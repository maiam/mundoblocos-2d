"""Fauna de fazenda do Orvalis em voxel (ADR 0124): texturas dos 4 animais, modelos em caixas.

Entradas : assets-src/orvalis-voxel/mobs/{porco,vaca,ovelha,galinha}_uv_64x64.png  (pacote Mobs64px do Drive: atlas UV de 64 × 64 por animal)
           assets-src/orvalis-voxel/mobs/fazenda-uv.json                          (as 4 fichas do `mobs64px-uv.json`: caixas, pivôs e UV; frente = −Z, 1 unidade = 1/16 de bloco)
Saídas   : src/assets/orvalis-fazenda-{porco,vaca,ovelha,galinha}.webp            (WebP sem perdas, 64 × 64)
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
    im = Image.open(f'{MOBS}{nome}_uv_64x64.png').convert('RGBA')
    assert im.size == (64, 64), (nome, im.size)
    im.save(f'{OUT}orvalis-fazenda-{nome}.webp', 'WEBP', lossless=True, method=6)

ficha = json.load(open(MOBS + 'fazenda-uv.json'))
for mob in ficha['mobs'].values():
    mob.pop('reference', None)
    mob.pop('atlas', None)
with open('src/render/art/fazenda-modelos.json', 'w') as f:
    json.dump(ficha, f, ensure_ascii=False, separators=(',', ':'))

print('ok')
