#!/usr/bin/env python3
"""Pranchas de crescimento (carvalho, macieira, cacto): grade 4 × 2 transparente → folha de quadros iguais.

  assets-src/trees/<nome>.png → src/assets/tree-<nome>.png (4 × 2 quadros de FRAME × FRAME px).
Cada quadro mantém o tamanho relativo da prancha (estágios menores continuam menores) e fica com a base do desenho
centrada no pé do quadro. O fundo é limpo: alfa fraco some e só fica o maior pedaço conectado de cada célula (mais os
pedaços grandes, como flores soltas encostadas). O render escolhe o quadro por estágio/variante (render/textures.ts).
Uso: python3 scripts/extract-trees.py && python3 scripts/optimize-assets.py
"""
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC, OUT = ROOT / 'assets-src' / 'trees', ROOT / 'src' / 'assets'
NAMES = ['oak', 'apple', 'cactus']
COLS, ROWS = 4, 2
FRAME = 192
ALPHA_MIN = 90


def components(mask):
    """Rótulos de 4-vizinhança (BFS) numa máscara reduzida; devolve (rótulos, tamanhos)."""
    h, w = mask.shape
    lab = np.zeros((h, w), np.int32)
    sizes = [0]
    n = 0
    for y0, x0 in zip(*np.nonzero(mask)):
        if lab[y0, x0]:
            continue
        n += 1
        size = 0
        q = deque([(y0, x0)])
        lab[y0, x0] = n
        while q:
            y, x = q.popleft()
            size += 1
            for yy, xx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                if 0 <= yy < h and 0 <= xx < w and mask[yy, xx] and not lab[yy, xx]:
                    lab[yy, xx] = n
                    q.append((yy, xx))
        sizes.append(size)
    return lab, sizes


def segment(sheet):
    """Os 8 desenhos da prancha inteira (a grade da prancha não é exata: copas cruzam as divisas).

    Pedaços grandes = desenhos; pedaços pequenos perto de um desenho (flores, frutas no chão) vão junto; o resto é
    ruído do fundo. Devolve [(imagem limpa, caixa)] na ordem de leitura (linha de cima, depois a de baixo).
    """
    a = np.asarray(sheet).copy()
    alpha = a[..., 3]
    alpha[alpha < ALPHA_MIN] = 0
    small = alpha[::2, ::2] > 0
    lab, sizes = components(small)
    big = max(sizes[1:])
    boxes = {}
    for n in range(1, len(sizes)):
        if sizes[n] < big * 0.0015:
            continue
        ys, xs = np.nonzero(lab == n)
        boxes[n] = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1, sizes[n])
    main = [n for n, b in boxes.items() if b[4] >= big * 0.08]
    owner = {n: n for n in main}
    for n, b in boxes.items():
        if n in owner:
            continue
        cx, cy = (b[0] + b[2]) / 2, (b[1] + b[3]) / 2
        pad = 12
        for m in main:
            mb = boxes[m]
            if mb[0] - pad <= cx <= mb[2] + pad and mb[1] - pad <= cy <= mb[3] + pad:
                owner[n] = m
                break
    if len(main) != COLS * ROWS:
        raise SystemExit(f'esperava {COLS * ROWS} desenhos, achei {len(main)}')
    mid = small.shape[0] / 2
    order = sorted(main, key=lambda m: ((boxes[m][1] + boxes[m][3]) / 2 > mid, (boxes[m][0] + boxes[m][2]) / 2))
    out = []
    for m in order:
        keep = np.isin(lab, [n for n, o in owner.items() if o == m])
        km = np.repeat(np.repeat(keep, 2, axis=0), 2, axis=1)[: alpha.shape[0], : alpha.shape[1]]
        b = a.copy()
        b[..., 3] = np.where(km, alpha, 0)
        ys, xs = np.nonzero(b[..., 3])
        out.append((Image.fromarray(b, 'RGBA'), (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)))
    return out


for name in NAMES:
    sheet = Image.open(SRC / f'{name}.png').convert('RGBA')
    cells = segment(sheet)
    # Escala única para a prancha inteira: o maior desenho cabe no quadro (com folga).
    span = max(max(b[2] - b[0], b[3] - b[1]) for _, b in cells)
    k = FRAME * 0.96 / span
    out = Image.new('RGBA', (FRAME * COLS, FRAME * ROWS))
    for i, (im, (x0, y0, x1, y1)) in enumerate(cells):
        part = im.crop((x0, y0, x1, y1))
        part = part.resize((max(1, round(part.width * k)), max(1, round(part.height * k))), Image.LANCZOS)
        fx, fy = (i % COLS) * FRAME, (i // COLS) * FRAME
        out.alpha_composite(part, (fx + (FRAME - part.width) // 2, fy + FRAME - part.height))
    out.save(OUT / f'tree-{name}.png', optimize=True)
    print(name, 'escala', round(k, 3), 'quadros', [(round((b[2] - b[0]) * k), round((b[3] - b[1]) * k)) for _, b in cells])


# Ícones dos itens (64 × 64): mudas = 1º estágio da prancha; maçã = maior fruta vermelha da macieira carregada.
def icon(im, n=64, margin=0.06):
    ys, xs = np.nonzero(np.asarray(im)[..., 3] > 0)
    im = im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    k = n * (1 - 2 * margin) / max(im.size)
    im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
    out = Image.new('RGBA', (n, n))
    out.alpha_composite(im, ((n - im.width) // 2, (n - im.height) // 2))
    return out


for name in ('oak', 'apple'):
    sheet = Image.open(OUT / f'tree-{name}.png')
    icon(sheet.crop((0, 0, FRAME, FRAME))).save(OUT / f'icon-item-{name}-sapling.png', optimize=True)

src = Image.open(SRC / 'apple.png').convert('RGBA')
cells = segment(src)
im, (x0, y0, x1, y1) = cells[3]  # macieira grande com frutas
a = np.asarray(im.crop((x0, y0, x1, y1))).astype(int)
red = (a[..., 0] > 170) & (a[..., 1] < 90) & (a[..., 2] < 90) & (a[..., 3] > 200)
lab, sizes = components(red)
n = int(np.argmax(sizes[1:])) + 1
ys, xs = np.nonzero(lab == n)
cx, cy = (xs.min() + xs.max()) // 2, (ys.min() + ys.max()) // 2
# Só a fruta: disco em volta da mancha vermelha (inclui brilho e contorno), sem as folhas em volta.
rad = max(xs.max() - xs.min(), ys.max() - ys.min()) / 2 * 1.08
yy, xx = np.mgrid[0:a.shape[0], 0:a.shape[1]]
m = (xx - cx) ** 2 + (yy - cy) ** 2 <= rad * rad
b = a.copy()
b[..., 3] = np.where(m, b[..., 3], 0)
fruit = Image.fromarray(b.astype(np.uint8), 'RGBA')
icon(fruit).save(OUT / 'icon-item-apple.png', optimize=True)
print('ícones: mudas e maçã')
