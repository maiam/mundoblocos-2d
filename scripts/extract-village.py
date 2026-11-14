#!/usr/bin/env python3
"""Vila Camponesa (v0.93.89): itens de assets-src/vila-camponesa/itens → src/assets/village-<nome>.webp.

Cada item é recortado pela caixa útil (alfa), reduzido para a escala do jogo e gravado em WebP. Escala do jogo: 48 px de imagem por
célula ANTIGA (32 px de mundo) = 24 px por célula da grade fina (`TOWN_PX_PER_CELL` em render/townArt.ts), então a largura final é
`largura em células × 24`. Larguras em células: docs/domains/village.md (medidas no mapa; os itens não são recortes dele).
Uso: python3 scripts/extract-village.py   (depois python3 scripts/optimize-assets.py não é necessário: já sai em WebP)
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'assets-src' / 'vila-camponesa' / 'itens'
OUT = ROOT / 'src' / 'assets'
PX_PER_CELL = 24

# nome -> (arquivo, largura da caixa útil em células, recorte opcional (x0, y0, x1, y1) em px do item ou None)
ITEMS: dict[str, tuple[str, float, tuple[int, int, int, int] | None]] = {
    'house-straw-1': ('0-1-01-casa-de-palha.png', 8.6, None),
    'house-straw-2': ('2-1-01-casa-de-palha.png', 8.6, None),
    'house-straw-3': ('0-2-01-casa-de-palha.png', 8.6, None),
    'house-tile-1': ('0-1-02-casa-de-telhas.png', 8.6, None),
    'house-tile-2': ('2-2-01-casa-de-telhas.png', 8.6, None),
    'barn': ('1-0-01-celeiro.png', 13.5, None),
    'coop': ('2-0-01-galinheiro.png', 4.5, None),
    'well': ('1-1-01-poco.png', 4.7, None),
    'bench-1': ('1-1-02-banco.png', 2.0, None),
    'bench-2': ('1-2-02-banco.png', 2.0, None),
    'bed-wheat': ('0-0-02-canteiro-trigo.png', 6.5, None),
    'bed-veg': ('2-1-02-horta-cercada.png', 7.0, None),
    'oak-1': ('0-0-01-carvalho.png', 8.0, None),
    'oak-2': ('0-2-02-carvalho.png', 7.5, None),
    'oak-3': ('2-2-03-carvalho.png', 7.5, None),
    'tree-1': ('2-1-03-arvore-pequena.png', 5.0, None),
    'tree-2': ('0-1-04-arvore-pequena.png', 5.0, None),
    # muro de estacas: o segmento reto mede 6 células (7 estacas); os cantos e as laterais saem na mesma escala de estaca
    'palisade-h6': ('1-2-05-palicada-reta.png', 6.0, None),
    'palisade-h7': ('1-2-05-palicada-reta.png', 7.0, None),
    'palisade-nw': ('compl-01-palicada-canto-noroeste.png', 6.9, None),
    'palisade-ne': ('compl-02-palicada-canto-nordeste.png', 6.9, None),
    'palisade-sw': ('0-2-06-palicada-canto-sudoeste.png', 5.5, None),
    'palisade-se': ('2-2-06-palicada-canto-sudeste.png', 5.3, None),
    'gate-open': ('1-2-01-portao-aberto.png', 8.6, None),
    'gate-closed': ('compl-03-portao-fechado.png', 8.6, None),
    'lamp': ('1-2-04-poste-com-lampiao.png', 1.9, None),
    'barrel': ('1-0-03-barril.png', 1.5, None),
    'rocks': ('0-0-04-rochas.png', 3.0, None),
    'bush': ('0-0-05-arbusto-florido.png', 3.3, None),
    'logs': ('0-1-03-toras-empilhadas.png', 2.6, None),
    'hay': ('0-0-06-feno-em-pe.png', 2.4, None),
    'cart': ('1-0-04-carroca-de-mao.png', 3.6, None),
    'flowers': ('1-2-06-capim-e-flores.png', 1.8, None),
    'sacks': ('2-1-04-sacos-de-juta.png', 2.0, None),
}
# Laterais do muro (norte e sul têm o segmento reto; leste e oeste não vieram na arte): uma "estaca" recortada do braço vertical dos
# cantos do norte, de ponta a ponta, que se repete uma por fileira (período 1 célula na vertical). Ver docs/domains/village.md.
PALISADE_V = {
    'palisade-w': ('compl-01-palicada-canto-noroeste.png', (50, 198, 150, 298)),
    'palisade-e': ('compl-02-palicada-canto-nordeste.png', (505, 245, 605, 345)),
}


def bbox(im: Image.Image) -> tuple[int, int, int, int]:
    return im.getchannel('A').point(lambda v: 255 if v > 20 else 0).getbbox()


def save(name: str, im: Image.Image, cells_w: float) -> None:
    w = max(2, round(cells_w * PX_PER_CELL))
    h = max(2, round(im.height * w / im.width))
    out = im.resize((w, h), Image.LANCZOS)
    out.save(OUT / f'village-{name}.webp', 'WEBP', quality=88, method=6)
    print(f'village-{name}.webp {w}x{h}')


for name, (fn, cells_w, crop) in ITEMS.items():
    im = Image.open(SRC / fn).convert('RGBA')
    im = im.crop(crop) if crop else im
    save(name, im.crop(bbox(im)), cells_w)
for name, (fn, crop) in PALISADE_V.items():
    im = Image.open(SRC / fn).convert('RGBA').crop(crop)
    im = im.crop(bbox(im))
    save(name, im, im.width * 0.24 / PX_PER_CELL)  # escala 0,24: o período de 100 px vira 24 px = 1 célula (estaca ≈ 0,85 célula de largura)
