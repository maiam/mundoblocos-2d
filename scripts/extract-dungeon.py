"""Arte da dungeon (montanhas, pedras, blocos e aranhas) → folhas prontas para o jogo.

Cada prancha é dividida em caixas; em cada caixa o desenho é separado do fundo por um de três modos:
  alpha  — a prancha já é transparente (montanhas, blocos);
  light  — fundo claro e pouco saturado (pedras, aranha pequena e grande): flood fill a partir das bordas,
           que também leva a sombra clara/acinzentada desenhada no chão;
  dark   — fundo escuro (aranha gigante): flood fill dos pixels próximos da cor do fundo.
Depois fica só o maior pedaço (descarta números, molduras e respingos) com os buracos internos preenchidos.

Saídas (src/assets/, depois `python3 scripts/optimize-assets.py`):
  dungeon-ground.png    4 topos 64×64 para o chão (terra, teia, ossos, musgo) — da prancha de blocos
  dungeon-props.png     4 blocos com enfeite alto (ovos, cogumelo, espinhos, raízes), quadros 96×128
  dungeon-walls.png     4 cubos de parede (terra, teia, ossos, musgo), quadros 64×100
  dungeon-mountains.png 8 montanhas, quadros 192×192 · dungeon-rocks.png 8 pedras, quadros 128×112
  spider-small.png / spider-big.png / spider-boss.png  8 quadros de caminhada (4×2), base comum

Uso: python3 scripts/extract-dungeon.py   (requer Pillow e numpy)
"""
from collections import deque

import numpy as np
from PIL import Image

SRC = 'assets-src/'
OUT = 'src/assets/'


def grid(w, h, cols, rows, y_edges=None, x_edges=None, pad=0):
    """Caixas da grade. `y_edges` com 2×rows valores = (início, fim) de cada linha (pula legendas entre linhas)."""
    xs = x_edges or [round(i * w / cols) for i in range(cols + 1)]
    ys = y_edges or [round(i * h / rows) for i in range(rows + 1)]
    yr = [(ys[2 * r], ys[2 * r + 1]) for r in range(rows)] if len(ys) == 2 * rows else [(ys[r], ys[r + 1]) for r in range(rows)]
    return [(xs[c] + pad, yr[r][0] + pad, xs[c + 1] - pad, yr[r][1] - pad) for r in range(rows) for c in range(cols)]


def flood(cand):
    """Pixels de `cand` conectados (4-viz.) à borda da imagem — dilatação iterativa vetorizada."""
    reach = np.zeros_like(cand)
    reach[0, :] = cand[0, :]; reach[-1, :] = cand[-1, :]; reach[:, 0] = cand[:, 0]; reach[:, -1] = cand[:, -1]
    while True:
        grown = reach.copy()
        grown[1:, :] |= reach[:-1, :]; grown[:-1, :] |= reach[1:, :]
        grown[:, 1:] |= reach[:, :-1]; grown[:, :-1] |= reach[:, 1:]
        grown &= cand
        if (grown == reach).all():
            return reach
        reach = grown


def largest(mask):
    h, w = mask.shape
    label = np.zeros((h, w), np.int32)
    best, best_n, cur = 0, 0, 0
    for sy, sx in zip(*np.nonzero(mask)):
        if label[sy, sx]:
            continue
        cur += 1
        label[sy, sx] = cur
        q, n = deque([(sy, sx)]), 0
        while q:
            y, x = q.popleft()
            n += 1
            for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not label[ny, nx]:
                    label[ny, nx] = cur
                    q.append((ny, nx))
        if n > best_n:
            best, best_n = cur, n
    return label == best


