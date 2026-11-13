"""Monta o atlas de paredes de um material (W3, ADR 0027) a partir de `assets-src/paredes/<material>/`:
16 tampas (cap_00…cap_15, 128 × 128) em grade 4 × 4 e, abaixo, 4 frentes (front_mid, front_end_left, front_end_right, front_post,
128 × 154) em uma fileira. Layout = `src/render/wallAtlas.ts` (mesma ordem; atlas de 512 × 666). WebP sem perdas.

Uso: python3 scripts/build-wall-atlas.py tabuas   → src/assets/walls-tabuas.webp
"""
import os
import sys

from PIL import Image

CAP, FW, FH = 128, 128, 154
FRONTS = ['front_mid', 'front_end_left', 'front_end_right', 'front_post']
material = sys.argv[1]
src = os.path.join('assets-src', 'paredes', material)
atlas = Image.new('RGBA', (4 * CAP, 4 * CAP + FH), (0, 0, 0, 0))
for m in range(16):
    t = Image.open(os.path.join(src, f'cap_{m:02d}.png')).convert('RGBA')
    assert t.size == (CAP, CAP), (m, t.size)
    atlas.paste(t, ((m % 4) * CAP, (m // 4) * CAP))
for i, name in enumerate(FRONTS):
    t = Image.open(os.path.join(src, f'{name}.png')).convert('RGBA')
    assert t.size == (FW, FH), (name, t.size)
    atlas.paste(t, (i * FW, 4 * CAP))
out = os.path.join('src', 'assets', f'walls-{material}.webp')
atlas.save(out, 'WEBP', lossless=True, method=6)
print(f'{out}: {atlas.size}, {os.path.getsize(out) // 1024} kB')
