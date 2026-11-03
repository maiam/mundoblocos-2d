#!/usr/bin/env python3
"""Arte da Cidade do Despertar: recorta e reduz as imagens fornecidas.

assets-src/town-house-red-sizes.png (casas de telhado vermelho 3×2, 4×3 e 5×3 lado a lado, com legendas embaixo)
→ src/assets/town-house-red-{3x2,4x3,5x3}.png: cada casa reduzida para a PAREDE medir exatamente w × 64 px
(w células em 2×), com 24 px de margem de cada lado para o beiral; base da casa no pé da imagem. Sem esticar nem
repetir partes — o render só posiciona (render/townArt.ts, HOUSE_RED_PAD).
assets-src/town-bushes.png (3 arbustos lado a lado: redondo, alto, largo) → src/assets/town-bushes.png: tira de
3 quadros de 120 × 96 px, mesma escala para todos, cada um centrado e com a base no pé do quadro.
Depois rode scripts/optimize-assets.py (PNG → WebP).
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
HOUSES_SRC = ROOT / 'assets-src' / 'town-house-red-sizes.png'
HOUSE_SIZES = [(3, 2), (4, 3), (5, 3)]
CELL = 64
PAD = 24
BUSHES_SRC = ROOT / 'assets-src' / 'town-bushes.png'
BUSHES_OUT = ROOT / 'src' / 'assets' / 'town-bushes.png'
BUSH_CELL = (120, 96)
BUSH_SCALE = 0.2


def solid_bbox(im: Image.Image, min_count: int = 8):
    """Caixa das colunas/linhas com pelo menos `min_count` pixels opacos (ignora poeira na borda)."""
    a = im.getchannel('A').point(lambda v: 255 if v > 128 else 0)
    w, h = a.size
    px = a.load()
    cols = [x for x in range(w) if sum(1 for y in range(0, h, 2) if px[x, y]) >= min_count]
    rows = [y for y in range(h) if sum(1 for x in range(0, w, 2) if px[x, y]) >= min_count]
    return cols[0], rows[0], cols[-1] + 1, rows[-1] + 1


def runs_of(filled, min_len=40):
    out, start = [], None
    for x, f in enumerate(list(filled) + [False]):
        if f and start is None:
            start = x
        if not f and start is not None:
            if x - start > min_len:
                out.append((start, x))
            start = None
    return out


def houses() -> None:
    """Separa as casas pelas colunas vazias; corta a legenda (primeira linha vazia abaixo da casa)."""
    im = Image.open(HOUSES_SRC).convert('RGBA')
    a = im.getchannel('A').point(lambda v: 255 if v > 128 else 0)
    w, h = a.size
    px = a.load()
    top_band = int(h * 0.65)  # legendas ficam abaixo disto
    cols = [sum(1 for y in range(0, top_band, 2) if px[x, y]) > 3 for x in range(w)]
    found = runs_of(cols)
    assert len(found) == len(HOUSE_SIZES), found
    for (x0, x1), (cw, cd) in zip(found, HOUSE_SIZES):
        count = lambda y: sum(1 for x in range(x0, x1, 2) if px[x, y])
        y0 = next(y for y in range(h) if count(y) > 3)
        bottom = next(y for y in range(int(h * 0.4), h) if count(y) == 0)
        wall_row = bottom - 20
        xs = [x for x in range(x0, x1) if px[x, wall_row]]
        wl, wr = xs[0], xs[-1] + 1
        s = (cw * CELL) / (wr - wl)
        crop = im.crop((x0, y0, x1, bottom))
        scaled = crop.resize((round(crop.width * s), round(crop.height * s)), Image.LANCZOS)
        canvas = Image.new('RGBA', (cw * CELL + 2 * PAD, scaled.height))
        canvas.alpha_composite(scaled, (PAD - round((wl - x0) * s), 0))
        out = ROOT / 'src' / 'assets' / f'town-house-red-{cw}x{cd}.png'
        canvas.save(out)
        print(f'casa {cw}x{cd}: {canvas.size}')


def main() -> None:
    houses()
    bushes()


def bushes() -> None:
    """Separa os arbustos pelas colunas vazias entre eles e monta a tira com escala única."""
    im = Image.open(BUSHES_SRC).convert('RGBA')
    a = im.getchannel('A').point(lambda v: 255 if v > 128 else 0)
    w, h = a.size
    px = a.load()
    filled = [sum(1 for y in range(0, h, 2) if px[x, y]) > 3 for x in range(w)]
    runs, start = [], None
    for x, f in enumerate(filled + [False]):
        if f and start is None:
            start = x
        if not f and start is not None:
            if x - start > 40:
                runs.append((start, x))
            start = None
    cw, ch = BUSH_CELL
    strip = Image.new('RGBA', (cw * len(runs), ch))
    for i, (x0, x1) in enumerate(runs):
        part = im.crop((x0, 0, x1, h))
        bb = solid_bbox(part, 2)
        part = part.crop(bb)
        part = part.resize((round(part.width * BUSH_SCALE), round(part.height * BUSH_SCALE)), Image.LANCZOS)
        strip.alpha_composite(part, (i * cw + (cw - part.width) // 2, ch - part.height))
        print(f'arbusto {i}: {part.size}')
    strip.save(BUSHES_OUT)


if __name__ == '__main__':
    main()
