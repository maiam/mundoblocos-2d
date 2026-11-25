"""Atlas de terreno do Titã e do Orvalis em voxel, em **16 px por face** (ADR 0106; regra do Minecraft) e a variante de **8 px** da vista isométrica.

O nome do arquivo ficou (`…atlas32`) porque a **arte-fonte** dos tiles do Titã tem 32 px (ADR 0079); o mundo é renderizado a 16 px e a fonte pode ser maior (a do Orvalis tem até 2048 px).
Entradas : `src/titan/tiles.json` (ordem dos tiles, lida também por `voxel.ts`/`mesher.ts`; `tile`/`pad` do atlas de 16 px e `iso.tile`/`iso.pad` do de 8 px), `assets-src/titan/texturas32/02-Texturas-PNG/<bloco>/<papel>.png`
           (Titã; quadrado, a lateral da laje com a metade da altura) e `assets-src/orvalis-voxel/texturas32/orvalis/<tile>.png` (Orvalis; qualquer tamanho quadrado).
Saídas   : `src/assets/titan-atlas-16px.webp` (padrão) e `src/assets/titan-atlas-8px.webp` (isométrica): grade de 8 colunas, tile com borda duplicada (16 px + 2 de cada lado, passo 20; 8 px + 1, passo 10: **a mesma
           proporção**, então os UVs de `titan/mesher.ts` `tileUV` valem para os dois), WebP SEM perdas, fundo transparente nas sobras. A fonte é reduzida por média de área (`BOX`; `LANCZOS` se a razão não for inteira).
A lateral da laje (largura × metade) vai na METADE DE CIMA do tile. Repetível. Uso: python3 scripts/make-titan-atlas32.py
"""
import json
import math

from PIL import Image

CFG = json.load(open('src/titan/tiles.json'))
SRC = 'assets-src/titan/texturas32/02-Texturas-PNG/'
SRC_ORV = 'assets-src/orvalis-voxel/texturas32/'  # tiles `orvalis/…` (ADR 0105; `make-orvalis-voxel-arte.py`)
COLS = CFG['cols']
VARIANTS = [('src/assets/titan-atlas-16px.webp', CFG['tile'], CFG['pad']), ('src/assets/titan-atlas-8px.webp', CFG['iso']['tile'], CFG['iso']['pad'])]


def load(name: str) -> Image.Image:
    return Image.open(f"{SRC_ORV if name.startswith('orvalis/') else SRC}{name}.png").convert('RGBA')


def to_tile(im: Image.Image, name: str, tile: int) -> Image.Image:
    """Reduz a fonte para `tile` px de largura (a altura mantém a proporção: quadrado ou metade, para a lateral da laje)."""
    w, h = im.size
    assert w >= tile and h in (w, w // 2), (name, im.size)
    if w == tile:
        return im
    return im.resize((tile, h * tile // w), Image.BOX if w % tile == 0 else Image.LANCZOS)


def build(out: str, tile: int, pad: int) -> None:
    pitch = tile + 2 * pad
    rows = math.ceil(len(CFG['tiles']) / COLS)
    atlas = Image.new('RGBA', (COLS * pitch, rows * pitch), (0, 0, 0, 0))
    for i, name in enumerate(CFG['tiles']):
        src = to_tile(load(name), name, tile)
        t = Image.new('RGBA', (tile, tile), (0, 0, 0, 0)); t.paste(src, (0, 0))
        x0, y0 = (i % COLS) * pitch + pad, (i // COLS) * pitch + pad
        atlas.paste(t, (x0, y0))
        h = src.size[1]
        for d in range(1, pad + 1):  # borda duplicada (evita costura no filtro): repete as bordas da arte útil
            for k in range(tile):
                atlas.putpixel((x0 - d, y0 + min(k, h - 1)), t.getpixel((0, min(k, h - 1)))); atlas.putpixel((x0 + tile - 1 + d, y0 + min(k, h - 1)), t.getpixel((tile - 1, min(k, h - 1))))
                atlas.putpixel((x0 + k, y0 - d), t.getpixel((k, 0))); atlas.putpixel((x0 + k, y0 + h - 1 + d), t.getpixel((k, h - 1)))
    atlas.save(out, 'WEBP', lossless=True, method=6)
    print(out, atlas.size, len(CFG['tiles']), 'tiles de', tile, 'px')


def main() -> None:
    for out, tile, pad in VARIANTS:
        build(out, tile, pad)


if __name__ == '__main__':
    main()
