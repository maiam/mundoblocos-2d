"""Rio das Fadas (ADR 0036, v0.93.147): extrai as peças de água de `assets-src/iso-set/rio-atlas.png` (atlas do Blockbench `rio-das-fadas.bbmodel`).

Cada peça do pacote é uma laje 16 × 16 × 7 com o topo pintado e o código das 4 bordas (norte, leste, sul, oeste): D seco, C canal, F lago. No Santuário
a peça vira um CUBO inteiro: a laje (7/16 da altura) fica em cima e o resto é a base de terra (o tile alto de terra do atlas).

Saídas (em `src/assets/`):
  iso-rio.webp          topos de 128 px (7 por linha, na ordem de `TILES`) + as 3 laterais completas (seco, canal, lago) na linha de baixo.
  icon-iso-rio-canal.webp, icon-iso-rio-lago.webp   ícones 64 × 64 dos pincéis.
A ordem de `TILES` é a de `RIO_PIECES` em `src/world/rio.ts` (um teste confere). Uso: python3 scripts/extract-iso-rio.py
"""
from pathlib import Path

import numpy as np
from PIL import Image

root = Path(__file__).resolve().parent.parent
atlas = Image.open(root / 'assets-src/iso-set/rio-atlas.png').convert('RGB')

PITCH, TILE0 = 164, 3   # os quadrados de 160 px começam em 3 + 164·n (3 px de margem)
# (chave, coluna, linha) no atlas. Ficam de fora: Prado (seco liso), Corredeira e Cascata (relevo 3D) — ver NEXT_STEPS.
TILES = [
    ('poca', 0, 0), ('ninfeias', 1, 0), ('calma', 2, 0), ('ondulada', 3, 0), ('espuma', 4, 0),
    ('canal_ns', 5, 0), ('canal_lo', 6, 0), ('curva_nl', 7, 0), ('curva_no', 8, 0), ('cruz', 9, 0), ('t_nlo', 10, 0),
    ('margem_l', 0, 1), ('margem_o', 1, 1), ('foz_lago', 2, 1), ('baia', 3, 1), ('margem_rasa', 4, 1), ('raso_espuma', 5, 1), ('rochedos', 6, 1),
    ('nascente_l', 9, 1), ('foz', 10, 1),
    ('nascente_s', 0, 2), ('nascente_n', 1, 2), ('margem_n', 2, 2), ('raso_so', 3, 2), ('raso_ne', 4, 2), ('raso_no', 5, 2),
]
N = 128
COLS = 7


def tile(col, row):
    x, y = TILE0 + PITCH * col, TILE0 + PITCH * row
    return atlas.crop((x, y, x + 160, y + 160)).resize((N, N), Image.LANCZOS)


# Laterais: a laje tem 70 px de altura no atlas (7/16 de 160); o resto do cubo é a base de terra (o tile alto de terra, sem a franja de grama).
under = atlas.crop((491, 805 + 70, 641, 965))
strips = {
    'D': atlas.crop((3, 825, 163, 895)),      # seco: terra com franja de grama
    'C': atlas.crop((167, 825, 327, 895)),    # canal: margem de terra, água no meio, margem de terra
    'F': atlas.crop((336, 825, 486, 895)),    # lago: só água
}
LAB = round(N * 70 / 160)                    # altura da laje no cubo de 128 px
faces = {}
for k, strip in strips.items():
    f = Image.new('RGB', (N, N))
    f.paste(under.resize((N, N - LAB + 6), Image.LANCZOS), (0, LAB - 6))
    f.paste(strip.resize((N, LAB), Image.LANCZOS), (0, 0))
    faces[k] = f

sheet = Image.new('RGB', (COLS * N, (len(TILES) + COLS - 1) // COLS * N + N), (0, 0, 0))
for i, (_, c, r) in enumerate(TILES):
    sheet.paste(tile(c, r), ((i % COLS) * N, (i // COLS) * N))
base = (len(TILES) + COLS - 1) // COLS * N
for j, k in enumerate('DCF'):
    sheet.paste(faces[k], (j * N, base))
sheet.save(root / 'src/assets/iso-rio.webp', quality=88)


def icon(top_img, south_img, east_img, name):
    """Cubo isométrico 64 × 64 (topo + faces sul e leste), a mesma projeção da câmera."""
    T, R, L = np.array([32, 5.0]), np.array([59, 20.0]), np.array([5, 20.0])
    B = L + R - T
    H = 22.0
    out = Image.new('RGBA', (64, 64), (0, 0, 0, 0))

    def put(img, origin, ex, ey):
        w, h = img.size
        m = np.array([[ex[0] / w, ey[0] / h], [ex[1] / w, ey[1] / h]])
        inv = np.linalg.inv(m)
        o = inv @ np.asarray(origin)
        coef = (inv[0, 0], inv[0, 1], -o[0], inv[1, 0], inv[1, 1], -o[1])
        rgb = img.convert('RGB').transform((64, 64), Image.AFFINE, coef, resample=Image.BICUBIC)
        mask = Image.new('L', (w, h), 255).transform((64, 64), Image.AFFINE, coef, resample=Image.BILINEAR)
        out.paste(rgb, (0, 0), mask)

    put(south_img, L, B - L, np.array([0, H]))
    put(east_img, B, R - B, np.array([0, H]))
    put(top_img, T, R - T, L - T)
    out.save(root / f'src/assets/{name}.webp', lossless=True)


def shade(img, k):
    return Image.blend(img, Image.new('RGB', img.size, (20, 15, 35)), k)


icon(tile(*TILES[5][1:]), shade(faces['C'], 0.1), shade(faces['D'], 0.24), 'icon-iso-rio-canal')
icon(tile(*TILES[2][1:]), shade(faces['F'], 0.1), shade(faces['F'], 0.24), 'icon-iso-rio-lago')
print('ok', len(TILES), 'peças, folha', sheet.size)
