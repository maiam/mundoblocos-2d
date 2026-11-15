#!/usr/bin/env python3
"""Cerca de madeira v2 e porteira animada (v0.93.95): peças do dono do produto → tira de 3 quadros + 5 poses da porteira.

Fonte: assets-src/cerca-v2/ — `trecho-norte-sul.png` (2 postes e 1 trilho vertical), `canto-L.png` (3 postes; trilhos horizontais e vertical) e
`porteira-frente-{0,22.5,45,67.5,90}.png` (poses de abrir; vêm com legenda, linha de chão e ponto de âncora desenhados: são apagados aqui).
Medidas da arte (px): distância entre postes = 340 (= 1 célula), poste 46 × 157 (160 de altura), trilhos horizontais a 34–58 e 91–115 acima da base
do poste, trilho vertical de 24 px de largura no meio da altura (~70 acima da base). Pivô = centro da base do poste.

Saída (px por célula = 128: a escala do jogo é 32 px de mundo por célula):
  src/assets/fence.webp       tira de 3 quadros 128 × 128: 0 = trecho horizontal (trilhos ← poste → trilhos), 1 = vertical (trilho ↑ poste ↓),
                              2 = poste. Âncora (base do poste) em (64, 90) de cada quadro; o corte norte/sul do trecho vertical é na linha 64.
  src/assets/fence-gate.webp  5 poses da porteira (0°, 22,5°, 45°, 67,5°, 90°), cada uma 128 × 76, base dos postes na linha 61; os postes ficam a
                              ±0,33 célula do centro e dois cotos de trilho ligam cada poste à borda da célula (onde chegam os trilhos vizinhos).
  src/assets/icon-block-fence.webp e icon-block-fence-gate.webp (64 × 64).
Uso: python3 scripts/extract-fence-v2.py
"""
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'assets-src' / 'cerca-v2'
OUT = ROOT / 'src' / 'assets'

PITCH = 340          # px entre postes na arte = 1 célula
K = 128 / PITCH      # arte → quadro de 128 px por célula
ANCHOR = (170, 240)  # base do poste dentro do quadro-fonte de 340 × 340
POST_BOX = (237, 31, 284, 190)  # poste de cima do trecho vertical (base em (260, 188))
POST_BASE_IN_BOX = (23, 157)


def load(name: str) -> Image.Image:
    return Image.open(SRC / name).convert('RGBA')


def seamless(strip: Image.Image, period: int, overlap: int, axis: int) -> Image.Image:
    """Faixa periódica: o começo se mistura com o trecho que vem depois do período (emenda invisível)."""
    a = np.asarray(strip).astype(np.float32)
    if axis == 1:
        base, wrap = a[:, :period].copy(), a[:, period:period + overlap]
        t = np.linspace(0, 1, overlap)[None, :, None]
        base[:, :overlap] = wrap * (1 - t) + base[:, :overlap] * t
    else:
        base, wrap = a[:period].copy(), a[period:period + overlap]
        t = np.linspace(0, 1, overlap)[:, None, None]
        base[:overlap] = wrap * (1 - t) + base[:overlap] * t
    return Image.fromarray(base.clip(0, 255).astype(np.uint8), 'RGBA')


L = load('canto-L.png')
V = load('trecho-norte-sul.png')
post = V.crop(POST_BOX)

# trilhos horizontais: entre os postes do canto L (x 114–406), linhas 70–158
rails_src = L.crop((114, 70, 407, 159))
rails = seamless(rails_src, 240, 52, 1).resize((PITCH, rails_src.height), Image.LANCZOS)
RAIL_Y = 70 + (ANCHOR[1] - 188)  # a linha 70 da arte cai em 122 no quadro-fonte

# trilho vertical: coluna de 24 px entre os postes do trecho norte–sul, linhas 196–368
col_src = V.crop((248, 196, 272, 369))
col = seamless(col_src, 130, 42, 0).resize((24, PITCH), Image.LANCZOS)


def frame() -> Image.Image:
    return Image.new('RGBA', (PITCH, PITCH), (0, 0, 0, 0))


def put_post(f: Image.Image) -> None:
    f.alpha_composite(post, (ANCHOR[0] - POST_BASE_IN_BOX[0], ANCHOR[1] - POST_BASE_IN_BOX[1]))


