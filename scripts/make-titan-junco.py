"""Família do Junco do Titã (ADR 0100): texturas de bloco e ícones de 32 px a partir das artes do pacote ("Junco" do Drive), reduzidas a 512 px em `assets-src/titan/junco/`.

Entradas : assets-src/titan/junco/Textura-Junco_512.png     trama de junco com moldura de feixes e amarrações (a marca d'água do canto inferior direito já foi coberta)
           assets-src/titan/junco/{Laje,Degrau,Cadeira}-De-Junco_512.png   as peças em vista 3/4 sobre fundo branco
Saídas   : assets-src/titan/texturas32/02-Texturas-PNG/21-bloco-de-junco/{topo,lateral,base}.png   32 × 32: a mesma trama nas seis faces (cada face é um painel de junco com moldura)
           assets-src/titan/texturas32/02-Texturas-PNG/22-laje-de-junco/{topo,lateral}.png   topo 32 × 32 e lateral 32 × 16 (as 16 linhas de cima do painel: moldura e trama, sem esticar)
           assets-src/titan/arte32/{Bloco,Laje,Degrau,Cadeira}_de_Junco_Item_32px.png   ícones 3/4 de 32 px (o Bloco é um cubo isométrico montado com a própria textura; os outros, as artes sem o fundo branco)
           src/assets/titan-junco-tile.webp   64 × 64 sem perdas: a trama que os modelos 3D (degrau, cadeira) repetem por face (ADR 0100)
Depois rode `make-titan-atlas32.py` (tiles novos no fim de `tiles.json`) e `make-titan-arte32.py`. Repetível e determinístico. Uso: python3 -I scripts/make-titan-junco.py
"""
import os
from collections import deque

import numpy as np
from PIL import Image, ImageEnhance

SRC = 'assets-src/titan/junco/'
TEX = 'assets-src/titan/texturas32/02-Texturas-PNG/'
ICONS = 'assets-src/titan/arte32/'


def tile(size: int) -> Image.Image:
    t = Image.open(SRC + 'Textura-Junco_512.png').convert('RGB').resize((size, size), Image.LANCZOS)
    t = ImageEnhance.Color(t).enhance(1.12)
    return ImageEnhance.Contrast(t).enhance(1.08)


def keyed_white(im: Image.Image, thresh: int = 236, work: int = 512) -> Image.Image:
    """Fundo branco chapado -> transparente por inundação a partir das bordas (o branco do desenho, por dentro, fica)."""
    a = np.array(im.convert('RGB').resize((work, work), Image.BOX))
    light = a.min(axis=2) >= thresh
    bg = np.zeros_like(light); q = deque()
    for i in range(work):
        for y, x in ((0, i), (work - 1, i), (i, 0), (i, work - 1)):
            if light[y, x] and not bg[y, x]:
                bg[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < work and 0 <= nx < work and light[ny, nx] and not bg[ny, nx]:
                bg[ny, nx] = True; q.append((ny, nx))
    out = im.convert('RGBA')
    mask = Image.fromarray(((~bg) * 255).astype(np.uint8)).resize(im.size, Image.NEAREST)
    out.putalpha(mask)
    return out


def icon_from_art(name: str, out: str, margin: int = 1) -> None:
    im = keyed_white(Image.open(SRC + name + '_512.png'))
    a = np.array(im).astype(float)
    al = a[..., 3] / 255
    ys, xs = np.where(al > 0.5)
    im = im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    a = np.array(im).astype(float); al = a[..., 3] / 255
    inner = 32 - 2 * margin
    s = inner / max(im.size)
    w, h = max(1, round(im.size[0] * s)), max(1, round(im.size[1] * s))
    pm = a[..., :3] * al[..., None]
    ch = [np.array(Image.fromarray(c.astype(np.float32), 'F').resize((w, h), Image.BOX)) for c in (pm[..., 0], pm[..., 1], pm[..., 2], al)]
    pa = ch[3]
    rgb = np.stack(ch[:3], axis=-1) / np.maximum(pa[..., None], 1e-3)
    lum = rgb @ np.array([0.299, 0.587, 0.114])
    rgb = lum[..., None] + (rgb - lum[..., None]) * 1.15
    res = np.zeros((32, 32, 4), dtype=np.uint8)
    ox, oy = (32 - w) // 2, 32 - h - margin  # assenta na base do ícone
    res[oy:oy + h, ox:ox + w, :3] = np.clip(rgb, 0, 255).astype(np.uint8)
    res[oy:oy + h, ox:ox + w, 3] = np.where(pa > 0.5, 255, 0)
    Image.fromarray(res, 'RGBA').save(ICONS + out)


def iso_cube(out: str) -> None:
    """Cubo isométrico de 32 px com a trama nas três faces visíveis (topo claro, esquerda média, direita escura)."""
    S = 128
    t = np.array(tile(256)).astype(float)
    canvas = np.zeros((S, S, 4), dtype=float)
    # faces: (origem, vetor u, vetor v, brilho) no canvas de 128 px
    faces = [((64, 4), (58, 29), (-58, 29), 1.0),   # topo
             ((4, 33), (60, 30), (0, 58), 0.80),     # esquerda
             ((64, 63), (58, -29), (0, 58), 0.62)]   # direita
    for (ox, oy), (ux, uy), (vx, vy), shade in faces:
        m = np.array([[ux, vx], [uy, vy]], dtype=float)
        inv = np.linalg.inv(m)
        ys, xs = np.mgrid[0:S, 0:S]
        p = np.stack([xs + 0.5 - ox, ys + 0.5 - oy])
        ab = np.tensordot(inv, p, axes=(1, 0))
        a, b = ab[0], ab[1]
        inside = (a >= 0) & (a < 1) & (b >= 0) & (b < 1)
        tx = np.clip((a * 256).astype(int), 0, 255); ty = np.clip((b * 256).astype(int), 0, 255)
        col = t[ty, tx] * shade
        canvas[inside, :3] = col[inside]; canvas[inside, 3] = 255
    img = Image.fromarray(np.clip(canvas, 0, 255).astype(np.uint8), 'RGBA').resize((32, 32), Image.LANCZOS)
    arr = np.array(img); arr[..., 3] = np.where(arr[..., 3] > 128, 255, 0)
    Image.fromarray(arr, 'RGBA').save(ICONS + out)


def main() -> None:
    t32 = tile(32)
    for d, files in (('21-bloco-de-junco', ('topo', 'lateral', 'base')), ('22-laje-de-junco', ('topo',))):
        os.makedirs(TEX + d, exist_ok=True)
        for f in files:
            t32.save(f'{TEX}{d}/{f}.png')
    t32.crop((0, 0, 32, 16)).save(f'{TEX}22-laje-de-junco/lateral.png')
    tile(64).save('src/assets/titan-junco-tile.webp', 'WEBP', lossless=True, quality=100, method=6)
    iso_cube('Bloco_de_Junco_Item_32px.png')
    for name, out in (('Laje-De-Junco', 'Laje_de_Junco_Item_32px.png'), ('Degrau-De-Junco', 'Degrau_de_Junco_Item_32px.png'), ('Cadeira-De-Junco', 'Cadeira_de_Junco_Item_32px.png')):
        icon_from_art(name, out)
    print('texturas 21 e 22, tile de 64 px e 4 ícones de 32 px')


if __name__ == '__main__':
    main()
