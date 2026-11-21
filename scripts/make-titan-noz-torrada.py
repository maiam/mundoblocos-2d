"""Ícone provisório da Noz Torrada do Titã (ADR 0083): a Noz de Duna tostada, em 32 × 32 px.

Entrada : `assets-src/titan/arte32/Noz_de_Duna_Item_32px.png`.
Saída   : `assets-src/titan/arte32/Noz_Torrada_Item_32px.png` (item 30); rode depois `make-titan-arte32.py`, que o põe no atlas de itens.
Escurece e avermelha cada pixel, realça o miolo com brilhos dourados fixos (determinístico) e fecha o contorno mais escuro. Arte provisória; o desenho final do dono do produto
(`Noz_Torrada_Arte.png` no Drive é só uma ilustração grande) pode substituir o arquivo. Uso: python3 -I scripts/make-titan-noz-torrada.py
"""
import colorsys

from PIL import Image

SRC = 'assets-src/titan/arte32/Noz_de_Duna_Item_32px.png'
OUT = 'assets-src/titan/arte32/Noz_Torrada_Item_32px.png'


def main() -> None:
    im = Image.open(SRC).convert('RGBA')
    assert im.size == (32, 32), im.size
    px = im.load()
    out = Image.new('RGBA', im.size, (0, 0, 0, 0))
    po = out.load()
    for y in range(32):
        for x in range(32):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            h = max(0.0, h - 0.025)  # um pouco mais para o vermelho
            s = min(1.0, s * 1.08)
            v = v * 0.64  # tostada: bem mais escura
            if (x * 7 + y * 13) % 11 == 0 and v > 0.35:  # brilhos dourados espalhados, sempre nos mesmos pontos
                v = min(1.0, v * 1.45); s *= 0.8
            nr, ng, nb = colorsys.hsv_to_rgb(h, s, v)
            po[x, y] = (int(nr * 255), int(ng * 255), int(nb * 255), a)
    out.save(OUT)
    print(OUT, out.size)


if __name__ == '__main__':
    main()
