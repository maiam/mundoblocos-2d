#!/usr/bin/env python3
"""Objetos fabricados por receita (fogueira, caldeirão, forno, cadeira): prancha transparente → ícone e sprite do mundo.

  assets-src/<nome>.png → src/assets/icon-block-<nome>.png (64×64, hotbar) e src/assets/<nome>.png (sprite do mundo,
  SPRITE_W px de largura; o render desenha com a largura em células de `CRAFT_PROPS` em render/textures.ts).
Uso: python3 scripts/extract-craftables.py && python3 scripts/optimize-assets.py
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
NAMES = ['campfire', 'cauldron', 'oven', 'chair']
SPRITE_W = 128

import numpy as np
from PIL import Image

SRC, OUT = ROOT / 'assets-src', ROOT / 'src' / 'assets'


def cutout(path):
    im = Image.open(path).convert('RGBA')
    a = np.asarray(im).copy()
    a[..., 3][a[..., 3] < 60] = 0  # brilho fraco do fundo fora
    # Recorte pelas linhas/colunas com desenho de verdade (≥ 4 px): pontinhos soltos do fundo não alargam a caixa.
    solid = a[..., 3] > 0
    ys = np.nonzero(solid.sum(axis=1) >= 4)[0]
    xs = np.nonzero(solid.sum(axis=0) >= 4)[0]
    return Image.fromarray(a, 'RGBA').crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))


def square(im, n, margin=0.04):
    k = n * (1 - 2 * margin) / max(im.size)
    im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
    out = Image.new('RGBA', (n, n))
    out.alpha_composite(im, ((n - im.width) // 2, (n - im.height) // 2))
    return out


for name in NAMES:
    im = cutout(SRC / f'{name}.png')
    square(im, 64).save(OUT / f'icon-block-{name}.png', optimize=True)
    k = SPRITE_W / im.width
    sprite = im.resize((SPRITE_W, round(im.height * k)), Image.LANCZOS)
    sprite.save(OUT / f'{name}.png', optimize=True)
    print(name, sprite.size)
