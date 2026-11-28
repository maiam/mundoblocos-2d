"""Atlas da horta do Orvalis em voxel (ADR 0113, 0127, 0128, 0129): 49 quadros de **32 px** (ADR 0143: a arte de 32 px do pacote Assets32px em `assets-src/orvalis-voxel/assets32/` quando houver; a de 16 px é ampliada por vizinho mais próximo) numa tira (trigo, cenoura e batata × 8 idades; tomate × 3; beterraba × 4; caule de abóbora e de melancia × 8 idades e o caule conectado de cada um), a partir da arte do pacote Texturas16px.

Entradas : assets-src/orvalis-voxel/texturas32/horta/<espécie>-<fase>.png   quadradas (16 px ou maiores; reduzidas a 16); espécies na ordem trigo, cenoura, batata, tomate; fases 1 a 3. Fonte editável.
Saída    : src/assets/orvalis-horta-32px.webp   1568 × 32 (a coluna é `4 + GARDEN_LAYOUT[espécie].start + idade` no `setCrops` do renderer: as 4 primeiras do atlas de cultivo são do junco)
Uso: python3 scripts/make-orvalis-horta.py   (precisa do Pillow: `pip3 install pillow`)
"""
import os

from PIL import Image

SRC = 'assets-src/orvalis-voxel/texturas32/horta/'
OUT = 'src/assets/orvalis-horta-32px.webp'
A32 = 'assets-src/orvalis-voxel/assets32/'
T = 32  # px de cada quadro
# quadro de `texturas32/horta/<nome>` -> arte de 32 px do pacote (a beterraba usa as idades 00–03)
HORTA32 = {f'{sp}-{n}': f'orvalis_{sp}_fase_0{n}' for sp in ('trigo', 'cenoura', 'batata', 'tomate') for n in (1, 2, 3)} | {f'beterraba-{n}': f'orvalis_beterraba_idade_0{n - 1}' for n in (1, 2, 3, 4)}


def up(im: Image.Image) -> Image.Image:
    return im if im.width == T else im.resize((T, T), Image.NEAREST if im.width < T else Image.BOX if im.width % T == 0 else Image.LANCZOS)
SPECIES = ('trigo', 'cenoura', 'batata', 'tomate')


def frame(name: str) -> Image.Image:
    f = f'{A32}{HORTA32[name]}_32x32.png' if name in HORTA32 else ''
    im = Image.open(f if f and os.path.exists(f) else SRC + name + '.png').convert('RGBA')
    assert im.width == im.height, (name, im.size)
    return up(im)


CUL = 'assets-src/orvalis-voxel/cultivos/orvalis_'  # sprites novos do pacote Cultivos (ADR 0128, 0129)


def cul(name: str) -> Image.Image:
    f = f'{A32}orvalis_{name}_32x32.png'
    if os.path.exists(f):  # a arte de 32 px do pacote
        im = Image.open(f).convert('RGBA')
        assert im.size == (T, T), (name, im.size)
        return im
    im = Image.open(f'{CUL}{name}_16x16.png').convert('RGBA')  # a alternativa padrão: 16 px dobrados
    assert im.size == (16, 16), (name, im.size)
    return up(im)


def ages8() -> dict[str, list[Image.Image]]:
    """As 8 idades pelas regras do pacote (`LEIA-ME`): trigo = sprites novos 1, 2, 3, 4 e 6 e as fases antigas 1, 2 e 3 nas idades 0, 5 e 7; cenoura e batata = fase 1 (0–1), fase 2 (2–3), aparência 03 (4–6), fase 3 (7)."""
    out: dict[str, list[Image.Image]] = {}
    t = lambda f: frame(f'trigo-{f}')  # noqa: E731
    out['trigo'] = [t(1), cul('trigo_idade_01'), cul('trigo_idade_02'), cul('trigo_idade_03'), cul('trigo_idade_04'), t(2), cul('trigo_idade_06'), t(3)]
    for sp in ('cenoura', 'batata'):
        f1, f2, f3, a3 = frame(f'{sp}-1'), frame(f'{sp}-2'), frame(f'{sp}-3'), cul(f'{sp}_aparencia_03')
        out[sp] = [f1, f1, f2, f2, a3, a3, a3, f3]
    return out


if __name__ == '__main__':
    out = Image.new('RGBA', (T * 49, T), (0, 0, 0, 0))
    frames: list[Image.Image] = []
    a8 = ages8()
    for sp in ('trigo', 'cenoura', 'batata'):
        frames += a8[sp]
    frames += [frame(f'tomate-{f}') for f in (1, 2, 3)]  # tomate: 3 fases (do Orvalis, fora da Wiki)
    frames += [frame(f'beterraba-{f}') for f in (1, 2, 3, 4)]  # beterraba (ADR 0127): 4 idades
    for sp in ('abobora', 'melancia'):  # caules (ADR 0128): 8 idades cada
        frames += [cul(f'caule_{sp}_idade_0{i}') for i in range(8)]
    frames += [cul(f'caule_{sp}_ligado') for sp in ('abobora', 'melancia')]  # caule conectado de cada um
    assert len(frames) == 49, len(frames)
    for col, im in enumerate(frames):
        out.paste(im, (col * T, 0))
    out.save(OUT, lossless=True, quality=100, method=6)
    print(OUT, out.size)
