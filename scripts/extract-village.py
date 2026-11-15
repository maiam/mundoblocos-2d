#!/usr/bin/env python3
"""Vila Camponesa (v0.93.89; cerca de estacas v0.93.90): itens de assets-src/vila-camponesa/itens → src/assets/village-<nome>.webp.

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
    'gate-open': ('1-2-01-portao-aberto.png', 5.0, None),
    'gate-closed': ('compl-03-portao-fechado.png', 5.0, None),
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
def bbox(im: Image.Image) -> tuple[int, int, int, int]:
    return im.getchannel('A').point(lambda v: 255 if v > 20 else 0).getbbox()


def save(name: str, im: Image.Image, cells_w: float) -> None:
    w = max(2, round(cells_w * PX_PER_CELL))
    h = max(2, round(im.height * w / im.width))
    out = im.resize((w, h), Image.LANCZOS)
    out.save(OUT / f'village-{name}.webp', 'WEBP', quality=88, method=6)
    print(f'village-{name}.webp {w}x{h}')


# Fumaça desenhada nas chaminés das 5 casas (v0.93.109): sai da arte (a fumaça de verdade é animada em código, `render/three/chimneySmoke.ts`).
# Valor = linha (em px da IMAGEM FINAL de 206 de largura) em que começa o topo de pedra da chaminé: tudo acima dela, à direita de x = 90, é apagado.
# A imagem NÃO é recortada de novo (a caixa útil encolheria o topo e mudaria as coordenadas medidas das bocas das chaminés em `townArt.CHIMNEYS`).
SMOKE_RIM = {'house-straw-1': 41, 'house-straw-2': 39, 'house-straw-3': 42, 'house-tile-1': 37, 'house-tile-2': 40}
SMOKE_X0 = 90


def erase_smoke(im: Image.Image, cells_w: float, rim: int) -> Image.Image:
    k = im.width / round(cells_w * PX_PER_CELL)          # px do item por px da imagem final
    out = im.copy()
    out.paste((0, 0, 0, 0), (round(SMOKE_X0 * k), 0, im.width, round(rim * k)))
    return out


for name, (fn, cells_w, crop) in ITEMS.items():
    im = Image.open(SRC / fn).convert('RGBA')
    im = im.crop(crop) if crop else im
    im = im.crop(bbox(im))
    if name in SMOKE_RIM:
        im = erase_smoke(im, cells_w, SMOKE_RIM[name])
    save(name, im, cells_w)

# ---- Cerca de estacas (v0.93.90): uma unidade recortada da paliçada reta -----------------------------------------------------------
# A reta (`1-2-05`) alterna estaca alta (com corda) e baixa; de vale a vale (x 105–228, y 143–401) há um PERÍODO de 2 estacas que emenda
# consigo mesmo. Um bloco da cerca = 2 períodos = 4 estacas em 1 célula de largura. Baixa (jogador coloca): 1 × 1 célula (16 × 16 px do jogo);
# alta (muro da vila): 1 × 1,5 células (16 × 24 px; mais baixa que os 16 × 32 pedidos primeiro, para deformar menos), com o CORPO entre as cordas esticado (a madeira é vertical: esticar não deforma).
# Resolução: 96 px por célula da grade fina (4× a das outras peças), porque são só 16 px de jogo.
STAKE_PX = 96
src = Image.open(SRC / '1-2-05-palicada-reta.png').convert('RGBA')
per = src.crop((105, 143, 228, 401))
TOP, BODY0, BODY1 = 136, 146, 186


def stake_strip(extra: int) -> Image.Image:
    top = per.crop((0, 0, per.width, TOP))
    body = per.crop((0, BODY0, per.width, BODY1)).resize((per.width, BODY1 - BODY0 + extra), Image.LANCZOS)
    mid = per.crop((0, TOP, per.width, BODY0))
    bot = per.crop((0, BODY1, per.width, per.height))
    out = Image.new('RGBA', (per.width, top.height + mid.height + body.height + bot.height))
    y = 0
    for part in (top, mid, body, bot):
        out.paste(part, (0, y))
        y += part.height
    return out


def two_periods(p: Image.Image) -> Image.Image:
    w = Image.new('RGBA', (p.width * 2, p.height))
    w.paste(p, (0, 0)); w.paste(p, (p.width, 0))
    return w


low = two_periods(stake_strip(0))
tall_target = round(low.width * 1.5)  # 2 : 3 (16 × 24)
tall = two_periods(stake_strip(max(0, tall_target - stake_strip(0).height)))
low.resize((STAKE_PX, STAKE_PX), Image.LANCZOS).save(OUT / 'village-stake-low.webp', 'WEBP', quality=90, method=6)
tall.resize((STAKE_PX, round(STAKE_PX * 1.5)), Image.LANCZOS).save(OUT / 'village-stake-tall.webp', 'WEBP', quality=90, method=6)
# ícone do item (64 × 64): a cerca baixa centrada
icon = Image.new('RGBA', (64, 64), (0, 0, 0, 0))
small = low.resize((56, 56), Image.LANCZOS)
icon.alpha_composite(small, (4, 6))
icon.save(OUT / 'icon-block-fence-stake.webp', 'WEBP', quality=90, method=6)
print('village-stake-low.webp / village-stake-tall.webp / icon-block-fence-stake.webp')


# ---- Itens da água (v0.93.92): vitórias-régias (objetos) e peixes (sprites girados no jogo) -------------------------------------------
# Fonte: assets-src/agua-itens/*.png (arte do dono do produto, 12 itens). Plantas: 48 px por célula (densas, como as estacas); peixes: 128 px de comprimento.
WATER_SRC = ROOT / 'assets-src' / 'agua-itens'
WATER_PLANTS = {  # nome -> (arquivo, largura em células da grade fina)
    'lily-leaf': ('lirio-folha.png', 2.2), 'lily-bud': ('lirio-botao.png', 2.4), 'lily-white': ('lirio-flor-branca.png', 2.4), 'lily-pink': ('lirio-flor-rosa.png', 2.4),
    'victoria-a': ('victoria-folha-a.png', 4.4), 'victoria-b': ('victoria-folha-b.png', 4.4), 'victoria-flower': ('victoria-flor.png', 4.4), 'victoria-pair': ('victoria-par.png', 5.2),
}
for name, (fn, cells_w) in WATER_PLANTS.items():
    im = Image.open(WATER_SRC / fn).convert('RGBA')
    im = im.crop(bbox(im))
    w = round(cells_w * 48)
    im.resize((w, round(im.height * w / im.width)), Image.LANCZOS).save(OUT / f'water-{name}.webp', 'WEBP', quality=88, method=6)
FISH = {'gold': 'peixe-dourado.png', 'perch': 'peixe-listrado.png', 'silver': 'peixe-azul.png', 'carp': 'peixe-carpa.png'}
for name, fn in FISH.items():
    im = Image.open(WATER_SRC / fn).convert('RGBA')
    im = im.crop(bbox(im))
    # quadro quadrado (o peixe gira em volta do centro): lado = diagonal do desenho, para nenhum ponto sair ao girar
    side = int((im.width ** 2 + im.height ** 2) ** 0.5) + 2
    q = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    q.alpha_composite(im, ((side - im.width) // 2, (side - im.height) // 2))
    q.resize((160, 160), Image.LANCZOS).save(OUT / f'water-fish-{name}.webp', 'WEBP', quality=88, method=6)
print('itens da água: plantas e peixes')