horizontal = frame()
horizontal.alpha_composite(rails, (0, RAIL_Y))
put_post(horizontal)
vertical = frame()
vertical.alpha_composite(col, (ANCHOR[0] - 12, 0))
put_post(vertical)
single = frame()
put_post(single)

pieces = [im.resize((128, 128), Image.LANCZOS) for im in (horizontal, vertical, single)]
strip = Image.new('RGBA', (384, 128), (0, 0, 0, 0))
for i, p in enumerate(pieces):
    strip.alpha_composite(p, (i * 128, 0))
strip.save(OUT / 'fence.webp', 'WEBP', quality=90, method=6)


def icon(im: Image.Image, name: str) -> None:
    bb = im.getchannel('A').point(lambda v: 255 if v > 20 else 0).getbbox()
    im = im.crop(bb)
    k = 56 / max(im.size)
    im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
    c = Image.new('RGBA', (64, 64), (0, 0, 0, 0))
    c.alpha_composite(im, ((64 - im.width) // 2, (64 - im.height) // 2))
    c.save(OUT / name, 'WEBP', quality=90, method=6)


icon(horizontal, 'icon-block-fence.webp')

# ---- porteira: 5 poses ---------------------------------------------------------------------------------------------------------------
POSES = ['0', '22.5', '45', '67.5', '90']
GATE_BASE = 243          # linha da base dos postes na arte da porteira
GATE_POSTS = (117, 342)  # centros dos postes (distância 225 = 0,66 célula)
CROP_Y = (80, 282)       # post (topo 86) a folha aberta (até 280); a legenda (317+) fica de fora


def clean(im: Image.Image) -> Image.Image:
    """Apaga a linha de chão (bege) e o ponto de âncora (verde-azulado) desenhados na pose, só perto da base dos postes."""
    a = np.asarray(im).astype(int).copy()
    y0, y1 = GATE_BASE, GATE_BASE + 8
    reg = a[y0:y1]
    beige = (abs(reg[..., 0] - 215) < 28) & (abs(reg[..., 1] - 201) < 28) & (abs(reg[..., 2] - 177) < 30)
    teal = (abs(reg[..., 0] - 66) < 30) & (abs(reg[..., 1] - 152) < 30) & (abs(reg[..., 2] - 140) < 30)
    reg[beige | teal] = 0
    return Image.fromarray(a.clip(0, 255).astype(np.uint8), 'RGBA')


gate_w = PITCH
gate_h = CROP_Y[1] - CROP_Y[0]
base_y = GATE_BASE - CROP_Y[0]
shift = ANCHOR[0] - (GATE_POSTS[0] + GATE_POSTS[1]) / 2  # centra a porteira na célula
gate_strip = Image.new('RGBA', (128 * 5, round(gate_h * K)), (0, 0, 0, 0))
for i, name in enumerate(POSES):
    g = clean(load(f'porteira-frente-{name}.png')).crop((0, CROP_Y[0], 460, CROP_Y[1]))
    f = Image.new('RGBA', (gate_w, gate_h), (0, 0, 0, 0))
    # cotos de trilho do poste à borda da célula (os trilhos vizinhos chegam ali), atrás dos postes
    left_post_x = round(GATE_POSTS[0] + shift)
    right_post_x = round(GATE_POSTS[1] + shift)
    stub_y = base_y - 188 + 70  # a linha 70 da arte (topo dos trilhos) está a 118 acima da base do poste
    f.alpha_composite(rails.crop((0, 0, left_post_x + 6, rails.height)), (0, stub_y))
    f.alpha_composite(rails.crop((right_post_x - 6, 0, PITCH, rails.height)), (right_post_x - 6, stub_y))
    f.alpha_composite(g, (round(shift), 0))
    gate_strip.alpha_composite(f.resize((128, round(gate_h * K)), Image.LANCZOS), (i * 128, 0))
    if name == '0':
        icon(f, 'icon-block-fence-gate.webp')
gate_strip.save(OUT / 'fence-gate.webp', 'WEBP', quality=90, method=6)
print('cerca:', strip.size, ' porteira:', gate_strip.size, ' base dos postes na linha', round(base_y * K))
