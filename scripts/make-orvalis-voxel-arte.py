"""Arte do Orvalis em voxel (ADR 0105): texturas de 32 px por face, ícones de item e a água, a partir dos Materiais V2 (`assets-src/materiais/`, 128 × 128).

Entradas : assets-src/materiais/<material>/top.png e front.png (128 × 128, seamless).
Saídas   : assets-src/orvalis-voxel/texturas32/orvalis/<tile>.png   32 × 32 (os nomes são os de `src/titan/tiles.json` com o prefixo `orvalis/`; o atlas é montado por make-titan-atlas32.py)
           assets-src/orvalis-voxel/icones32/<bloco>.png            32 × 32, bloco em vista isométrica (2:1; luz 100/80/60 %) (lidos por make-titan-arte32.py: itens 42–51)
           src/assets/orvalis-agua-16px.webp / -8px.webp             64 × 16 e 32 × 8 (4 células: topo quadro 1, topo quadro 2, lateral, lateral; o mesmo formato do Lago Escuro do Titã)
**Os PNGs de `texturas32/` e `agua/` são a fonte editável (32 px ou maiores, quadrados — 64, 512, 2048…: a redução para 32 px é feita aqui e no atlas, sem alterar o arquivo):** o script só os cria quando faltam (ou com `--force`, que volta ao que sai dos Materiais V2) e **nunca sobrescreve** uma textura que você editou; ícones e água do jogo são sempre refeitos a partir deles.
As folhas são PROVISÓRIAS (sorteio determinístico de 3 verdes/rosas): ainda não há arte de folhas nos Materiais V2. Repetível. Uso: python3 scripts/make-orvalis-voxel-arte.py [--force]  (precisa do Pillow: `pip3 install pillow`)
"""
import os
import random
import sys

from PIL import Image

MAT = 'assets-src/materiais/'
TEX = 'assets-src/orvalis-voxel/texturas32/orvalis/'
ICO = 'assets-src/orvalis-voxel/icones32/'
WATER_SRC = 'assets-src/orvalis-voxel/agua/agua_32px.png'  # 1º quadro do topo da água (32 × 32, seamless); editável
WATER_OUT = {16: 'src/assets/orvalis-agua-16px.webp', 8: 'src/assets/orvalis-agua-8px.webp'}  # 16 px (padrão) e 8 px (isométrica), ADR 0106


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


def to_tile(im: Image.Image, name: str) -> Image.Image:
    """Reduz a textura em disco para 32 × 32 se ela vier maior (o arquivo não muda; o atlas faz a mesma redução)."""
    w, h = im.size
    if w == 32 and h == 32:
        return im
    assert w > 32 and w == h, (name, im.size)
    return im.resize((32, 32), Image.BOX if w % 32 == 0 else Image.LANCZOS)


def shade(im: Image.Image, k: float) -> Image.Image:
    out = im.copy()
    px = out.load()
    for y in range(out.height):
        for x in range(out.width):
            r, g, b, a = px[x, y]
            px[x, y] = (int(r * k), int(g * k), int(b * k), a)
    return out


def _face(tile: Image.Image, origin: tuple, u_vec: tuple, v_vec: tuple, size: int) -> Image.Image:
    """Projeta o tile (quadrado) no paralelogramo `origin + u·u_vec + v·v_vec` de uma tela `size × size` (fora do paralelogramo fica transparente)."""
    (ux, uy), (vx, vy) = u_vec, v_vec
    det = ux * vy - vx * uy
    # inverso de [[ux, vx], [uy, vy]]: (x, y) − origem → (u, v); o PIL pede o mapa saída → entrada, em pixels do tile
    a, b = vy / det, -vx / det
    c, d = -uy / det, ux / det
    w, h = tile.size
    ox, oy = origin
    coef = (a * w, b * w, -(a * ox + b * oy) * w, c * h, d * h, -(c * ox + d * oy) * h)
    return tile.transform((size, size), Image.AFFINE, coef, Image.NEAREST)


