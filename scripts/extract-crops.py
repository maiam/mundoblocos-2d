#!/usr/bin/env python3
"""Pranchas de crescimento de culturas (batata, tomate, cenoura): 8 × 2 estágios transparentes → folha 4 × 4.

  assets-src/crops/<nome>.png → src/assets/crop-<nome>.png (16 quadros de FRAME px, ordem de leitura = estágio 0..15).
Mesmo formato da folha do trigo (render/itemArt.ts → loadCropSprites): todos os estágios na mesma escala, com a base
do caule no centro do pé do quadro — a planta cresce no lugar. O ruído do fundo some (sprite_segments.segment).
Uso: python3 scripts/extract-crops.py && python3 scripts/optimize-assets.py
"""
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))
from sprite_segments import segment  # noqa: E402

SRC, OUT = ROOT / 'assets-src' / 'crops', ROOT / 'src' / 'assets'
NAMES = ['potato', 'tomato', 'carrot']
FRAME = 128

for name in NAMES:
    cells = segment(Image.open(SRC / f'{name}.png').convert('RGBA'), 8, 2)
    span = max(max(b[2] - b[0], b[3] - b[1]) for _, b in cells)
    k = FRAME * 0.96 / span
    out = Image.new('RGBA', (FRAME * 4, FRAME * 4))
    for i, (im, (x0, y0, x1, y1)) in enumerate(cells):
        part = im.crop((x0, y0, x1, y1))
        part = part.resize((max(1, round(part.width * k)), max(1, round(part.height * k))), Image.LANCZOS)
        fx, fy = (i % 4) * FRAME, (i // 4) * FRAME
        out.alpha_composite(part, (fx + (FRAME - part.width) // 2, fy + FRAME - part.height))
    out.save(OUT / f'crop-{name}.png', optimize=True)
    print(name, 'escala', round(k, 3))
