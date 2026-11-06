#!/usr/bin/env python3
"""Coraçõezinhos do namoro dos animais: prancha 4×4 transparente → tira de 16 quadros.

  assets-src/love-hearts-sheet.png → src/assets/love-hearts.png (16 quadros FRAME_W × FRAME_H numa fileira, ordem de
  leitura). Todos os quadros usam a mesma janela (união do desenho de todas as células), então os corações sobem e
  somem no lugar certo; o pé do quadro fica no chão, entre o casal (render/character.ts → `love-hearts`).
  Os quadros finais desbotam: o tom é clareado onde o alfa é baixo (sem isso o rosa fica amarronzado sobre a grama).
Uso: python3 scripts/extract-love.py && python3 scripts/optimize-assets.py
"""
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
FRAME_W = 192

a = np.asarray(Image.open(ROOT / 'assets-src' / 'love-hearts-sheet.png').convert('RGBA')).astype(np.float32)
H, W = a.shape[:2]
cw, ch = W // 4, H // 4
alpha = a[..., 3]
alpha[alpha < 12] = 0
# Clareia o tom proporcional à transparência (pixels desbotando puxam para o rosa claro).
k = (1 - alpha / 255.0)[..., None] * 0.8
pink = np.array([255, 170, 190], np.float32)
a[..., :3] = a[..., :3] * (1 - k) + pink * k
cells = [a[r * ch:(r + 1) * ch, c * cw:(c + 1) * cw] for r in range(4) for c in range(4)]
union = np.zeros((ch, cw), bool)
for cell in cells:
    union |= cell[..., 3] > 0
ys, xs = np.nonzero(union)
x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
# Janela centrada na horizontal (o centro do quadro = meio do casal).
half = max(cw // 2 - x0, x1 - cw // 2)
x0, x1 = cw // 2 - half, cw // 2 + half
k = FRAME_W / (x1 - x0)
fh = round((y1 - y0) * k)
out = Image.new('RGBA', (FRAME_W * 16, fh))
for i, cell in enumerate(cells):
    im = Image.fromarray(np.clip(cell, 0, 255).astype(np.uint8), 'RGBA').crop((x0, y0, x1, y1))
    out.alpha_composite(im.resize((FRAME_W, fh), Image.LANCZOS), (i * FRAME_W, 0))
out.save(ROOT / 'src' / 'assets' / 'love-hearts.png', optimize=True)
print('coracoes', out.size, 'janela', (x0, y0, x1, y1))
