#!/usr/bin/env python3
"""Arte da Cidade do Despertar: recorta e reduz as imagens de construção fornecidas.

assets-src/town-house-red.png (casa de telhado vermelho, fundo transparente) → src/assets/town-house-red.png
(largura 320 px = 5 células em 2×).
assets-src/town-bushes.png (3 arbustos lado a lado: redondo, alto, largo) → src/assets/town-bushes.png: tira de
3 quadros de 120 × 96 px, mesma escala para todos, cada um centrado e com a base no pé do quadro.
Depois rode scripts/optimize-assets.py (PNG → WebP).
Imprime as linhas do recorte (telhado/parede) usadas em src/render/townArt.ts (HOUSE_RED_SLICES).
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'assets-src' / 'town-house-red.png'
OUT = ROOT / 'src' / 'assets' / 'town-house-red.png'
WIDTH = 320
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


def main() -> None:
    im = Image.open(SRC).convert('RGBA')
    box = solid_bbox(im)
    crop = im.crop(box)
    s = WIDTH / crop.width
    out = crop.resize((WIDTH, round(crop.height * s)), Image.LANCZOS)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    out.save(OUT)
    # Fim do telhado (beiral): primeira linha, de baixo para cima no terço superior, com madeira no centro.
    px = crop.load()
    cx = crop.width // 2 - 150
    eave = next(y for y in range(int(crop.height * 0.3), crop.height) if px[cx, y][0] < 180 and px[cx, y][1] > 60)
    print(f'recorte {box} → {out.size}; beiral em y={round(eave * s)} (de {out.height})')
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
