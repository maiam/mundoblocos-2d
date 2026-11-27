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
MURETA = 'assets-src/orvalis-voxel/texturas32/mureta-pedra/'  # topo e face da Mureta de Pedra (ADR 0110)
DEGRAU = 'assets-src/orvalis-voxel/texturas32/degrau-pedra/'  # topo, frente, perfil do Degrau de Pedra (ADR 0109)
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
    """Leva a textura em disco a 32 × 32 para o ícone: reduz se vier maior (média) e amplia sem suavização se vier menor, em múltiplo inteiro (16 → 32). O arquivo não muda; o atlas faz a redução dele."""
    w, h = im.size
    if w == 32 and h == 32:
        return im
    if h * 2 == w:  # lateral de laje (largura × metade): vai a 32 × 16
        return im if w == 32 else im.resize((32, 16), Image.NEAREST if w < 32 else Image.BOX)
    assert w == h, (name, im.size)
    if w < 32:
        assert 32 % w == 0, (name, im.size)
        return im.resize((32, 32), Image.NEAREST)
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


def cube_icon(top: Image.Image, side: Image.Image, left: Image.Image | None = None, half: bool = False) -> Image.Image:
    """Bloco **isométrico** (2:1) de 32 × 32: losango do topo e duas laterais, com a luz fixa dos ícones de bloco do projeto (100 % topo, 80 % esquerda, 60 % direita). Desenhado a 4× e reduzido por média."""
    k = 4
    n = 32 * k
    dy = 7 * k if half else 0  # laje: meia altura, assentada na base do ícone
    t = (16 * k, 2 * k + dy); r = (30 * k, 9 * k + dy); b = (16 * k, 16 * k + dy); l = (2 * k, 9 * k + dy); drop = (0, (7 if half else 14) * k)
    big = Image.new('RGBA', (n, n), (0, 0, 0, 0))
    src_top, src_side = top.resize((n, n), Image.NEAREST), side.resize((n, n * side.height // side.width), Image.NEAREST)  # a lateral da laje tem meia altura
    src_left = left.resize((n, n * left.height // left.width), Image.NEAREST) if left is not None else src_side  # a frente (se houver) fica na lateral esquerda
    big.alpha_composite(_face(shade(src_left, 0.80), l, (b[0] - l[0], b[1] - l[1]), drop, n))  # lateral esquerda
    big.alpha_composite(_face(shade(src_side, 0.60), b, (r[0] - b[0], r[1] - b[1]), drop, n))  # lateral direita
    big.alpha_composite(_face(src_top, t, (r[0] - t[0], r[1] - t[1]), (l[0] - t[0], l[1] - t[1]), n))  # topo
    return big.resize((32, 32), Image.BOX)


def stair_icon(top: Image.Image, front: Image.Image, side: Image.Image) -> Image.Image:
    """Degrau **isométrico** (2:1) de 32 × 32 (mesma luz e mesma moldura do `cube_icon`): patamar de baixo na célula inteira e o de cima só na metade de trás; frente na lateral esquerda, perfil na direita. `front` e `side` são os PNGs do pacote (a pedra do espelho na metade de baixo; o perfil em L)."""
    k = 4
    n = 32 * k
    big = Image.new('RGBA', (n, n), (0, 0, 0, 0))
    P = lambda x, y: (x * k, y * k)  # noqa: E731
    s8 = lambda im, w, h: im.resize((w, h), Image.NEAREST)  # noqa: E731
    fw, fh = front.size
    front_lo = s8(front.crop((0, fh // 2, fw, fh)), n, n // 2)  # espelho: a metade de baixo do PNG
    sw, sh = side.size
    side_lo = s8(side.crop((0, sh // 2, sw, sh)), n, n // 2)  # perfil: patamar de baixo
    side_hi = s8(side.crop((sw // 2, 0, sw, sh // 2)), n // 2, n // 2)  # perfil: patamar de cima, só o quarto de trás (u de 8 a 16)
    tw, th = top.size
    top_front = s8(top.crop((0, th // 2, tw, th)), n, n // 2)  # a metade da frente do piso (a de trás fica sob o patamar de cima)
    top_back = s8(top.crop((0, 0, tw, th // 2)), n, n // 2)  # o piso do patamar de cima
    l, b, r, t = P(2, 16), P(16, 23), P(30, 16), P(16, 9)  # losango do patamar de baixo (topo a meia altura)
    m1, m2 = P(9, 12.5), P(23, 19.5)  # linha do espelho (meio do piso de baixo)
    h7 = (0, 7 * k)
    sub = lambda a, c: (a[0] - c[0], a[1] - c[1])  # noqa: E731
    big.alpha_composite(_face(shade(front_lo, 0.80), l, sub(b, l), h7, n))  # espelho de baixo (esquerda)
    big.alpha_composite(_face(shade(side_lo, 0.60), b, sub(r, b), h7, n))  # lateral de baixo (direita)
    big.alpha_composite(_face(top_front, m1, sub(m2, m1), sub(l, m1), n))  # piso da frente
    t0, r0 = P(16, 2), P(30, 9)
    mm1, mm2 = P(9, 5.5), P(23, 12.5)
    big.alpha_composite(_face(shade(front_lo, 0.80), mm1, sub(mm2, mm1), h7, n))  # espelho de cima
    big.alpha_composite(_face(shade(side_hi, 0.60), mm2, sub(r0, mm2), h7, n))  # lateral de cima (direita)
    big.alpha_composite(_face(top_back, t0, sub(r0, t0), sub(mm1, t0), n))  # piso de cima
    return big.resize((32, 32), Image.BOX)


def wall_icon(top: Image.Image, face: Image.Image) -> Image.Image:
    """Mureta **isométrica** (2:1) de 32 × 32: um trecho reto ao longo de X (8/16 de espessura, 12/16 de altura), com a luz fixa dos ícones (100 % topo, 80 % frente, 60 % ponta)."""
    k = 4
    n = 32 * k
    big = Image.new('RGBA', (n, n), (0, 0, 0, 0))
    P = lambda x, y, z: (k * (16 + 14 * x - 14 * z), k * (2 + 7 * x + 7 * z + 14 * (1 - y)))  # noqa: E731  x leste, z frente, y altura (cubo de 1)
    sub = lambda a, c: (a[0] - c[0], a[1] - c[1])  # noqa: E731
    s = lambda im, w, h: im.resize((w, h), Image.NEAREST)  # noqa: E731
    tw, th = top.size
    top_s = s(top.crop((0, th // 4, tw, th * 3 // 4)), n, n // 2)  # as linhas 4–11 de 16: o trecho de 8 de largura
    fw, fh = face.size
    front = s(face.crop((0, fh // 4, fw, fh)), n, n * 3 // 4)  # linhas 4–15: 12/16 de altura
    end = s(face.crop((fw // 4, fh // 4, fw * 3 // 4, fh)), n // 2, n * 3 // 4)  # a ponta: 8 de largura por 12 de altura
    h = 0.75
    o = P(0, h, 0.75)
    big.alpha_composite(_face(shade(front, 0.80), o, sub(P(1, h, 0.75), o), sub(P(0, 0, 0.75), o), n))  # frente (+Z)
    o = P(1, h, 0.75)
    big.alpha_composite(_face(shade(end, 0.60), o, sub(P(1, h, 0.25), o), sub(P(1, 0, 0.75), o), n))  # ponta (+X)
    o = P(0, h, 0.25)
    big.alpha_composite(_face(top_s, o, sub(P(1, h, 0.25), o), sub(P(0, h, 0.75), o), n))  # topo
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
    disk = {f[:-4]: to_tile(Image.open(TEX + f).convert('RGBA'), f) for f in sorted(os.listdir(TEX)) if f.endswith('.png')}  # daqui para a frente vale o que está em disco (editado, do catálogo ou gerado): todo PNG da pasta
    icons = {  # nome do ícone -> (topo, lateral); a ordem dos itens 42–51 está em make-titan-arte32.py
        'terra_com_grama': ('grama-topo', 'grama-lateral'), 'terra': ('terra', 'terra'), 'pedra': ('pedra-topo', 'pedra-lateral'), 'areia_da_praia': ('areia', 'areia'),
        'tora_de_carvalho': ('tora-carvalho-topo', 'tora-carvalho-lateral'), 'folhas_de_carvalho': ('folhas-carvalho', 'folhas-carvalho'),
        'tora_de_cerejeira': ('tora-cerejeira-topo', 'tora-cerejeira-lateral'), 'folhas_de_cerejeira': ('folhas-cerejeira', 'folhas-cerejeira'),
        'tora_de_betula': ('tora-betula-topo', 'tora-betula-lateral'), 'folhas_de_betula': ('folhas-betula', 'folhas-betula'),
        'tabuas_de_carvalho': ('tabua-carvalho', 'tabua-carvalho'), 'tabuas_de_cerejeira': ('tabua-cerejeira', 'tabua-cerejeira'), 'tabuas_de_betula': ('tabua-betula', 'tabua-betula'),
        'mesa_de_carpintaria': ('mesa-topo', 'mesa-lateral', 'mesa-frente'),
        'pedra_lisa': ('pedra-lisa', 'pedra-lisa'), 'tijolo_de_pedra': ('tijolo-pedra', 'tijolo-pedra'), 'laje_de_pedra': ('laje-topo', 'laje-face'),
        'terra_arada_seca': ('terra-arada-seca-topo', 'terra-arada-seca-lateral'), 'terra_arada_umida': ('terra-arada-umida-topo', 'terra-arada-umida-lateral'), 'caminho_de_terra': ('caminho-topo', 'caminho-lateral'),
        'fornalha': ('fornalha-topo', 'fornalha-lateral', 'fornalha-frente-apagada'),  # item 83 (ADR 0120)
        'terra_infertil': ('terra-infertil', 'terra-infertil'), 'bloco_de_argila': ('bloco-argila', 'bloco-argila'), 'bloco_de_tijolos': ('bloco-tijolos', 'bloco-tijolos'),  # ADR 0111
    }
    for name, spec in icons.items():
        cube_icon(disk[spec[0]], disk[spec[1]], disk[spec[2]] if len(spec) > 2 else None, half=name == 'laje_de_pedra').save(f'{ICO}{name}.png')
    dg = {nome: Image.open(f'{DEGRAU}{nome}.png').convert('RGBA') for nome in ('topo', 'frente', 'perfil')}
    stair_icon(dg['topo'], dg['frente'], dg['perfil']).save(f'{ICO}degrau_de_pedra.png')  # item 60 (ADR 0109)
    mu = {nome: Image.open(f'{MURETA}{nome}.png').convert('RGBA') for nome in ('topo', 'face')}
    wall_icon(mu['topo'], mu['face']).save(f'{ICO}mureta_de_pedra.png')  # item 61 (ADR 0110)
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
