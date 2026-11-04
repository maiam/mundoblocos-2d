#!/usr/bin/env python3
"""Arte da Cidade do Despertar: recorta as pranchas fornecidas (assets-src/town/*.png) em sprites prontos.

Cada objeto da tabela OBJECTS sai como src/assets/town-<nome>.png com escala fixa de PX_PER_CELL px por célula e o
CENTRO da área de encaixe no centro horizontal da imagem; a base do desenho fica no pé da imagem. O render só
posiciona (render/townArt.ts, TOWN_PX_PER_CELL): nada é esticado nem repetido.

Encaixe (`fit`):
- ('base', cells, frac): a largura do desenho na linha `frac` da altura (0 = topo, 1 = pé) mede `cells` células
  (ex.: a parede/fundação da casa = largura da área; o beiral transborda);
- ('full', cells): a largura total do desenho mede `cells` células.
Fundo: as pranchas já vêm transparentes; `bg=True` remove fundo escuro/semitransparente ligado à borda do recorte
(guarita). Em todos, sobram só as partes grandes (legendas, setas e textos pequenos somem).

Depois rode scripts/optimize-assets.py (PNG → WebP). `--only a,b` recorta só esses objetos. `--preview` grava uma folha de conferência com a área de cada
objeto desenhada sob ele (scratch/town-preview.png).
"""
import sys
from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'assets-src' / 'town'
OUT = ROOT / 'src' / 'assets'
PX_PER_CELL = 48

# nome, prancha, recorte (x0, y0, x1, y1) em px da prancha, encaixe, área (w, d) só para a prévia, remover fundo
OBJECTS = [
    ('house-red-1f', 'houses-red', (0, 0, 724, 690), ('base', 5, 0.95), (5, 5), False),
    ('house-red-2f', 'houses-red', (724, 0, 1448, 690), ('base', 5, 0.95), (5, 5), False),
    ('house-blue-1f', 'houses-blue', (0, 0, 720, 668), ('base', 5, 0.95), (5, 5), False),
    ('house-blue-2f', 'houses-blue', (720, 0, 1448, 668), ('base', 5, 0.95), (5, 5), False),
    ('house-brown-1f', 'houses-brown', (150, 150, 722, 722), ('base', 5, 0.95), (5, 5), False),
    ('house-brown-2f', 'houses-brown', (760, 0, 1370, 722), ('base', 5, 0.95), (5, 5), False),
    ('shop-1f', 'shops', (0, 0, 860, 640), ('base', 5, 0.95), (5, 5), False),
    ('shop-2f', 'shops', (860, 0, 1774, 640), ('base', 5, 0.95), (5, 5), False),
    ('smithy', 'smithy', (200, 0, 1336, 750), ('base', 8, 0.9), (8, 5), False),
    ('guild', 'guild', (0, 0, 1254, 955), ('base', 9, 0.82), (9, 9), False),
    ('castle', 'castle-moat', (0, 0, 1200, 1024), ('full', 26), (26, 17), False),
    ('inn', 'inn', (150, 0, 1390, 752), ('base', 9, 0.95), (9, 5), False),
    ('watchtower', 'watchtower', (90, 0, 670, 1290), ('base', 4, 0.9), (4, 6), True),
    ('bench-3', 'benches', (0, 100, 1010, 660), ('full', 3.7), (3, 1), False),
    ('bench-2', 'benches', (1020, 100, 1774, 660), ('full', 2.5), (2, 1), False),
    ('lamp-stone', 'lamps', (0, 0, 500, 800), ('base', 0.62, 0.7), (1, 1), False),
    ('lamp-wood', 'lamps', (500, 0, 1000, 800), ('base', 0.62, 0.7), (1, 1), False),
    ('lamp-mixed', 'lamps', (990, 0, 1536, 800), ('base', 0.62, 0.7), (1, 1), False),
    ('bush-round', 'bushes', (0, 300, 450, 850), ('full', 1.05), (1, 1), False),
    ('bush-tall', 'bushes', (450, 300, 810, 850), ('full', 0.86), (1, 1), False),
    ('bush-wide', 'bushes', (810, 300, 1448, 850), ('full', 1.6), (1, 1), False),
]


def solid(px, x, y, a_min=128):
    return px[x, y][3] >= a_min


def remove_background(im: Image.Image, step: int = 14) -> None:
    """Fundo ligado à borda do recorte: avança por pixels semitransparentes ou por vizinhos de cor quase igual
    (degradê/halo liso). O contorno escuro do desenho é uma borda forte e segura o avanço (guarita)."""
    w, h = im.size
    px = im.load()
    seen = bytearray(w * h)
    q = deque()
    for x in range(w):
        q.extend([(x, 0, None), (x, h - 1, None)])
    for y in range(h):
        q.extend([(0, y, None), (w - 1, y, None)])
    orig = im.copy().load()
    while q:
        x, y, prev = q.popleft()
        if x < 0 or y < 0 or x >= w or y >= h or seen[y * w + x]:
            continue
        r, g, b, a = orig[x, y]
        if a >= 200 and prev is not None:
            pr, pg, pb = prev
            if abs(r - pr) + abs(g - pg) + abs(b - pb) > step:
                continue
        seen[y * w + x] = 1
        px[x, y] = (0, 0, 0, 0)
        c = (r, g, b)
        q.extend([(x + 1, y, c), (x - 1, y, c), (x, y + 1, c), (x, y - 1, c)])


