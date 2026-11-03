"""Extrai as faces dos cubos da prancha de blocos para a vista 3/4 do jogo.

Fonte padrão: assets-src/blocks-sheet-34.png (prancha já em 3/4, escolhida). A prancha
isométrica antiga (assets-src/blocks-sheet.png) continua suportada com --iso:

- topo (losango T-R-C-L) → quadrado 64×64 (usado como chão e como topo do cubo);
- face esquerda (L-C-B-BL) → retângulo 64×36 (face frontal do cubo), usando só a
  parte de cima da face (menos achatamento);
- ícone do cubo inteiro (fundo removido) → src/assets/icon-block-<nome>.png.

A geometria vem de um gabarito medido no cubo de terra e é ancorada no centro da
base de cada cubo (as folhas do cubo de grama passam do contorno e enganariam a medição).

Uso: python3 scripts/extract-blocks.py [--iso | --sheet34 PRANCHA] [--out ATLAS]   (requer Pillow e numpy)
  Santuário (prancha 3/4 com fundo transparente, grade 6×3):
  python3 scripts/extract-blocks.py --celestial   → src/assets/celestial-atlas.png + icon-celestial-*.png
  --sheet34: prancha já em 3/4 (topo + frente, sem lateral). Topo e frente são recortados direto
  (sem perspectiva); o topo, desenhado achatado, é esticado para a célula quadrada do jogo.
"""
import argparse
from collections import deque

import numpy as np
from PIL import Image

_ap = argparse.ArgumentParser()
_ap.add_argument('--sheet34', default='assets-src/blocks-sheet-34.png')
_ap.add_argument('--iso', action='store_true', help='usar a prancha isométrica antiga')
_ap.add_argument('--celestial', action='store_true', help='prancha 3/4 transparente do Santuário (6×3)')
_ap.add_argument('--out', default='src/assets/blocks-atlas.png')
_ap.add_argument('--icons', action='store_true', default=True)
ARGS = _ap.parse_args()
if ARGS.iso:
    ARGS.sheet34 = None

CELESTIAL_NAMES = [
    'cloud-solid', 'cloud-ethereal', 'marble-celestial', 'marble-ornate', 'stone-celestial', 'stone-golden',
    'grass-celestial', 'grass-flowery', 'moss-luminous', 'earth-sacred', 'earth-floral', 'earth-cultivated',
    'water-sacred', 'water-crystal', 'crystal-life', 'light-block', 'wood-celestial', 'foliage-golden',
]
# Desenhos com direção/centro (molduras, sulcos, anéis, emblemas): no chão não giram nem misturam.
CELESTIAL_ORIENTED = {'marble-ornate', 'stone-golden', 'earth-cultivated', 'water-crystal', 'crystal-life',
                      'light-block', 'wood-celestial'}
CELESTIAL_TOP_RATIO = 0.46
# Chão que cobre áreas enormes (nuvens): contraste reduzido para a repetição não formar padrão.
CELESTIAL_SOFT_GROUND = {'cloud-solid', 'cloud-ethereal'}  # topo ≈ 46% da altura do cubo (medido na prancha)
SRC = ARGS.sheet34 or 'assets-src/blocks-sheet.png'
NAMES = ['dirt', 'grass', 'tilled', 'path', 'sand', 'stone', 'oak-log', 'oak-planks']
TOP = 64           # lado do topo (TILE × TEX_RES)
FRONT_H = 36       # altura da face frontal (CUBE_FRONT × TEX_RES)
FRONT_FRACTION = 0.62  # parte da face lateral usada (de cima para baixo)
INSET = 0.06       # recuo para deixar de fora o contorno escuro da arte
GROUND_INSET = 0.14  # recuo maior para o chão: só o miolo da face
# Prancha 3/4 (medida): corpo ≈ 1,17 × largura; topo ≈ 51,5% do corpo.
TOP34_BODY = 1.17
TOP34_RATIO = 0.515
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
rows = [(150, 600), (600, 1060)] if ARGS.sheet34 else [(220, 640), (640, 1060)]
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
    if ARGS.sheet34:
        # Prancha 3/4: caixa do corpo (a grama transborda por cima → topo pela base do cubo).
        bx0, bx1 = xs.min() + x0, xs.max() + x0
        body_h = TOP34_BODY * (bx1 - bx0)
        ty = ymax - body_h
        split = ty + TOP34_RATIO * body_h
        ix = (bx1 - bx0) * 0.03
        q = lambda xa, ya, xb, yb: [(xa, ya), (xa, yb), (xb, yb), (xb, ya)]
        top = warp(q(bx0 + ix, ty + ix, bx1 - ix, split), (TOP, TOP))
        gi = (bx1 - bx0) * 0.09
        grounds.append(warp(q(bx0 + gi, ty + gi * 0.7, bx1 - gi, split - gi * 0.5), (TOP, TOP)))
        front = warp(q(bx0 + ix * 0.6, split, bx1 - ix * 0.6, ymax - ix * 0.6), (TOP, FRONT_H))
    else:
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
    if ARGS.out == 'src/assets/blocks-atlas.png' and not ARGS.celestial:
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
if not ARGS.celestial:
    atlas.save(ARGS.out, optimize=True)
    print(ARGS.out, atlas.size)


