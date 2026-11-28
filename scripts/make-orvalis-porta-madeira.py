"""Porta e Alçapão de madeira do Orvalis em voxel (ADR 0141): textura e modelos 3D de carvalho, cerejeira e bétula, a partir do pacote do Drive (`catalogo/P1-02-vedacao-de-madeira/`, 16 × 16; desde o ADR 0143, a arte de 32 px do pacote Assets32px em `assets-src/orvalis-voxel/assets32/` passa na frente e a de 16 px é ampliada por vizinho mais próximo).

Entradas : assets-src/orvalis-voxel/catalogo/P1-02-vedacao-de-madeira/orvalis_<madeira>_{porta_frente,porta_verso,porta_borda,alcapao_face}_16x16.png   (fonte única; não são alterados)
           A porta do pacote é a **porta inteira desenhada em 16 × 16** (a Wiki a desenha em 16 × 32): a folha de 1 × 2 m usa a arte esticada em y; as margens transparentes são cortadas pela caixa útil (bbox).
Saídas   : src/assets/titan-porta-madeira.webp   384 × 32 (por madeira: frente | verso | borda | alçapão; carvalho, cerejeira, bétula; tiles de 32 px)
           src/assets/titan-porta-madeira.json   {portas: {carvalho, cerejeira, betula}, alcapoes: {<madeira>: {baixo, cima, aberto}}} no formato dos instanciados (`pos`, `nrm`, `uv`, `idx`, `size`)
A porta tem a geometria de `doorModelData` do renderer (1 × 2 × 3/16 m, pivô no centro da base, frente em +Z, dobradiça à esquerda; o mesmo código gira e espelha); o alçapão tem 3 tipos (fechado embaixo, fechado em cima,
aberto de pé rente à borda −Z no giro 0).
Uso: python3 scripts/make-orvalis-porta-madeira.py   (precisa do Pillow)
"""
import json
import os

from PIL import Image

PKG = 'assets-src/orvalis-voxel/catalogo/P1-02-vedacao-de-madeira/orvalis_%s_%s_16x16.png'
OUT_TEX, OUT_MODEL = 'src/assets/titan-porta-madeira.webp', 'src/assets/titan-porta-madeira.json'
WOODS = ('carvalho', 'cerejeira', 'betula')
T = 32  # px de cada tile (ADR 0143)
TILES, W = 4, 4 * 3 * T  # tiles por madeira; largura da tira
A32 = 'assets-src/orvalis-voxel/assets32/orvalis_%s_%s_32x32.png'
THICK, H = 3 / 16, 2.0


def src(wood: str, name: str) -> Image.Image:
    f = A32 % (wood, name)
    if os.path.exists(f):  # a arte de 32 px do pacote Assets32px
        im = Image.open(f).convert('RGBA')
        assert im.size == (T, T), (wood, name, im.size)
        return im
    im = Image.open(PKG % (wood, name)).convert('RGBA')  # a alternativa padrão: 16 px dobrados
    assert im.size == (16, 16), (wood, name, im.size)
    return im.resize((T, T), Image.NEAREST)


def bbox(im: Image.Image) -> tuple:
    b = im.getchannel('A').getbbox()
    assert b, 'imagem vazia'
    return b  # x0, y0, x1, y1 em px


class Quads:
    def __init__(self) -> None:
        self.pos, self.nrm, self.uv, self.idx = [], [], [], []

    def quad(self, p, n, t) -> None:
        b = len(self.pos) // 3
        for (x, y, z), (u, v) in zip(p, t):
            self.pos += [round(x, 4), round(y, 4), round(z, 4)]
            self.nrm += list(n)
            self.uv += [round(u, 5), round(v, 5)]
        self.idx += [b, b + 1, b + 2, b, b + 2, b + 3]

    def out(self, size) -> dict:
        return {'size': size, 'pos': self.pos, 'nrm': self.nrm, 'uv': self.uv, 'idx': self.idx}


def tex(wi: int, tile: int, u: float, v: float, box=(0, 0, T, T)) -> tuple:
    """(u, v) 0–1 dentro da caixa útil `box` (px) do tile `tile` da madeira `wi`, levado à tira inteira; recuo de 1/100 de texel."""
    x0, y0, x1, y1 = box
    px, py = x0 + (x1 - x0) * min(max(u, 0), 1), y0 + (y1 - y0) * min(max(v, 0), 1)
    px = min(max(px, x0 + 0.01), x1 - 0.01)
    py = min(max(py, y0 + 0.01), y1 - 0.01)
    return ((wi * TILES * T + tile * T + px) / W, py / T)


