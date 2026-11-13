"""Ajusta as frentes de parede entregues (front_mid, front_end_left, front_end_right, front_post) ao contrato final (ADR 0027):

1) LIMPEZA do alfa — uma frente é uma face sólida; o que vier semitransparente (a última coluna/linha, geralmente resíduo de recorte, e as
   juntas entre tábuas) é composto sobre a cor de junta (madeira escura) e vira opaco, senão o chão aparece através da parede;
2) LARGURA — reprojeta as pontas e o poste para a medida final (poste de `--tx` px): cada trecho (poste | braço) é esticado por partes, como
   em `retarget-wall-caps.py`; `front_mid` (128 px) não muda de largura. A altura (154 px) não muda.

Uso: python3 scripts/retarget-wall-fronts.py --entrada assets-src/paredes/tabuas/entregue-03 --saida assets-src/paredes/tabuas
       [--de 38,83] [--para 32,80]   (poste entregue/final e largura total das pontas entregue/final)
"""
import argparse
import os

import numpy as np
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument('--entrada', required=True)
ap.add_argument('--saida', required=True)
ap.add_argument('--de', default='38,83', help='largura do poste e das pontas na arte entregue')
ap.add_argument('--para', default='32,80', help='largura do poste e das pontas na medida final')
ap.add_argument('--junta', default='92,56,36', help='cor (RGB) sobre a qual o alfa parcial é composto')
args = ap.parse_args()
post_from, end_from = (int(v) for v in args.de.split(','))
post_to, end_to = (int(v) for v in args.para.split(','))
GROOVE = np.array([int(v) for v in args.junta.split(',')], np.float32)
os.makedirs(args.saida, exist_ok=True)


def opaque(a):
    """Compõe o alfa parcial sobre a cor de junta e fixa alfa 255 (exceto onde era realmente vazio: alfa 0)."""
    a = a.astype(np.float32)
    al = a[..., 3:4] / 255.0
    rgb = a[..., :3] * al + GROOVE * (1 - al)
    out = np.concatenate([rgb, np.full_like(al, 255.0)], axis=2)
    out[(a[..., 3] == 0)] = 0
    return out


def stretch(a, segments):
    """Remapeia por partes no eixo x: `segments` = [((x0, x1) origem, (y0, y1) destino), ...]."""
    h = a.shape[0]
    dst = np.zeros((h, segments[-1][1][1], 4), np.float32)
    for (s0, s1), (d0, d1) in segments:
        region = a[:, s0:s1]
        ch = [np.asarray(Image.fromarray(region[..., c], mode='F').resize((d1 - d0, h), Image.BICUBIC)) for c in range(4)]
        dst[:, d0:d1] = np.stack(ch, axis=2)
    return dst


plan = {
    'front_mid.png': None,  # 128 px: só a limpeza
    'front_post.png': [((0, post_from), (0, post_to))],
    # ponta esquerda: poste | braço leste; ponta direita: braço oeste | poste
    'front_end_left.png': [((0, post_from), (0, post_to)), ((post_from, end_from), (post_to, end_to))],
    'front_end_right.png': [((0, end_from - post_from), (0, end_to - post_to)), ((end_from - post_from, end_from), (end_to - post_to, end_to))],
}
for name, segs in plan.items():
    src = np.asarray(Image.open(os.path.join(args.entrada, name)).convert('RGBA')).astype(np.float32)
    out = opaque(src)
    if segs:
        out = stretch(out, segs)
    Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), 'RGBA').save(os.path.join(args.saida, name))
    print(f'{name}: {src.shape[1]}×{src.shape[0]} → {out.shape[1]}×{out.shape[0]}')
