#!/usr/bin/env python3
"""Arte dos interiores (ADR 0014): assets-src/interiors/<id>.png → src/assets/interior-<id>.png.

A imagem inteira vira o cômodo: é só redimensionada para PX_PER_CELL px por célula, com a grade do mapa lógico
(`world/interiors.ts`, `InteriorDef.map`: colunas × linhas) dividindo a imagem em partes iguais. Nada é recortado nem
deslocado, para o mapa continuar batendo com o desenho. Depois: python3 scripts/optimize-assets.py.
`--grid <png>` grava uma prévia com a grade e as células bloqueadas (conferência do mapa).
"""
import re
import sys
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'assets-src' / 'interiors'
OUT = ROOT / 'src' / 'assets'
PX_PER_CELL = 64


def maps():
    """Lê os mapas de `world/interiors.ts` (id → linhas), para a grade e a prévia baterem com o jogo."""
    ts = (ROOT / 'src' / 'world' / 'interiors.ts').read_text()
    out = {}
    for m in re.finditer(r"id: '(\w+)'.*?map: \[(.*?)\]", ts, re.S):
        out[m.group(1)] = re.findall(r"'([#.E]+)'", m.group(2))
    return out


def main():
    grid = Path(sys.argv[sys.argv.index('--grid') + 1]) if '--grid' in sys.argv else None
    for iid, rows in maps().items():
        cols, n = len(rows[0]), len(rows)
        im = Image.open(SRC / f'{iid}.png').convert('RGBA')
        out = im.resize((cols * PX_PER_CELL, n * PX_PER_CELL), Image.LANCZOS)
        out.save(OUT / f'interior-{iid}.png', optimize=True)
        print(f'interior-{iid}.png: {out.size} ({cols} × {n} células; origem {im.size})')
        if grid:
            g = out.copy()
            d = ImageDraw.Draw(g, 'RGBA')
            for y, row in enumerate(rows):
                for x, ch in enumerate(row):
                    box = (x * PX_PER_CELL, y * PX_PER_CELL, (x + 1) * PX_PER_CELL - 1, (y + 1) * PX_PER_CELL - 1)
                    if ch == '#':
                        d.rectangle(box, fill=(255, 0, 0, 70))
                    elif ch == 'E':
                        d.rectangle(box, fill=(0, 120, 255, 110))
                    d.rectangle(box, outline=(255, 255, 255, 120))
            g.save(grid.with_name(f'{grid.stem}-{iid}{grid.suffix}'))


if __name__ == '__main__':
    main()
