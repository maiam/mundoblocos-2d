#!/usr/bin/env python3
"""Árvores isométricas do Santuário (v0.93.156): 4 pranchas do dono do produto (bétula, cerejeira, macieira, carvalho), cada uma com 3 tamanhos
(pequena, média, grande), em `assets-src/trees/iso-<espécie>.png`.

Por árvore: (1) fundo some (bétula e cerejeira: creme, achado a partir das bordas; macieira e carvalho: já têm alfa); (2) o bloquinho de grama/terra, a grama, flores,
pedras e a sombra somem — abaixo de `start` só fica o tronco (cor do tronco, na faixa de x do tronco, que alarga um pouco até `end` para as raízes); (3) maior componente
conexo; (4) corta nas bordas da tinta. Os 3 tamanhos de uma espécie mantêm a proporção da prancha e a grande mede `LARGE_H` px (a altura do carvalho `tree` do
conjunto, que é desenhado 2× no jogo).

Saídas: src/assets/iso-trees.webp (atlas), src/render/isoTreesManifest.ts (retângulos) e src/assets/icon-iso-<espécie>-<s|m|l>.webp (ícones 64 × 64).
Uso: python3 scripts/extract-iso-trees.py   (depois: python3 scripts/optimize-assets.py)
"""
import json
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'assets-src' / 'trees'
LARGE_H = 386  # altura (px da prancha isométrica) da árvore grande; o jogo desenha 2×

# Por espécie: arquivo, fundo ('cream' = achar a partir das bordas; 'alpha' = já tem alfa), predicado do tronco e, por árvore (pequena, média, grande):
# faixa x da árvore, faixa x do tronco na linha `start - 5`, linha onde começa a base (grama, flores, pedras) e linha onde o tronco acaba.
SPECIES = {
    'betula': dict(file='iso-betula.png', bg='cream', trunk='any', flare=0.3, trees=[
        dict(band=(40, 300), trunk=(145, 192), start=768, end=812),
        dict(band=(320, 800), trunk=(520, 588), start=765, end=815),
        dict(band=(820, 1410), trunk=(1020, 1150), start=760, end=832),
    ]),
    'cerejeira': dict(file='iso-cerejeira.png', bg='cream', trunk='red', flare=0.5, trees=[
        dict(band=(30, 310), trunk=(140, 205), start=790, end=858),
        dict(band=(320, 830), trunk=(545, 615), start=775, end=862),
        dict(band=(820, 1420), trunk=(1055, 1175), start=745, end=862),
    ]),
    'macieira': dict(file='iso-macieira.png', bg='alpha', trunk='brown', flare=0.5, trees=[
        dict(band=(20, 310), trunk=(148, 200), start=690, end=780),
        dict(band=(330, 840), trunk=(550, 630), start=680, end=785),
        dict(band=(840, 1520), trunk=(1115, 1250), start=660, end=800),
    ]),
    'carvalho': dict(file='iso-carvalho.png', bg='alpha', trunk='brown', flare=0.5, trees=[
        dict(band=(20, 320), trunk=(150, 205), start=655, end=745),
        dict(band=(330, 800), trunk=(535, 610), start=640, end=760),
        dict(band=(810, 1520), trunk=(1080, 1190), start=640, end=790),
    ]),
}
SIZES = ['s', 'm', 'l']


def background_mask(rgb: np.ndarray) -> np.ndarray:
    """Pixels de fundo creme ligados às bordas da imagem (o tronco claro da bétula, por dentro, não é alcançado)."""
    h, w, _ = rgb.shape
    ref = np.median(np.concatenate([rgb[:8].reshape(-1, 3), rgb[-8:].reshape(-1, 3)]), axis=0)
    dist = np.abs(rgb.astype(int) - ref).max(axis=2)
    near = dist <= 14
    lab, _ = ndimage.label(near)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    return np.isin(lab, list(border))


def trunk_like(rgb: np.ndarray, kind: str) -> np.ndarray:
    r, g, b = (rgb[..., i].astype(int) for i in range(3))
    mx, mn = np.maximum(np.maximum(r, g), b), np.minimum(np.minimum(r, g), b)
    sat = (mx - mn) / np.maximum(mx, 1)
    green = (g > r + 6) & (g > b + 25)
    gray = (sat < 0.16) & (mx < 215) & (mx > 60) & (kind != 'any')
    if kind == 'red':
        return (r > g + 35) & (r > b + 35) & ~green
    if kind == 'brown':
        return (r > g + 15) & (g > b) & (r < 215) & (g < r * 0.72) & (sat > 0.38) & ~green & ~gray
    return ~green  # bétula: o tronco é creme com marcas marrons (só tira o verde)


def largest(mask: np.ndarray) -> np.ndarray:
    lab, n = ndimage.label(mask, structure=np.ones((3, 3)))
    if n == 0:
        return mask
    sizes = ndimage.sum(mask, lab, range(1, n + 1))
    return lab == (1 + int(np.argmax(sizes)))


