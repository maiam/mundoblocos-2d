#!/usr/bin/env python3
"""Flores fofas do dono do produto (v0.93.97) → tira de quadros para o enfeite `Block.FLOWER`.

Fonte: assets-src/flores/NN-nome.png (um PNG transparente por flor, 360 × 320; base do caule em y = 278, caule em x ≈ 179).
Todas usam a MESMA escala (a mais alta, o Lírio de Lua, fica com 80 px; 128 px = 1 célula, como a cerca → ~0,6 célula): a proporção entre as
flores se mantém. Saída: src/assets/flowers.webp = N quadros 96 × 96 lado a lado, na ordem do número do arquivo; a base do caule fica em (48, 92).
Flor nova: ponha NN-nome.png na pasta e rode de novo (o jogo lê a quantidade de quadros pela largura da tira).
Uso: python3 scripts/extract-flowers.py
"""
import glob
import re
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
FRAME = 96
OUTLINE = (58, 72, 66)  # contorno extra (v0.93.97): o traço original some na redução; este o reforça por fora
OUTLINE_PX = 5          # MaxFilter (ímpar): 5 = ~2 px de arte de contorno
BASE_Y, STEM_X = 278, 179
files = sorted(glob.glob(str(ROOT / 'assets-src' / 'flores' / '[0-9][0-9]-*.png')), key=lambda f: int(re.search(r'/(\d\d)-', f).group(1)))
ims = [Image.open(f).convert('RGBA') for f in files]
tops = [np.nonzero(np.asarray(im)[..., 3] > 40)[0].min() for im in ims]
scale = 80 / (BASE_Y - min(tops))
strip = Image.new('RGBA', (FRAME * len(ims), FRAME), (0, 0, 0, 0))
for i, im in enumerate(ims):
    s = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
    strip.alpha_composite(s, (i * FRAME + FRAME // 2 - round(STEM_X * scale), 92 - round(BASE_Y * scale)))
# contorno: silhueta dilatada em OUTLINE_COLOR por trás do desenho
alpha = strip.getchannel('A').point(lambda v: 255 if v > 24 else 0).filter(ImageFilter.MaxFilter(OUTLINE_PX))
base = Image.new('RGBA', strip.size, OUTLINE + (0,))
base.putalpha(alpha)
base.alpha_composite(strip)
strip = base
strip.save(ROOT / 'src' / 'assets' / 'flowers.webp', 'WEBP', quality=90, method=6)
print(len(ims), 'flores, escala', round(scale, 3))
