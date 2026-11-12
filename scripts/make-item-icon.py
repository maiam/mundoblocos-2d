"""Gera o ícone de um item (hotbar e itens caídos) a partir de uma imagem transparente: recorta pela borda do desenho,
encaixa num quadrado transparente e reduz para `--size` px (WebP sem perdas, como os demais `icon-*`).

Uso: python3 scripts/make-item-icon.py assets-src/moeda-cobre.png src/assets/icon-copper-coin.webp [--size 64]
"""
import argparse

import numpy as np
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument('src')
ap.add_argument('out')
ap.add_argument('--size', type=int, default=64)
args = ap.parse_args()

im = Image.open(args.src).convert('RGBA')
box = Image.fromarray((np.asarray(im)[..., 3] > 24).astype(np.uint8) * 255).getbbox()
im = im.crop(box)
side = max(im.size)
sq = Image.new('RGBA', (side, side), (0, 0, 0, 0))
sq.paste(im, ((side - im.width) // 2, (side - im.height) // 2))
sq = sq.resize((args.size, args.size), Image.LANCZOS)
sq.save(args.out, 'WEBP', lossless=True)
print(f'{args.out}: {args.size}x{args.size} (recorte {box})')
