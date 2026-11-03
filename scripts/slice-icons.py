"""Recorta ícones de uma prancha em grade com fundo transparente (um ícone por célula).

Uso: python3 scripts/slice-icons.py PRANCHA COLS ROWS PREFIXO nome1,nome2,...
  ex.: python3 scripts/slice-icons.py assets-src/celestial-blocks-iso.png 6 3 icon-celestial \\
       cloud-solid,cloud-ethereal,...
Saída: src/assets/<PREFIXO>-<nome>.png (64 px no lado maior). Rode optimize-assets.py depois.
"""
import sys

import numpy as np
from PIL import Image

src, cols, rows, prefix, names = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4], sys.argv[5].split(',')
img = Image.open(src).convert('RGBA')
a = np.asarray(img).copy()
a[..., 3][a[..., 3] < 40] = 0  # remove resíduos semitransparentes do fundo
img = Image.fromarray(a, 'RGBA')
W, H = img.size
for i, name in enumerate(names):
    r, c = divmod(i, cols)
    cell = img.crop((round(c * W / cols), round(r * H / rows), round((c + 1) * W / cols), round((r + 1) * H / rows)))
    al = np.asarray(cell)[..., 3]
    ys, xs = np.nonzero(al > 0)
    # Maior componente: ignora respingos soltos do fundo perto das bordas.
    crop = cell.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    k = 64 / max(crop.size)
    crop = crop.convert('RGBa').resize((max(1, round(crop.width * k)), max(1, round(crop.height * k))), Image.LANCZOS).convert('RGBA')
    crop.save(f'src/assets/{prefix}-{name}.png', optimize=True)
print(f'{len(names)} ícones em src/assets/{prefix}-*.png')
