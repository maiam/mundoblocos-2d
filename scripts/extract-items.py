#!/usr/bin/env python3
"""Ícones de itens desenhados soltos (maçã, batata, tomate, cenoura): PNG transparente → ícone 64 × 64 da bolsa.

  assets-src/items/<nome>.png → src/assets/icon-item-<nome>.png (desenho centrado, com folga).
Uso: python3 scripts/extract-items.py && python3 scripts/optimize-assets.py
"""
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC, OUT = ROOT / 'assets-src' / 'items', ROOT / 'src' / 'assets'
N, MARGIN = 64, 0.05

for path in sorted(SRC.glob('*.png')):
    a = np.asarray(Image.open(path).convert('RGBA')).copy()
    a[..., 3][a[..., 3] < 60] = 0  # brilho fraco do fundo fora
    solid = a[..., 3] > 0
    ys = np.nonzero(solid.sum(axis=1) >= 4)[0]
    xs = np.nonzero(solid.sum(axis=0) >= 4)[0]
    im = Image.fromarray(a, 'RGBA').crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    k = N * (1 - 2 * MARGIN) / max(im.size)
    im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
    out = Image.new('RGBA', (N, N))
    out.alpha_composite(im, ((N - im.width) // 2, (N - im.height) // 2))
    out.save(OUT / f'icon-item-{path.stem}.png', optimize=True)
    print(path.stem)
