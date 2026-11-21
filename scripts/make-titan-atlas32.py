"""Atlas de terreno do Titã em 32 px por face (ADR 0079): monta `src/assets/titan-atlas-32px.webp` a partir das texturas planas do dono do produto.

Entradas : `src/titan/tiles.json` (a ordem dos tiles; é a mesma que o TypeScript lê em `voxel.ts`) e `assets-src/titan/texturas32/02-Texturas-PNG/<bloco>/<papel>.png` (32 × 32, a lateral da laje 32 × 16).
Saída    : `src/assets/titan-atlas-32px.webp`: grade de 8 colunas, tile de 32 px com 2 px de borda duplicada (passo 36; `titan/mesher.ts` `tileUV`), WebP SEM perdas, fundo transparente nas sobras.
A lateral da laje (32 × 16) vai na METADE DE CIMA do tile (o mesher usa os 16 px de cima para a laje de meia altura). Repetível. Uso: python3 -I scripts/make-titan-atlas32.py
"""
import json
import math

from PIL import Image

CFG = json.load(open('src/titan/tiles.json'))
SRC = 'assets-src/titan/texturas32/02-Texturas-PNG/'
OUT = 'src/assets/titan-atlas-32px.webp'
TILE, PAD, COLS = CFG['tile'], CFG['pad'], CFG['cols']
PITCH = TILE + 2 * PAD


def main() -> None:
    rows = math.ceil(len(CFG['tiles']) / COLS)
    atlas = Image.new('RGBA', (COLS * PITCH, rows * PITCH), (0, 0, 0, 0))
    for i, name in enumerate(CFG['tiles']):
        src = Image.open(f'{SRC}{name}.png').convert('RGBA')
        assert src.size[0] == TILE and src.size[1] in (TILE, TILE // 2), (name, src.size)
        t = Image.new('RGBA', (TILE, TILE), (0, 0, 0, 0)); t.paste(src, (0, 0))
        x0, y0 = (i % COLS) * PITCH + PAD, (i // COLS) * PITCH + PAD
        atlas.paste(t, (x0, y0))
        h = src.size[1]
        for d in range(1, PAD + 1):  # borda duplicada (evita costura no filtro): repete as bordas da arte útil
            for k in range(TILE):
                atlas.putpixel((x0 - d, y0 + min(k, h - 1)), t.getpixel((0, min(k, h - 1)))); atlas.putpixel((x0 + TILE - 1 + d, y0 + min(k, h - 1)), t.getpixel((TILE - 1, min(k, h - 1))))
                atlas.putpixel((x0 + k, y0 - d), t.getpixel((k, 0))); atlas.putpixel((x0 + k, y0 + h - 1 + d), t.getpixel((k, h - 1)))
    atlas.save(OUT, 'WEBP', lossless=True, method=6)
    print(OUT, atlas.size, len(CFG['tiles']), 'tiles')


if __name__ == '__main__':
    main()