def keep_large(im: Image.Image, min_share=0.04) -> None:
    """Apaga componentes opacos pequenos (legendas, setas, textos) — fica o desenho principal."""
    w, h = im.size
    px = im.load()
    label = [0] * (w * h)
    sizes = {}
    cur = 0
    for y in range(h):
        for x in range(w):
            if label[y * w + x] or not solid(px, x, y, 40):
                continue
            cur += 1
            n = 0
            q = deque([(x, y)])
            label[y * w + x] = cur
            while q:
                cx, cy = q.popleft()
                n += 1
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if 0 <= nx < w and 0 <= ny < h and not label[ny * w + nx] and solid(px, nx, ny, 40):
                        label[ny * w + nx] = cur
                        q.append((nx, ny))
            sizes[cur] = n
    if not sizes:
        return
    big = max(sizes.values())
    keep = {k for k, n in sizes.items() if n >= big * min_share}
    for y in range(h):
        for x in range(w):
            if label[y * w + x] not in keep:
                px[x, y] = (0, 0, 0, 0)


def extract(name, sheet, box, fit, bg):
    im = Image.open(SRC / f'{sheet}.png').convert('RGBA').crop(box)
    if bg:
        remove_background(im)
    keep_large(im)
    bb = im.getchannel('A').point(lambda v: 255 if v >= 40 else 0).getbbox()
    im = im.crop(bb)
    px = im.load()
    if fit[0] == 'base':
        _, cells, frac = fit
        y = min(im.height - 1, int(im.height * frac))
        xs = [x for x in range(im.width) if solid(px, x, y)]
        x0, x1 = xs[0], xs[-1] + 1
    else:
        _, cells = fit
        x0, x1 = 0, im.width
    s = cells * PX_PER_CELL / (x1 - x0)
    im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
    cx = (x0 + x1) / 2 * s  # centro da área de encaixe na imagem reduzida
    half = max(cx, im.width - cx)
    canvas = Image.new('RGBA', (int(2 * half + 2), im.height))
    canvas.alpha_composite(im, (round(canvas.width / 2 - cx), 0))
    canvas.save(OUT / f'town-{name}.png')
    return canvas


def main() -> None:
    preview = '--preview' in sys.argv
    # `--only nome1,nome2`: recorta só esses objetos (não regrava os demais).
    only = set(sys.argv[sys.argv.index('--only') + 1].split(',')) if '--only' in sys.argv else None
    out = []
    for name, sheet, box, fit, area, bg in OBJECTS:
        if only and name not in only:
            continue
        img = extract(name, sheet, box, fit, bg)
        print(f'{name}: {img.size} → {img.width / PX_PER_CELL:.2f} × {img.height / PX_PER_CELL:.2f} células')
        out.append((name, img, area))
    if preview:
        cols = 5
        cw, ch = 26 * PX_PER_CELL // 2 + 20, 0
        tiles = []
        for name, img, (w, d) in out:
            t = Image.new('RGBA', (img.width + 20, img.height + d * PX_PER_CELL + 30), (60, 120, 60, 255))
            dr = ImageDraw.Draw(t)
            gx = t.width / 2 - w * PX_PER_CELL / 2
            gy = img.height + 10 - d * PX_PER_CELL  # área no chão: termina no pé do desenho
            for i in range(w + 1):
                dr.line([(gx + i * PX_PER_CELL, gy), (gx + i * PX_PER_CELL, gy + d * PX_PER_CELL)], fill=(255, 255, 0, 255))
            for j in range(d + 1):
                dr.line([(gx, gy + j * PX_PER_CELL), (gx + w * PX_PER_CELL, gy + j * PX_PER_CELL)], fill=(255, 255, 0, 255))
            t.alpha_composite(img, (10, 10))
            dr.text((4, t.height - 16), name, fill=(255, 255, 255, 255))
            tiles.append(t)
        W = 2600
        rows, x, y, rh = [], 0, 0, 0
        sheet = Image.new('RGBA', (W, 4000), (30, 30, 30, 255))
        for t in tiles:
            if x + t.width > W:
                x, y, rh = 0, y + rh + 10, 0
            sheet.alpha_composite(t, (x, y))
            x += t.width + 10
            rh = max(rh, t.height)
        sheet = sheet.crop((0, 0, W, y + rh))
        dest = Path(sys.argv[sys.argv.index('--preview') + 1]) if len(sys.argv) > sys.argv.index('--preview') + 1 else ROOT / 'town-preview.png'
        sheet.save(dest)
        print('prévia:', dest)


if __name__ == '__main__':
    main()