def fill_small_holes(fg, max_area):
    """Preenche buracos internos menores que `max_area` px (vãos entre patas continuam vazios)."""
    holes = ~fg & ~flood(~fg)
    if not holes.any():
        return fg
    h, w = fg.shape
    seen = np.zeros_like(holes)
    out = fg.copy()
    for sy, sx in zip(*np.nonzero(holes)):
        if seen[sy, sx]:
            continue
        seen[sy, sx] = True
        q, comp = deque([(sy, sx)]), [(sy, sx)]
        while q:
            y, x = q.popleft()
            for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                if 0 <= ny < h and 0 <= nx < w and holes[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True
                    q.append((ny, nx)); comp.append((ny, nx))
        if len(comp) <= max_area:
            for y, x in comp:
                out[y, x] = True
    return out


def cut(img, box, mode, scale, shadow=150, holes=None):
    """Recorta a caixa, reduz por `scale` e devolve RGBA com o fundo removido.
    `shadow`: claridade mínima do que conta como fundo/sombra no modo light (menor = remove sombras mais escuras).
    `holes`: área máxima dos buracos internos preenchidos (None = todos)."""
    crop = img.crop(box)
    crop = crop.resize((max(1, round(crop.width * scale)), max(1, round(crop.height * scale))), Image.LANCZOS)
    a = np.asarray(crop.convert('RGBA')).astype(np.int16)
    rgb, al = a[..., :3], a[..., 3]
    mx, mn = rgb.max(2), rgb.min(2)
    if mode == 'alpha':
        fg = al > 60
    elif mode == 'light':
        bg = flood((mn > shadow) & (mx - mn < 34))
        fg = ~bg & (al > 60)
    else:  # dark
        ref = np.median(np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]]), axis=0)
        near = (np.abs(rgb - ref).sum(2) < 48) | (mx <= ref.max() + 6)  # fundo e sombra (mais escura) no chão
        fg = ~flood(near)
    fg = largest(fg)
    fg = fill_small_holes(fg, holes) if holes is not None else (fg | ~flood(~fg))  # buracos internos
    out = np.dstack([rgb.astype(np.uint8), np.where(fg, al if mode == 'alpha' else 255, 0).astype(np.uint8)])
    return Image.fromarray(out, 'RGBA')


def bbox(im):
    ys, xs = np.nonzero(np.asarray(im)[..., 3] > 0)
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


