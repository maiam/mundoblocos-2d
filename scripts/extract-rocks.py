#!/usr/bin/env python3
"""Prancha de pedras soltas (pedregulhos do mundo): desenhos em fileiras irregulares → tira de quadros iguais.

  assets-src/rocks-sheet.png → src/assets/rocks.png (N quadros de FRAME × FRAME px numa fileira, ordem de leitura).
Cada desenho mantém o tamanho relativo da prancha (pedrinhas continuam pequenas) e fica com a base centrada no pé do
quadro. Separação por pedaços conectados (sem grade: as fileiras da prancha têm quantidades diferentes).
O render sorteia um quadro por célula (render/textures.ts → `ROCK_BOULDER`).
Uso: python3 scripts/extract-rocks.py && python3 scripts/optimize-assets.py
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))
from sprite_segments import ALPHA_MIN, components  # noqa: E402

FRAME = 96

a = np.asarray(Image.open(ROOT / 'assets-src' / 'rocks-sheet.png').convert('RGBA')).copy()
alpha = a[..., 3]
alpha[alpha < ALPHA_MIN] = 0
small = alpha[::2, ::2] > 0
lab, sizes = components(small)
big = max(sizes[1:])
items = []
for n in range(1, len(sizes)):
    if sizes[n] < big * 0.01:  # pontinhos do fundo
        continue
    ys, xs = np.nonzero(lab == n)
    items.append((n, xs.min() * 2, ys.min() * 2, xs.max() * 2 + 2, ys.max() * 2 + 2))
# Ordem de leitura: fileiras pela base do desenho (pedras de uma fileira têm a base quase na mesma altura).
items.sort(key=lambda t: t[4])
rows, cur = [], []
for it in items:
    if cur and it[4] - cur[-1][4] > 40:
        rows.append(cur)
        cur = []
    cur.append(it)
rows.append(cur)
ordered = [it for r in rows for it in sorted(r, key=lambda t: t[1])]
span = max(max(x1 - x0, y1 - y0) for _, x0, y0, x1, y1 in ordered)
k = FRAME * 0.96 / span
out = Image.new('RGBA', (FRAME * len(ordered), FRAME))
for i, (n, x0, y0, x1, y1) in enumerate(ordered):
    keep = np.repeat(np.repeat(lab == n, 2, axis=0), 2, axis=1)[: alpha.shape[0], : alpha.shape[1]]
    b = a.copy()
    b[..., 3] = np.where(keep, alpha, 0)
    part = Image.fromarray(b, 'RGBA').crop((x0, y0, x1, y1))
    part = part.resize((max(1, round(part.width * k)), max(1, round(part.height * k))), Image.LANCZOS)
    out.alpha_composite(part, (i * FRAME + (FRAME - part.width) // 2, FRAME - part.height))
out.save(ROOT / 'src' / 'assets' / 'rocks.png', optimize=True)
print('pedras', len(ordered), 'fileiras', [len(r) for r in rows], 'escala', round(k, 3))
