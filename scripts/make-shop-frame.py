#!/usr/bin/env python3
"""Moldura da janela da loja (v0.93.57): assets-src/ui/shop-frame.png → src/assets/ui-shop.png.

Apaga da arte os textos que mudam no jogo ("Confira os meus itens à venda!" e "Página 1 de 3": o jogo escreve os dele em cima) preenchendo
cada retângulo com um degradê vertical entre as bordas de cima e de baixo. O resto (Anterior, Próxima, Comprar, Vender, moldura, espaços e
preços vazios) fica como veio. Depois: python3 scripts/optimize-assets.py.
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'assets-src' / 'ui' / 'shop-frame.png'
OUT = ROOT / 'src' / 'assets' / 'ui-shop.png'

# (x0, y0, x1, y1) em pixels da arte (1187 × 1326), fim exclusivo: só o miolo do texto. As cores vêm de faixas de 4 px logo acima
# e logo abaixo, ainda dentro do balão/da pílula (nunca da borda dourada), tiradas pela média da largura toda (sem listras).
ERASE = [
    (326, 183, 724, 219),    # balão de fala
    (466, 1066, 704, 1104),  # "Página 1 de 3"
]
GAP = 2
STRIP = 4


def main():
    im = Image.open(SRC).convert('RGBA')
    px = im.load()

    def mean(x0, x1, y0, y1):
        cells = [px[x, y] for x in range(x0, x1) for y in range(y0, y1)]
        return tuple(sum(c[i] for c in cells) / len(cells) for i in range(4))

    for x0, y0, x1, y1 in ERASE:
        ct = mean(x0, x1, y0 - GAP - STRIP, y0 - GAP)
        cb = mean(x0, x1, y1 + GAP, y1 + GAP + STRIP)
        for y in range(y0, y1):
            t = (y - y0) / max(1, y1 - y0 - 1)
            c = tuple(round(ct[i] + (cb[i] - ct[i]) * t) for i in range(4))
            for x in range(x0, x1):
                px[x, y] = c
    im.save(OUT, optimize=True)
    print(f'ui-shop.png: {im.size}')


if __name__ == '__main__':
    main()
