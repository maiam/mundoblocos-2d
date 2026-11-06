"""Recorte de pranchas transparentes em desenhos soltos (árvores, culturas): usado por extract-trees.py e
extract-crops.py. A grade das pranchas raramente é exata (copas e folhas cruzam as divisas), então os desenhos são
separados por pedaços conectados; pedaços pequenos perto de um desenho vão junto e o resto é ruído do fundo.
"""
from collections import deque

import numpy as np
from PIL import Image

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


def segment(sheet, cols, rows):
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
    # Um desenho por célula da grade: o maior pedaço cujo centro cai nela (estágios minúsculos, como o broto, contam).
    ch, cw = small.shape[0] / rows, small.shape[1] / cols
    best = {}
    for n, b in boxes.items():
        cell = (int(((b[1] + b[3]) / 2) // ch), int(((b[0] + b[2]) / 2) // cw))
        if b[4] >= big * 0.004 and (cell not in best or b[4] > boxes[best[cell]][4]):
            best[cell] = n
    main = list(best.values())
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
    if len(main) != cols * rows:
        raise SystemExit(f'esperava {cols * rows} desenhos, achei {len(main)}')
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


