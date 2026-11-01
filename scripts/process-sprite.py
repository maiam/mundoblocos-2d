"""Converte uma folha de sprites (fundo claro e neutro) em PNG transparente com
quadros de tamanho uniforme e ancoragem comum (base do desenho na base do quadro).

O fundo e a sombra projetada são removidos por flood fill a partir das bordas de
cada célula, considerando "fundo" os pixels claros e pouco saturados; o contorno
do desenho contém a remoção.

Exemplos (ver docs/OPERATIONS.md para a lista completa):
  python3 scripts/process-sprite.py assets-src/heroine-sheet.png src/assets/heroine.png --frame-h 144
  python3 scripts/process-sprite.py assets-src/sheep-sheet.png src/assets/sheep.png --frame-h 96 --sat 23 --min 128
  python3 scripts/process-sprite.py assets-src/sheep-love-sheet.png src/assets/sheep-love.png \\
      --cols 4 --rows 1 --region 0,0,2172,490 --frame-h 120
"""
import argparse
from collections import deque

import numpy as np
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument('src')
ap.add_argument('out')
ap.add_argument('--frame-h', type=int, default=144, help='altura final do quadro (px)')
ap.add_argument('--cols', type=int, default=4)
ap.add_argument('--rows', type=int, default=4)
ap.add_argument('--sat', type=int, default=16, help='saturação máxima do fundo/sombra')
ap.add_argument('--min', type=int, default=140, help='claridade mínima do fundo/sombra')
ap.add_argument('--region', default=None, help='x0,y0,x1,y1: recorte da folha antes de dividir em grade')
args = ap.parse_args()

src = Image.open(args.src).convert('RGB')
if args.region:
    src = src.crop(tuple(int(v) for v in args.region.split(',')))
img = np.asarray(src).astype(np.int16)
H, W, _ = img.shape
cw, ch = W / args.cols, H / args.rows

mx = img.max(axis=2)
mn = img.min(axis=2)
bg_like = ((mx - mn) < args.sat) & (mn > args.min)


def remove_bg(x0, y0, x1, y1):
    """Flood fill a partir das bordas da célula; retorna alpha (0..255)."""
    h, w = y1 - y0, x1 - x0
    like = bg_like[y0:y1, x0:x1]
    bg = np.zeros((h, w), bool)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if like[y, x] and not bg[y, x]:
                bg[y, x] = True; q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if like[y, x] and not bg[y, x]:
                bg[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and not bg[ny, nx] and like[ny, nx]:
                bg[ny, nx] = True; q.append((ny, nx))
    alpha = np.where(bg, 0, 255).astype(np.float32)
    # Borda suave: pixels claros vizinhos do fundo ficam semitransparentes.
    edge = np.zeros_like(bg)
    edge[1:, :] |= bg[:-1, :]; edge[:-1, :] |= bg[1:, :]
    edge[:, 1:] |= bg[:, :-1]; edge[:, :-1] |= bg[:, 1:]
    edge &= ~bg
    light = mn[y0:y1, x0:x1].astype(np.float32)
    soft = np.clip((255 - light) / 90, 0.25, 1) * 255
    alpha[edge] = np.minimum(alpha[edge], soft[edge])
    return alpha.astype(np.uint8)


cells = []
for r in range(args.rows):
    for c in range(args.cols):
        x0, y0 = round(c * cw), round(r * ch)
        x1, y1 = round((c + 1) * cw), round((r + 1) * ch)
        a = remove_bg(x0, y0, x1, y1)
        cells.append(np.dstack([img[y0:y1, x0:x1].astype(np.uint8), a]))

# Caixa comum a todos os quadros (mantém a ancoragem estável entre quadros).
mh = min(cell.shape[0] for cell in cells)
mw = min(cell.shape[1] for cell in cells)
ys, xs = [], []
for cell in cells:
    yy, xx = np.nonzero(cell[:mh, :mw, 3] > 0)
    ys += [yy.min(), yy.max()]; xs += [xx.min(), xx.max()]
top, bottom = min(ys), max(ys) + 1
left, right = min(xs), max(xs) + 1
half = max(mw / 2 - left, right - mw / 2)
left, right = max(0, int(mw / 2 - half)), min(mw, int(mw / 2 + half))

scale = args.frame_h / (bottom - top)
fw = int(round((right - left) * scale))
sheet = Image.new('RGBA', (fw * args.cols, args.frame_h * args.rows), (0, 0, 0, 0))
for i, cell in enumerate(cells):
    crop = Image.fromarray(cell[top:bottom, left:right], 'RGBA')
    frame = crop.convert('RGBa').resize((fw, args.frame_h), Image.LANCZOS).convert('RGBA')
    sheet.paste(frame, ((i % args.cols) * fw, (i // args.cols) * args.frame_h))
sheet.save(args.out, optimize=True)
print(f'{args.out}: quadros {fw}x{args.frame_h}, folha {sheet.size}')
