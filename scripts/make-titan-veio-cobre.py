"""Tile do Veio de Cobre de Duna (ADR 0063) no atlas de terreno do Titã: rocha violeta com veios cor de cobre e manchas verde-oliva, a mesma arte nas 6 faces (como os veios de rocha e gelo).

Atlas: 4 colunas, passo 20 px, tile de 16 px com 2 px de borda duplicada (como `titan/mesher.ts` `tileUV`); 11 = veio de cobre (linha 2, coluna 3). Parte do tile 4 (rocha) tingido de violeta e desenha por cima
(caminhos aleatórios determinísticos), então é repetível. Conceito: `assets-src/titan/conceito/Veio_de_Cobre_de_Duna_Prancha.png`. WebP SEM perdas. Uso: python3 -I scripts/make-titan-veio-cobre.py
"""
import random

from PIL import Image

PATH = 'src/assets/titan-atlas-16px.webp'
PITCH, PAD, TILE = 20, 2, 16
COPPER = [(214, 112, 52), (240, 150, 70), (176, 86, 40)]
OLIVE = [(120, 120, 56), (140, 140, 70)]


def origin(i):
    return (i % 4) * PITCH + PAD, (i // 4) * PITCH + PAD


def main():
    img = Image.open(PATH).convert('RGBA')
    assert img.size == (80, 60), img.size
    ox, oy = origin(4)
    base = img.crop((ox, oy, ox + TILE, oy + TILE)).copy()
    px = base.load()
    for y in range(TILE):
        for x in range(TILE):
            r, g, b, a = px[x, y]
            px[x, y] = (min(255, int(r * 1.15 + 14)), int(g * 0.9 + 4), min(255, int(b * 1.2 + 22)), a)  # rocha escura → violeta-acinzentado
    rnd = random.Random(11)
    for k in range(2):  # dois veios em diagonal, com quebras
        x, y = rnd.randrange(0, 4), rnd.randrange(8, 16) if k else rnd.randrange(0, 8)
        for _ in range(26):
            c = COPPER[rnd.randrange(3)]
            px[x % TILE, y % TILE] = c + (255,)
            if rnd.random() < 0.35:
                px[(x + 1) % TILE, y % TILE] = COPPER[2] + (255,)
            x += 1 if rnd.random() < 0.8 else 0
            y += -1 if rnd.random() < 0.6 else (1 if rnd.random() < 0.3 else 0)
    for _ in range(3):  # manchas de crosta verde-oliva
        cx, cy = rnd.randrange(TILE), rnd.randrange(TILE)
        for dx, dy in ((0, 0), (1, 0), (0, 1), (-1, 0)):
            px[(cx + dx) % TILE, (cy + dy) % TILE] = OLIVE[rnd.randrange(2)] + (255,)
    x0, y0 = origin(11)
    img.paste(base, (x0, y0))
    # borda duplicada de 2 px (evita costura no filtro): repete as bordas do tile
    for d in range(1, PAD + 1):
        for i in range(TILE):
            img.putpixel((x0 - d, y0 + i), base.getpixel((0, i))); img.putpixel((x0 + TILE - 1 + d, y0 + i), base.getpixel((TILE - 1, i)))
            img.putpixel((x0 + i, y0 - d), base.getpixel((i, 0))); img.putpixel((x0 + i, y0 + TILE - 1 + d), base.getpixel((i, TILE - 1)))
    img.save(PATH, 'WEBP', lossless=True, method=6)
    print('tile 11 gravado em', PATH)


if __name__ == '__main__':
    main()
