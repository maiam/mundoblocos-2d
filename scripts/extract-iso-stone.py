#!/usr/bin/env python3
"""Bloco de Pedra isométrico (ADR 0036, v0.93.143): o cubo 1×1×1 de `assets-src/iso-set/blocos-pedra.png` (as outras peças da prancha — 1×1×2, 2×2×2,
3×2×1, 5×5×1 — são o mesmo bloco empilhado e não viram blocos: o jogo empilha).

Mesma técnica do `extract-iso-set.py`: o topo e as duas faces visíveis (sul = esquerda, leste = direita) saem "desentortados" do losango/paralelogramo
isométrico para quadrados de 128 px. Saídas: `src/assets/iso-stone.webp` (3 quadrados em 1 linha: topo, sul, leste) e `icon-iso-stone-block.webp` (64 px).
"""
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

root = Path(__file__).resolve().parent.parent
src = Image.open(root / 'assets-src/iso-set/blocos-pedra.png').convert('RGBA')
A = np.asarray(src)
rgb = A[..., :3].astype(int)
fg = (A[..., 3] > 40) & ~((rgb.min(2) > 235) & (rgb.max(2) - rgb.min(2) < 14))
lab, n = ndimage.label(ndimage.binary_dilation(fg, iterations=2))
# o cubo 1×1×1 é a peça do canto superior esquerdo (x < 400, y < 420, ~195 × 190)
box = None
for i, s in enumerate(ndimage.find_objects(lab), 1):
    w, h = s[1].stop - s[1].start, s[0].stop - s[0].start
    if s[1].start < 400 and s[0].start < 300 and 150 < w < 260 and 150 < h < 260:
        box = (i, s)
assert box, 'cubo 1×1×1 não encontrado'
i, s = box
m = (lab[s] == i) & fg[s]
piece = Image.fromarray(np.dstack([A[s][..., :3], np.where(m, 255, 0).astype(np.uint8)]), 'RGBA')
a = np.asarray(piece)[..., 3] >= 40
h, w = a.shape
cols = np.where(a.any(0))[0]
xl, xr = cols.min(), cols.max()
first = lambda x: int(np.argmax(a[:, x]))
yl, yr = first(xl + 6), first(xr - 6)
rows = np.where(a.any(1))[0]
yt, bottom = rows.min(), rows.max()
xt = int(np.median(np.where(a[yt + 3])[0]))
T, R, L = np.array([xt, yt + 2], float), np.array([xr - 2, yr], float), np.array([xl + 2, yl], float)
B = L + R - T
H = float(bottom - B[1])
N = 128


def affine(origin, ex, ey):
    co = (ex[0] / N, ey[0] / N, origin[0], ex[1] / N, ey[1] / N, origin[1])
    flat = Image.new('RGB', piece.size, (150, 140, 130))   # o que sobra fora do desenho (arestas) fica com a cor da pedra, nunca transparente
    flat.paste(piece, mask=piece.getchannel('A'))
    return flat.transform((N, N), Image.AFFINE, co, resample=Image.BICUBIC)


k = 0.03
c = (T + R + L + B) / 4
top = affine(c + (T - c) * (1 - 2 * k), (R - T) * (1 - 2 * k), (L - T) * (1 - 2 * k))
u0, u1, v0, v1 = 0.06, 0.94, 0.07, 0.9
south = affine(L + (B - L) * u0 + np.array([0, H * v0]), (B - L) * (u1 - u0), np.array([0, H * (v1 - v0)]))
east = affine(B + (R - B) * u0 + np.array([0, H * v0]), (R - B) * (u1 - u0), np.array([0, H * (v1 - v0)]))


def bond(face):
    """Lateral emendável (v0.93.144): do desenho da face (laje de cima + 1 fiada de tijolos) fica só a fiada, que vira 2 fiadas em amarração
    (a de baixo deslocada meio tijolo, com a volta da borda). As bordas da fiada são juntas (e a de cima é a sombra da junta), então
    a textura emenda em u (lado a lado) e em v (cubo sobre cubo) sem a laje repetida a cada cubo."""
    course = face.crop((0, int(N * 0.47), N, N)).resize((N, N // 2), Image.LANCZOS)
    out = Image.new('RGB', (N, N))
    out.paste(course, (0, 0))
    out.paste(course, (N // 2, N // 2))
    out.paste(course, (-N // 2, N // 2))
    return out


atlas = Image.new('RGB', (3 * N, N))
for j, f in enumerate((top, bond(south), bond(east))):
    atlas.paste(f, (j * N, 0))
atlas.save(root / 'src/assets/iso-stone.webp', quality=90)

crop = piece.crop(piece.getbbox())
sc = 58 / max(crop.size)
crop = crop.resize((max(1, round(crop.width * sc)), max(1, round(crop.height * sc))), Image.LANCZOS)
ic = Image.new('RGBA', (64, 64), (0, 0, 0, 0))
ic.alpha_composite(crop, ((64 - crop.width) // 2, (64 - crop.height) // 2))
ic.save(root / 'src/assets/icon-iso-stone-block.webp', lossless=True)
print('ok: cubo', piece.size, 'altura da face', round(H, 1))
