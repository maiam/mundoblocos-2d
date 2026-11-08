#!/usr/bin/env python3
"""Retratos dos NPCs para a caixa de conversa (v0.92.0): recorta a cabeça do 1º quadro (de frente, parado) da folha
original de cada NPC (`assets-src/npcs/<id>.png`, 4×4) em alta resolução e grava `src/assets/portrait-<id>.png` (192×192,
fundo transparente; a moldura da caixa já traz o fundo azul do círculo). Rode `optimize-assets.py` depois.

Uso: python3 scripts/make-portraits.py [id ...]   (sem ids: todos os arquivos de assets-src/npcs)
O Black (ferreiro) não tem folha original: sua folha é a composição `assets-src/npcs/black.png` (quadros de 120×144) e o
retrato sai dela ampliado.
"""
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'assets-src' / 'npcs'
OUT = 192


def head(frame: Image.Image) -> Image.Image:
    a = np.asarray(frame.getchannel('A')) > 128
    ys, xs = np.nonzero(a)
    top, bottom = ys.min(), ys.max()
    body_h = bottom - top + 1
    # Cabeça = parte de cima do desenho (cabelo + rosto ≈ 45% da altura no chibi).
    cut = top + int(body_h * 0.46)
    hy, hx = np.nonzero(a[:cut])
    x0, x1, y0, y1 = hx.min(), hx.max(), hy.min(), hy.max()
    side = int(max(x1 - x0 + 1, y1 - y0 + 1) * 1.12)
    cx, cy = (x0 + x1) // 2, (y0 + y1) // 2 + int(side * 0.03)
    box = (cx - side // 2, cy - side // 2, cx - side // 2 + side, cy - side // 2 + side)
    canvas = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    canvas.alpha_composite(frame.crop((max(0, box[0]), max(0, box[1]), min(frame.width, box[2]), min(frame.height, box[3]))),
                           (max(0, -box[0]), max(0, -box[1])))
    return canvas.convert('RGBa').resize((OUT, OUT), Image.LANCZOS).convert('RGBA')


def main() -> int:
    ids = sys.argv[1:] or sorted(p.stem for p in SRC.glob('*.png'))
    tmp = Path(tempfile.mkdtemp())
    for n in ids:
        if n == 'black':
            sheet = Image.open(SRC / 'black.png').convert('RGBA')
            frame = sheet.crop((0, 0, sheet.width // 4, sheet.height // 4)).resize((sheet.width, sheet.height), Image.LANCZOS)
        else:
            big = tmp / f'{n}.png'
            subprocess.run([sys.executable, str(ROOT / 'scripts' / 'process-sprite.py'), str(SRC / f'{n}.png'), str(big),
                            '--alpha', '--largest', '--frame-h', '576', '--rows-map', '0,3,1,2'], check=True, capture_output=True)
            sheet = Image.open(big).convert('RGBA')
            frame = sheet.crop((0, 0, sheet.width // 4, sheet.height // 4))
        head(frame).save(ROOT / 'src' / 'assets' / f'portrait-{n}.png')
        print(f'portrait-{n}.png')
    return 0


if __name__ == '__main__':
    sys.exit(main())
