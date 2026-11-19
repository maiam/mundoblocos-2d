"""Acrescenta ao atlas do Titã os dois tiles de veio natural (ADR 0044): rocha com marca mineral e gelo com nervura azulada.

Atlas: 4 colunas, passo 20 px, tile de 16 px com 2 px de borda duplicada (como `titan/mesher.ts` `tileUV`). Tiles 0–7 são o terreno original;
8 = rocha com veio (linha 3, coluna 1), 9 = gelo com veio. O script parte dos tiles 4 (rocha) e 5 (gelo) e desenha por cima, então é repetível:
se o atlas já tem 80 × 60, só regrava os tiles 8 e 9. WebP SEM perdas (não passa pelo optimize-assets.py).
Uso: python3 -I scripts/make-titan-veins.py [--preview prancha.png]
"""
import sys
from PIL import Image

PATH = 'src/assets/titan-atlas-16px.webp'
PITCH, PAD, TILE = 20, 2, 16


def origin(i):
    return (i % 4) * PITCH + PAD, (i // 4) * PITCH + PAD


def tile(img, i):
    x, y = origin(i)
    return img.crop((x, y, x + TILE, y + TILE)).copy()


def put(img, i, t):
    x, y = origin(i)
    img.paste(t, (x, y))
    for k in range(1, PAD + 1):  # borda duplicada de 2 px (evita costura com filtro Nearest e névoa)
        for d in range(TILE):
            img.putpixel((x - k, y + d), t.getpixel((0, d))); img.putpixel((x + TILE - 1 + k, y + d), t.getpixel((TILE - 1, d)))
            img.putpixel((x + d, y - k), t.getpixel((d, 0))); img.putpixel((x + d, y + TILE - 1 + k), t.getpixel((d, TILE - 1)))
    for k in range(1, PAD + 1):
        for j in range(1, PAD + 1):
            img.putpixel((x - k, y - j), t.getpixel((0, 0))); img.putpixel((x + TILE - 1 + k, y - j), t.getpixel((TILE - 1, 0)))
            img.putpixel((x - k, y + TILE - 1 + j), t.getpixel((0, TILE - 1))); img.putpixel((x + TILE - 1 + k, y + TILE - 1 + j), t.getpixel((TILE - 1, TILE - 1)))


def draw(t, pts, col):
    for (x, y) in pts:
        if 0 <= x < TILE and 0 <= y < TILE:
            t.putpixel((x, y), col)


def rock_vein(base):
    t = base.copy()
    dark, mid, light, glint = (74, 38, 24, 255), (190, 112, 58, 255), (238, 168, 96, 255), (255, 226, 160, 255)
    band = [(2, 12), (3, 11), (4, 10), (5, 9), (6, 8), (7, 7), (8, 6), (9, 5), (10, 4), (11, 3), (12, 2)]
    draw(t, [(x + 1, y + 1) for x, y in band], dark)           # sombra do veio (um pixel abaixo e à direita)
    draw(t, band, mid)
    draw(t, [(5, 9), (8, 6), (11, 3)], light)
    draw(t, [(4, 11), (6, 9), (7, 8), (9, 6), (10, 5), (4, 9), (9, 7), (3, 12)], mid)  # engrossa de forma irregular
    draw(t, [(12, 8), (13, 8), (12, 9), (3, 4), (4, 4), (4, 5)], mid)                 # pepitas soltas
    draw(t, [(8, 6), (12, 8), (4, 4)], glint)
    return t


def ice_vein(base):
    t = base.copy()
    deep, mid, light = (46, 104, 186, 255), (96, 170, 236, 255), (206, 240, 255, 255)
    for x0, tip, lean in ((3, 3, 1), (8, 1, 0), (12, 4, -1)):  # três nervuras que sobem e terminam em ponta
        h = 14 - tip
        for k in range(h):
            y = 14 - k
            x = x0 + (lean if k > h // 2 else 0)
            wide = k < h // 3                                  # a base é mais larga; a ponta termina em 1 px
            draw(t, [(x, y)], deep if wide else mid)
            if wide: draw(t, [(x + 1, y)], mid)
        draw(t, [(x0 + lean, tip)], light)
    draw(t, [(6, 8), (10, 9), (7, 12), (11, 12)], light)       # reflexos no gelo
    return t


def main():
    img = Image.open(PATH).convert('RGBA')
    assert img.size in ((80, 40), (80, 60)), f'atlas inesperado: {img.size}'
    if img.size == (80, 40):
        big = Image.new('RGBA', (80, 60), (0, 0, 0, 0))
        big.paste(img, (0, 0))
        img = big
    rock, ice = tile(img, 4), tile(img, 5)
    put(img, 8, rock_vein(rock))
    put(img, 9, ice_vein(ice))
    img.save(PATH, 'WEBP', lossless=True, method=6)
    print(PATH, img.size)
    if '--preview' in sys.argv:
        out = sys.argv[sys.argv.index('--preview') + 1]
        pv = Image.new('RGBA', (4 * 56, 48), (0, 0, 0, 255))
        for n, i in enumerate((4, 8, 5, 9)):
            pv.paste(tile(img, i).resize((48, 48), Image.NEAREST), (n * 56, 0))
        pv.save(out)


if __name__ == '__main__':
    main()
