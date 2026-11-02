"""Ícones de interface, tenda e a nova Tábua de Carvalho → arte do jogo.

  ui-character.png / ui-skills.png / ui-builder.png (transparentes, com brilho fraco) → icon-ui-*.png 96×96
  chest-angled.png / chest-front.png → icon-block-chest.png (ícone) e chest.png (sprite do mundo)
  tent.jpg (fundo branco) → icon-block-tent.png (64×64, hotbar) e tent.png (sprite do mundo, 96 de altura)
  oak-planks-cube.png (cubo 3/4 transparente) → substitui a coluna da Tábua no blocks-atlas (topo, frente, chão)
      e o ícone icon-block-oak-planks.png

Uso: python3 scripts/extract-ui.py && python3 scripts/optimize-assets.py   (requer Pillow e numpy)
"""
from collections import deque

import numpy as np
from PIL import Image

SRC, OUT = 'assets-src/', 'src/assets/'


def flood(cand):
    reach = np.zeros_like(cand)
    reach[0, :] = cand[0, :]; reach[-1, :] = cand[-1, :]; reach[:, 0] = cand[:, 0]; reach[:, -1] = cand[:, -1]
    while True:
        g = reach.copy()
        g[1:, :] |= reach[:-1, :]; g[:-1, :] |= reach[1:, :]; g[:, 1:] |= reach[:, :-1]; g[:, :-1] |= reach[:, 1:]
        g &= cand
        if (g == reach).all():
            return reach
        reach = g


def cutout(path, mode, scale=0.25):
    """Fundo fora: 'alpha' corta o brilho fraco (alfa < 90); 'light' remove fundo branco a partir das bordas."""
    im = Image.open(path).convert('RGBA')
    im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
    a = np.asarray(im).copy()
    if mode == 'alpha':
        a[..., 3][a[..., 3] < 90] = 0
    else:
        rgb = a[..., :3].astype(int)
        bg = flood((rgb.min(2) > 225) & (rgb.max(2) - rgb.min(2) < 20))
        a[..., 3][bg] = 0
    out = Image.fromarray(a, 'RGBA')
    ys, xs = np.nonzero(a[..., 3] > 0)
    return out.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))


def square(im, n, margin=0.04):
    k = n * (1 - 2 * margin) / max(im.size)
    im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
    out = Image.new('RGBA', (n, n))
    out.alpha_composite(im, ((n - im.width) // 2, (n - im.height) // 2))
    return out


for name, mode in [('character', 'alpha'), ('skills', 'alpha'), ('builder', 'alpha')]:
    square(cutout(SRC + f'ui-{name}.png', mode), 96).save(OUT + f'icon-ui-{name}.png', optimize=True)
    print(OUT + f'icon-ui-{name}.png')

# Baú de Carvalho: vista inclinada → ícone; vista de frente → sprite do mundo (combina com a câmera 3/4).
square(cutout(SRC + 'chest-angled.png', 'alpha'), 64).save(OUT + 'icon-block-chest.png', optimize=True)
chest = cutout(SRC + 'chest-front.png', 'alpha', scale=0.12)
chest.save(OUT + 'chest.png', optimize=True)
print(OUT + 'icon-block-chest.png', OUT + 'chest.png', chest.size)

tent = cutout(SRC + 'tent.jpg', 'light', scale=1.0)
square(tent, 64).save(OUT + 'icon-block-tent.png', optimize=True)
k = 96 / tent.height
tent.resize((round(tent.width * k), 96), Image.LANCZOS).save(OUT + 'tent.png', optimize=True)
print(OUT + 'icon-block-tent.png', OUT + 'tent.png')

# ---- Nova Tábua de Carvalho no atlas (coluna 7 = ordem de MATERIALS) ----
COL = 7
TOP, FRONT = 64, 36
cube = Image.open(SRC + 'oak-planks-cube.png').convert('RGBA')
quad = lambda pts: [v for p in pts for v in p]
top = cube.transform((TOP, TOP), Image.QUAD, quad([(250, 92), (180, 536), (1076, 536), (1000, 92)]), Image.BICUBIC)
front = cube.transform((TOP, FRONT), Image.QUAD, quad([(184, 552), (184, 1180), (1070, 1180), (1070, 552)]), Image.BICUBIC)
atlas = Image.open(OUT + 'blocks-atlas.webp').convert('RGB')
atlas.paste(top.convert('RGB'), (COL * TOP, 0))
atlas.paste(front.convert('RGB'), (COL * TOP, TOP))
atlas.paste(top.convert('RGB'), (COL * TOP, TOP + FRONT))  # chão = topo (tábua tem direção: não gira)
atlas.save(OUT + 'blocks-atlas.png', optimize=True)
icon = cube.crop(cube.getbbox())
square(icon, 64, margin=0.02).save(OUT + 'icon-block-oak-planks.png', optimize=True)
print(OUT + 'blocks-atlas.png (coluna da Tábua substituída)', OUT + 'icon-block-oak-planks.png')