def door(wi: int, w: str) -> dict:
    h, d = 0.5, THICK / 2
    fb = bbox(src(w, 'porta_frente'))
    sb = bbox(src(w, 'porta_verso'))
    bb = bbox(src(w, 'porta_borda'))
    q = Quads()
    P = lambda tile, u, v, box: tex(wi, tile, u, v, box)
    q.quad([(-h, 0, d), (h, 0, d), (h, H, d), (-h, H, d)], (0, 0, 1), [P(0, 0, 1, fb), P(0, 1, 1, fb), P(0, 1, 0, fb), P(0, 0, 0, fb)])  # frente
    q.quad([(h, 0, -d), (-h, 0, -d), (-h, H, -d), (h, H, -d)], (0, 0, -1), [P(1, 1, 1, sb), P(1, 0, 1, sb), P(1, 0, 0, sb), P(1, 1, 0, sb)])  # verso
    q.quad([(-h, 0, -d), (-h, 0, d), (-h, H, d), (-h, H, -d)], (-1, 0, 0), [P(2, 0, 1, bb), P(2, 1, 1, bb), P(2, 1, 0, bb), P(2, 0, 0, bb)])  # lados: a borda de 3 px
    q.quad([(h, 0, d), (h, 0, -d), (h, H, -d), (h, H, d)], (1, 0, 0), [P(2, 0, 1, bb), P(2, 1, 1, bb), P(2, 1, 0, bb), P(2, 0, 0, bb)])
    q.quad([(-h, H, d), (h, H, d), (h, H, -d), (-h, H, -d)], (0, 1, 0), [P(2, 0, 0.02, bb), P(2, 1, 0.02, bb), P(2, 1, 0.06, bb), P(2, 0, 0.06, bb)])  # topo e base: um trecho da borda
    q.quad([(-h, 0, -d), (h, 0, -d), (h, 0, d), (-h, 0, d)], (0, -1, 0), [P(2, 0, 0.02, bb), P(2, 1, 0.02, bb), P(2, 1, 0.06, bb), P(2, 0, 0.06, bb)])
    return q.out([1, H, THICK])


def plate(wi: int, y0: float, y1: float, z0: float, z1: float) -> dict:
    """Placa do alçapão (x de −0,5 a 0,5): faces grandes com o tile inteiro e as finas com a faixa da moldura (3 px)."""
    x0, x1 = -0.5, 0.5
    q = Quads()
    Q = lambda u, v, box=(0, 0, T, T): tex(wi, 3, u, v, box)
    edge = (0, 0, T, 3 * T // 16)
    big_y = (y1 - y0) < (z1 - z0)  # placa deitada: as faces grandes são o topo e a base
    if big_y:
        q.quad([(x0, y1, z1), (x1, y1, z1), (x1, y1, z0), (x0, y1, z0)], (0, 1, 0), [Q(0, 1), Q(1, 1), Q(1, 0), Q(0, 0)])
        q.quad([(x0, y0, z0), (x1, y0, z0), (x1, y0, z1), (x0, y0, z1)], (0, -1, 0), [Q(0, 0), Q(1, 0), Q(1, 1), Q(0, 1)])
    else:
        q.quad([(x0, y1, z1), (x1, y1, z1), (x1, y1, z0), (x0, y1, z0)], (0, 1, 0), [Q(0, 0, edge), Q(1, 0, edge), Q(1, 1, edge), Q(0, 1, edge)])
        q.quad([(x0, y0, z0), (x1, y0, z0), (x1, y0, z1), (x0, y0, z1)], (0, -1, 0), [Q(0, 0, edge), Q(1, 0, edge), Q(1, 1, edge), Q(0, 1, edge)])
    if big_y:
        for p, n in (([(x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)], (0, 0, 1)), ([(x1, y0, z0), (x0, y0, z0), (x0, y1, z0), (x1, y1, z0)], (0, 0, -1)), ([(x1, y0, z1), (x1, y0, z0), (x1, y1, z0), (x1, y1, z1)], (1, 0, 0)), ([(x0, y0, z0), (x0, y0, z1), (x0, y1, z1), (x0, y1, z0)], (-1, 0, 0))):
            q.quad(p, n, [Q(0, 1, edge), Q(1, 1, edge), Q(1, 0, edge), Q(0, 0, edge)])
    else:
        q.quad([(x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)], (0, 0, 1), [Q(0, 1), Q(1, 1), Q(1, 0), Q(0, 0)])
        q.quad([(x1, y0, z0), (x0, y0, z0), (x0, y1, z0), (x1, y1, z0)], (0, 0, -1), [Q(0, 1), Q(1, 1), Q(1, 0), Q(0, 0)])
        for p, n in (([(x1, y0, z1), (x1, y0, z0), (x1, y1, z0), (x1, y1, z1)], (1, 0, 0)), ([(x0, y0, z0), (x0, y0, z1), (x0, y1, z1), (x0, y1, z0)], (-1, 0, 0))):
            q.quad(p, n, [Q(0, 1, edge), Q(1, 1, edge), Q(1, 0, edge), Q(0, 0, edge)])
    return q.out([1, y1 - y0, z1 - z0])


def main() -> None:
    strip = Image.new('RGBA', (W, T), (0, 0, 0, 0))
    for wi, w in enumerate(WOODS):
        for ti, name in enumerate(('porta_frente', 'porta_verso', 'porta_borda', 'alcapao_face')):
            strip.paste(src(w, name), ((wi * TILES + ti) * T, 0))
    strip.save(OUT_TEX, lossless=True, quality=100, method=6)
    models = {'portas': {w: door(i, w) for i, w in enumerate(WOODS)}, 'alcapoes': {}}
    for i, w in enumerate(WOODS):
        models['alcapoes'][w] = {'baixo': plate(i, 0, THICK, -0.5, 0.5), 'cima': plate(i, 1 - THICK, 1, -0.5, 0.5), 'aberto': plate(i, 0, 1, -0.5, -0.5 + THICK)}
    json.dump(models, open(OUT_MODEL, 'w'), separators=(',', ':'))
    print(OUT_TEX, OUT_MODEL)


if __name__ == '__main__':
    main()
