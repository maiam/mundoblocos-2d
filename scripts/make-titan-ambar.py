"""Arte provisória do Âmbar do Titã (ADR 0073): tiles do atlas de terreno e ícone do Bloco de Âmbar Compactado.

Atlas de terreno (4 colunas, passo 20 px, tile de 16 px com 2 px de borda duplicada, como `titan/mesher.ts` `tileUV`): o atlas passa de 80 × 80 para 80 × 100 (linha 5) e ganha
16 = Veio de Âmbar (rocha violeta com veios alaranjados e brilhos claros, mesma arte nas 6 faces) e 17 = Bloco de Âmbar Compactado (placas de âmbar em todas as faces).
Ícone de 32 px do bloco (id 29) em `assets-src/titan/arte32/Bloco_de_Ambar_Compactado_Item_32px.png` (cubo em vista 3/4, como os outros blocos); rode depois `make-titan-arte32.py`.
Arte provisória gerada por código (determinística, repetível); o dono do produto pode trocar pelos desenhos finais. WebP SEM perdas. Uso: python3 -I scripts/make-titan-ambar.py
"""
import random

from PIL import Image, ImageDraw

PATH = 'src/assets/titan-atlas-16px.webp'
ICON = 'assets-src/titan/arte32/Bloco_de_Ambar_Compactado_Item_32px.png'
PITCH, PAD, TILE = 20, 2, 16
AMBER = [(240, 160, 52), (255, 196, 84), (206, 112, 30)]
GLINT = (255, 232, 160)


def origin(i):
    return (i % 4) * PITCH + PAD, (i // 4) * PITCH + PAD


def put(img, i, t):
    x0, y0 = origin(i)
    img.paste(t, (x0, y0))
    for d in range(1, PAD + 1):  # borda duplicada de 2 px (evita costura no filtro)
        for k in range(TILE):
            img.putpixel((x0 - d, y0 + k), t.getpixel((0, k))); img.putpixel((x0 + TILE - 1 + d, y0 + k), t.getpixel((TILE - 1, k)))
            img.putpixel((x0 + k, y0 - d), t.getpixel((k, 0))); img.putpixel((x0 + k, y0 + TILE - 1 + d), t.getpixel((k, TILE - 1)))


def violet(t):
    px = t.load()
    for y in range(TILE):
        for x in range(TILE):
            r, g, b, a = px[x, y]
            px[x, y] = (min(255, int(r * 1.15 + 14)), int(g * 0.9 + 4), min(255, int(b * 1.2 + 22)), a)
    return t


def vein_tile(base):
    t = violet(base.copy()); px = t.load(); rnd = random.Random(73)
    for k in range(2):  # dois veios em diagonal, com quebras (brilho discreto: a rocha violeta continua à vista)
        x, y = rnd.randrange(0, 5), rnd.randrange(2, 14)
        for _ in range(24):
            px[x % TILE, y % TILE] = AMBER[rnd.randrange(3)] + (255,)
            if rnd.random() < 0.4:
                px[(x + 1) % TILE, y % TILE] = AMBER[2] + (255,)
            if rnd.random() < 0.15:
                px[x % TILE, (y + 1) % TILE] = AMBER[0] + (255,)
            x += 1 if rnd.random() < 0.8 else 0
            y += -1 if rnd.random() < 0.55 else (1 if rnd.random() < 0.4 else 0)
    for _ in range(4):  # brilhos claros: o toque de luz que chama a atenção na penumbra
        px[rnd.randrange(TILE), rnd.randrange(TILE)] = GLINT + (255,)
    return t


def block_tile():
    t = Image.new('RGBA', (TILE, TILE)); px = t.load(); rnd = random.Random(29)
    for cy in range(4):
        for cx in range(4):  # 4 × 4 placas de 4 px: cada uma com um tom, junta escura entre elas
            tone = AMBER[rnd.randrange(3)]
            for dy in range(4):
                for dx in range(4):
                    c = tone
                    if dx == 3 or dy == 3:
                        c = (112, 62, 22)
                    elif dx == 0 and dy == 0:
                        c = GLINT
                    elif rnd.random() < 0.18:
                        c = AMBER[rnd.randrange(3)]
                    px[cx * 4 + dx, cy * 4 + dy] = c + (255,)
    return t


def icon():
    im = Image.new('RGBA', (32, 32), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    top = [(16, 3), (29, 10), (16, 17), (3, 10)]; left = [(3, 10), (16, 17), (16, 30), (3, 23)]; right = [(16, 17), (29, 10), (29, 23), (16, 30)]
    d.polygon(top, fill=(255, 196, 84)); d.polygon(left, fill=(224, 134, 40)); d.polygon(right, fill=(176, 92, 26))
    for poly in (top, left, right):
        d.line(poly + [poly[0]], fill=(60, 30, 10), width=1)
    rnd = random.Random(5)
    for _ in range(14):  # placas e brilhos nas faces
        x, y = rnd.randrange(5, 27), rnd.randrange(8, 26)
        if im.getpixel((x, y))[3]:
            r, g, b, a = im.getpixel((x, y)); im.putpixel((x, y), (min(255, r + 28), min(255, g + 24), b, 255))
    for x, y in ((16, 6), (12, 9), (20, 9), (8, 13)):
        im.putpixel((x, y), GLINT + (255,))
    return im


def main():
    img = Image.open(PATH).convert('RGBA')
    if img.size == (80, 80):
        big = Image.new('RGBA', (80, 100), (0, 0, 0, 0)); big.paste(img, (0, 0)); img = big
    assert img.size == (80, 100), img.size
    ox, oy = origin(4)
    base = img.crop((ox, oy, ox + TILE, oy + TILE)).copy()
    put(img, 16, vein_tile(base)); put(img, 17, block_tile())
    img.save(PATH, 'WEBP', lossless=True, method=6)
    icon().save(ICON)
    print('tiles 16 e 17 gravados em', PATH, '; ícone em', ICON)


if __name__ == '__main__':
    main()
