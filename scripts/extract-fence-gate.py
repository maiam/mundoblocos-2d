#!/usr/bin/env python3
"""Porteira (v0.93.96; a cerca virou o modelo 3D: `extract-fence-model.py`): kit do dono do produto (`assets-src/cerca-v3/kit.png`, fundo transparente)
→ 5 poses da porteira. O kit só traz a porteira fechada (frente); a abertura é feita aqui: a folha (entre os dois postes) encolhe na largura pelo
cosseno do ângulo (0°, 22,5°, 45°, 67,5°, 90°), presa na dobradiça da esquerda, com os postes fixos.

Saída (px por célula = 128; escala do jogo = 16 px por célula):
  src/assets/fence-gate.webp  5 poses 136 × 94 (base dos postes na linha 90); postes nas bordas da célula.
  src/assets/icon-block-fence-gate.webp (64 × 64).
Uso: python3 scripts/extract-fence-gate.py
"""

from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'src' / 'assets'
PITCH = 325
K = 128 / PITCH

# O kit já vem com alfa (fundo e sombra removidos pelo dono do produto): o alfa baixo (halo/brilho) é descartado e a borda suavizada.
raw = np.asarray(Image.open(ROOT / 'assets-src' / 'cerca-v3' / 'kit.png').convert('RGBA')).astype(np.float32)
alpha = np.clip((raw[..., 3] - 90) * 255 / (250 - 90), 0, 255)
rgba = np.dstack([raw[..., :3], alpha]).astype(np.uint8)
# borda suave: 1 px de blur no alfa evita serrilhado depois da redução
KIT = Image.fromarray(rgba, 'RGBA')


def crop(box):
    return KIT.crop(box)


def seamless(strip: Image.Image, period: int, overlap: int, axis: int) -> Image.Image:
    a = np.asarray(strip).astype(np.float32)
    if axis == 1:
        base, wrap = a[:, :period].copy(), a[:, period:period + overlap]
        t = np.linspace(0, 1, overlap)[None, :, None]
        base[:, :overlap] = wrap * (1 - t) + base[:, :overlap] * t
    else:
        base, wrap = a[:period].copy(), a[period:period + overlap]
        t = np.linspace(0, 1, overlap)[:, None, None]
        base[:overlap] = wrap * (1 - t) + base[:overlap] * t
    return Image.fromarray(base.clip(0, 255).astype(np.uint8), 'RGBA')


def tile(strip: Image.Image, length: int, axis: int) -> Image.Image:
    w, h = strip.size
    out = Image.new('RGBA', (length, h) if axis == 1 else (w, length), (0, 0, 0, 0))
    pos = 0
    while pos < length:
        out.alpha_composite(strip, (pos, 0) if axis == 1 else (0, pos))
        pos += w if axis == 1 else h
    return out


def icon(im: Image.Image, name: str) -> None:
    bb = im.getchannel('A').point(lambda v: 255 if v > 20 else 0).getbbox()
    im = im.crop(bb)
    k = 56 / max(im.size)
    im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
    c = Image.new('RGBA', (64, 64), (0, 0, 0, 0))
    c.alpha_composite(im, ((64 - im.width) // 2, (64 - im.height) // 2))
    c.save(OUT / name, 'WEBP', quality=90, method=6)



# ---- porteira: folha encolhe presa à dobradiça da esquerda ---------------------------------------------------------------------------
G_TOP, G_BASE = 712, 940
left_post = crop((1103, G_TOP, 1165, G_BASE))
right_post = crop((1383, G_TOP, 1445, G_BASE))
panel = crop((1163, G_TOP, 1385, G_BASE))
GW = 345
gate_w = 136
gate_h = round((G_BASE - G_TOP) * K) + 4
poses = []
for ang in (0, 22.5, 45, 67.5, 90):
    f = Image.new('RGBA', (GW, G_BASE - G_TOP), (0, 0, 0, 0))
    cw = max(8, round(panel.width * np.cos(np.radians(ang))))
    p = panel.resize((cw, panel.height), Image.LANCZOS)
    if ang:                                   # escurece um pouco quanto mais aberta (some de frente)
        a = np.asarray(p).astype(np.float32)
        a[..., :3] *= 1 - 0.25 * (ang / 90)
        p = Image.fromarray(a.clip(0, 255).astype(np.uint8), 'RGBA')
    f.alpha_composite(p, (60, 0))             # dobradiça = x 60 (borda esquerda da folha dentro do quadro de 345)
    f.alpha_composite(left_post, (0, 0))
    f.alpha_composite(right_post, (GW - right_post.width, 0))
    poses.append(f)
gate_strip = Image.new('RGBA', (gate_w * 5, gate_h), (0, 0, 0, 0))
for i, f in enumerate(poses):
    s = f.resize((round(f.width * K), round(f.height * K)), Image.LANCZOS)
    gate_strip.alpha_composite(s, (i * gate_w + (gate_w - s.width) // 2, 0))
    if i == 0:
        icon(f, 'icon-block-fence-gate.webp')
gate_strip.save(OUT / 'fence-gate.webp', 'WEBP', quality=90, method=6)
print('porteira:', gate_strip.size, ' base dos postes na linha', round((G_BASE - G_TOP) * K))
