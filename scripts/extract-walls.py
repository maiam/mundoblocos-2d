#!/usr/bin/env python3
"""Paredes: prancha de 8 pedras (cada uma em 3 alturas) + prancha de 8 materiais → coluna alta de cada uma + ícones.

  assets-src/stone-walls-sheet.png (4 fileiras × 2 grupos; em cada grupo, cubo baixo, médio e alto) →
  src/assets/walls.png (8 quadros FRAME_W × FRAME_H, base do desenho no pé do quadro, na ordem das pedras do jogo:
  Bruta, Irregular, Tijolo, Chão (lajotas), Lisa, Polida, Rachada, Tijolo Rachado) e src/assets/icon-block-wall-<n>.png.
  assets-src/material-walls-sheet.png (2 fileiras × 4 colunas sobre fundo escuro, sem transparência: Terra, Grama,
  Terra Arada, Terra Batida / Areia, Pedra com Musgo, Tronco, Tábuas) → quadros 8…15 da mesma tira e ícones 8…15.
  O fundo é recortado pelo contorno escuro de cada bloco (`material_parts`).
  Só a coluna mais alta de cada grupo é usada (parede = 3 de altura, decisão do dono do produto). O render tira o
  contorno do lado que encosta em outra parede (parede contínua; render/textures.ts → `wallTextures`).
Uso: python3 scripts/extract-walls.py && python3 scripts/optimize-assets.py
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))
from sprite_segments import ALPHA_MIN, components  # noqa: E402

FRAME_W = 96
OUT = ROOT / 'src' / 'assets'

a = np.asarray(Image.open(ROOT / 'assets-src' / 'stone-walls-sheet.png').convert('RGBA')).copy()
alpha = a[..., 3]
alpha[alpha < ALPHA_MIN] = 0
lab, sizes = components(alpha[::2, ::2] > 0)
big = max(sizes[1:])
boxes = []
for n in range(1, len(sizes)):
    if sizes[n] < big * 0.05:
        continue
    ys, xs = np.nonzero(lab == n)
    boxes.append((n, xs.min() * 2, ys.min() * 2, xs.max() * 2 + 2, ys.max() * 2 + 2))
H, W = alpha.shape
# Grupo = (fileira pela base, metade esquerda/direita); a mais alta de cada grupo é a parede.
groups = {}
for b in boxes:
    row = int((b[4] / H) * 4)
    col = 0 if (b[1] + b[3]) / 2 < W / 2 else 1
    key = (min(row, 3), col)
    if key not in groups or (b[4] - b[2]) > (groups[key][4] - groups[key][2]):
        groups[key] = b
order = [groups[(r, c)] for r in range(4) for c in range(2)]
assert len(order) == 8, groups.keys()
parts = []
for n, x0, y0, x1, y1 in order:
    keep = np.repeat(np.repeat(lab == n, 2, axis=0), 2, axis=1)[:H, :W]
    b = a.copy()
    b[..., 3] = np.where(keep, alpha, 0)
    parts.append(Image.fromarray(b, 'RGBA').crop((x0, y0, x1, y1)))

# Prancha de materiais: caixa de cada bloco (px da prancha, contorno incluído), na ordem de `WALL_MATERIALS` 8…15.
MATERIAL_BOXES = [(283, 26, 477, 487), (532, 25, 739, 487), (793, 26, 1000, 487), (1053, 26, 1252, 487),
                  (279, 525, 478, 988), (532, 525, 741, 988), (790, 525, 1004, 988), (1053, 525, 1255, 988)]


def first_dark(vals, ref, k=0.7):
    """Primeiro px bem mais escuro que o fundo logo fora do bloco (o contorno)."""
    for i, v in enumerate(vals):
        if v < k * ref:
            return i
    return None


def material_parts():
    """Recorta cada bloco da prancha de fundo escuro: de cada borda para dentro até o contorno (linha e coluna)."""
    src = np.asarray(Image.open(ROOT / 'assets-src' / 'material-walls-sheet.png').convert('RGBA')).copy()
    lum = src[..., :3].astype(int).sum(2)
    res = []
    for x0, y0, x1, y1 in MATERIAL_BOXES:
        X0, Y0, X1, Y1 = x0 - 8, y0 - 8, x1 + 9, y1 + 9
        sub = lum[Y0:Y1, X0:X1]
        h, w = sub.shape

        def scan(lines):
            def fix(z):  # falhas (tufos de grama, flores) viram a vizinhança; mediana tira picos
                z = np.array([np.nan if q is None else q for q in z], float)
                idx = np.arange(len(z))
                ok = ~np.isnan(z)
                z = np.interp(idx, idx[ok], z[ok])
                return np.array([np.median(z[max(0, i - 3):i + 4]) for i in idx]).round().astype(int)
            return (fix([first_dark(v[:60], v[0]) for v in lines]),
                    fix([first_dark(v[::-1][:60], v[-1]) for v in lines]))
        lft, rgt = scan(sub)
        top, bot = scan(sub.T)
        xs, ys = np.arange(w)[None, :], np.arange(h)[:, None]
        keep = (xs >= lft[:, None]) & (xs < w - rgt[:, None]) & (ys >= top[None, :]) & (ys < h - bot[None, :])
        crop = src[Y0:Y1, X0:X1].copy()
        crop[..., 3] = np.where(keep, 255, 0)
        res.append(Image.fromarray(crop, 'RGBA').crop(Image.fromarray(crop, 'RGBA').getbbox()))
    return res


parts += material_parts()
# Cada parede ocupa a largura inteira do quadro (= 1 célula): vizinhas encostam sem fresta.
# Todas com a altura das de pedra (parede = 3 de altura): as da prancha de materiais vêm mais esguias e são achatadas.
stone_h = round(np.median([p.height * FRAME_W / p.width for p in parts[:8]]))
heights = [round(p.height * FRAME_W / p.width) if i < 8 else stone_h for i, p in enumerate(parts)]
frame_h = max(heights)
strip = Image.new('RGBA', (FRAME_W * len(parts), frame_h))
for i, p in enumerate(parts):
    q = p.resize((FRAME_W, heights[i]), Image.LANCZOS)
    strip.alpha_composite(q, (i * FRAME_W, frame_h - q.height))
    icon = Image.new('RGBA', (64, 64))
    s = 60 / max(p.size)
    qi = p.resize((max(1, round(p.width * s)), max(1, round(p.height * s))), Image.LANCZOS)
    icon.alpha_composite(qi, ((64 - qi.width) // 2, (64 - qi.height) // 2))
    icon.save(OUT / f'icon-block-wall-{i}.png', optimize=True)
strip.save(OUT / 'walls.png', optimize=True)
print('paredes', strip.size, [p.size for p in parts])
