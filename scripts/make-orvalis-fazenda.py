"""Fauna de fazenda do Orvalis em voxel (ADR 0124): texturas dos 4 animais, modelos em caixas.

Entradas : assets-src/orvalis-voxel/mobs/{porco,vaca,ovelha,galinha}_uv_{128x128,64x64}.png  (Drive: atlas UV por animal; 128 × 128 preferido, 64 × 64 de reserva)
           assets-src/orvalis-voxel/mobs/fazenda-uv.json                          (as 4 fichas do `mobs64px-uv.json`: caixas, pivôs e UV; frente = −Z, 1 unidade = 1/16 de bloco)
Saídas   : src/assets/orvalis-fazenda-{porco,vaca,ovelha,galinha}.webp            (WebP sem perdas, 128 × 128 ou 64 × 64)
           src/render/art/fazenda-modelos.json                                    (as fichas, sem o texto de referência)
Repetível. Uso: python3 -I scripts/make-orvalis-fazenda.py (Pillow). Depois: `make-titan-arte32.py` e `make-titan-item-masks.py`.
"""
import json
import os

from PIL import Image

MOBS = 'assets-src/orvalis-voxel/mobs/'
ART16 = 'assets-src/titan/arte16/'
OUT = 'src/assets/'

for nome in ('porco', 'vaca', 'ovelha', 'galinha'):
    # ADR 0143 (adendo): criatura pode passar de 32 px. Atlas de 128 × 128 do Drive quando existe, senão o de 64 × 64; os UVs da ficha são
    # frações do `textureSize` (64 × 64), então a troca não muda o modelo.
    f128 = f'{MOBS}{nome}_uv_128x128.png'
    im = Image.open(f128 if os.path.exists(f128) else f'{MOBS}{nome}_uv_64x64.png').convert('RGBA')
    assert im.size in ((64, 64), (128, 128)), (nome, im.size)
    im.save(f'{OUT}orvalis-fazenda-{nome}.webp', 'WEBP', lossless=True, method=6)

ficha = json.load(open(MOBS + 'fazenda-uv.json'))
for mob in ficha['mobs'].values():
    mob.pop('reference', None)
    mob.pop('atlas', None)
with open('src/render/art/fazenda-modelos.json', 'w') as f:
    json.dump(ficha, f, ensure_ascii=False, separators=(',', ':'))

print('ok')
