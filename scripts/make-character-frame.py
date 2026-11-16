#!/usr/bin/env python3
"""Moldura do painel do personagem (v0.93.122): assets-src/ui/character-frame.png → src/assets/ui-character.png.

Da arte do dono do produto (1448 × 1086): o branco de FORA vira transparente (cantos arredondados) e o branco do círculo do avatar e da caixa do personagem
vira buraco (o jogo desenha o avatar e o personagem de corpo inteiro ATRÁS da moldura); os valores "---" e "–/–" (nível, XP, ataque, HP e as três moedas) são apagados
repetindo, em cada linha, a cor do miolo logo à esquerda do texto (o degradê do painel é vertical). O jogo escreve os valores em cima. Depois: python3 scripts/optimize-assets.py.
"""
from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'assets-src' / 'ui' / 'character-frame.png'
OUT = ROOT / 'src' / 'assets' / 'ui-character.png'

# Sementes do branco a esvaziar: fora (cantos), círculo do avatar, caixa do personagem.
SEEDS = [(2, 2), (1445, 2), (2, 1083), (1445, 1083), (195, 110), (725, 380)]
# (x0, y0, x1, y1) fim exclusivo: só o miolo do texto a apagar.
ERASE = [
    (232, 752, 322, 782),    # Nível ---
    (1120, 678, 1218, 708),  # XP –/–
    (660, 790, 750, 814),    # Ataque ---
    (1085, 790, 1175, 814),  # HP ---
    (612, 890, 696, 920),    # moedas de cobre ---
    (882, 890, 966, 920),    # moedas de prata ---
    (1160, 890, 1244, 920),  # moedas de ouro ---
]


# Preenchimento azul da barra de XP (vem pintado até ~45%): some; o jogo desenha o dele. Cor da trilha = a do lado direito, linha a linha.
XP_FILL = (600, 683, 908, 706)
XP_TRACK_SAMPLE = (1000, 1006)


def white(p):
    return p[0] > 232 and p[1] > 232 and p[2] > 232 and p[3] > 200


def main():
    im = Image.open(SRC).convert('RGBA')
    w, h = im.size
    px = im.load()
    for sx, sy in SEEDS:
        if not white(px[sx, sy]):
            continue
        q = deque([(sx, sy)])
        px[sx, sy] = (0, 0, 0, 0)
        while q:
            x, y = q.popleft()
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h and white(px[nx, ny]):
                    px[nx, ny] = (0, 0, 0, 0)
                    q.append((nx, ny))
    for x0, y0, x1, y1 in ERASE:
        for y in range(y0, y1):
            c = tuple(round(sum(px[x, y][i] for x in range(x0 - 10, x0 - 4)) / 6) for i in range(4))
            for x in range(x0, x1):
                px[x, y] = c
    x0, y0, x1, y1 = XP_FILL
    for y in range(y0, y1):
        c = tuple(round(sum(px[x, y][i] for x in range(*XP_TRACK_SAMPLE)) / (XP_TRACK_SAMPLE[1] - XP_TRACK_SAMPLE[0])) for i in range(4))
        for x in range(x0, x1):
            px[x, y] = c
    im.save(OUT, optimize=True)
    print(f'ui-character.png: {im.size}')


if __name__ == '__main__':
    main()
