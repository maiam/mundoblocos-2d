#!/usr/bin/env python3
"""Importa a arte oficial de um material para assets-src/materiais/<material>/ (Padrão V2, ADR 0023).

Uso: python3 scripts/import-material.py <material> --top arquivo.png [--front arquivo.png] [--overlay arquivo.png]
- Qualquer tamanho quadrado vira 128×128 (redução repetindo a imagem em volta: a emenda do original se mantém).
- Sem --front não se grava frente: o pipeline usa o próprio topo (regra do dono do produto, 2026-11-07).
- Overlay (franja da frente) com alfa, de qualquer tamanho quadrado: o script limpa o ruído do alfa e a cor das bordas
  (resto de recorte, ex.: halo vermelho) e reduz a 128 com alfa pré-multiplicado, repetindo só na horizontal (esquerda
  casa com direita). Franja mais alta que 32 px (contrato): --fit-fringe guarda os 32 px de baixo do desenho (onde fica a
  borda recortada) e sobe para o alto — mantém a proporção das folhas, sem achatar.
Apaga o PROVISORIO.txt da pasta. Depois: python3 scripts/build-materials.py --preview
"""
import argparse
from pathlib import Path

import numpy as np
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


def box_blur(a: np.ndarray, r: int) -> np.ndarray:
    """Média em caixa de lado 2r+1 (borda replicada), em float."""
    k = 2 * r + 1
    for axis in (0, 1):
        pad = [(0, 0)] * a.ndim
        pad[axis] = (r + 1, r)
        c = np.cumsum(np.pad(a, pad, mode='edge'), axis=axis, dtype=np.float64)
        n = a.shape[axis]
        a = ((np.take(c, range(k, k + n), axis=axis) - np.take(c, range(0, n), axis=axis)) / k).astype(np.float32)
    return a


def clean_overlay(img: Image.Image) -> Image.Image:
    """Zera o ruído do alfa e troca a cor dos pixels meio transparentes pela dos vizinhos opacos (sem halo)."""
    a = np.asarray(img.convert('RGBA')).astype(np.float32)
    alpha = a[..., 3]
    alpha[alpha < 10] = 0
    solid = (alpha >= 250).astype(np.float32)
    rgb = a[..., :3]
    r = max(4, img.size[0] // 100)
    num = rgb * solid[..., None]
    den = solid
    for _ in range(3):  # 3 caixas ≈ gaussiana
        num = box_blur(num, r)
        den = box_blur(den, r)
    mean_solid = (rgb * solid[..., None]).sum((0, 1)) / max(float(solid.sum()), 1.0)
    bleed = np.where(den[..., None] > 0.02, num / np.maximum(den[..., None], 1e-6), mean_solid)
    out = np.where((alpha >= 250)[..., None], rgb, bleed)
    return Image.fromarray(np.dstack([out, alpha]).clip(0, 255).astype(np.uint8), 'RGBA')


def overlay128(img: Image.Image) -> Image.Image:
    """Reduz a franja a 128×128: alfa pré-multiplicado, repete em volta só na horizontal (a franja é uma faixa)."""
    if img.size == (SIZE, SIZE):
        return img
    w, h = img.size
    wide = Image.new('RGBA', (w * 3, h))
    for i in range(3):
        wide.paste(img, (i * w, 0))
    wide = wide.convert('RGBa').resize((SIZE * 3, SIZE), Image.LANCZOS).convert('RGBA')
    arr = np.array(wide.crop((SIZE, 0, SIZE * 2, SIZE)))
    arr[arr[..., 3] < 8] = 0  # a redução (Lanczos) deixa alfa mínimo em volta: não conta como franja
    return Image.fromarray(arr, 'RGBA')


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
    ov = overlay128(clean_overlay(Image.open(a.overlay)))
    if a.fit_fringe:
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
