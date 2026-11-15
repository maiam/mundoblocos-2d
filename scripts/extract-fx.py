#!/usr/bin/env python3
"""Efeitos de golpe do dono do produto (v0.93.102) → tiras de quadros 128 × 128 para o 3D.

Fontes (assets-src/efeitos/, pranchas 4 × 4 de 1254 px; cada quadro tem 313,5 px, recortado com arredondamento): `buraco.png` (cavar), `corte-arvore.png`
(machadada), `espada.png` (golpe de espada, do canto inferior esquerdo ao superior direito; o jogo espelha para a esquerda).
Os pixels quase transparentes trazem cores soltas (vermelho/amarelo) que virariam um halo na filtragem do GPU: aqui a cor deles é refeita a partir
da vizinhança opaca. Quadros usados: buraco 0–11 (os 4 últimos são o buraco parado), árvore 4–13 (pula a estrela grande do começo) e espada 0–11.
Saída: src/assets/fx-dig.webp (12), fx-tree.webp (10), fx-slash.webp (12) quadros de 128 × 128 lado a lado.
Uso: python3 scripts/extract-fx.py
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SRC, OUT = ROOT / 'assets-src' / 'efeitos', ROOT / 'src' / 'assets'
CELL, FRAME = 313.5, 128
SHEETS = {'fx-dig': ('buraco.png', range(0, 12)), 'fx-tree': ('corte-arvore.png', range(4, 14)), 'fx-slash': ('espada.png', range(0, 12))}


def clean(im: Image.Image) -> Image.Image:
    """Refaz o RGB dos pixels pouco opacos a partir da vizinhança (sem halo vermelho/amarelo ao filtrar)."""
    a = np.asarray(im).astype(np.float32)
    al = a[..., 3:4] / 255
    prem = Image.fromarray((a[..., :3] * al).clip(0, 255).astype(np.uint8))
    alpha = Image.fromarray(a[..., 3].astype(np.uint8))
    pb = np.asarray(prem.filter(ImageFilter.GaussianBlur(5))).astype(np.float32)
    ab = np.asarray(alpha.filter(ImageFilter.GaussianBlur(5))).astype(np.float32)[..., None] / 255
    est = np.where(ab > 0.004, pb / np.maximum(ab, 0.004), 0)
    w = np.clip(al / 0.6, 0, 1)                      # opaco mantém a cor; transparente usa a estimativa
    rgb = a[..., :3] * w + est * (1 - w)
    return Image.fromarray(np.dstack([rgb.clip(0, 255), a[..., 3]]).astype(np.uint8), 'RGBA')


for name, (src, frames) in SHEETS.items():
    sheet = Image.open(SRC / src).convert('RGBA')
    strip = Image.new('RGBA', (FRAME * len(frames), FRAME), (0, 0, 0, 0))
    for k, i in enumerate(frames):
        cx, cy = round((i % 4) * CELL), round((i // 4) * CELL)
        f = clean(sheet.crop((cx, cy, cx + round(CELL), cy + round(CELL)))).resize((FRAME, FRAME), Image.LANCZOS)
        strip.alpha_composite(f, (k * FRAME, 0))
    strip.save(OUT / f'{name}.webp', 'WEBP', quality=88, method=6)
    print(name, strip.size)
