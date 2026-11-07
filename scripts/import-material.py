#!/usr/bin/env python3
"""Importa a arte oficial de um material para assets-src/materiais/<material>/ (Padrão V2, ADR 0023).

Uso: python3 scripts/import-material.py <material> --top arquivo.png [--front arquivo.png] [--overlay arquivo.png]
- Qualquer tamanho quadrado vira 128×128 (redução repetindo a imagem em volta: a emenda do original se mantém).
- Sem --front, a frente usa o próprio topo (contrato 02 § 5: vale se a janela 128×64 funciona como frente).
- Overlay é copiado como veio (precisa já ter 128×128 com alfa).
Apaga o PROVISORIO.txt da pasta. Depois: python3 scripts/build-materials.py --preview
"""
import argparse
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SIZE = 128


def to128(path: str) -> Image.Image:
    img = Image.open(path).convert('RGBA')
    if img.size == (SIZE, SIZE):
        return img
    w, h = img.size
    big = Image.new('RGBA', (w * 3, h * 3))
    for i in range(3):
        for j in range(3):
            big.paste(img, (i * w, j * h))
    big = big.resize((SIZE * 3, SIZE * 3), Image.LANCZOS)
    return big.crop((SIZE, SIZE, SIZE * 2, SIZE * 2))


ap = argparse.ArgumentParser()
ap.add_argument('material')
ap.add_argument('--top', required=True)
ap.add_argument('--front')
ap.add_argument('--overlay')
a = ap.parse_args()
d = ROOT / 'assets-src' / 'materiais' / a.material
d.mkdir(parents=True, exist_ok=True)
top = to128(a.top)
top.save(d / 'top.png')
(to128(a.front) if a.front else top).save(d / 'front.png')
if a.overlay:
    ov = Image.open(a.overlay).convert('RGBA')
    if ov.size != (SIZE, SIZE):
        raise SystemExit(f'overlay precisa ter {SIZE}×{SIZE} (veio {ov.size})')
    ov.save(d / 'front_overlay.png')
(d / 'PROVISORIO.txt').unlink(missing_ok=True)
print(a.material, 'ok')
