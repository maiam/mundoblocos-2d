#!/usr/bin/env python3
"""Cerca de madeira e portão: referências do dono do produto → peças que o render emenda por vizinhos.

  assets-src/cerca/moldura.png (cercado quadrado visto em 3/4) → src/assets/fence.png
      tira de 3 quadros FRAME_W × FRAME_H, todos com a mesma âncora (o centro da célula, ANCHOR):
        0 = trecho horizontal (meia travessa ← poste do meio → meia travessa)
        1 = trecho vertical (meia travessa ↑ poste ↓ meia travessa)
        2 = poste grande (canto/ponta/encontro), tirado do canto inferior esquerdo
      O render corta os quadros 0 e 1 ao meio na âncora (oeste/leste, norte/sul) e desenha só as metades que
      apontam para cercas vizinhas; o poste grande vai por cima quando a célula não é um trecho reto.
  assets-src/cerca/portao.png (portão fechado, aberto e poste solto) → src/assets/fence-gate.png
      2 quadros (fechado, aberto) com os dois postes; os centros dos postes caem nas bordas da célula.
      O aberto = folha aberta + poste solto da referência (que já está à mesma distância do fechado).
  Ícones 64×64: src/assets/icon-block-fence.png e icon-block-fence-gate.png.
Uso: python3 scripts/extract-fence.py && python3 scripts/optimize-assets.py
"""
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC, OUT = ROOT / 'assets-src' / 'cerca', ROOT / 'src' / 'assets'

# --- cerca (moldura) ---
PITCH = 176  # distância entre postes do meio na moldura = 1 célula
CELL = 128  # px de saída por célula
FRAME_W, FRAME_H = CELL, 192
ANCHOR = (64, 112)  # centro da célula dentro do quadro (texturas.ts usa os mesmos números)
K = CELL / PITCH
# Âncora (centro do poste) e janela de recorte (meia célula para cada lado) de cada peça, em px da moldura.
PIECES = [
    ((537, 212), (537 - 88, 120, 537 + 88, 305)),  # horizontal: 2º poste da fileira de cima
    ((165, 595), (60, 595 - 88, 270, 595 + 88)),  # vertical: 2º poste da lateral esquerda
    ((163, 1025), (100, 925, 212, 1120)),  # poste do canto inferior esquerdo
]

# --- portão ---
GATE_POSTS = 583  # distância entre os centros dos dois postes = 1 célula
GATE_MARGIN = 90  # além do centro de cada poste (largura do poste)
GATE_Y = (140, 765)
GATE_LEFT = [152, 1030]  # centro do poste das dobradiças: fechado, aberto
GATE_K = CELL / GATE_POSTS


def rgba(path):
    a = np.asarray(Image.open(path).convert('RGBA')).copy()
    a[..., 3][a[..., 3] < 60] = 0
    return Image.fromarray(a, 'RGBA')


def scaled(im, k):
    return im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)


def icon(im, n=64, margin=0.06):
    bb = im.getbbox()
    im = im.crop(bb)
    k = n * (1 - 2 * margin) / max(im.size)
    im = scaled(im, k)
    out = Image.new('RGBA', (n, n))
    out.alpha_composite(im, ((n - im.width) // 2, (n - im.height) // 2))
    return out


frame = rgba(SRC / 'moldura.png')
strip = Image.new('RGBA', (FRAME_W * len(PIECES), FRAME_H))
for i, ((ax, ay), box) in enumerate(PIECES):
    part = scaled(frame.crop(box), K)
    x = round(ANCHOR[0] - (ax - box[0]) * K)
    y = round(ANCHOR[1] - (ay - box[1]) * K)
    cell = Image.new('RGBA', (FRAME_W, FRAME_H))
    cell.paste(part, (x, y), part)
    strip.alpha_composite(cell, (i * FRAME_W, 0))
strip.save(OUT / 'fence.png', optimize=True)

gate_src = rgba(SRC / 'portao.png')
gw = round((GATE_POSTS + 2 * GATE_MARGIN) * GATE_K)
gh = round((GATE_Y[1] - GATE_Y[0]) * GATE_K)
gates = Image.new('RGBA', (gw * 2, gh))
for i, left in enumerate(GATE_LEFT):
    box = (left - GATE_MARGIN, GATE_Y[0], left + GATE_POSTS + GATE_MARGIN, GATE_Y[1])
    part = scaled(gate_src.crop(box), GATE_K).resize((gw, gh), Image.LANCZOS)
    gates.alpha_composite(part, (i * gw, 0))
gates.save(OUT / 'fence-gate.png', optimize=True)

# Ícones: um trecho reto com postes nas pontas (dois quadros horizontais lado a lado) e o portão fechado.
run = Image.new('RGBA', (FRAME_W * 2, FRAME_H))
run.alpha_composite(strip.crop((0, 0, FRAME_W, FRAME_H)), (0, 0))
run.alpha_composite(strip.crop((0, 0, FRAME_W, FRAME_H)), (FRAME_W, 0))
icon(run).save(OUT / 'icon-block-fence.png', optimize=True)
icon(gates.crop((0, 0, gw, gh))).save(OUT / 'icon-block-fence-gate.png', optimize=True)
print('cerca', strip.size, 'portão', gates.size, 'quadro do portão', (gw, gh))
