"""Prancha 3/4 de pedras (assets-src/stone-variants-34.png, transparente, 4×2) → atlas e ícones.

Ordem da prancha (esq.→dir.): linha 1 Pedra Bruta, Pedra Irregular, Tijolo de Pedra, Chão de Pedra;
linha 2 Pedra Lisa, Pedra Polida, Pedra Rachada, Tijolo de Pedra Rachado.
- Pedra Bruta substitui a coluna da Pedra (STONE) no blocks-atlas e o ícone icon-block-stone.
- As outras 7 são acrescentadas ao fim do atlas, na ordem de MATERIALS (world/blocks.ts).
Topo = 71,4% de cima do cubo (medido na prancha); frente = o resto. Chão = topo (contínuo nos que não têm direção).

Rode DEPOIS de extract-blocks.py (que regera o atlas de 8 colunas) e de extract-ui.py; depois optimize-assets.py.
Uso: python3 scripts/extract-stones.py
"""
import numpy as np
from PIL import Image

SRC, OUT = 'assets-src/stone-variants-34.png', 'src/assets/'
TOP, FRONT = 64, 36
SPLIT = 0.714
BOXES = [(38, 81, 349, 490), (392, 81, 703, 490), (746, 81, 1057, 490), (1100, 81, 1411, 490),
         (37, 576, 349, 990), (392, 576, 703, 990), (746, 576, 1058, 990), (1101, 576, 1412, 990)]
NAMES = ['stone', 'stone-cobble', 'stone-brick', 'stone-floor', 'stone-smooth', 'stone-polished', 'stone-cracked',
         'stone-brick-cracked']
ORIENTED = {'stone-brick', 'stone-floor', 'stone-polished', 'stone-brick-cracked'}
STONE_COL = 5  # coluna da Pedra em MATERIALS


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
for (x0, y0, x1, y1), name in zip(BOXES, NAMES):
    split = y0 + (y1 - y0) * SPLIT
    k = (x1 - x0) * 0.035  # para dentro da borda arredondada
    top = sheet.transform((TOP, TOP), Image.QUAD, quad(x0 + k, y0 + k, x1 - k, split - 2), Image.BICUBIC).convert('RGB')
    front = sheet.transform((TOP, FRONT), Image.QUAD, quad(x0 + k, split + 2, x1 - k, y1 - k), Image.BICUBIC).convert('RGB')
    g = (x1 - x0) * 0.08
    ground = sheet.transform((TOP, TOP), Image.QUAD, quad(x0 + g, y0 + g, x1 - g, split - g * 0.6), Image.BICUBIC).convert('RGB')
    faces.append((top, front, ground if name in ORIENTED else seamless(ground)))
    icon = sheet.crop((x0, y0, x1, y1))
    k2 = 62 / max(icon.size)
    icon = icon.resize((round(icon.width * k2), round(icon.height * k2)), Image.LANCZOS)
    out = Image.new('RGBA', (64, 64))
    out.alpha_composite(icon, ((64 - icon.width) // 2, (64 - icon.height) // 2))
    out.save(OUT + f'icon-block-{name}.png', optimize=True)

base = Image.open(OUT + 'blocks-atlas.webp').convert('RGB')
cols = 8 + len(NAMES) - 1
atlas = Image.new('RGB', (TOP * cols, base.height))
atlas.paste(base.crop((0, 0, TOP * 8, base.height)), (0, 0))
for i, (top, front, ground) in enumerate(faces):
    c = STONE_COL if i == 0 else 7 + i
    atlas.paste(top, (c * TOP, 0))
    atlas.paste(front, (c * TOP, TOP))
    atlas.paste(ground, (c * TOP, TOP + FRONT))
atlas.save(OUT + 'blocks-atlas.png', optimize=True)
print(OUT + 'blocks-atlas.png', atlas.size, '+ 8 ícones')
