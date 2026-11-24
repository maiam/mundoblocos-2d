"""Arte do Orvalis em voxel (ADR 0105): texturas de 32 px por face, ícones de item e a água, a partir dos Materiais V2 (`assets-src/materiais/`, 128 × 128).

Entradas : assets-src/materiais/<material>/top.png e front.png (128 × 128, seamless).
Saídas   : assets-src/orvalis-voxel/texturas32/orvalis/<tile>.png   32 × 32 (os nomes são os de `src/titan/tiles.json` com o prefixo `orvalis/`; o atlas é montado por make-titan-atlas32.py)
           assets-src/orvalis-voxel/icones32/<bloco>.png            32 × 32, bloco em vista 3/4 (lidos por make-titan-arte32.py: itens 42–51)
           src/assets/orvalis-agua-32px.webp                        128 × 32 (4 células: topo quadro 1, topo quadro 2, lateral, lateral; o mesmo formato do Lago Escuro do Titã)
As folhas são PROVISÓRIAS (sorteio determinístico de 3 verdes/rosas): ainda não há arte de folhas nos Materiais V2. Repetível. Uso: python3 -I scripts/make-orvalis-voxel-arte.py
"""
import os
import random

from PIL import Image

MAT = 'assets-src/materiais/'
TEX = 'assets-src/orvalis-voxel/texturas32/orvalis/'
ICO = 'assets-src/orvalis-voxel/icones32/'
WATER_OUT = 'src/assets/orvalis-agua-32px.webp'


def load(path: str) -> Image.Image:
    return Image.open(MAT + path + '.png').convert('RGBA')


def small(im: Image.Image) -> Image.Image:
    return im.resize((32, 32), Image.BOX)


def leaves(dark: tuple, mid: tuple, light: tuple, seed: int) -> Image.Image:
    """Folhagem provisória: manchas de três tons e alguns furos escuros (como as folhas do estilo rápido)."""
    rng = random.Random(seed)
    im = Image.new('RGBA', (32, 32))
    px = im.load()
    for y in range(32):
        for x in range(32):
            r = rng.random()
            px[x, y] = (*(dark if r < 0.28 else light if r > 0.8 else mid), 255)
    for _ in range(26):  # furos: um pixel mais escuro, dá relevo de folha
        px[rng.randrange(32), rng.randrange(32)] = (*tuple(int(c * 0.6) for c in dark), 255)
    return im


def shade(im: Image.Image, k: float) -> Image.Image:
    out = im.copy()
    px = out.load()
    for y in range(out.height):
        for x in range(out.width):
            r, g, b, a = px[x, y]
            px[x, y] = (int(r * k), int(g * k), int(b * k), a)
    return out


def cube_icon(top: Image.Image, side: Image.Image) -> Image.Image:
    """Bloco em vista 3/4 de 32 × 32: tampa achatada em cima e a frente (um pouco mais escura) embaixo."""
    ic = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
    ic.alpha_composite(top.resize((26, 10), Image.BOX), (3, 5))
    ic.alpha_composite(shade(side, 0.82).resize((26, 16), Image.BOX), (3, 15))
    return ic


def main() -> None:
    os.makedirs(TEX, exist_ok=True)
    os.makedirs(ICO, exist_ok=True)
    grass_top, dirt = small(load('grama/top')), small(load('grama/front'))
    side = dirt.copy()  # lateral da grama: a terra com a franja verde do topo (6 px de baixo da textura de grama, a mais escura)
    for y in range(6):
        for x in range(32):
            g = grass_top.getpixel((x, 31 - y))
            if y < 4 or (x * 7 + y * 13) % 5 < 2:
                side.putpixel((x, y), g)
    tiles = {
        'grama-topo': grass_top, 'grama-lateral': side, 'terra': dirt,
        'pedra-topo': small(load('pedra/top')), 'pedra-lateral': small(load('pedra/front')), 'areia': small(load('areia/top')),
        'tora-carvalho-topo': small(load('tora-de-carvalho/top')), 'tora-carvalho-lateral': small(load('tora-de-carvalho/front')),
        'tora-cerejeira-topo': small(load('tora-de-cerejeira/top')), 'tora-cerejeira-lateral': small(load('tora-de-cerejeira/front')),
        'tora-betula-topo': small(load('tora-de-betula/top')), 'tora-betula-lateral': small(load('tora-de-betula/front')),
        'folhas-carvalho': leaves((38, 98, 30), (58, 136, 40), (98, 178, 62), 11),
        'folhas-cerejeira': leaves((214, 120, 156), (240, 166, 192), (255, 208, 224), 12),
        'folhas-betula': leaves((110, 138, 34), (152, 186, 60), (200, 216, 96), 13),
    }
    for name, im in tiles.items():
        assert im.size == (32, 32), name
        im.save(f'{TEX}{name}.png')
    icons = {  # nome do ícone -> (topo, lateral); a ordem dos itens 42–51 está em make-titan-arte32.py
        'terra_com_grama': ('grama-topo', 'grama-lateral'), 'terra': ('terra', 'terra'), 'pedra': ('pedra-topo', 'pedra-lateral'), 'areia_da_praia': ('areia', 'areia'),
        'tora_de_carvalho': ('tora-carvalho-topo', 'tora-carvalho-lateral'), 'folhas_de_carvalho': ('folhas-carvalho', 'folhas-carvalho'),
        'tora_de_cerejeira': ('tora-cerejeira-topo', 'tora-cerejeira-lateral'), 'folhas_de_cerejeira': ('folhas-cerejeira', 'folhas-cerejeira'),
        'tora_de_betula': ('tora-betula-topo', 'tora-betula-lateral'), 'folhas_de_betula': ('folhas-betula', 'folhas-betula'),
    }
    for name, (t, s) in icons.items():
        cube_icon(tiles[t], tiles[s]).save(f'{ICO}{name}.png')
    w1 = small(load('agua/top'))
    w2 = Image.new('RGBA', (32, 32))  # 2º quadro: a mesma água deslocada (a textura é seamless): a ondulação de 2 quadros do motor
    for y in range(32):
        for x in range(32):
            w2.putpixel(((x + 11) % 32, (y + 7) % 32), w1.getpixel((x, y)))
    lat = shade(w1, 0.9)
    sheet = Image.new('RGBA', (128, 32))
    for i, c in enumerate((w1, w2, lat, lat)):
        sheet.paste(c, (i * 32, 0))
    sheet.save(WATER_OUT, 'WEBP', lossless=True, method=6)
    print('tiles', len(tiles), 'ícones', len(icons), WATER_OUT)


if __name__ == '__main__':
    main()
