"""Atlas de terreno do Titã e do Orvalis em voxel, em **32 px por face** (ADR 0143: arte de 32 px quando houver; a de 16 px é a alternativa padrão e vira 32 por dobra de pixels), mais as variantes de **16 px** (a anterior, ADR 0106) e de **8 px** (vista isométrica).

O nome do arquivo ficou (`…atlas32`) porque a **arte-fonte** dos tiles do Titã tem 32 px (ADR 0079); o mundo é renderizado a 16 px e a fonte pode ser maior (a do Orvalis tem até 2048 px).
Entradas : `src/titan/tiles.json` (ordem dos tiles, lida também por `voxel.ts`/`mesher.ts`; `tile`/`pad` do atlas de 16 px e `iso.tile`/`iso.pad` do de 8 px), `assets-src/titan/texturas32/02-Texturas-PNG/<bloco>/<papel>.png`
           (Titã; quadrado, a lateral da laje com a metade da altura) e `assets-src/orvalis-voxel/texturas32/orvalis/<tile>.png` (Orvalis; qualquer tamanho quadrado).
Saídas   : `src/assets/titan-atlas-32px.webp` (**padrão**), `titan-atlas-16px.webp` (alternativa, sem uso) e `titan-atlas-8px.webp` (isométrica): grade de 8 colunas, tile com borda duplicada (32 px + 4 de cada lado, passo 40; 16 px + 2, passo 20;
           8 px + 1, passo 10: **a mesma proporção**, então os UVs de `titan/mesher.ts` `tileUV` valem para os três), WebP SEM perdas, fundo transparente nas sobras. A fonte é reduzida por média de área (`BOX`; `LANCZOS` se a razão não for inteira) e a de tamanho menor é **ampliada por vizinho mais próximo** (16 → 32). **Arte de 32 px do pacote Assets32px do Drive** (`assets-src/orvalis-voxel/assets32/`, manifesto `tiles.json`: tile → arquivo) vale no lugar da fonte de 16 px do tile.
A lateral da laje (largura × metade) vai na METADE DE CIMA do tile. Repetível. Uso: python3 scripts/make-titan-atlas32.py
"""
import json
import math

from PIL import Image

CFG = json.load(open('src/titan/tiles.json'))
SRC = 'assets-src/titan/texturas32/02-Texturas-PNG/'
SRC_ORV = 'assets-src/orvalis-voxel/texturas32/'  # tiles `orvalis/…` (ADR 0105; `make-orvalis-voxel-arte.py`)
COLS = CFG['cols']
A32 = 'assets-src/orvalis-voxel/assets32/'
M32 = json.load(open(A32 + 'tiles.json'))['tiles']  # tile do Orvalis -> arte de 32 px (ADR 0143)
VARIANTS = [('src/assets/titan-atlas-32px.webp', CFG['tile'] * 2, CFG['pad'] * 2), ('src/assets/titan-atlas-16px.webp', CFG['tile'], CFG['pad']), ('src/assets/titan-atlas-8px.webp', CFG['iso']['tile'], CFG['iso']['pad'])]


def load(name: str) -> Image.Image:
    key = name[len('orvalis/'):] if name.startswith('orvalis/') else None
    if key in M32:  # arte de 32 px do pacote (a lateral da laje: só a metade de baixo vale, vira 32 × 16)
        e = M32[key]
        im = Image.open(f"{A32}{e['file'] if isinstance(e, dict) else e}_32x32.png").convert('RGBA')
        return im.crop((0, im.height // 2, im.width, im.height)) if isinstance(e, dict) and e.get('crop') == 'baixo' else im
    return Image.open(f"{SRC_ORV if name.startswith('orvalis/') else SRC}{name}.png").convert('RGBA')


def to_tile(im: Image.Image, name: str, tile: int) -> Image.Image:
    """Reduz a fonte para `tile` px de largura (a altura mantém a proporção: quadrado ou metade, para a lateral da laje)."""
    w, h = im.size
    assert h in (w, w // 2) and (w >= tile or tile % w == 0), (name, im.size)
    if w == tile:
        return im
    if w < tile:  # só 16 px: dobra de pixels, sem suavizar (a alternativa padrão do ADR 0143)
        return im.resize((tile, h * tile // w), Image.NEAREST)
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
