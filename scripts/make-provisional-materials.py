#!/usr/bin/env python3
"""Texturas PROVISÓRIAS no formato do Padrão de Materiais V2 (128×128), tiradas do atlas atual.

Só para testar o pipeline e a cena de escala antes de a arte oficial chegar (assets-src/materiais/CONTRATO.md).
Gera, para areia, terra e grama:
  assets-src/materiais/<material>/top.png    — chão contínuo do atlas (64×64) ampliado para 128×128;
  assets-src/materiais/<material>/front.png  — face frontal (64×36) ampliada para 128×72 no topo; resto transparente;
  assets-src/materiais/grama/front_overlay.png — só a franja verde da frente da grama (alfa fora dela).
Cada pasta ganha um PROVISORIO.txt: troque os PNGs pela arte oficial e apague o aviso.
Uso: python3 scripts/make-provisional-materials.py && python3 scripts/build-materials.py
"""
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'assets-src' / 'materiais'
TOP, FRONT = 64, 36  # atlas atual (TEX_RES 2): topo 64×64, frente 64×36, chão contínuo na 3ª linha
COLS = {'terra': 0, 'grama': 1, 'areia': 4}  # ordem de MATERIALS em world/blocks.ts



def wrap_resize(img: Image.Image, w: int, h: int, vertical: bool = True) -> Image.Image:
    """Amplia repetindo a imagem em volta (a borda continua no lado oposto, sem 'esticar' o pixel da borda)."""
    iw, ih = img.size
    ny = 3 if vertical else 1
    big = Image.new('RGBA', (iw * 3, ih * ny))
    for i in range(3):
        for j in range(ny):
            big.paste(img, (i * iw, j * ih))
    big = big.resize((w * 3, h * ny), Image.LANCZOS)
    return big.crop((w, h if vertical else 0, w * 2, h * 2 if vertical else h))


atlas = Image.open(ROOT / 'src' / 'assets' / 'blocks-atlas.webp').convert('RGBA')
for name, col in COLS.items():
    d = OUT / name
    d.mkdir(parents=True, exist_ok=True)
    x = col * TOP
    # 2 px de margem: o WebP mistura a cor da coluna vizinha nas bordas (fio verde na terra).
    ground = atlas.crop((x + 2, TOP + FRONT + 2, x + TOP - 2, TOP + FRONT + TOP - 2))
    wrap_resize(ground, 128, 128).save(d / 'top.png')
    front = wrap_resize(atlas.crop((x + 2, TOP, x + TOP - 2, TOP + FRONT)), 128, 72, vertical=False)
    f = Image.new('RGBA', (128, 128))
    f.paste(front, (0, 0))
    f.save(d / 'front.png')
    if name == 'grama':
        a = np.asarray(f).copy()
        r, g, b = (a[..., i].astype(int) for i in range(3))
        green = (g > r + 8) & (g > b)
        green[40:] = False  # franja só na parte de cima da frente
        a[..., 3] = np.where(green, a[..., 3], 0)
        Image.fromarray(a, 'RGBA').save(d / 'front_overlay.png')
    (d / 'PROVISORIO.txt').write_text(
        'Arte PROVISÓRIA gerada do atlas antigo (scripts/make-provisional-materials.py).\n'
        'Substitua pelos PNGs oficiais 128x128 do Padrão V2 e apague este aviso.\n')
    print(name, 'ok')
