"""Fauna de fazenda do Orvalis em voxel (ADR 0124): texturas dos 4 animais, modelos em caixas e ícones provisórios do espólio.

Entradas : assets-src/orvalis-voxel/mobs/{porco,vaca,ovelha,galinha}_uv_64x64.png  (pacote Mobs64px do Drive: atlas UV de 64 × 64 por animal)
           assets-src/orvalis-voxel/mobs/fazenda-uv.json                          (as 4 fichas do `mobs64px-uv.json`: caixas, pivôs e UV; frente = −Z, 1 unidade = 1/16 de bloco)
Saídas   : src/assets/orvalis-fazenda-{porco,vaca,ovelha,galinha}.webp            (WebP sem perdas, 64 × 64)
           src/render/art/fazenda-modelos.json                                    (as fichas, sem o texto de referência)
           assets-src/titan/arte16/orvalis_{pena,porco_cru,porco_assado,bovina_crua,bife,carneiro_cru,carneiro_assado,frango_cru,frango_assado}_16x16.png
                                                                                  (ícones PROVISÓRIOS de 16 × 16, desenhados aqui; trocar quando a arte do Drive chegar)
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

# ---- ícones provisórios (16 × 16) ----
def sprite(rows: list[str], pal: dict[str, tuple[int, int, int]]) -> Image.Image:
    im = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch in pal:
                im.putpixel((x, y), pal[ch] + (255,))
    return im

# Corte de carne em oval com um osso: cru (rosado) e assado (marrom); a cor do tipo muda a margem.
CARNE = [
    '................',
    '................',
    '....oooooo......',
    '..ooxxxxxxoo....',
    '.oxxxxxxxxxxo...',
    '.oxxllllxxxxo...',
    '.oxxlllxxxxxo...',
    '.oxxxxxxxxxoo...',
    '..oxxxxxxxoo.bb.',
    '...ooxxxxooobbb.',
    '.....oooooo.bbb.',
    '..........bb....',
    '................',
    '................',
    '................',
    '................',
]
TIPOS = {
    'porco_cru': dict(o=(150, 70, 80), x=(232, 130, 140), l=(250, 190, 195), b=(240, 235, 220)),
    'porco_assado': dict(o=(90, 50, 30), x=(170, 100, 60), l=(205, 140, 90), b=(240, 235, 220)),
    'bovina_crua': dict(o=(120, 30, 40), x=(190, 60, 70), l=(225, 120, 120), b=(240, 235, 220)),
    'bife': dict(o=(70, 38, 24), x=(130, 78, 48), l=(170, 110, 70), b=(240, 235, 220)),
    'carneiro_cru': dict(o=(130, 50, 60), x=(205, 90, 100), l=(235, 150, 155), b=(240, 235, 220)),
    'carneiro_assado': dict(o=(80, 44, 28), x=(150, 88, 54), l=(190, 125, 80), b=(240, 235, 220)),
}
for nome, pal in TIPOS.items():
    sprite(CARNE, pal).save(f'{ART16}orvalis_{nome}_16x16.png')

COXA = [  # frango: coxa com osso
    '................',
    '................',
    '......oooo......',
    '....ooxxxxoo....',
    '...oxxxxxxxxo...',
    '...oxxllxxxxo...',
    '...oxxlxxxxxo...',
    '....oxxxxxxo....',
    '.....ooxxxoo....',
    '.......ooxo.....',
    '........bbb.....',
    '.......bbb......',
    '......bbbb......',
    '.....bb.bb......',
    '................',
    '................',
]
sprite(COXA, dict(o=(190, 130, 90), x=(245, 200, 160), l=(255, 230, 205), b=(240, 235, 220))).save(f'{ART16}orvalis_frango_cru_16x16.png')
sprite(COXA, dict(o=(120, 70, 30), x=(200, 130, 55), l=(235, 175, 90), b=(240, 235, 220))).save(f'{ART16}orvalis_frango_assado_16x16.png')

PENA = [
    '................',
    '..............oo',
    '............ooww',
    '..........oowwo.',
    '........ooawwwo.',
    '.......oawwwwo..',
    '......oawwwwo...',
    '.....oawwwwo....',
    '....oawwwwo.....',
    '...oawwwoo......',
    '..oawwoo........',
    '.oaoooo.........',
    'oao.............',
    'oo..............',
    '................',
    '................',
]
sprite(PENA, dict(o=(120, 120, 128), w=(245, 245, 250), a=(200, 200, 210))).save(f'{ART16}orvalis_pena_16x16.png')
print('ok')
