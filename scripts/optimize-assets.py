"""Converte os PNGs gerados em src/assets/ para WebP (o que o jogo importa) e remove os PNGs.

- Sprites e atlas: WebP com perdas q90 e alfa sem perdas (visualmente idêntico, ~70% menor).
- Ícones (icon-*.png): WebP sem perdas (pequenos e com contorno fino).
Rodar sempre depois de process-sprite.py / extract-blocks.py.

Uso: python3 scripts/optimize-assets.py   (requer Pillow com suporte a WebP)
"""
import os

from PIL import Image

DIR = 'src/assets'
before = after = 0
for f in sorted(os.listdir(DIR)):
    if not f.endswith('.png'):
        continue
    src = os.path.join(DIR, f)
    dst = src[:-4] + '.webp'
    im = Image.open(src)
    if f.startswith('icon-'):
        im.save(dst, 'WEBP', lossless=True, method=6)
    else:
        im.save(dst, 'WEBP', quality=90, alpha_quality=100, method=6)
    before += os.path.getsize(src)
    after += os.path.getsize(dst)
    os.remove(src)
    print(f'{f} -> {os.path.basename(dst)}')
if before:
    print(f'total: {before // 1024} KB -> {after // 1024} KB')
