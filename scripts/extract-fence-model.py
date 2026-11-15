#!/usr/bin/env python3
"""Cerca de estacas do modelo do Blockbench (v0.93.96): `assets-src/cerca-betula/*.bbmodel` → 3 tiras de 5 quadros + ícones.

O modelo (estacas de 4 × 17 u, travessas em 2 alturas, 12 u = 1 célula) é renderizado com Three.js (Chromium do Playwright) na câmera do jogo
(oblíqua K = 1, norte para cima) e revestido com as tábuas do `materials-v2.webp` (uma por madeira; `scripts/fence-model/render.html`).
Saída (128 px por célula; quadro 128 × 232, base da estaca em (64, 208)):
  src/assets/fence.webp (Carvalho), fence-betula.webp, fence-cerejeira.webp  — 5 quadros: 0 horizontal (estaca + travessas ←→), 1 vertical
      (estaca + travessas ↑↓), 2 estaca, 3 braço norte (só travessas, ↑), 4 braço sul (só travessas, ↓; desenhado por cima da estaca).
  src/assets/icon-block-fence.webp, icon-block-fence-betula.webp, icon-block-fence-cerejeira.webp (64 × 64).
Requer: node + playwright (global) e `npm ci` (three). Uso: python3 scripts/extract-fence-model.py
"""
import shutil, subprocess, tempfile
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'src' / 'assets'
WOODS = {'carvalho': ('tabuas-de-carvalho', 'fence.webp', 'icon-block-fence.webp', 'fence-gate.webp'),
         'betula': ('tabuas-de-betula', 'fence-betula.webp', 'icon-block-fence-betula.webp', 'fence-gate-betula.webp'),
         'cerejeira': ('tabuas-de-cerejeira', 'fence-cerejeira.webp', 'icon-block-fence-cerejeira.webp', 'fence-gate-cerejeira.webp')}
PIECES = ['horizontal', 'vertical', 'post', 'armn', 'arms']

import json
mats = json.loads((OUT / 'materials-v2.json').read_text())
sheet = Image.open(OUT / 'materials-v2.webp').convert('RGBA')
cell = mats['cell']
work = Path(tempfile.mkdtemp(prefix='cerca-modelo-'))
renders = work / 'renders'
models = ROOT / 'assets-src' / 'cerca-betula'
shutil.copy(next(models.glob('cerca-*.bbmodel')), work / 'model.json')
shutil.copy(next(models.glob('portao-*.bbmodel')), work / 'gate.json')
for wood, (mat, _, _, _) in WOODS.items():
    i = mats['materials'].index(mat)
    sheet.crop((i * cell, mats['rows']['top'][0], (i + 1) * cell, mats['rows']['top'][0] + cell)).save(work / f'top-{wood}.png')
    sheet.crop((i * cell, mats['rows']['front'][0], (i + 1) * cell, mats['rows']['front'][0] + cell)).save(work / f'front-{wood}.png')
subprocess.run(['node', str(ROOT / 'scripts' / 'fence-model' / 'render.cjs'), str(work), str(renders)], check=True, cwd=ROOT)

for wood, (_, strip_name, icon_name, gate_name) in WOODS.items():
    strip = Image.new('RGBA', (128 * 5, 232), (0, 0, 0, 0))
    for i, p in enumerate(PIECES):
        strip.alpha_composite(Image.open(renders / f'{wood}-{p}.png').convert('RGBA'), (i * 128, 0))
    strip.save(OUT / strip_name, 'WEBP', quality=90, method=6)
    im = Image.open(renders / f'{wood}-horizontal.png').convert('RGBA')
    im = im.crop(im.getchannel('A').point(lambda v: 255 if v > 20 else 0).getbbox())
    k = 56 / max(im.size)
    im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
    c = Image.new('RGBA', (64, 64), (0, 0, 0, 0))
    c.alpha_composite(im, ((64 - im.width) // 2, (64 - im.height) // 2))
    c.save(OUT / icon_name, 'WEBP', quality=90, method=6)
    gate = Image.new('RGBA', (192 * 5, 300), (0, 0, 0, 0))   # 5 poses (0°, 22,5°, 45°, 67,5°, 90°) 192 × 300; base das estacas em (96, 278)
    for i in range(5):
        gate.alpha_composite(Image.open(renders / f'{wood}-gate-{i}.png').convert('RGBA'), (i * 192, 0))
    gate.save(OUT / gate_name, 'WEBP', quality=90, method=6)
    if wood == 'carvalho':
        im = Image.open(renders / 'carvalho-gate-0.png').convert('RGBA')
        im = im.crop(im.getchannel('A').point(lambda v: 255 if v > 20 else 0).getbbox())
        k = 56 / max(im.size)
        im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
        c = Image.new('RGBA', (64, 64), (0, 0, 0, 0))
        c.alpha_composite(im, ((64 - im.width) // 2, (64 - im.height) // 2))
        c.save(OUT / 'icon-block-fence-gate.webp', 'WEBP', quality=90, method=6)
shutil.rmtree(work)
print('ok: 3 tiras de cerca, 3 de portão e 4 ícones')
