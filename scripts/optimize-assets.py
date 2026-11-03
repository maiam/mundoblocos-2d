"""Converte os PNGs gerados em src/assets/ para WebP (o que o jogo importa) e remove os PNGs.

- Sprites e atlas: WebP com perdas q84 e alfa q85 (diferença média ~2/255, invisível no jogo; ~20% menor que
  q90 com alfa sem perdas — Fase 0 do plano, para o artefato caber no orçamento).
- Ícones (icon-*.png): WebP sem perdas (pequenos e com contorno fino).
Rodar sempre depois de process-sprite.py / extract-blocks.py / extract-dungeon.py.

Uso: python3 scripts/optimize-assets.py               (requer Pillow com suporte a WebP)
     python3 scripts/optimize-assets.py --recompress  regrava no nível atual os WebP de sprite ≥ 60 kB já existentes
"""
import io
import os
import sys

from PIL import Image

DIR = 'src/assets'
SPRITE = dict(quality=84, alpha_quality=85, method=6)

if '--recompress' in sys.argv:
    saved = 0
    for f in sorted(os.listdir(DIR)):
        path = os.path.join(DIR, f)
        if not f.endswith('.webp') or f.startswith('icon-') or os.path.getsize(path) < 60 * 1024:
            continue
        old = os.path.getsize(path)
        buf = io.BytesIO()
        Image.open(path).convert('RGBA').save(buf, 'WEBP', **SPRITE)
        if buf.tell() < old * 0.97:  # só regrava se ganhar de verdade
            with open(path, 'wb') as out:
                out.write(buf.getvalue())
            saved += old - buf.tell()
            print(f'{f}: {old // 1024} KB -> {buf.tell() // 1024} KB')
    print(f'economia: {saved // 1024} KB')
    sys.exit(0)

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
        im.save(dst, 'WEBP', **SPRITE)
    before += os.path.getsize(src)
    after += os.path.getsize(dst)
    os.remove(src)
    print(f'{f} -> {os.path.basename(dst)}')
if before:
    print(f'total: {before // 1024} KB -> {after // 1024} KB')
