"""Converte uma folha de sprites 4x4 (fundo claro e neutro) em PNG transparente
com quadros de tamanho uniforme e ancoragem comum (pés na base do quadro).

Uso: python3 scripts/process-sprite.py [entrada] [saída] [altura_do_quadro] [sat_max] [min_claro]
  heroína: python3 scripts/process-sprite.py assets-src/heroine-sheet.png src/assets/heroine.png 144
  ovelha:  python3 scripts/process-sprite.py assets-src/sheep-sheet.png src/assets/sheep.png 96 23 128
sat_max/min_claro definem o que conta como fundo/sombra (pouco saturado e claro); a
remoção só avança a partir das bordas da célula, então o contorno do desenho a contém.
Linhas da folha: 0 = frente (baixo), 1 = esquerda, 2 = direita, 3 = costas (cima).
"""
import sys
from collections import deque

import numpy as np
from PIL import Image

SRC = sys.argv[1] if len(sys.argv) > 1 else 'assets-src/heroine-sheet.png'
OUT = sys.argv[2] if len(sys.argv) > 2 else 'src/assets/heroine.png'
GRID = 4
FRAME_H = int(sys.argv[3]) if len(sys.argv) > 3 else 144  # altura final do quadro em px

img = np.asarray(Image.open(SRC).convert('RGB')).astype(np.int16)
H, W, _ = img.shape
cw, ch = W / GRID, H / GRID

mx = img.max(axis=2)
mn = img.min(axis=2)
SAT_MAX = int(sys.argv[4]) if len(sys.argv) > 4 else 16
MIN_LIGHT = int(sys.argv[5]) if len(sys.argv) > 5 else 140
# Fundo: claro e pouco saturado (inclui a sombra cinza projetada).
bg_like = ((mx - mn) < SAT_MAX) & (mn > MIN_LIGHT)

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
    # Suaviza a borda: pixels claros vizinhos do fundo ficam semitransparentes.
    edge = np.zeros_like(bg)
    edge[1:, :] |= bg[:-1, :]; edge[:-1, :] |= bg[1:, :]
    edge[:, 1:] |= bg[:, :-1]; edge[:, :-1] |= bg[:, 1:]
    edge &= ~bg
    light = mn[y0:y1, x0:x1].astype(np.float32)
    soft = np.clip((255 - light) / 90, 0.25, 1) * 255
    alpha[edge] = np.minimum(alpha[edge], soft[edge])
    return alpha.astype(np.uint8)

cells = []
for r in range(GRID):
    for c in range(GRID):
        x0, y0 = round(c * cw), round(r * ch)
        x1, y1 = round((c + 1) * cw), round((r + 1) * ch)
        a = remove_bg(x0, y0, x1, y1)
        rgba = np.dstack([img[y0:y1, x0:x1].astype(np.uint8), a])
        cells.append(rgba)

# Caixa comum a todos os quadros (mantém a ancoragem estável entre quadros).
mh = min(cell.shape[0] for cell in cells)
mw = min(cell.shape[1] for cell in cells)
ys, xs = [], []
for cell in cells:
    yy, xx = np.nonzero(cell[:mh, :mw, 3] > 0)
    ys += [yy.min(), yy.max()]; xs += [xx.min(), xx.max()]
top, bottom = min(ys), max(ys) + 1
left, right = min(xs), max(xs) + 1
# Centraliza horizontalmente em torno do centro da célula.
half = max(mw / 2 - left, right - mw / 2)
left, right = int(mw / 2 - half), int(mw / 2 + half)

scale = FRAME_H / (bottom - top)
fw = int(round((right - left) * scale))
sheet = Image.new('RGBA', (fw * GRID, FRAME_H * GRID), (0, 0, 0, 0))
for i, cell in enumerate(cells):
    crop = Image.fromarray(cell[top:bottom, max(left, 0):right], 'RGBA')
    frame = crop.convert('RGBa').resize((fw, FRAME_H), Image.LANCZOS).convert('RGBA')
    sheet.paste(frame, ((i % GRID) * fw, (i // GRID) * FRAME_H))
sheet.save(OUT, optimize=True)
print(f'{OUT}: quadros {fw}x{FRAME_H}, folha {sheet.size}')
