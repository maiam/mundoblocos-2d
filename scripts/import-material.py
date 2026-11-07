#!/usr/bin/env python3
"""Importa a arte oficial de um material para assets-src/materiais/<material>/ (Padrão V2, ADR 0023).

Uso: python3 scripts/import-material.py <material> --top arquivo.png [--front arquivo.png] [--overlay arquivo.png]
- Qualquer tamanho quadrado vira 128×128 (redução repetindo a imagem em volta: a emenda do original se mantém).
- Sem --front não se grava frente: o pipeline usa o próprio topo (regra do dono do produto, 2026-11-07).
- Overlay precisa ter 128×128 com alfa. Franja mais alta que 32 px (contrato): --fit-fringe guarda os 32 px de baixo
  do desenho (onde fica a borda recortada) e sobe para o alto — mantém a proporção das folhas, sem achatar.
Apaga o PROVISORIO.txt da pasta. Depois: python3 scripts/build-materials.py --preview
"""
import argparse
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SIZE = 128
FRINGE = 32  # altura máxima da franja (contrato 02 § 3C)


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
ap.add_argument('--fit-fringe', action='store_true', help='franja > 32 px: guarda os 32 px de baixo do desenho')
a = ap.parse_args()
d = ROOT / 'assets-src' / 'materiais' / a.material
d.mkdir(parents=True, exist_ok=True)
top = to128(a.top)
top.save(d / 'top.png')
if a.front:
    to128(a.front).save(d / 'front.png')
else:
    (d / 'front.png').unlink(missing_ok=True)
if a.overlay:
    ov = Image.open(a.overlay).convert('RGBA')
    if ov.size != (SIZE, SIZE):
        raise SystemExit(f'overlay precisa ter {SIZE}×{SIZE} (veio {ov.size})')
    if a.fit_fringe:
        import numpy as np
        arr = np.asarray(ov)
        rows = np.where(arr[..., 3].max(1) > 0)[0]
        end = int(rows.max()) + 1 if len(rows) else 0
        if end > FRINGE:
            out = np.zeros_like(arr)
            out[:FRINGE] = arr[end - FRINGE:end]
            ov = Image.fromarray(out, 'RGBA')
            print(f'franja {end} px → {FRINGE} px (linhas {end - FRINGE}–{end - 1})')
    ov.save(d / 'front_overlay.png')
(d / 'PROVISORIO.txt').unlink(missing_ok=True)
print(a.material, 'ok')
