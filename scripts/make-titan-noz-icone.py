"""Ícone provisório de 32 × 32 px da Noz de Duna (ADR 0060): o pacote de arte do Drive trouxe a planta e a textura da casca, mas não o ícone de item.
Desenha uma noz ovalada com a paleta da célula da casca do atlas (`assets-src/titan/noz/Noz_de_Duna_Atlas_32px.png`), contorno escuro, luz do alto à esquerda e a fenda escura
ao meio. Troque o PNG de saída por arte própria quando existir e rode `make-titan-arte32.py`. Uso: python3 -I scripts/make-titan-noz-icone.py"""
import math
import random

from PIL import Image

SRC = 'assets-src/titan/noz/Noz_de_Duna_Atlas_32px.png'
OUT = 'assets-src/titan/arte32/Noz_de_Duna_Item_32px.png'


def main() -> None:
    atlas = Image.open(SRC).convert('RGB')
    shell = atlas.crop((36 * 3 + 2, 2, 36 * 3 + 34, 34))  # célula 4 = casca ocre com fenda
    cols = sorted({shell.getpixel((x, y)) for x in range(32) for y in range(32)}, key=sum)
    n = len(cols)
    dark, deep = cols[0], cols[max(1, n // 6)]
    mid, light, spark = cols[n // 2], cols[(4 * n) // 5], cols[-1]
    outline = tuple(int(c * 0.45) for c in dark)
    rnd = random.Random(16)
    img = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
    cx, cy, rx, ry = 15.5, 17.0, 11.2, 9.0
    tilt = -0.35  # leve inclinação, como as nozes do modelo
    ct, st = math.cos(tilt), math.sin(tilt)

    def inside(x: float, y: float, k: float) -> float:
        dx, dy = x - cx, y - cy
        u, v = dx * ct + dy * st, -dx * st + dy * ct
        return (u / (rx * k)) ** 2 + (v / (ry * k)) ** 2

    for y in range(32):
        for x in range(32):
            d = inside(x + 0.5, y + 0.5, 1.0)
            if d > 1.0:
                continue
            if d > 0.80:
                img.putpixel((x, y), outline + (255,))
                continue
            dx, dy = x + 0.5 - cx, y + 0.5 - cy
            u, v = dx * ct + dy * st, -dx * st + dy * ct
            lit = -(dx * 0.6 + dy * 0.8) / 11 + 0.5 + rnd.uniform(-0.09, 0.09)  # luz do alto à esquerda
            c = spark if lit > 0.93 else light if lit > 0.68 else mid if lit > 0.38 else deep if lit > 0.16 else dark
            if abs(v) < 1.25 and abs(u) < rx * 0.86 and abs(u) > 0.0:  # fenda escura ao longo do eixo maior
                c = dark if abs(v) < 0.7 else deep
            img.putpixel((x, y), c + (255,))
    # sombra suave sob a noz
    for x in range(8, 24):
        if img.getpixel((x, 27))[3] == 0 and img.getpixel((x, 26))[3] > 0:
            img.putpixel((x, 27), outline + (110,))
    img.save(OUT)
    print(OUT, img.size)


if __name__ == '__main__':
    main()
