"""Conjunto isométrico (ADR 0036, v0.93.140): extrai as 36 peças de `assets-src/iso-set/prancha-iso.png` (fundo transparente).

Saídas (todas em `src/assets/`):
  iso-ground.webp   20 quadrados de 128 px (5 × 4): o TOPO de cada piso (e do bloco de grama, na 20ª casa) "desentortado" do losango isométrico
                    para um quadrado (u = leste, v = sul, norte para cima, como o chão do jogo).
  iso-cube.webp     as duas faces visíveis do bloco de grama, desentortadas (sul | leste), 2 × 128 px.
  iso-props.webp    objetos (árvore, arbustos, pedras, casa…) recortados e empacotados; os retângulos vão para `src/render/isoSetManifest.ts`.
  icon-iso-<chave>.webp   ícone 64 × 64 de cada peça.
As peças são achadas pelos componentes conexos do alfa, ordenados por (linha ≈ y / 60, x); a ordem vale para ESTA prancha.
Uso: python3 scripts/extract-iso-set.py
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

root = Path(__file__).resolve().parent.parent
src = Image.open(root / 'assets-src/iso-set/prancha-iso.png').convert('RGBA')
A = np.asarray(src)
mask = A[..., 3] >= 40
lab, n = ndimage.label(ndimage.binary_dilation(mask, iterations=1))
comps = []
for i, s in enumerate(ndimage.find_objects(lab), 1):
    if (lab[s] == i).sum() > 400:
        comps.append((round(s[0].start / 60), s[1].start, i, s))
comps.sort(key=lambda c: (c[0], c[1]))
KEYS = ['cube_grass', 'g_grass', 'g_dirt', 'g_stone', 'g_edge_a', 'g_edge_b', 'g_edge_c', 'g_edge_d', 'g_edge_e', 'g_stone_plain',
        'p_ns', 'p_ew', 'p_curve_a', 'p_curve_b', 'p_corner', 'house', 'p_t', 'p_cross', 'p_end', 'p_diag', 'p_patch',
        'tree', 'bush_l', 'bush_m', 'bush_s', 'rock_l', 'pebbles', 'tuft', 'daisies', 'lavender', 'lantern', 'stall', 'planter',
        'stone_planter', 'barrel', 'crate']
assert len(comps) == len(KEYS), (len(comps), len(KEYS))
GROUND = ['g_grass', 'g_dirt', 'g_stone', 'g_stone_plain', 'g_edge_a', 'g_edge_b', 'g_edge_c', 'g_edge_d', 'g_edge_e',
          'p_ns', 'p_ew', 'p_curve_a', 'p_curve_b', 'p_corner', 'p_t', 'p_cross', 'p_end', 'p_diag', 'p_patch']
PROPS = ['tree', 'bush_l', 'bush_m', 'bush_s', 'rock_l', 'pebbles', 'tuft', 'daisies', 'lavender', 'lantern', 'stall', 'planter',
         'stone_planter', 'barrel', 'crate', 'house']
pieces = {}
for (_, _, i, s), key in zip(comps, KEYS):
    m = (lab[s] == i)
    rgba = A[s].copy()
    rgba[..., 3] = np.where(m, rgba[..., 3], 0)
    pieces[key] = Image.fromarray(rgba, 'RGBA')

N = 128


def corners(img):
    """Vértices do topo (losango): T (topo), R (direita), L (esquerda), B = L + R − T. Coordenadas na peça."""
    a = np.asarray(img)[..., 3] >= 40
    h, w = a.shape
    cols = np.where(a.any(0))[0]
    xl, xr = cols.min(), cols.max()
    first = lambda x: int(np.argmax(a[:, x]))
    yl = first(min(xl + 3, w - 1))
    yr = first(max(xr - 3, 0))
    rows = np.where(a.any(1))[0]
    yt = rows.min()
    xt = int(np.median(np.where(a[yt + 1])[0])) if a[yt + 1].any() else (xl + xr) // 2
    T = np.array([xt, yt], float)
    L = np.array([xl, yl], float)
    R = np.array([xr, yr], float)
    return T, R, L, L + R - T, a


def affine(img, origin, ex, ey, size=(N, N)):
    """Amostra o paralelogramo origin + u·ex + v·ey (u, v em 0..1) como um quadrado."""
    a = (ex[0] / size[0], ey[0] / size[1], origin[0], ex[1] / size[0], ey[1] / size[1], origin[1])
    return img.convert('RGB').transform(size, Image.AFFINE, a, resample=Image.BICUBIC)


def top_square(img, inset=0.075):
    T, R, L, B, _ = corners(img)
    c = (T + R + L + B) / 4
    k = 1 - inset * 2
    T, R, L = c + (T - c) * k, c + (R - c) * k, c + (L - c) * k
    return affine(img, T, R - T, L - T)


def seamless(img):
    """Torna um piso liso emendável (grama): mistura o quadro com ele mesmo deslocado de meio quadro (peso triangular: 1 no meio, 0 nas bordas)."""
    a = np.asarray(img).astype(np.float32)
    b = np.roll(a, (N // 2, N // 2), axis=(0, 1))
    t = 1 - np.abs(np.linspace(-1, 1, N))
    w = (t[:, None] * t[None, :])[..., None]
    w = np.sqrt(w)  # mantém mais do original no miolo
    return Image.fromarray((a * w + b * (1 - w)).clip(0, 255).astype(np.uint8))


ground_atlas = Image.new('RGB', (5 * N, 4 * N), (0, 0, 0))
for i, key in enumerate(GROUND + ['cube_grass']):
    tile = top_square(pieces[key])
    if key == 'g_grass':
        tile = seamless(tile)
    ground_atlas.paste(tile, ((i % 5) * N, (i // 5) * N))
ground_atlas.save(root / 'src/assets/iso-ground.webp', quality=88)

# Bloco de grama: duas faces laterais abaixo do topo.
cg = pieces['cube_grass']
T, R, L, B, ca = corners(cg)
bottom = np.where(ca.any(1))[0].max()
H = float(bottom - B[1])
inset = 0.03
u0, u1, v0, v1 = 0.07, 0.95, 0.06, 0.88   # recua das bordas: ali o alfa é parcial e a cor da peça está contaminada
south = affine(cg, L + (B - L) * u0 + np.array([0, H * v0]), (B - L) * (u1 - u0), np.array([0, H * (v1 - v0)]))   # face sul: L → B
east = affine(cg, B + (R - B) * u0 + np.array([0, H * v0]), (R - B) * (u1 - u0), np.array([0, H * (v1 - v0)]))    # face leste: B → R
cube = Image.new('RGB', (2 * N, N))
cube.paste(south, (0, 0))
cube.paste(east, (N, 0))
cube.save(root / 'src/assets/iso-cube.webp', quality=88)

# Objetos: prateleiras de largura 1024.
W = 1024
x = y = rowh = 0
manifest = {}
trim = {}
for key in PROPS:
    im = pieces[key]
    bb = im.getbbox()
    im = im.crop(bb)
    trim[key] = im
order = sorted(PROPS, key=lambda k: -trim[k].height)
pad = 3
atlas_h = 0
pos = {}
for key in order:
    im = trim[key]
    if x + im.width + pad > W:
        x = 0; y += rowh + pad; rowh = 0
    pos[key] = (x, y)
    x += im.width + pad
    rowh = max(rowh, im.height)
atlas_h = y + rowh + pad
atlas = Image.new('RGBA', (W, atlas_h), (0, 0, 0, 0))
for key in PROPS:
    atlas.paste(trim[key], pos[key])
    manifest[key] = [pos[key][0], pos[key][1], trim[key].width, trim[key].height]
atlas.save(root / 'src/assets/iso-props.webp', quality=88)

# Ícones 64 × 64.
ALL = ['cube_grass'] + GROUND + PROPS
for key in ALL:
    im = pieces[key].crop(pieces[key].getbbox())
    s = 58 / max(im.width, im.height)
    im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
    ic = Image.new('RGBA', (64, 64), (0, 0, 0, 0))
    ic.alpha_composite(im, ((64 - im.width) // 2, (64 - im.height) // 2))
    ic.save(root / f'src/assets/icon-iso-{key.replace("_", "-")}.webp', lossless=True)

ts = ['// Gerado por scripts/extract-iso-set.py — NÃO EDITE (rode o script de novo).',
      '// Retângulos [x, y, w, h] de cada objeto no atlas `iso-props.webp`.',
      'export const ISO_PROPS_ATLAS: Readonly<Record<string, readonly [number, number, number, number]>> = {']
for k in PROPS:
    ts.append(f"  '{k}': {json.dumps(manifest[k])},")
ts.append('};')
ts.append(f'export const ISO_GROUND_ORDER: readonly string[] = {json.dumps(GROUND + ["cube_grass"])};')
(root / 'src/render/isoSetManifest.ts').write_text('\n'.join(ts) + '\n')
print('ok', len(GROUND), 'pisos,', len(PROPS), 'objetos, altura do atlas', atlas_h, ' H cubo', round(H, 1))
