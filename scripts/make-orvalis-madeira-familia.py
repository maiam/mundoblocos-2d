"""Família das madeiras do Orvalis em voxel (ADR 0139): lajes e degraus de carvalho, cerejeira e bétula, a partir do pacote do Drive (`catalogo/P1-02-vedacao-de-madeira/`, 16 × 16; e, desde o ADR 0143, a arte de 32 px do pacote Assets32px em `assets-src/orvalis-voxel/assets32/`, que passa na frente; sem ela, a de 16 px é ampliada por vizinho mais próximo).

Entradas : assets-src/orvalis-voxel/catalogo/P1-02-vedacao-de-madeira/orvalis_<madeira>_{laje_topo,laje_face,degrau_perfil}_16x16.png   (a fonte única; o script não os altera)
           laje_face = a lateral da laje: só a metade de baixo do PNG tem arte (vira 16 × 8); no degrau o mesmo PNG é o espelho (a metade de baixo)
Saídas   : assets-src/orvalis-voxel/texturas32/orvalis/laje-<madeira>-{topo,face}.png   16 × 16 e 16 × 8 (lidos por make-titan-atlas32.py; só criados se faltarem ou com --force)
           src/assets/titan-degrau-madeira.webp    288 × 32 (por madeira: topo | frente | perfil; carvalho, cerejeira, bétula; tiles de 32 px)
           src/assets/titan-cerca-madeira.webp     96 × 32 (tábuas de carvalho | cerejeira | bétula, de `texturas32/orvalis/tabua-*.png`; textura da Cerca e do Portão, ADR 0140; os modelos saem de `render/cercaModel.ts`)
           src/assets/titan-degrau-madeira.json    {carvalho, cerejeira, betula}: modelos no formato dos instanciados (as caixas de `STAIR_BASE`, UVs na tira de 9 tiles)
O desenho é o do Degrau de Pedra (`make-orvalis-degrau.py`, ADR 0109): perfil em L, espelho na metade de baixo; a arte vai como desenhada, sem girar nem espelhar além da lateral −X.
Uso: python3 scripts/make-orvalis-madeira-familia.py [--force]   (precisa do Pillow)
"""
import json
import os
import sys

from PIL import Image

PKG = 'assets-src/orvalis-voxel/catalogo/P1-02-vedacao-de-madeira/orvalis_%s_%s_16x16.png'
A32 = 'assets-src/orvalis-voxel/assets32/orvalis_%s_%s_32x32.png'
T = 32  # px de cada tile das tiras (ADR 0143)
TEX = 'assets-src/orvalis-voxel/texturas32/orvalis/'
OUT_FENCE = 'src/assets/titan-cerca-madeira.webp'
OUT_TEX, OUT_MODEL = 'src/assets/titan-degrau-madeira.webp', 'src/assets/titan-degrau-madeira.json'
WOODS = ('carvalho', 'cerejeira', 'betula')
STAIR = [(0, 0, 0, 1, 0.5, 1), (0, 0.5, 0, 1, 1, 0.5)]  # as mesmas caixas de STAIR_BASE
HALF = 0.5 / T  # meio texel (em fração do tile) de recuo nas bordas dos tiles


def src16(wood: str, name: str) -> Image.Image:
    im = Image.open(PKG % (wood, name)).convert('RGBA')
    assert im.size == (16, 16), (wood, name, im.size)
    return im


def src(wood: str, name: str) -> Image.Image:
    """A arte de `T` px: a do pacote Assets32px quando existe; senão a de 16 px dobrada por vizinho mais próximo."""
    f = A32 % (wood, name)
    if os.path.exists(f):
        im = Image.open(f).convert('RGBA')
        assert im.size == (T, T), (wood, name, im.size)
        return im
    return src16(wood, name).resize((T, T), Image.NEAREST)


