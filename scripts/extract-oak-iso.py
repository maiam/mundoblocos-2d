#!/usr/bin/env python3
"""Carvalhos isométricos (v0.93.127): assets-src/trees/oak-iso.png (prancha de 3 carvalhos — pequeno, médio, grande — sobre blocos de grama, com brilho verde atrás)
→ src/assets/tree-oak-iso.png: tira de 3 quadros de MESMA largura (o maior carvalho de ponta a ponta, como `tree-oak`), a base do tronco no pé do quadro.

Por árvore: (1) o brilho vira transparência (curva no alfa + maior componente conexo); (2) o bloquinho de grama/terra, as folhas rasteiras, flores e pedras somem
(abaixo de BASE_Y só fica o tronco: marrom, ligado ao que está acima, até TRUNK_END_Y); (3) corta nas bordas da tinta. Só o desenho: o chão do jogo é o do jogo.
Depois: python3 scripts/optimize-assets.py. Usado só na câmera Isométrica do Santuário (`SanctuaryCameraModes`).
"""
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'assets-src' / 'trees' / 'oak-iso.png'
OUT = ROOT / 'src' / 'assets' / 'tree-oak-iso.png'

# Faixas (x0, x1) de cada carvalho na prancha (1536 × 1024), da esquerda para a direita.
BANDS = [(0, 330), (330, 870), (870, 1536)]
# Abaixo desta linha (px da prancha) o que não é tronco sai (folhas rasteiras, grama, flores, pedras); e o tronco acaba em TRUNK_END_Y.
BASE_Y = [690, 662, 672]
TRUNK_END_Y = [775, 790, 805]
PAD = 4


def alpha_curve(a: np.ndarray) -> np.ndarray:
    """Brilho (alfa baixo) some; a tinta (alfa alto) fica; a borda é suave."""
    return np.clip((a.astype(float) - 70) / (225 - 70), 0, 1) * 255


def largest(mask: np.ndarray) -> np.ndarray:
    h, w = mask.shape
    seen = np.zeros_like(mask, bool)
    best = []
    for sy in range(h):
        for sx in range(w):
            if mask[sy, sx] and not seen[sy, sx]:
                comp = []
                q = deque([(sy, sx)])
                seen[sy, sx] = True
                while q:
                    y, x = q.popleft()
                    comp.append((y, x))
                    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        ny, nx = y + dy, x + dx
                        if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not seen[ny, nx]:
                            seen[ny, nx] = True
                            q.append((ny, nx))
                if len(comp) > len(best):
                    best = comp
    out = np.zeros_like(mask, bool)
    for y, x in best:
        out[y, x] = True
    return out


def trunk_mask(rgb: np.ndarray) -> np.ndarray:
    r, g, b = rgb[..., 0].astype(int), rgb[..., 1].astype(int), rgb[..., 2].astype(int)
    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)
    sat = (mx - mn) / np.maximum(mx, 1)
    return (r > g + 14) & (r > b + 45) & (r > 70) & (sat > 0.5)  # a pedrinha (bege, pouca saturação) fica de fora


def extract(a: np.ndarray, band: tuple, base_y: int, end_y: int) -> Image.Image:
    x0, x1 = band
    t = a[:, x0:x1].copy()
    alpha = alpha_curve(t[..., 3])
    ink = alpha > 40
    # abaixo da linha da base: só o tronco (marrom) ligado ao que está acima
    brown = trunk_mask(t[..., :3]) & ink
    keep = ink.copy()
    keep[base_y:] = False
    seed = brown.copy()
    seed[:base_y - 1] = False
    seed[base_y:] = False
    lower = brown.copy()
    lower[:base_y] = False
    lower[end_y:] = False
    # componente do tronco que sai da linha base (as linhas acima da base são `keep`)
    h, w = lower.shape
    q = deque()
    grown = np.zeros_like(lower)
    for x in range(w):
        if lower[base_y, x] and keep[base_y - 1, x]:
            grown[base_y, x] = True
            q.append((base_y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and lower[ny, nx] and not grown[ny, nx]:
                grown[ny, nx] = True
                q.append((ny, nx))
    keep |= grown
    keep = largest(keep)
    t[..., 3] = np.where(keep, alpha, 0).astype(np.uint8)
    img = Image.fromarray(t, 'RGBA')
    return img.crop(img.getchannel('A').getbbox())


def main():
    a = np.array(Image.open(SRC).convert('RGBA'))
    trees = [extract(a, BANDS[i], BASE_Y[i], TRUNK_END_Y[i]) for i in range(3)]
    fw = max(t.width for t in trees) + 2 * PAD
    fh = max(t.height for t in trees) + 2 * PAD
    sheet = Image.new('RGBA', (fw * 3, fh))
    for i, t in enumerate(trees):
        sheet.alpha_composite(t, (i * fw + (fw - t.width) // 2, fh - PAD - t.height))  # base do tronco no pé do quadro
    sheet.save(OUT, optimize=True)
    print(f'tree-oak-iso.png: {sheet.size} (3 quadros de {fw} × {fh}); árvores {[t.size for t in trees]}')


if __name__ == '__main__':
    main()
