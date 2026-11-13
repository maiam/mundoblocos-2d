"""Reprojeta as 16 tampas de parede (cap_00…cap_15, 128 × 128) de uma espessura para outra, esticando cada faixa (poste e braços)
em vez de repintar: a malha 3 × 3 (braço | poste | braço, nos dois eixos) é remapeada por partes, então a TOPOLOGIA e as EMENDAS
entre peças continuam idênticas (o mesmo mapeamento vale para todas as peças).

Uso (padrão: da arte entregue em 0,3 / 0,3 → espessura final 0,25 / 0,35 da ADR 0027):
  python3 scripts/retarget-wall-caps.py --entrada assets-src/paredes/tabuas/entregue-03 --saida assets-src/paredes/tabuas
         [--de-x 45,83] [--de-z 45,83] [--para-x 48,80] [--para-z 42,86]
Os intervalos são os limites do poste em px: (início, fim). Alfa binarizado em 0,5 (a arte entregue tem bordas nítidas).
"""
import argparse
import os

import numpy as np
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument('--entrada', required=True)
ap.add_argument('--saida', required=True)
ap.add_argument('--de-x', default='45,83')
ap.add_argument('--de-z', default='45,83')
ap.add_argument('--para-x', default='48,80')
ap.add_argument('--para-z', default='42,86')
args = ap.parse_args()
pair = lambda s: tuple(int(v) for v in s.split(','))
FX, FZ, TX, TZ = pair(args.de_x), pair(args.de_z), pair(args.para_x), pair(args.para_z)
N = 128


def segments(frm, to):
    """Pares (origem a:b, destino a:b) dos três trechos: braço antes, poste, braço depois."""
    return [((0, frm[0]), (0, to[0])), ((frm[0], frm[1]), (to[0], to[1])), ((frm[1], N), (to[1], N))]


def resize_region(a, w, h):
    """Redimensiona uma região RGBA (premultiplicada) para (h, w), canal a canal."""
    out = np.zeros((h, w, 4), np.float32)
    for c in range(4):
        out[..., c] = np.asarray(Image.fromarray(a[..., c].astype(np.float32), mode='F').resize((w, h), Image.BICUBIC))
    return out


os.makedirs(args.saida, exist_ok=True)
for m in range(16):
    name = f'cap_{m:02d}.png'
    src = np.asarray(Image.open(os.path.join(args.entrada, name)).convert('RGBA')).astype(np.float32)
    al = src[..., 3:4] / 255.0
    pre = np.concatenate([src[..., :3] * al, src[..., 3:4]], axis=2)  # premultiplicado
    dst = np.zeros_like(pre)
    for (zs, zd) in segments(FZ, TZ):
        for (xs, xd) in segments(FX, TX):
            region = pre[zs[0]:zs[1], xs[0]:xs[1]]
            dh, dw = zd[1] - zd[0], xd[1] - xd[0]
            if region.size and dh > 0 and dw > 0:
                dst[zd[0]:zd[1], xd[0]:xd[1]] = resize_region(region, dw, dh)
    a = dst[..., 3:4] / 255.0
    keep = a > 0.5
    rgb = np.where(keep, dst[..., :3] / np.maximum(a, 1e-6), 0)
    out = np.concatenate([np.clip(rgb, 0, 255), np.where(keep, 255.0, 0.0)], axis=2).astype(np.uint8)
    Image.fromarray(out, 'RGBA').save(os.path.join(args.saida, name))
print(f'16 tampas reprojetadas: poste x {FX}→{TX}, z {FZ}→{TZ} em {args.saida}')