def cube_icon(top: Image.Image, side: Image.Image) -> Image.Image:
    """Bloco **isométrico** (2:1) de 32 × 32: losango do topo e duas laterais, com a luz fixa dos ícones de bloco do projeto (100 % topo, 80 % esquerda, 60 % direita). Desenhado a 4× e reduzido por média."""
    k = 4
    n = 32 * k
    t = (16 * k, 2 * k); r = (30 * k, 9 * k); b = (16 * k, 16 * k); l = (2 * k, 9 * k); drop = (0, 14 * k)
    big = Image.new('RGBA', (n, n), (0, 0, 0, 0))
    src_top, src_side = top.resize((n, n), Image.NEAREST), side.resize((n, n), Image.NEAREST)
    big.alpha_composite(_face(shade(src_side, 0.80), l, (b[0] - l[0], b[1] - l[1]), drop, n))  # lateral esquerda
    big.alpha_composite(_face(shade(src_side, 0.60), b, (r[0] - b[0], r[1] - b[1]), drop, n))  # lateral direita
    big.alpha_composite(_face(src_top, t, (r[0] - t[0], r[1] - t[1]), (l[0] - t[0], l[1] - t[1]), n))  # topo
    return big.resize((32, 32), Image.BOX)


def main() -> None:
    force = '--force' in sys.argv
    os.makedirs(os.path.dirname(WATER_SRC), exist_ok=True)
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
    made = 0
    for name, im in tiles.items():
        assert im.size == (32, 32), name
        if force or not os.path.exists(f'{TEX}{name}.png'):  # nunca sobrescreve a textura editada
            im.save(f'{TEX}{name}.png')
            made += 1
    disk = {name: to_tile(Image.open(f'{TEX}{name}.png').convert('RGBA'), name) for name in tiles}  # daqui para a frente vale o que está em disco (editado ou não)
    icons = {  # nome do ícone -> (topo, lateral); a ordem dos itens 42–51 está em make-titan-arte32.py
        'terra_com_grama': ('grama-topo', 'grama-lateral'), 'terra': ('terra', 'terra'), 'pedra': ('pedra-topo', 'pedra-lateral'), 'areia_da_praia': ('areia', 'areia'),
        'tora_de_carvalho': ('tora-carvalho-topo', 'tora-carvalho-lateral'), 'folhas_de_carvalho': ('folhas-carvalho', 'folhas-carvalho'),
        'tora_de_cerejeira': ('tora-cerejeira-topo', 'tora-cerejeira-lateral'), 'folhas_de_cerejeira': ('folhas-cerejeira', 'folhas-cerejeira'),
        'tora_de_betula': ('tora-betula-topo', 'tora-betula-lateral'), 'folhas_de_betula': ('folhas-betula', 'folhas-betula'),
    }
    for name, (t, s) in icons.items():
        cube_icon(disk[t], disk[s]).save(f'{ICO}{name}.png')
    if force or not os.path.exists(WATER_SRC):
        small(load('agua/top')).save(WATER_SRC)
    w1 = to_tile(Image.open(WATER_SRC).convert('RGBA'), WATER_SRC)
    w2 = Image.new('RGBA', (32, 32))  # 2º quadro: a mesma água deslocada (a textura é seamless): a ondulação de 2 quadros do motor
    for y in range(32):
        for x in range(32):
            w2.putpixel(((x + 11) % 32, (y + 7) % 32), w1.getpixel((x, y)))
    lat = shade(w1, 0.9)
    for px, out in WATER_OUT.items():  # 4 células por tamanho (topo 1, topo 2, lateral, lateral), reduzidas por média
        sheet = Image.new('RGBA', (4 * px, px))
        for i, c in enumerate((w1, w2, lat, lat)):
            sheet.paste(c.resize((px, px), Image.BOX), (i * px, 0))
        sheet.save(out, 'WEBP', lossless=True, method=6)
    water = ', '.join(WATER_OUT.values())
    print(f'tiles: {made} criados de {len(tiles)} (os outros já existiam e foram mantidos) · ícones {len(icons)} · {water}')


if __name__ == '__main__':
    main()
