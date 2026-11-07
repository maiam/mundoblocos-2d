#!/usr/bin/env python3
"""Paredes de pedra: prancha de 8 pedras (cada uma em 3 alturas) → coluna de 3 de altura de cada uma + ícones.

  assets-src/stone-walls-sheet.png (4 fileiras × 2 grupos; em cada grupo, cubo baixo, médio e alto) →
  src/assets/walls.png (8 quadros FRAME_W × FRAME_H, base do desenho no pé do quadro, na ordem das pedras do jogo:
  Bruta, Irregular, Tijolo, Chão (lajotas), Lisa, Polida, Rachada, Tijolo Rachado) e src/assets/icon-block-wall-<n>.png.
  Só a coluna mais alta de cada grupo é usada (parede = 3 de altura, decisão do dono do produto). O render tira o
  contorno do lado que encosta em outra parede (parede contínua; render/textures.ts → `wallTextures`).
Uso: python3 scripts/extract-walls.py && python3 scripts/optimize-assets.py
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))
from sprite_segments import ALPHA_MIN, components  # noqa: E402

FRAME_W = 96
OUT = ROOT / 'src' / 'assets'

a = np.asarray(Image.open(ROOT / 'assets-src' / 'stone-walls-sheet.png').convert('RGBA')).copy()
alpha = a[..., 3]
alpha[alpha < ALPHA_MIN] = 0
lab, sizes = components(alpha[::2, ::2] > 0)
big = max(sizes[1:])
boxes = []
for n in range(1, len(sizes)):
    if sizes[n] < big * 0.05:
        continue
    ys, xs = np.nonzero(lab == n)
    boxes.append((n, xs.min() * 2, ys.min() * 2, xs.max() * 2 + 2, ys.max() * 2 + 2))
H, W = alpha.shape
# Grupo = (fileira pela base, metade esquerda/direita); a mais alta de cada grupo é a parede.
groups = {}
for b in boxes:
    row = int((b[4] / H) * 4)
    col = 0 if (b[1] + b[3]) / 2 < W / 2 else 1
    key = (min(row, 3), col)
    if key not in groups or (b[4] - b[2]) > (groups[key][4] - groups[key][2]):
        groups[key] = b
order = [groups[(r, c)] for r in range(4) for c in range(2)]
assert len(order) == 8, groups.keys()
parts = []
for n, x0, y0, x1, y1 in order:
    keep = np.repeat(np.repeat(lab == n, 2, axis=0), 2, axis=1)[:H, :W]
    b = a.copy()
    b[..., 3] = np.where(keep, alpha, 0)
    parts.append(Image.fromarray(b, 'RGBA').crop((x0, y0, x1, y1)))
# Cada parede ocupa a largura inteira do quadro (= 1 célula): vizinhas encostam sem fresta.
frame_h = max(round(p.height * FRAME_W / p.width) for p in parts)
strip = Image.new('RGBA', (FRAME_W * 8, frame_h))
for i, p in enumerate(parts):
    q = p.resize((FRAME_W, round(p.height * FRAME_W / p.width)), Image.LANCZOS)
    strip.alpha_composite(q, (i * FRAME_W, frame_h - q.height))
    icon = Image.new('RGBA', (64, 64))
    s = 60 / max(p.size)
    qi = p.resize((max(1, round(p.width * s)), max(1, round(p.height * s))), Image.LANCZOS)
    icon.alpha_composite(qi, ((64 - qi.width) // 2, (64 - qi.height) // 2))
    icon.save(OUT / f'icon-block-wall-{i}.png', optimize=True)
strip.save(OUT / 'walls.png', optimize=True)
print('paredes', strip.size, [p.size for p in parts])