def soften(tile, strength=0.55):
    """Aproxima o tile da sua média (borrada) — mantém a textura, tira o padrão marcado."""
    from PIL import ImageFilter
    blur = tile.filter(ImageFilter.GaussianBlur(3))
    mean = Image.new('RGB', tile.size, tuple(int(v) for v in np.asarray(tile).reshape(-1, 3).mean(0)))
    calm = Image.blend(blur, mean, 0.4)
    return Image.blend(tile, calm, strength)


def _longest_run(idx):
    best, start, prev = (idx[0], idx[0]), idx[0], idx[0]
    for v in list(idx[1:]) + [None]:
        if v is None or v != prev + 1:
            if prev - start > best[1] - best[0]:
                best = (start, prev)
            if v is not None:
                start = v
        if v is not None:
            prev = v
    return best


def extract_celestial(src='assets-src/celestial-blocks-34.png', out='src/assets/celestial-atlas.png'):
    """Prancha 3/4 transparente em grade 6×3: caixa do cubo pelo maior trecho opaco contínuo de cada célula
    (ignora respingos e o vizinho que invade a célula); topo/frente cortados pela proporção medida."""
    sheet = Image.open(src).convert('RGBA')
    rgba = np.asarray(sheet).copy()
    rgba[..., 3][rgba[..., 3] < 40] = 0
    sheet = Image.fromarray(rgba, 'RGBA')
    al = rgba[..., 3]
    Hs, Ws = al.shape
    rows = [(0, Hs // 3 + 28), (Hs // 3 + 28, 2 * Hs // 3 - 24), (2 * Hs // 3 - 24, Hs)]
    tops_c, fronts_c, grounds_c = [], [], []
    for i, name in enumerate(CELESTIAL_NAMES):
        r, c = divmod(i, 6)
        y0, y1 = rows[r]
        x0, x1 = max(0, int(c * Ws / 6) - 30), min(Ws, int((c + 1) * Ws / 6) + 30)
        m = al[y0:y1, x0:x1] > 200
        cx0, cx1 = _longest_run(np.nonzero(m.sum(0) > m.shape[0] * 0.35)[0])
        cy0, cy1 = _longest_run(np.nonzero(m.sum(1) > m.shape[1] * 0.2)[0])
        bx0, bx1, by0, by1 = cx0 + x0, cx1 + x0, cy0 + y0, cy1 + y0
        split = by0 + CELESTIAL_TOP_RATIO * (by1 - by0)
        k = (bx1 - bx0) * 0.035
        quad = lambda xa, ya, xb, yb: [(xa, ya), (xa, yb), (xb, yb), (xb, ya)]
        warp_s = lambda q, size: sheet.transform(size, Image.QUAD, [v for p in q for v in p], Image.BICUBIC)
        tops_c.append(warp_s(quad(bx0 + k, by0 + k, bx1 - k, split), (TOP, TOP)))
        g = (bx1 - bx0) * 0.1
        grounds_c.append(warp_s(quad(bx0 + g, by0 + g * 0.6, bx1 - g, split - g * 0.4), (TOP, TOP)))
        fronts_c.append(warp_s(quad(bx0 + k * 0.6, split, bx1 - k * 0.6, by1 - k * 0.6), (TOP, FRONT_H)))
        # Ícone: o cubo inteiro (com o que transborda por cima, ex.: folhagem).
        cell = sheet.crop((x0, y0, x1, y1))
        ca = np.asarray(cell)[..., 3]
        ys, xs = np.nonzero(ca > 0)
        icon = cell.crop((max(cx0 - 6, xs.min()), ys.min(), min(cx1 + 7, xs.max() + 1), ys.max() + 1))
        f = 64 / max(icon.size)
        icon = icon.convert('RGBa').resize((round(icon.width * f), round(icon.height * f)), Image.LANCZOS).convert('RGBA')
        icon.save(f'src/assets/icon-celestial-{name}.png', optimize=True)
    atlas_c = Image.new('RGBA', (TOP * len(CELESTIAL_NAMES), TOP + FRONT_H + TOP))
    for i, name in enumerate(CELESTIAL_NAMES):
        atlas_c.paste(tops_c[i], (i * TOP, 0))
        atlas_c.paste(fronts_c[i], (i * TOP, TOP))
        gr = grounds_c[i].convert('RGB')
        gr = gr if name in CELESTIAL_ORIENTED else seamless(gr)
        if name in CELESTIAL_SOFT_GROUND:
            gr = soften(gr)
        atlas_c.paste(gr, (i * TOP, TOP + FRONT_H))
    atlas_c.convert('RGB').save(out, optimize=True)
    print(out, atlas_c.size, '+ 18 ícones')


if ARGS.celestial:
    extract_celestial()
