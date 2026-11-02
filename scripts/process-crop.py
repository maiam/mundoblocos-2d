"""Folha de crescimento de planta (4×4, fundo claro, estágios de tamanhos diferentes) →
folha uniforme em que cada quadro tem a BASE do caule no mesmo ponto (centro-inferior)
e todos usam a MESMA escala — a planta cresce no lugar, sem pular entre estágios.

Uso: python3 scripts/process-crop.py [entrada] [saída] [lado_do_quadro]
  python3 scripts/process-crop.py assets-src/wheat-growth-sheet-v2.png src/assets/wheat-crop.png 128
"""
import sys

import numpy as np
from PIL import Image

SRC = sys.argv[1] if len(sys.argv) > 1 else 'assets-src/wheat-growth-sheet-v2.png'
OUT = sys.argv[2] if len(sys.argv) > 2 else 'src/assets/wheat-crop.png'
FRAME = int(sys.argv[3]) if len(sys.argv) > 3 else 128

rgb = np.asarray(Image.open(SRC).convert('RGB')).astype(np.float32)
mn, mx = rgb.min(2), rgb.max(2)
sat = mx - mn
# Alfa suave: fundo = claro e pouco saturado. Plantas são saturadas (verde/dourado).
alpha = np.clip((sat - 18) / 24, 0, 1)
alpha = np.maximum(alpha, np.clip((200 - mn) / 40, 0, 1))
alpha[alpha < 0.12] = 0
fg = alpha > 0.5
# Remove a cor do fundo misturada nas bordas (evita franja clara sobre a terra).
BG = np.median(rgb[:20, :20].reshape(-1, 3), axis=0)
a3 = np.maximum(alpha, 1e-3)[..., None]
rgb = np.clip((rgb - (1 - a3) * BG) / a3, 0, 255)


def runs(idx):
    out, s, p = [], idx[0], idx[0]
    for v in list(idx[1:]) + [None]:
        if v is None or v != p + 1:
            out.append((int(s), int(p)))
            if v is not None:
                s = v
        if v is not None:
            p = v
    return out


row_bands = [r for r in runs(np.nonzero(fg.sum(1) > 2)[0]) if r[1] - r[0] > 20]
col_bands = [c for c in runs(np.nonzero(fg.sum(0) > 2)[0]) if c[1] - c[0] > 20]
assert len(row_bands) == 4 and len(col_bands) == 4, (row_bands, col_bands)

cells = []
for (y0, y1) in row_bands:
    for (x0, x1) in col_bands:
        m = fg[y0:y1 + 1, x0:x1 + 1]
        ys, xs = np.nonzero(m)
        bottom = ys.max()
        base_x = xs[ys >= bottom - 6].mean()  # centro dos caules na base
        cells.append((x0, y0, x1, y1, ys.min(), bottom, base_x))

# Escala comum: o maior quadro (largura ou altura acima da base) cabe no quadro de saída.
need = max(max(c[5] - c[4], 2 * max(c[6], c[2] - c[0] - c[6])) for c in cells)
scale = (FRAME - 2) / need

rgba = np.dstack([rgb, alpha * 255]).astype(np.uint8)
sheet = Image.new('RGBA', (FRAME * 4, FRAME * 4), (0, 0, 0, 0))
for i, (x0, y0, x1, y1, top, bottom, base_x) in enumerate(cells):
    crop = Image.fromarray(rgba[y0:y0 + bottom + 1, x0:x1 + 1], 'RGBA')
    w, h = max(1, round(crop.width * scale)), max(1, round(crop.height * scale))
    crop = crop.convert('RGBa').resize((w, h), Image.LANCZOS).convert('RGBA')
    fx = (i % 4) * FRAME + round(FRAME / 2 - base_x * scale)
    fy = (i // 4) * FRAME + FRAME - h
    frame = Image.new('RGBA', (FRAME, FRAME), (0, 0, 0, 0))
    frame.alpha_composite(crop, (fx - (i % 4) * FRAME, fy - (i // 4) * FRAME))
    sheet.alpha_composite(frame, ((i % 4) * FRAME, (i // 4) * FRAME))
sheet.save(OUT, optimize=True)
print(f'{OUT}: 16 quadros {FRAME}x{FRAME}, escala {scale:.3f}')
