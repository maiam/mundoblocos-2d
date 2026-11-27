"""Atlas da horta do Orvalis em voxel (ADR 0113, 0127): 34 quadros de 16 px (trigo, cenoura, batata e tomate × 3 fases; a beterraba × 4 idades; o caule de abóbora e o de melancia × 8 idades e o caule conectado de cada um, ADR 0128) numa tira, a partir da arte do pacote Texturas16px.

Entradas : assets-src/orvalis-voxel/texturas32/horta/<espécie>-<fase>.png   quadradas (16 px ou maiores; reduzidas a 16); espécies na ordem trigo, cenoura, batata, tomate; fases 1 a 3. Fonte editável.
Saída    : src/assets/orvalis-horta-16px.webp   544 × 16 (a coluna é `4 + espécie × 3 + (fase − 1)` no `setCrops` do renderer: as 4 primeiras do atlas de cultivo são do junco)
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
    out = Image.new('RGBA', (16 * 34, 16), (0, 0, 0, 0))
    for i, sp in enumerate(SPECIES):
        for f in (1, 2, 3):
            out.paste(frame(f'{sp}-{f}'), ((i * 3 + f - 1) * 16, 0))
    for f in (1, 2, 3, 4):  # beterraba (ADR 0127): 4 idades, depois das 12 das outras espécies
        out.paste(frame(f'beterraba-{f}'), ((12 + f - 1) * 16, 0))
    CUL = 'assets-src/orvalis-voxel/cultivos/orvalis_'  # caules de abóbora e melancia (ADR 0128): 8 idades cada, depois o caule conectado de cada um
    col = 16
    for sp in ('abobora', 'melancia'):
        for i in range(8):
            out.paste(Image.open(f'{CUL}caule_{sp}_idade_0{i}_16x16.png').convert('RGBA'), (col * 16, 0)); col += 1
    for sp in ('abobora', 'melancia'):
        out.paste(Image.open(f'{CUL}caule_{sp}_ligado_16x16.png').convert('RGBA'), (col * 16, 0)); col += 1
    assert col == 34
    out.save(OUT, lossless=True, quality=100, method=6)
    print(OUT, out.size)
