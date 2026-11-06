"""Converte uma folha de sprites (fundo claro e neutro) em PNG transparente com
quadros de tamanho uniforme e ancoragem comum (base do desenho na base do quadro).

O fundo e a sombra projetada são removidos por flood fill a partir das bordas de
cada célula, considerando "fundo" os pixels claros e pouco saturados; o contorno
do desenho contém a remoção.

Exemplos (ver docs/OPERATIONS.md para a lista completa):
  python3 scripts/process-sprite.py assets-src/heroine-sheet.png src/assets/heroine.png --frame-h 144
  python3 scripts/process-sprite.py assets-src/sheep-sheet.png src/assets/sheep.png --frame-h 96 --sat 23 --min 128
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
ap.add_argument('--grid-offset-y', type=int, default=0,
                help='desloca a grade para cima (px) quando o desenho de uma linha invade a de cima (ex.: auréolas)')
ap.add_argument('--largest', action='store_true',
                help='mantém só o maior pedaço conectado de cada quadro (descarta fragmentos de quadros vizinhos)')
ap.add_argument('--alpha', action='store_true',
                help='a folha já tem transparência: usa o alfa da imagem em vez de remover o fundo')
ap.add_argument('--rows-map', default=None,
                help='linhas de saída a partir das de entrada, ex. "0,3,1,2"; sufixo m espelha ("0,1,1m,2"). '
                     'Use para normalizar na ordem canônica frente, esquerda, direita, costas.')
ap.add_argument('--respace', type=int, default=0, metavar='PAD',
                help='(com --alpha) corta cada coluna no vão vazio mais próximo de cada divisa de linha e reespaça os '
                     'quadros com PAD px de folga em cima/embaixo, mantendo a posição relativa. Use quando os quadros '
                     'transbordam a grade para cima e para baixo em colunas diferentes (sem corte reto comum).')
args = ap.parse_args()

src_rgba = Image.open(args.src).convert('RGBA')
if args.region:
    src_rgba = src_rgba.crop(tuple(int(v) for v in args.region.split(',')))
if args.respace:
    assert args.alpha, '--respace exige --alpha'
    arr = np.asarray(src_rgba)
    ink = arr[..., 3] >= 48
    h0, w0 = ink.shape
    ch0, cw0, pad = h0 / args.rows, w0 / args.cols, args.respace
    nh = round(ch0 + 2 * pad)
    out = np.zeros((nh * args.rows, w0, 4), np.uint8)
    for c in range(args.cols):
        x0, x1 = round(c * cw0), round((c + 1) * cw0)
        empty = ~ink[:, x0:x1].any(axis=1)
        cuts = [0]
        for k in range(1, args.rows):
            nominal = round(k * ch0)
            cand = [y for y in range(max(0, nominal - int(ch0 / 2)), min(h0, nominal + int(ch0 / 2))) if empty[y]]
            if not cand:
                raise SystemExit(f'coluna {c}: sem vão vazio perto da divisa {k}')
            # Centro do trecho vazio mais próximo da divisa nominal.
            y = min(cand, key=lambda v: abs(v - nominal))
            lo = hi = y
            while lo > 0 and empty[lo - 1]: lo -= 1
            while hi < h0 - 1 and empty[hi + 1]: hi += 1
            cuts.append((lo + hi) // 2)
        cuts.append(h0)
        for k in range(args.rows):
            a, b = cuts[k], cuts[k + 1]
            dst = k * nh + pad + (a - round(k * ch0))
            if dst < k * nh or dst + (b - a) > (k + 1) * nh:
                raise SystemExit(f'quadro ({k},{c}) não cabe: aumente PAD')
            out[dst:dst + (b - a), x0:x1] = arr[a:b, x0:x1]
    src_rgba = Image.fromarray(out, 'RGBA')
src_alpha = np.asarray(src_rgba)[..., 3]
src = src_rgba.convert('RGB')
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


def keep_largest(a):
    """Zera o alfa fora do maior componente conectado (8-vizinhança) com alfa ≥ 64."""
    m = a >= 64
    h, w = m.shape
    label = np.zeros((h, w), np.int32)
    best, best_n, cur = 0, 0, 0
    for sy, sx in zip(*np.nonzero(m)):
        if label[sy, sx]:
            continue
        cur += 1
        label[sy, sx] = cur
        q, n = deque([(sy, sx)]), 0
        while q:
            y, x = q.popleft()
            n += 1
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < h and 0 <= nx < w and m[ny, nx] and not label[ny, nx]:
                        label[ny, nx] = cur
                        q.append((ny, nx))
        if n > best_n:
            best, best_n = cur, n
    keep = label == best
    # Mantém a borda suave: pixels fracos encostados no componente principal.
    grown = keep.copy()
    grown[1:, :] |= keep[:-1, :]; grown[:-1, :] |= keep[1:, :]
    grown[:, 1:] |= keep[:, :-1]; grown[:, :-1] |= keep[:, 1:]
    out = a.copy()
    out[~grown] = 0
    return out


cells = []
for r in range(args.rows):
    for c in range(args.cols):
        x0, y0 = round(c * cw), max(0, round(r * ch) - args.grid_offset_y)
        x1, y1 = round((c + 1) * cw), min(H, round((r + 1) * ch) - args.grid_offset_y)
        if args.alpha:
            # Alfa original; resíduos fracos do fundo (< 48) viram transparência total.
            a = src_alpha[y0:y1, x0:x1].copy()
            a[a < 48] = 0
        else:
            a = remove_bg(x0, y0, x1, y1)
        if args.largest:
            a = keep_largest(a)
        cells.append(np.dstack([img[y0:y1, x0:x1].astype(np.uint8), a]))

if args.rows_map:
    remapped = []
    for spec in args.rows_map.split(','):
        r = int(spec.rstrip('m'))
        for c in range(args.cols):
            cell = cells[r * args.cols + c]
            remapped.append(cell[:, ::-1].copy() if spec.endswith('m') else cell)
    cells = remapped

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
print(f'{args.out}: quadros {fw}x{args.frame_h}, folha {sheet.size}, '
      f'altura do desenho na origem {bottom - top}px (célula {mh}px)')
