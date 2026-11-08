#!/usr/bin/env python3
"""Deriva a forma de uma transição entre dois chãos a partir da pintura do par (Padrão V2, ADR 0023, CONTRATO.md).

Uso: python3 scripts/import-transition.py <forma> pintura.png --invader left|right [--overlay LARGURA]
A pintura é um quadro quadrado com um chão de cada lado e a divisa irregular no meio (como foi enviada). `--invader` diz
QUAL lado é o material que avança (o outro é o que recebe). Passos: classifica cada pixel (LDA nas bordas esquerda e
direita do quadro), acha por linha a divisa que melhor separa os dois lados e grava:
- `_mascaras/<forma>.png`: alfa da forma, com o material que avança SÓLIDO À ESQUERDA (o quadro é espelhado se ele veio
  pela direita), igual ao `import-mask.py`;
- `_mascaras/<forma>.overlay.png` (só com --overlay): os pixels PINTADOS numa faixa de LARGURA px (escala 256) em volta
  da divisa, com alfa que some nas pontas — espuma, água rasa, halo — para ficar por cima do material que avança.
Nada de ler canvas: tudo é feito aqui, na arte. Texturas nunca giram: só a forma e a faixa (que giram no build).
"""
import argparse
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SIZE = 256


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('name')
    ap.add_argument('path')
    ap.add_argument('--invader', choices=['left', 'right'], required=True)
    ap.add_argument('--overlay', type=int, default=0, help='largura (px a 256) da faixa pintada em volta da divisa')
    args = ap.parse_args()
    img = Image.open(args.path).convert('RGB')
    if img.size[0] != img.size[1]:
        print(f'precisa ser quadrada (veio {img.size})', file=sys.stderr)
        return 1
    if args.invader == 'right':
        img = img.transpose(Image.FLIP_LEFT_RIGHT)  # o material que avança passa a ficar à esquerda
    rgb = img.resize((SIZE, SIZE), Image.LANCZOS)
    f = np.asarray(rgb.filter(ImageFilter.GaussianBlur(2.5))).astype(np.float64).reshape(-1, 3)
    grid = f.reshape(SIZE, SIZE, 3)
    a = grid[:, : SIZE // 6].reshape(-1, 3)  # material que avança (esquerda)
    b = grid[:, -SIZE // 6:].reshape(-1, 3)  # material que recebe (direita)
    cov = np.cov(np.vstack([a - a.mean(0), b - b.mean(0)]).T) + np.eye(3) * 1e-3
    w = np.linalg.solve(cov, a.mean(0) - b.mean(0))
    mid = w @ (a.mean(0) + b.mean(0)) / 2
    score = (grid @ w - mid) > 0  # True = lado que avança
    # Divisa por linha: x que mais concorda (esquerda = avança, direita = recebe), só na faixa do meio.
    xs = np.arange(SIZE)
    xb = np.zeros(SIZE)
    for y in range(SIZE):
        left_ok = np.concatenate([[0], np.cumsum(score[y])])  # acertos à esquerda de x
        right_ok = np.concatenate([[0], np.cumsum(~score[y])])
        total_right = right_ok[-1]
        agree = left_ok[: SIZE + 1] + (total_right - right_ok[: SIZE + 1])
        lo, hi = int(SIZE * 0.15), int(SIZE * 0.85)
        xb[y] = lo + int(np.argmax(agree[lo:hi]))
    k = np.array([1, 2, 3, 2, 1], float) / 9
    pad = np.concatenate([xb[-2:], xb, xb[:2]])  # divisa contínua na vertical (a pintura é ladrilho nessa direção)
    xb = np.convolve(pad, k, mode='valid')
    X = xs[None, :].astype(np.float64)
    alpha = np.clip((xb[:, None] - X) / 2.0 + 0.5, 0, 1)
    out = ROOT / 'assets-src' / 'materiais' / '_mascaras'
    out.mkdir(parents=True, exist_ok=True)
    white = np.full((SIZE, SIZE, 4), 255, np.uint8)
    white[..., 3] = (alpha * 255).round().astype(np.uint8)
    Image.fromarray(white, 'RGBA').save(out / f'{args.name}.png')
    ov_path = out / f'{args.name}.overlay.png'
    if args.overlay:
        d = np.abs(X - xb[:, None])
        s = np.clip(1.8 * (1 - d / args.overlay), 0, 1)  # chapado perto da divisa, some só nas pontas
        s = s * s * (3 - 2 * s)
        ov = np.dstack([np.asarray(rgb), (s * 255).round().astype(np.uint8)])
        Image.fromarray(ov, 'RGBA').save(ov_path)
    elif ov_path.exists():
        ov_path.unlink()
    print(f'{args.name}: divisa em {xb.min() / SIZE:.0%}–{xb.max() / SIZE:.0%} da largura (média {xb.mean() / SIZE:.0%})'
          f'{f", faixa de {args.overlay} px" if args.overlay else ""} → {out.relative_to(ROOT)}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
