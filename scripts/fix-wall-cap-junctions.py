"""Limpa as junções coluna × fileira das tampas de parede (cap_XX, 128 × 128; ADR 0027).

Problema: nas tampas em que uma COLUNA (vizinho norte e/ou sul) encontra uma FILEIRA (vizinho leste e/ou oeste), a arte desenhava
a franja clara da borda norte da fileira (e as marcas escuras da faixa) atravessando o miolo da coluna. Na junção, a linha reta
deve sumir: dentro da largura do miolo da coluna o desenho é o miolo liso (`cap_05`).

Regra (por máscara N=1 L=2 S=4 O=8): se (N ou S) e (L ou O) — onde a coluna toca a fileira — o intervalo x do miolo [CORE0, CORE1) é copiado de
`cap_05`: com vizinho NORTE, nas linhas da faixa da fileira (y de Z0 até a aresta inferior, mantida se a coluna termina ali); sem vizinho norte
(canto de cima), só na aresta inferior da fileira, que cruzaria o miolo da coluna que segue para o sul (o fechamento do topo fica).
Uso: python3 scripts/fix-wall-cap-junctions.py assets-src/paredes/tabuas
"""
import os
import shutil
import sys

import numpy as np
from PIL import Image

D = sys.argv[1] if len(sys.argv) > 1 else 'assets-src/paredes/tabuas'
Z0, Z1 = 42, 86
CORE0, CORE1 = 27, 103
KEEP = 3  # linhas da aresta inferior mantidas quando a coluna termina na fileira
bk = os.path.join(D, 'antes-juncoes')
os.makedirs(bk, exist_ok=True)
col = np.asarray(Image.open(os.path.join(D, 'cap_05.png')).convert('RGBA'))
changed = []
for m in range(16):
    n, e, s, w = (m & 1) != 0, (m & 2) != 0, (m & 4) != 0, (m & 8) != 0
    if not ((n or s) and (e or w)):
        continue
    src = os.path.join(D, f'cap_{m:02d}.png')
    if not os.path.exists(os.path.join(bk, f'cap_{m:02d}.png')):
        shutil.copy(src, os.path.join(bk, f'cap_{m:02d}.png'))
    img = np.asarray(Image.open(os.path.join(bk, f'cap_{m:02d}.png')).convert('RGBA')).copy()
    if n:   # coluna chega do norte: a linha do topo da fileira e as marcas da faixa somem dentro do miolo
        y0, y1 = Z0, (Z1 + KEEP if s else Z1 - KEEP)
    else:   # coluna parte para o sul (canto de cima): o fechamento do topo fica; só some a aresta inferior que cruza o miolo
        y0, y1 = Z1 - KEEP, Z1 + KEEP
    img[y0:y1, CORE0:CORE1] = col[y0:y1, CORE0:CORE1]
    Image.fromarray(img, 'RGBA').save(src)
    changed.append(m)
print('tampas ajustadas:', changed)
