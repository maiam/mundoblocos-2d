"""Extrai as faces dos cubos da prancha isométrica (assets-src/blocks-sheet.png)
para a vista 3/4 do jogo:

- topo (losango T-R-C-L) → quadrado 64×64 (usado como chão e como topo do cubo);
- face esquerda (L-C-B-BL) → retângulo 64×36 (face frontal do cubo), usando só a
  parte de cima da face (menos achatamento);
- ícone do cubo inteiro (fundo removido) → src/assets/icon-block-<nome>.png.

A geometria vem de um gabarito medido no cubo de terra e é ancorada no centro da
base de cada cubo (as folhas do cubo de grama passam do contorno e enganariam a medição).

Uso: python3 scripts/extract-blocks.py   (requer Pillow e numpy)
"""
from collections import deque

import numpy as np
from PIL import Image

SRC = 'assets-src/blocks-sheet.png'
NAMES = ['dirt', 'grass', 'tilled', 'path', 'sand', 'stone', 'oak-log', 'oak-planks']
TOP = 64           # lado do topo (TILE × TEX_RES)
FRONT_H = 36       # altura da face frontal (CUBE_FRONT × TEX_RES)
FRONT_FRACTION = 0.62  # parte da face lateral usada (de cima para baixo)
INSET = 0.06       # recuo para deixar de fora o contorno escuro da arte
GROUND_INSET = 0.14  # recuo maior para o chão: só o miolo da face
# Materiais com direção (sulcos, anéis, tábuas): no chão não giram nem são misturados.
ORIENTED = {'tilled', 'oak-log', 'oak-planks'}

img = Image.open(SRC).convert('RGB')
arr = np.asarray(img).astype(int)
mx, mn = arr.max(2), arr.min(2)
bg_like = ((mx - mn) < 14) & (mn > 215)
H, W = bg_like.shape

# Gabarito (relativo ao centro da base B, largura de referência 273 px), medido no cubo de terra.
REF_W = 273.0
TPL = {
    'T': (0, -324), 'L': (-143.5, -250), 'R': (143.5, -259), 'C': (0, -176),
    'BL': (-143.5, -78), 'BR': (143.5, -83), 'B': (0, 0),
}


def flood_bg(x0, y0, x1, y1):
    like = bg_like[y0:y1, x0:x1]
    h, w = like.shape
    bg = np.zeros((h, w), bool)
    q = deque((y, x) for y in range(h) for x in (0, w - 1) if like[y, x])
    q.extend((y, x) for x in range(w) for y in (0, h - 1) if like[y, x])
    for y, x in q:
        bg[y, x] = True
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and not bg[ny, nx] and like[ny, nx]:
                bg[ny, nx] = True
                q.append((ny, nx))
    return ~bg


def lerp(a, b, t):
    return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)


def inset_quad(q, k):
    cx = sum(p[0] for p in q) / 4
    cy = sum(p[1] for p in q) / 4
    return [lerp(p, (cx, cy), k) for p in q]


def warp(quad, size):
    """quad = [canto sup-esq, inf-esq, inf-dir, sup-dir] da origem → retângulo `size`."""
    data = [v for p in quad for v in p]
    return img.transform(size, Image.QUAD, data, Image.BICUBIC)


tops, fronts, grounds = [], [], []
rows = [(220, 640), (640, 1060)]
for i, name in enumerate(NAMES):
    r, c = divmod(i, 4)
    x0, x1 = int(c * W / 4), int((c + 1) * W / 4)
    y0, y1 = rows[r]
    fg = flood_bg(x0, y0, x1, y1)
    ys, xs = np.nonzero(fg)
    ymax = ys.max() + y0
    # Vértices inferiores esquerdo/direito: extremos laterais na faixa baixa do cubo.
    low = ys > (ys.max() - 0.3 * (ys.max() - ys.min()))
    blx, brx = xs[low].min() + x0, xs[low].max() + x0
    cx = (blx + brx) / 2
    s = (brx - blx) / REF_W
    P = {k: (cx + v[0] * s, ymax + v[1] * s) for k, v in TPL.items()}

    top = warp(inset_quad([P['L'], P['C'], P['R'], P['T']], INSET), (TOP, TOP))
    # Chão: miolo do topo, sem nenhum contorno (base da versão contínua).
    grounds.append(warp(inset_quad([P['L'], P['C'], P['R'], P['T']], GROUND_INSET), (TOP, TOP)))
    bottom_l = lerp(P['L'], P['BL'], FRONT_FRACTION)
    bottom_r = lerp(P['C'], P['B'], FRONT_FRACTION)
    front = warp(inset_quad([P['L'], bottom_l, bottom_r, P['C']], INSET * 0.6), (TOP, FRONT_H))
    tops.append(top)
    fronts.append(front)

    # Ícone: cubo inteiro sem fundo.
    rgba = np.dstack([arr[y0:y1, x0:x1].astype(np.uint8), (fg * 255).astype(np.uint8)])
    yy, xx = np.nonzero(fg)
    icon = Image.fromarray(rgba[yy.min():yy.max() + 1, xx.min():xx.max() + 1], 'RGBA')
    k = 64 / max(icon.size)
    icon = icon.convert('RGBa').resize((round(icon.width * k), round(icon.height * k)), Image.LANCZOS).convert('RGBA')
    icon.save(f'src/assets/icon-block-{name}.png', optimize=True)

def seamless(tile):
    """Versão contínua para o chão: mistura o topo com ele mesmo deslocado meia
    célula, usando o deslocado perto das bordas (onde ficam as emendas)."""
    a = np.asarray(tile).astype(np.float32)
    rolled = np.roll(np.roll(a, TOP // 2, 0), TOP // 2, 1)
    yy, xx = np.mgrid[0:TOP, 0:TOP]
    d = np.minimum(np.minimum(xx, TOP - 1 - xx), np.minimum(yy, TOP - 1 - yy)) / (TOP / 2)
    w = np.clip((0.42 - d) / 0.42, 0, 1)[..., None] ** 1.2  # 1 na borda → 0 a ~40% para dentro
    return Image.fromarray((a * (1 - w) + rolled * w).astype(np.uint8))


# Linha 0: topo do cubo · linha 1: face frontal · linha 2: chão contínuo.
atlas = Image.new('RGB', (TOP * len(NAMES), TOP + FRONT_H + TOP))
for i in range(len(NAMES)):
    atlas.paste(tops[i], (i * TOP, 0))
    atlas.paste(fronts[i], (i * TOP, TOP))
    g = grounds[i] if NAMES[i] in ORIENTED else seamless(grounds[i])
    atlas.paste(g, (i * TOP, TOP + FRONT_H))
atlas.save('src/assets/blocks-atlas.png', optimize=True)
print('src/assets/blocks-atlas.png', atlas.size, '+ 8 ícones')
