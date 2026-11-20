"""Tiles do Braseiro de Rocha (ADR 0065) no atlas de terreno do Titã: 15 = revestimento de carapaça (ADR 0066, escamas); 12 = lateral (rocha violeta em blocos), 13 = topo apagado (cuba escura com cinza e brasas mortas), 14 = topo aceso (cuba com a brasa de âmbar
brilhando). O atlas passa de 80 × 60 para 80 × 80 (4 × 4 tiles de 16 px, passo 20, 2 px de borda duplicada; `titan/mesher.ts` lê `ATLAS_H = 80`). Parte do tile 4 (rocha) e do 11 (veio de cobre, sem os veios).
Conceito: `assets-src/titan/conceito/Braseiro_de_Rocha.png`. Repetível (regrava só os tiles 12–14). WebP SEM perdas. Uso: python3 -I scripts/make-titan-braseiro.py
"""
import random

from PIL import Image

PATH = 'src/assets/titan-atlas-16px.webp'
PITCH, PAD, TILE = 20, 2, 16


def origin(i):
    return (i % 4) * PITCH + PAD, (i // 4) * PITCH + PAD


def put(img, i, t):
    x0, y0 = origin(i)
    img.paste(t, (x0, y0))
    for d in range(1, PAD + 1):  # borda duplicada de 2 px
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


def main():
    img = Image.open(PATH).convert('RGBA')
    if img.size == (80, 60):
        big = Image.new('RGBA', (80, 80), (0, 0, 0, 0)); big.paste(img, (0, 0)); img = big
    assert img.size == (80, 80), img.size
    x, y = origin(4)
    base = violet(img.crop((x, y, x + TILE, y + TILE)).copy())
    rnd = random.Random(21)
    # 12: lateral — blocos de rocha com juntas escuras e riscos cor de cobre
    side = base.copy(); p = side.load()
    for k in range(TILE):
        p[k, 5] = (52, 40, 62, 255); p[k, 11] = (52, 40, 62, 255)
        p[(k * 3 + 2) % TILE, 2] = (52, 40, 62, 255); p[(k * 5 + 7) % TILE, 8] = (52, 40, 62, 255)
    for _ in range(9):
        p[rnd.randrange(TILE), rnd.randrange(TILE)] = (176, 96, 48, 255)
    put(img, 12, side)
    # 13 e 14: topo — borda de rocha de 3 px e cuba de 10 × 10
    for tile, lit in ((13, False), (14, True)):
        t = base.copy(); q = t.load()
        for yy in range(3, 13):
            for xx in range(3, 13):
                d = max(abs(xx - 7.5), abs(yy - 7.5))
                q[xx, yy] = (28, 22, 34, 255) if d > 3.5 else ((70, 58, 74, 255) if not lit else (120, 52, 24, 255))
        for _ in range(6 if not lit else 0):
            q[rnd.randrange(4, 12), rnd.randrange(4, 12)] = (90, 84, 92, 255)  # cinza
        if lit:
            for yy in range(5, 11):
                for xx in range(5, 11):
                    d = abs(xx - 7.5) + abs(yy - 7.5)
                    q[xx, yy] = (255, 214, 96, 255) if d < 2.5 else (255, 160, 56, 255) if d < 4 else (226, 104, 36, 255)
            q[7, 7] = q[8, 8] = (255, 244, 190, 255)
        put(img, tile, t)
    # 15: revestimento de carapaça (ADR 0066) — fileiras de placas sobrepostas (escamas) sobre rocha violeta
    t = base.copy(); q = t.load()
    for row in range(4):
        for col in range(4):
            cx, cy = col * 4 + (2 if row % 2 else 0), row * 4
            for yy in range(4):
                for xx in range(5):
                    px, py = (cx + xx) % TILE, cy + yy
                    c = (150, 84, 52) if (yy == 3 or xx == 0) else (118, 78, 110)
                    q[px, py] = (c[0] + rnd.randrange(-8, 9), c[1] + rnd.randrange(-6, 7), c[2] + rnd.randrange(-8, 9), 255)
    put(img, 15, t)
    img.save(PATH, 'WEBP', lossless=True, method=6)
    print('tiles 12–15 gravados em', PATH, img.size)


if __name__ == '__main__':
    main()
