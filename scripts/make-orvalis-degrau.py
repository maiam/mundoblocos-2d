"""Degrau de Pedra do Orvalis em voxel (ADR 0109): textura de 3 tiles e modelo 3D de duas caixas, a partir da arte do pacote Texturas16px (e, desde o ADR 0143, da arte de 32 px do pacote Assets32px quando houver: a tira sai a 32 px por tile).

Entradas : assets-src/orvalis-voxel/texturas32/degrau-pedra/{topo,frente,perfil}.png   quadrados (16 px ou maiores; reduzidos a 16 por face). Fonte editável: o script não os altera.
           topo   = o piso dos dois patamares (16 × 16, opaco)
           frente = o espelho: só a metade de baixo do PNG tem pedra (16 × 8 úteis)
           perfil = a lateral em L: patamar de baixo inteiro (metade de baixo) e o de cima só na metade de trás (quarto superior direito)
Saídas   : src/assets/titan-degrau-pedra.webp   96 × 32 (topo | frente | perfil; tiles de 32 px: a arte de 16 px é ampliada por vizinho mais próximo)
           src/assets/titan-degrau-pedra.json    modelo no formato dos instanciados (`pos`, `nrm`, `uv`, `idx`, `size`; frente em +Z, giro 0; pivô no centro da base da célula)
As UVs usam a arte **como desenhada**: o perfil cobre a lateral +X com u = 1 − z, v = 1 − y (o patamar alto atrás); a lateral −X usa a mesma u = 1 − z (v0.229.0: com u = z o patamar alto caía na metade transparente do tile e saía preto).
As caixas são as de `titan/voxel.ts` (`STAIR_BASE`). Uso: python3 scripts/make-orvalis-degrau.py   (precisa do Pillow: `pip3 install pillow`)
"""
import json
import os

from PIL import Image

SRC = 'assets-src/orvalis-voxel/texturas32/degrau-pedra/'
A32 = 'assets-src/orvalis-voxel/assets32/orvalis_degrau_pedra_%s_32x32.png'  # a arte de 32 px do pacote (ADR 0143), quando existe
T = 32  # px de cada tile da tira
OUT_TEX, OUT_MODEL = 'src/assets/titan-degrau-pedra.webp', 'src/assets/titan-degrau-pedra.json'
STAIR = [(0, 0, 0, 1, 0.5, 1), (0, 0.5, 0, 1, 1, 0.5)]  # as mesmas caixas de STAIR_BASE
EPS = 0.5 / (3 * T)  # recuo de meio texel nas bordas dos tiles (sem sangrar para o vizinho da tira)


def tile(name: str) -> Image.Image:
    im = Image.open(A32 % name if os.path.exists(A32 % name) else SRC + name + '.png').convert('RGBA')
    assert im.width == im.height, (name, im.size)
    if im.width == T:
        return im
    return im.resize((T, T), Image.NEAREST if im.width < T else Image.BOX if im.width % T == 0 else Image.LANCZOS)


def strip() -> Image.Image:
    out = Image.new('RGBA', (3 * T, T), (0, 0, 0, 0))
    for i, n in enumerate(('topo', 'frente', 'perfil')):
        out.paste(tile(n), (i * T, 0))
    out.save(OUT_TEX, lossless=True, quality=100, method=6)
    return out


def at(i: int, u: float, v: float) -> tuple:
    """(u, v) de 0–1 dentro do tile i da tira, levado para a textura inteira."""
    return (round((i + min(max(u, 0), 1)) / 3, 5), round(min(max(v, 0), 1), 5))


def faces(b):
    x0, y0, z0, x1, y1, z1 = b
    # (cantos anti-horários vistos de fora, normal, tile, função (x, y, z) -> (u, v) no tile)
    return [
        ([(x0, y1, z1), (x1, y1, z1), (x1, y1, z0), (x0, y1, z0)], (0, 1, 0), 0, lambda x, y, z: (x, z)),
        ([(x0, y0, z0), (x1, y0, z0), (x1, y0, z1), (x0, y0, z1)], (0, -1, 0), 0, lambda x, y, z: (x, z)),
        ([(x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)], (0, 0, 1), 1, lambda x, y, z: (x, 1 - (y - y0))),
        ([(x1, y0, z0), (x0, y0, z0), (x0, y1, z0), (x1, y1, z0)], (0, 0, -1), 1, lambda x, y, z: (1 - x, 1 - (y - y0))),
        ([(x1, y0, z1), (x1, y0, z0), (x1, y1, z0), (x1, y1, z1)], (1, 0, 0), 2, lambda x, y, z: (1 - z, 1 - y)),
        ([(x0, y0, z0), (x0, y0, z1), (x0, y1, z1), (x0, y1, z0)], (-1, 0, 0), 2, lambda x, y, z: (1 - z, 1 - y)),  # perfil: o patamar alto (atrás, z 0–0,5) cai na metade desenhada do tile nas duas laterais (v0.229.0; antes a lateral −X caía na metade transparente e saía preta)
    ]


def model() -> None:
    pos, nrm, uv, idx = [], [], [], []
    for b in STAIR:
        for corners, n, ti, f in faces(b):
            base = len(pos) // 3
            for (x, y, z) in corners:
                pos += [round(x - 0.5, 4), round(y, 4), round(z - 0.5, 4)]
                nrm += list(n)
                u, v = f(x, y, z)
                du = min(max(u, EPS * 3), 1 - EPS * 3)
                uv += list(at(ti, du, v))
            idx += [base, base + 1, base + 2, base, base + 2, base + 3]
    json.dump({'size': [1, 1, 1], 'pos': pos, 'nrm': nrm, 'uv': uv, 'idx': idx}, open(OUT_MODEL, 'w'), separators=(',', ':'))
    print(OUT_MODEL, len(idx) // 3, 'triângulos')


if __name__ == '__main__':
    strip()
    model()
