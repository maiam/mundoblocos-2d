"""Ícone provisório de um modelo 3D do Titã (ADR 0088, 0089): o próprio modelo desenhado em vista 3/4, 32 × 32 px. Modelos: `escada` (item 32) e `bau` (item 33).

Entradas : `src/assets/titan-<modelo>.json` (malha reduzida) e `src/assets/titan-<modelo>-atlas.webp` (cor-base), gerados por `extract-titan-<modelo>.py`.
Saída    : `assets-src/titan/arte32/<Nome>_Item_32px.png`; rode depois `make-titan-arte32.py` e `make-titan-item-masks.py`.
Rasteriza os triângulos com z-buffer e luz fixa em 4× (128 × 128), reduz para 32 e deixa o alfa binário. Arte provisória gerada por código (determinística); o dono do produto pode trocar o
arquivo pelo desenho final. Uso: python3 -I scripts/make-titan-modelo-icone.py [escada|bau]  (sem argumento, faz os dois)
"""
import json
import math
import sys

import numpy as np
from PIL import Image

S = 128  # supersample
# por modelo: arquivo de saída, giro em Y e inclinação em X (graus), ponto central (no espaço do modelo) e o diâmetro, em metros, que ocupa o ícone
MODELS = {
    'escada': dict(out='Escada_de_Junco_Item_32px.png', yaw=-32, tilt=18, center=(0, 0.5, -0.45), span=1.1),
    'bau': dict(out='Bau_de_Rocha_e_Junco_Item_32px.png', yaw=-35, tilt=28, center=(0, 0.36, 0), span=1.25),
}


def render(name: str) -> None:
    cfg = MODELS[name]
    MODEL, ATLAS, OUT = f'src/assets/titan-{name}.json', f'src/assets/titan-{name}-atlas.webp', 'assets-src/titan/arte32/' + cfg['out']
    m = json.load(open(MODEL))
    pos = np.array(m['pos'], dtype=float).reshape(-1, 3)
    nrm = np.array(m['nrm'], dtype=float).reshape(-1, 3)
    uv = np.array(m['uv'], dtype=float).reshape(-1, 2)
    idx = np.array(m['idx'], dtype=int).reshape(-1, 3)
    atlas = np.array(Image.open(ATLAS).convert('RGB'))
    ah, aw = atlas.shape[:2]
    yaw, tilt = math.radians(cfg['yaw']), math.radians(cfg['tilt'])
    cy, sy, cx, sx = math.cos(yaw), math.sin(yaw), math.cos(tilt), math.sin(tilt)
    def rot(v):  # gira em Y e depois inclina em X (vista de cima)
        x, y, z = v[:, 0], v[:, 1], v[:, 2]
        x1, z1 = x * cy + z * sy, -x * sy + z * cy
        return np.stack([x1, y * cx - z1 * sx, y * sx + z1 * cx], axis=1)
    p = rot(pos - np.array(cfg['center']))
    n = rot(nrm)
    scale = S * 0.88 / cfg['span']
    sxp, syp = p[:, 0] * scale + S / 2, S / 2 - p[:, 1] * scale
    img = np.zeros((S, S, 4), dtype=np.uint8)
    zbuf = np.full((S, S), -1e9)
    light = np.array([0.35, 0.8, 0.5]); light /= np.linalg.norm(light)
    for a, b, c in idx:
        xs, ys = [sxp[a], sxp[b], sxp[c]], [syp[a], syp[b], syp[c]]
        x0, x1, y0, y1 = max(0, int(min(xs))), min(S - 1, int(max(xs)) + 1), max(0, int(min(ys))), min(S - 1, int(max(ys)) + 1)
        den = (ys[1] - ys[2]) * (xs[0] - xs[2]) + (xs[2] - xs[1]) * (ys[0] - ys[2])
        if abs(den) < 1e-9:
            continue
        for py in range(y0, y1 + 1):
            for px in range(x0, x1 + 1):
                w0 = ((ys[1] - ys[2]) * (px + 0.5 - xs[2]) + (xs[2] - xs[1]) * (py + 0.5 - ys[2])) / den
                w1 = ((ys[2] - ys[0]) * (px + 0.5 - xs[2]) + (xs[0] - xs[2]) * (py + 0.5 - ys[2])) / den
                w2 = 1 - w0 - w1
                if w0 < 0 or w1 < 0 or w2 < 0:
                    continue
                z = w0 * p[a, 2] + w1 * p[b, 2] + w2 * p[c, 2]
                if z <= zbuf[py, px]:
                    continue
                u = w0 * uv[a, 0] + w1 * uv[b, 0] + w2 * uv[c, 0]
                v = w0 * uv[a, 1] + w1 * uv[b, 1] + w2 * uv[c, 1]
                col = atlas[min(ah - 1, max(0, int(v * ah))), min(aw - 1, max(0, int(u * aw)))].astype(float)
                nn = w0 * n[a] + w1 * n[b] + w2 * n[c]
                nn /= (np.linalg.norm(nn) or 1)
                shade = 0.62 + 0.38 * max(0.0, float(abs(nn @ light)))
                zbuf[py, px] = z
                img[py, px] = [*(np.clip(col * shade, 0, 255).astype(np.uint8)), 255]
    small = Image.fromarray(img, 'RGBA').resize((32, 32), Image.LANCZOS)
    a = np.array(small)
    a[..., 3] = np.where(a[..., 3] > 128, 255, 0)
    Image.fromarray(a, 'RGBA').save(OUT)
    print(OUT, (32, 32))


def main() -> None:
    for name in (sys.argv[1:] or list(MODELS)):
        render(name)


if __name__ == '__main__':
    main()