def variants(cells, fw, fh, name):
    """Variantes independentes: cada uma justa, centrada na largura e apoiada na base do quadro."""
    sheet = Image.new('RGBA', (fw * len(cells), fh))
    for i, im in enumerate(cells):
        im = im.crop(bbox(im))
        k = min(fw / im.width, fh / im.height)
        im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
        sheet.alpha_composite(im, (i * fw + (fw - im.width) // 2, fh - im.height))
    sheet.save(OUT + name, optimize=True)
    print(OUT + name, sheet.size)


def walk(cells, fh, name):
    """Ciclo de caminhada: caixa comum a todos os quadros (sem tremer), 4×2, altura do quadro `fh`."""
    boxes = [bbox(im) for im in cells]
    w = max(b[2] - b[0] for b in boxes)
    h = max(b[3] - b[1] for b in boxes)
    k = fh / h
    fw = round(w * k)
    sheet = Image.new('RGBA', (fw * 4, fh * 2))
    for i, (im, b) in enumerate(zip(cells, boxes)):
        cx = (b[0] + b[2]) / 2
        part = im.crop((round(cx - w / 2), b[3] - h, round(cx - w / 2) + w, b[3]))
        part = part.resize((fw, fh), Image.LANCZOS)
        sheet.alpha_composite(part, ((i % 4) * fw, (i // 4) * fh))
    sheet.save(OUT + name, optimize=True)
    print(OUT + name, sheet.size, f'quadro {fw}x{fh}')


def seamless(tile):
    """Mistura o topo com ele mesmo deslocado meia célula perto das bordas (chão sem emenda visível)."""
    a = np.asarray(tile).astype(np.float32)
    n = a.shape[0]
    rolled = np.roll(np.roll(a, n // 2, 0), n // 2, 1)
    yy, xx = np.mgrid[0:n, 0:n]
    d = np.minimum(np.minimum(xx, n - 1 - xx), np.minimum(yy, n - 1 - yy)) / (n / 2)
    w = np.clip((0.45 - d) / 0.45, 0, 1)[..., None] ** 1.2
    return Image.fromarray((a * (1 - w) + rolled * w).astype(np.uint8))


def ground_tops(cells, seamless_mask):
    """Topo de cada bloco plano → 64×64, recortado bem para dentro (sem o contorno escuro do cubo)."""
    tiles = []
    for im, smooth in zip(cells, seamless_mask):
        x0, y0, x1, y1 = bbox(im)
        g = (x1 - x0) * 0.13
        split = y0 + (y1 - y0) * 0.44
        quad = [(x0 + g, y0 + g * 0.7), (x0 + g, split), (x1 - g, split), (x1 - g, y0 + g * 0.7)]
        t = im.transform((64, 64), Image.QUAD, [v for p in quad for v in p], Image.BICUBIC).convert('RGB')
        tiles.append(seamless(t) if smooth else t)
    atlas = Image.new('RGB', (64 * len(tiles), 64))
    for i, t in enumerate(tiles):
        atlas.paste(t, (i * 64, 0))
    atlas.save(OUT + 'dungeon-ground.png', optimize=True)
    print(OUT + 'dungeon-ground.png', atlas.size)


# ---- Cenário ----
mountains = Image.open(SRC + 'dungeon-mountains-sheet.png')
variants([cut(mountains, b, 'alpha', 0.5) for b in grid(*mountains.size, 4, 2, y_edges=[0, 445, 887])],
         192, 192, 'dungeon-mountains.png')

rocks = Image.open(SRC + 'dungeon-rocks-sheet.png')
variants([cut(rocks, b, 'light', 0.4) for b in grid(*rocks.size, 4, 2, y_edges=[0, 450, 887], pad=4)],
         128, 112, 'dungeon-rocks.png')

blocks = Image.open(SRC + 'dungeon-blocks-sheet.png')
bcells = [cut(blocks, b, 'alpha', 0.5) for b in grid(*blocks.size, 4, 2, y_edges=[0, 440, 887])]
ground_tops([bcells[i] for i in (0, 1, 4, 7)], [True, False, False, True])   # terra, teia, ossos, musgo
variants([bcells[i] for i in (2, 3, 5, 6)], 96, 128, 'dungeon-props.png')  # ovos, cogumelo, espinhos, raízes


def walls(cells, name):
    """Paredes do labirinto: cubo inteiro esticado para a proporção do cubo do jogo (TILE × (TILE + CUBE_FRONT))."""
    sheet = Image.new('RGBA', (64 * len(cells), 100))
    for i, im in enumerate(cells):
        sheet.alpha_composite(im.crop(bbox(im)).resize((64, 100), Image.LANCZOS), (i * 64, 0))
    sheet.save(OUT + name, optimize=True)
    print(OUT + name, sheet.size)


walls([bcells[i] for i in (0, 1, 4, 7)], 'dungeon-walls.png')  # terra, teia, ossos, musgo

# ---- Aranhas (8 quadros de caminhada cada) ----
small = Image.open(SRC + 'spider-small-sheet.png')
walk([cut(small, b, 'light', 0.5, shadow=100, holes=40) for b in grid(*small.size, 4, 2, x_edges=[12, 368, 724, 1080, 1436],
                                                  y_edges=[182, 572, 964], pad=8)], 72, 'spider-small.png')
big = Image.open(SRC + 'spider-big-sheet.png')
walk([cut(big, b, 'light', 0.5, shadow=120, holes=12) for b in grid(*big.size, 4, 2, y_edges=[100, 520, 1040])], 96, 'spider-big.png')
boss = Image.open(SRC + 'spider-boss-sheet.png')
walk([cut(boss, b, 'dark', 0.6, holes=40) for b in grid(*boss.size, 4, 2, x_edges=[620, 1000, 1390, 1760, 2150],
                                                          y_edges=[95, 312, 390, 612])], 144, 'spider-boss.png')
