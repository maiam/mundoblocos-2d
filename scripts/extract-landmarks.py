#!/usr/bin/env python3
"""Marcos do mundo desenhados soltos (entrada do Covil das Aranhas): PNG transparente → sprite recortado.

  assets-src/<nome>.png → src/assets/<nome>.png com WIDTH px de largura (o render desenha com a largura em células
  da tabela em render/textures.ts; a base do desenho fica no pé da célula âncora).
Uso: python3 scripts/extract-landmarks.py && python3 scripts/optimize-assets.py
"""
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
NAMES = {'dungeon-cave': 320}

for name, width in NAMES.items():
    a = np.asarray(Image.open(ROOT / 'assets-src' / f'{name}.png').convert('RGBA')).copy()
    a[..., 3][a[..., 3] < 60] = 0
    solid = a[..., 3] > 0
    ys = np.nonzero(solid.sum(axis=1) >= 4)[0]
    xs = np.nonzero(solid.sum(axis=0) >= 4)[0]
    im = Image.fromarray(a, 'RGBA').crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    im.save(ROOT / 'src' / 'assets' / f'{name}.png', optimize=True)
    print(name, im.size)
