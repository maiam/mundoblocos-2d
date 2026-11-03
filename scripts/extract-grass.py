"""Prancha 3/4 da Terra com Grama (assets-src/grass-variants-34.png, transparente, 3 cubos lado a lado) → atlas e ícone.

As 3 variações são sorteadas por célula (fixas pela seed) no chão e nos cubos:
- variação 1 substitui a coluna da Terra com Grama (GRASS, coluna 1 de MATERIALS) e o ícone icon-block-grass;
- variações 2 e 3 vão para as colunas extras 15 e 16 do atlas (depois dos 15 materiais; ver GROUND_VARIANTS em
  render/textures.ts).
Topo = do alto do cubo até o começo da franja de grama; frente = franja + terra. Chão = topo contínuo (sem emendas).

Rode DEPOIS de extract-blocks.py, extract-ui.py e extract-stones.py; depois optimize-assets.py.
Uso: python3 scripts/extract-grass.py
"""
import numpy as np
from PIL import Image

SRC, OUT = 'assets-src/grass-variants-34.png', 'src/assets/'
TOP, FRONT = 64, 36
BOXES = [(484, 67, 888, 629), (893, 67, 1284, 629), (1290, 67, 1691, 629)]
SPLIT_Y = 378  # começo da franja de grama sobre a terra (medido na prancha)
GRASS_COL = 1
EXTRA_COLS = [15, 16]
MATERIAL_COLS = 15


def seamless(tile):
    a = np.asarray(tile).astype(np.float32)
    n = a.shape[0]
    rolled = np.roll(np.roll(a, n // 2, 0), n // 2, 1)
    yy, xx = np.mgrid[0:n, 0:n]
    d = np.minimum(np.minimum(xx, n - 1 - xx), np.minimum(yy, n - 1 - yy)) / (n / 2)
    w = np.clip((0.42 - d) / 0.42, 0, 1)[..., None] ** 1.2
    return Image.fromarray((a * (1 - w) + rolled * w).astype(np.uint8))


sheet = Image.open(SRC).convert('RGBA')
quad = lambda x0, y0, x1, y1: [x0, y0, x0, y1, x1, y1, x1, y0]
faces = []
for i, (x0, y0, x1, y1) in enumerate(BOXES):
    k = (x1 - x0) * 0.03  # para dentro da borda arredondada
    top = sheet.transform((TOP, TOP), Image.QUAD, quad(x0 + k, y0 + k, x1 - k, SPLIT_Y), Image.BICUBIC).convert('RGB')
    front = sheet.transform((TOP, FRONT), Image.QUAD, quad(x0 + k, SPLIT_Y, x1 - k, y1 - k), Image.BICUBIC).convert('RGB')
    g = (x1 - x0) * 0.08
    ground = sheet.transform((TOP, TOP), Image.QUAD, quad(x0 + g, y0 + g, x1 - g, SPLIT_Y - g * 0.5), Image.BICUBIC).convert('RGB')
    faces.append((top, front, seamless(ground)))
    if i == 0:
        icon = sheet.crop((x0, y0, x1, y1))
        s = 62 / max(icon.size)
        icon = icon.resize((round(icon.width * s), round(icon.height * s)), Image.LANCZOS)
        out = Image.new('RGBA', (64, 64))
        out.alpha_composite(icon, ((64 - icon.width) // 2, (64 - icon.height) // 2))
        out.save(OUT + 'icon-block-grass.png', optimize=True)

base = Image.open(OUT + 'blocks-atlas.webp').convert('RGB')
atlas = Image.new('RGB', (TOP * (MATERIAL_COLS + len(EXTRA_COLS)), base.height))
atlas.paste(base.crop((0, 0, TOP * MATERIAL_COLS, base.height)), (0, 0))
for col, (top, front, ground) in zip([GRASS_COL, *EXTRA_COLS], faces):
    atlas.paste(top, (col * TOP, 0))
    atlas.paste(front, (col * TOP, TOP))
    atlas.paste(ground, (col * TOP, TOP + FRONT))
atlas.save(OUT + 'blocks-atlas.png', optimize=True)
print(OUT + 'blocks-atlas.png', atlas.size, '+ icon-block-grass.png')
