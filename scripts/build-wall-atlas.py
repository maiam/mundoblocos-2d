"""Monta o atlas de paredes de um material (W3, ADR 0027) a partir de `assets-src/paredes/<material>/`:
16 tampas (cap_00…cap_15, 128 × 128) em grade 4 × 4 e, abaixo, 4 frentes (front_mid, front_end_left, front_end_right, front_post,
128 × 154) em uma fileira e, abaixo, 3 quadros da porta (door_closed, door_half, door_open, 128 × 154). Layout = `src/render/wallAtlas.ts`
(mesma ordem; atlas de 512 × 820). WebP sem perdas.

Se os arquivos da porta não existirem em `assets-src/paredes/<material>/`, gera um quadro PROVISÓRIO a partir de `front_mid` (duas folhas
com uma emenda no meio; vão de 32 px na intermediária e de 64 px na aberta) — só para testar; a arte real substitui.

Uso: python3 scripts/build-wall-atlas.py tabuas   → src/assets/walls-tabuas.webp
"""
import os
import sys

from PIL import Image

CAP, FW, FH = 128, 128, 154
FRONTS = ['front_mid', 'front_end_left', 'front_end_right', 'front_post']
DOORS = ['door_closed', 'door_half', 'door_open']
JAMB = 16  # batente = franja única
material = sys.argv[1]
src = os.path.join('assets-src', 'paredes', material)
atlas = Image.new('RGBA', (4 * CAP, 4 * CAP + 2 * FH), (0, 0, 0, 0))
for m in range(16):
    t = Image.open(os.path.join(src, f'cap_{m:02d}.png')).convert('RGBA')
    assert t.size == (CAP, CAP), (m, t.size)
    atlas.paste(t, ((m % 4) * CAP, (m // 4) * CAP))
for i, name in enumerate(FRONTS):
    t = Image.open(os.path.join(src, f'{name}.png')).convert('RGBA')
    assert t.size == (FW, FH), (name, t.size)
    atlas.paste(t, (i * FW, 4 * CAP))


def placeholder_door(name):
    """Quadro provisório da porta a partir de front_mid: batentes de 16 px; vão transparente de 0 / 32 / 64 px no centro."""
    base = Image.open(os.path.join(src, 'front_mid.png')).convert('RGBA')
    gap = {'door_closed': 0, 'door_half': 32, 'door_open': 64}[name]
    out = base.copy()
    px = out.load()
    if gap:
        x0, x1 = CAP // 2 - gap // 2, CAP // 2 + gap // 2
        for x in range(x0, x1):
            for y in range(JAMB, FH):  # abaixo da verga; sem soleira
                px[x, y] = (0, 0, 0, 0)
    else:
        for y in range(JAMB, FH):  # emenda das duas folhas
            px[CAP // 2, y] = (60, 40, 28, 255)
    return out


placeholders = []
for i, name in enumerate(DOORS):
    f = os.path.join(src, f'{name}.png')
    if os.path.exists(f):
        t = Image.open(f).convert('RGBA')
        assert t.size == (FW, FH), (name, t.size)
    elif material == 'tabuas':  # só as Tábuas têm porta por enquanto
        t = placeholder_door(name)
        placeholders.append(name)
    else:
        t = Image.new('RGBA', (FW, FH), (0, 0, 0, 0))
    atlas.paste(t, (i * FW, 4 * CAP + FH))
if placeholders:
    print('porta PROVISÓRIA (sem arte em assets-src):', ', '.join(placeholders))
out = os.path.join('src', 'assets', f'walls-{material}.webp')
atlas.save(out, 'WEBP', lossless=True, method=6)
print(f'{out}: {atlas.size}, {os.path.getsize(out) // 1024} kB')
