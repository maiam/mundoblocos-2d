"""Atlas da horta do Orvalis em voxel (ADR 0113): 12 quadros de 16 px (trigo, cenoura, batata e tomate × 3 fases) numa tira, a partir da arte do pacote Texturas16px.

Entradas : assets-src/orvalis-voxel/texturas32/horta/<espécie>-<fase>.png   quadradas (16 px ou maiores; reduzidas a 16); espécies na ordem trigo, cenoura, batata, tomate; fases 1 a 3. Fonte editável.
Saída    : src/assets/orvalis-horta-16px.webp   192 × 16 (a coluna é `4 + espécie × 3 + (fase − 1)` no `setCrops` do renderer: as 4 primeiras do atlas de cultivo são do junco)
Uso: python3 scripts/make-orvalis-horta.py   (precisa do Pillow: `pip3 install pillow`)
"""
from PIL import Image

SRC = 'assets-src/orvalis-voxel/texturas32/horta/'
OUT = 'src/assets/orvalis-horta-16px.webp'
SPECIES = ('trigo', 'cenoura', 'batata', 'tomate')


def frame(name: str) -> Image.Image:
    im = Image.open(SRC + name + '.png').convert('RGBA')
    assert im.width == im.height, (name, im.size)
    return im if im.width == 16 else im.resize((16, 16), Image.BOX if im.width % 16 == 0 else Image.LANCZOS)


if __name__ == '__main__':
    out = Image.new('RGBA', (16 * 12, 16), (0, 0, 0, 0))
    for i, sp in enumerate(SPECIES):
        for f in (1, 2, 3):
            out.paste(frame(f'{sp}-{f}'), ((i * 3 + f - 1) * 16, 0))
    out.save(OUT, lossless=True, quality=100, method=6)
    print(OUT, out.size)