def slab_tiles(force: bool) -> int:
    made = 0
    for w in WOODS:
        for name, im in ((f'laje-{w}-topo', src16(w, 'laje_topo')), (f'laje-{w}-face', src16(w, 'laje_face').crop((0, 8, 16, 16)))):  # a fonte de 16 px do tile (a arte de 32 px vem pelo manifesto `assets32/tiles.json`)
            if force or not os.path.exists(f'{TEX}{name}.png'):
                im.save(f'{TEX}{name}.png')
                made += 1
    return made


def faces(b):
    x0, y0, z0, x1, y1, z1 = b
    return [
        ([(x0, y1, z1), (x1, y1, z1), (x1, y1, z0), (x0, y1, z0)], (0, 1, 0), 0, lambda x, y, z: (x, z)),
        ([(x0, y0, z0), (x1, y0, z0), (x1, y0, z1), (x0, y0, z1)], (0, -1, 0), 0, lambda x, y, z: (x, z)),
        ([(x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)], (0, 0, 1), 1, lambda x, y, z: (x, 1 - (y - y0))),
        ([(x1, y0, z0), (x0, y0, z0), (x0, y1, z0), (x1, y1, z0)], (0, 0, -1), 1, lambda x, y, z: (1 - x, 1 - (y - y0))),
        ([(x1, y0, z1), (x1, y0, z0), (x1, y1, z0), (x1, y1, z1)], (1, 0, 0), 2, lambda x, y, z: (1 - z, 1 - y)),
        ([(x0, y0, z0), (x0, y0, z1), (x0, y1, z1), (x0, y1, z0)], (-1, 0, 0), 2, lambda x, y, z: (z, 1 - y)),
    ]


def model(wi: int) -> dict:
    pos, nrm, uv, idx = [], [], [], []
    for b in STAIR:
        for corners, n, ti, f in faces(b):
            base = len(pos) // 3
            for (x, y, z) in corners:
                pos += [round(x - 0.5, 4), round(y, 4), round(z - 0.5, 4)]
                nrm += list(n)
                u, v = f(x, y, z)
                u = min(max(u, 0), 1) * (1 - 2 * HALF) + HALF  # recuo de meio texel de cada lado do tile (sem sangrar para o vizinho da tira)
                uv += [round((wi * 3 + ti + u) / 9, 5), round(min(max(v, 0), 1), 5)]
            idx += [base, base + 1, base + 2, base, base + 2, base + 3]
    return {'size': [1, 1, 1], 'pos': pos, 'nrm': nrm, 'uv': uv, 'idx': idx}


def main() -> None:
    force = '--force' in sys.argv
    made = slab_tiles(force)
    strip = Image.new('RGBA', (9 * T, T), (0, 0, 0, 0))
    for wi, w in enumerate(WOODS):
        for ti, name in enumerate(('laje_topo', 'laje_face', 'degrau_perfil')):  # topo | frente (o espelho) | perfil
            strip.paste(src(w, name), ((wi * 3 + ti) * T, 0))
    strip.save(OUT_TEX, lossless=True, quality=100, method=6)
    fence = Image.new('RGBA', (3 * T, T), (0, 0, 0, 0))
    for wi, w in enumerate(WOODS):
        f32 = f'assets-src/orvalis-voxel/assets32/orvalis_tabua_{w}_32x32.png'
        t = Image.open(f32 if os.path.exists(f32) else f'{TEX}tabua-{w}.png').convert('RGBA')  # a tábua de 32 px do pacote, ou a de 16 px dobrada
        fence.paste(t if t.width == T else t.resize((T, T), Image.NEAREST if t.width < T else Image.BOX), (wi * T, 0))
    fence.save(OUT_FENCE, lossless=True, quality=100, method=6)
    json.dump({w: model(i) for i, w in enumerate(WOODS)}, open(OUT_MODEL, 'w'), separators=(',', ':'))
    print(f'tiles de laje criados: {made} · {OUT_TEX} · {OUT_MODEL}')


if __name__ == '__main__':
    main()