def extract(img: np.ndarray, spec: dict, cfg: dict) -> Image.Image:
    x0, x1 = cfg['band']
    t = img[:, x0:x1].copy()
    rgb = t[..., :3]
    if spec['bg'] == 'cream':
        ink = ~background_mask(rgb)
        alpha = ink.astype(float) * 255
    else:
        alpha = np.clip((t[..., 3].astype(float) - 70) / (225 - 70), 0, 1) * 255
        ink = alpha > 40
    keep = ink.copy()
    h, w = keep.shape
    start, end = cfg['start'], cfg['end']
    tx0, tx1 = cfg['trunk'][0] - x0, cfg['trunk'][1] - x0
    tw = tx1 - tx0
    like = trunk_like(rgb, spec['trunk'])
    yy, xx = np.mgrid[0:h, 0:w]
    grow = spec['flare'] * tw * np.clip((yy - start) / max(1, end - start), 0, 1)
    inband = (xx >= tx0 - grow) & (xx <= tx1 + grow)
    zone = yy >= start
    keep &= ~zone | (inband & like & (yy < end))
    keep = largest(keep)
    keep = ndimage.binary_opening(keep, iterations=1) | (keep & ~zone)
    keep = largest(keep)
    keep = ndimage.binary_fill_holes(keep)  # musgo/brilho no tronco que o filtro de cor tirou vira furo: volta
    if spec['bg'] == 'cream':
        keep = ndimage.binary_erosion(keep, iterations=1) | (keep & False)  # tira o fio creme da borda
    soft = ndimage.gaussian_filter(keep.astype(float), 0.7)  # borda suave
    a = np.where(keep, alpha, np.minimum(alpha, soft * 255 * (soft > 0.4))).astype(np.uint8)
    out = np.dstack([rgb, a]).astype(np.uint8)
    im = Image.fromarray(out, 'RGBA')
    return im.crop(im.getchannel('A').getbbox())


def main():
    sprites, rects = {}, {}
    for sp, spec in SPECIES.items():
        img = np.array(Image.open(SRC / spec['file']).convert('RGBA'))
        trees = [extract(img, spec, cfg) for cfg in spec['trees']]
        f = LARGE_H / trees[2].height
        for s, im in zip(SIZES, trees):
            sprites[f'{sp}_{s}'] = im.resize((max(1, round(im.width * f)), max(1, round(im.height * f))), Image.LANCZOS)
    # Atlas: prateleiras de largura 1024.
    W, pad = 1024, 3
    order = sorted(sprites, key=lambda k: -sprites[k].height)
    x = y = rowh = 0
    pos = {}
    for k in order:
        im = sprites[k]
        if x + im.width + pad > W:
            x, y, rowh = 0, y + rowh + pad, 0
        pos[k] = (x, y)
        x += im.width + pad
        rowh = max(rowh, im.height)
    atlas = Image.new('RGBA', (W, y + rowh + pad), (0, 0, 0, 0))
    for k, im in sprites.items():
        atlas.alpha_composite(im, pos[k])
        rects[k] = [pos[k][0], pos[k][1], im.width, im.height]
    atlas.save(ROOT / 'src/assets/iso-trees.webp', quality=90)
    for k, im in sprites.items():
        s = 58 / max(im.width, im.height)
        ic = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
        icon = Image.new('RGBA', (64, 64), (0, 0, 0, 0))
        icon.alpha_composite(ic, ((64 - ic.width) // 2, (64 - ic.height) // 2))
        icon.save(ROOT / f'src/assets/icon-iso-{k.replace("_", "-")}.webp', lossless=True)
    ts = ['// Gerado por scripts/extract-iso-trees.py — NÃO EDITE (rode o script de novo).',
          '// Retângulos [x, y, w, h] de cada árvore (espécie_tamanho) no atlas `iso-trees.webp`.',
          'export const ISO_TREES_ATLAS: Readonly<Record<string, readonly [number, number, number, number]>> = {']
    ts += [f"  '{k}': {json.dumps(rects[k])}," for k in sorted(rects)]
    ts.append('};')
    (ROOT / 'src/render/isoTreesManifest.ts').write_text('\n'.join(ts) + '\n')
    # Prévia para conferir (fundo magenta): scratch, não vai ao jogo.
    prev = Image.new('RGBA', (1300, 2 * 400), (255, 0, 255, 255))
    for i, sp in enumerate(SPECIES):
        xo = 10 + (i % 2) * 650
        for s in SIZES:
            im = sprites[f'{sp}_{s}']
            prev.alpha_composite(im.resize((im.width // 2 * 2 // 2, im.height // 2 * 2 // 2)) if False else im, (xo, (i // 2) * 400 + 395 - im.height))
            xo += im.width + 10
    prev.convert('RGB').save(ROOT / 'assets-src/trees/_previa-arvores-iso.png')
    print('ok', {k: tuple(v[2:]) for k, v in rects.items()})


if __name__ == '__main__':
    main()
