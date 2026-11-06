#!/usr/bin/env python3
"""Pranchas de crescimento (carvalho, macieira, cacto): grade 4 × 2 transparente → folha de quadros iguais.

  assets-src/trees/<nome>.png → src/assets/tree-<nome>.png (4 × 2 quadros de FRAME × FRAME px).
Cada quadro mantém o tamanho relativo da prancha (estágios menores continuam menores) e fica com a base do desenho
centrada no pé do quadro. O fundo é limpo: alfa fraco some e só fica o maior pedaço conectado de cada célula (mais os
pedaços grandes, como flores soltas encostadas). O render escolhe o quadro por estágio/variante (render/textures.ts).
Uso: python3 scripts/extract-trees.py && python3 scripts/optimize-assets.py
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))
from sprite_segments import segment  # noqa: E402
SRC, OUT = ROOT / 'assets-src' / 'trees', ROOT / 'src' / 'assets'
NAMES = ['oak', 'apple', 'cactus']
COLS, ROWS = 4, 2
FRAME = 192


for name in NAMES:
    sheet = Image.open(SRC / f'{name}.png').convert('RGBA')
    cells = segment(sheet, COLS, ROWS)
    # Escala única para a prancha inteira: o maior desenho cabe no quadro (com folga).
    span = max(max(b[2] - b[0], b[3] - b[1]) for _, b in cells)
    k = FRAME * 0.96 / span
    out = Image.new('RGBA', (FRAME * COLS, FRAME * ROWS))
    for i, (im, (x0, y0, x1, y1)) in enumerate(cells):
        part = im.crop((x0, y0, x1, y1))
        part = part.resize((max(1, round(part.width * k)), max(1, round(part.height * k))), Image.LANCZOS)
        fx, fy = (i % COLS) * FRAME, (i // COLS) * FRAME
        out.alpha_composite(part, (fx + (FRAME - part.width) // 2, fy + FRAME - part.height))
    out.save(OUT / f'tree-{name}.png', optimize=True)
    print(name, 'escala', round(k, 3), 'quadros', [(round((b[2] - b[0]) * k), round((b[3] - b[1]) * k)) for _, b in cells])


# Ícones das mudas (64 × 64) = 1º estágio da prancha. (A maçã tem arte própria: scripts/extract-items.py.)
def icon(im, n=64, margin=0.06):
    ys, xs = np.nonzero(np.asarray(im)[..., 3] > 0)
    im = im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    k = n * (1 - 2 * margin) / max(im.size)
    im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
    out = Image.new('RGBA', (n, n))
    out.alpha_composite(im, ((n - im.width) // 2, (n - im.height) // 2))
    return out


for name in ('oak', 'apple'):
    sheet = Image.open(OUT / f'tree-{name}.png')
    icon(sheet.crop((0, 0, FRAME, FRAME))).save(OUT / f'icon-item-{name}-sapling.png', optimize=True)

print('ícones: mudas')
