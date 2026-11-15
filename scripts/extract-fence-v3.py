#!/usr/bin/env python3
"""Cerca de madeira v3 e porteira (v0.93.96): kit do dono do produto (`assets-src/cerca-v3/kit.png`) → tira de 3 quadros + 5 poses da porteira.

O kit vem com fundo transparente e sem sombra (a primeira versão, sobre fundo creme, era recortada por saturação e perdia detalhes).
Peças usadas: trecho horizontal de cima (5 postes, 325 px entre postes = 1 célula), coluna de trilhos do trecho vertical da esquerda e a
porteira fechada (frente). A porteira abrir é feita aqui: a folha (entre os dois postes) encolhe na largura pelo cosseno do ângulo
(0°, 22,5°, 45°, 67,5°, 90°), presa na dobradiça da esquerda, com os postes fixos.

Saída (px por célula = 128; a escala do jogo é 32 px de mundo por célula):
  src/assets/fence.webp       tira de 3 quadros 128 × 144: 0 = horizontal (trilhos ← poste → trilhos), 1 = vertical (coluna de trilhos atrás do
                              poste), 2 = poste. Âncora (base do poste) em (64, 96); a coluna é centrada no poste (corte N/S na linha 75).
  src/assets/fence-gate.webp  5 poses 136 × 92 (base dos postes na linha 90); postes nas bordas da célula.
  src/assets/icon-block-fence.webp e icon-block-fence-gate.webp (64 × 64).
Uso: python3 scripts/extract-fence-v3.py   (depois python3 scripts/optimize-assets.py não é necessário: já sai em WebP)
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


# ---- peças-fonte ---------------------------------------------------------------------------------------------------------------------
POST = crop((741, 56, 801, 168))           # poste do trecho horizontal (60 × 112); base em y = 109 do recorte, centro x = 30
POST_BASE = (30, 109)
rails_span = crop((801, 72, 1069, 156))    # trilhos entre dois postes (268 × 84)
RAIL_TOP = 72 - 168 + 109                   # linha dos trilhos relativa à base do poste (+ base em POST_BASE[1])
col_span = crop((90, 622, 131, 830))        # coluna vertical entre dois postes (41 × 208)

rails = tile(seamless(rails_span, 240, 28, 1), PITCH, 1)
col = tile(seamless(col_span, 180, 28, 0), PITCH, 0)

FW, FH, AX, AY = PITCH, 360, PITCH // 2, 270   # quadro-fonte em px da arte; poste centrado, base em AY


def frame() -> Image.Image:
    return Image.new('RGBA', (FW, FH), (0, 0, 0, 0))


def put_post(f: Image.Image) -> None:
    f.alpha_composite(POST, (AX - POST_BASE[0], AY - POST_BASE[1]))


horizontal = frame()
horizontal.alpha_composite(rails, (0, AY - (168 - 72) + 0 - 0))
put_post(horizontal)
vertical = frame()
POST_MID = AY - 56                           # centro visual do poste
vertical.alpha_composite(col, (AX - col.width // 2, POST_MID - PITCH // 2))
put_post(vertical)
single = frame()
put_post(single)

FRAME = (128, 144)


def shrink(im: Image.Image) -> Image.Image:
    return im.resize((round(FW * K), round(FH * K)), Image.LANCZOS).crop((0, round((AY - 96 / K) * K) if False else 0, 128, 0 + 144))


def to_frame(im: Image.Image) -> Image.Image:
    # reduz e corta de modo que a base do poste caia em (64, 96)
    s = im.resize((round(FW * K), round(FH * K)), Image.LANCZOS)
    top = round(AY * K) - 96
    return s.crop((0, top, 128, top + 144))


strip = Image.new('RGBA', (384, 144), (0, 0, 0, 0))
for i, im in enumerate((horizontal, vertical, single)):
    strip.alpha_composite(to_frame(im), (i * 128, 0))
strip.save(OUT / 'fence.webp', 'WEBP', quality=90, method=6)


def icon(im: Image.Image, name: str) -> None:
    bb = im.getchannel('A').point(lambda v: 255 if v > 20 else 0).getbbox()
    im = im.crop(bb)
    k = 56 / max(im.size)
    im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
    c = Image.new('RGBA', (64, 64), (0, 0, 0, 0))
    c.alpha_composite(im, ((64 - im.width) // 2, (64 - im.height) // 2))
    c.save(OUT / name, 'WEBP', quality=90, method=6)


icon(horizontal, 'icon-block-fence.webp')

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
print('cerca:', strip.size, ' porteira:', gate_strip.size, ' base dos postes na linha', round((G_BASE - G_TOP) * K))
