"""Arte de 32 × 32 px do Titã (ADR 0053): atlas de itens e junco com mais definição, a partir do pacote de arte em `assets-src/titan/arte32/`.

Entradas : src/assets/titan-hotbar-sprites-16px.webp (atlas de itens 4 × 4 de 16 px, gerado por make-titan-fabricacao.py; só a cápsula legada, id 7, ainda vem dele),
           assets-src/titan/arte32/*.png: um sprite de 32 × 32 por item (tabela `NEW` abaixo; blocos e mesa em vista 3/4, o resto plano),
           assets-src/titan/arte16/*.png + itens.json: sprites de 16 × 16 de armas, ferramentas e itens (ADR 0097; `make-titan-sprites16.py`), ampliados 2× sem suavização,
           titan-junco-variantes-32px.png (128 × 32, 3 silhuetas + 1 célula vazia).
Saídas   : src/assets/titan-itens-32px.webp          128 × 128 (grade 4 × 4 de 32 px, índice = id do item − 1): todos os itens em 32 px de verdade; a célula 7 (cápsula legada) é a base de 16 px ampliada 2× (vizinho mais próximo)
           src/assets/titan-junco-variantes-32px.webp 128 × 32 (colunas 0–2 = broto baixo, haste bifurcada, tufo aberto; coluna 3 vazia)
           src/assets/titan-lago-16px.webp / -8px.webp  64 × 16 e 32 × 8 (Lago Escuro V2, ADR 0057; reduzido da arte de 32 px, ADR 0106): células 0 = topo quadro 1, 1 = topo quadro 2, 2 = lateral exposta, 3 = a mesma lateral (a ondulação desloca o UV em 1 célula: o quadro 2 do topo
                                                      cai na célula 1 e a lateral cai na 3, igual à 2). Fontes: lago_topo_01/02_32px.png e lago_lateral_exposta_32px.png.
Tudo em WebP SEM perdas (fora do optimize-assets.py). Repetível: lê só a base de 16 px e o pacote, nunca o próprio resultado. Uso: python3 -I scripts/make-titan-arte32.py
"""
import json
import os

from PIL import Image

BASE = 'src/assets/titan-hotbar-sprites-16px.webp'
SRC = 'assets-src/titan/arte32/'
SRC16 = 'assets-src/titan/arte16/'  # armas, ferramentas e itens de 16 × 16 px (ADR 0097): `itens.json` diz qual item usa qual arquivo
SRC_ORV = 'assets-src/orvalis-voxel/icones32/'  # blocos do Orvalis em voxel (ADR 0105; `make-orvalis-voxel-arte.py`): itens 42–51
ORV_ICONS = {42: 'terra_com_grama', 43: 'terra', 44: 'pedra', 45: 'areia_da_praia', 46: 'tora_de_carvalho', 47: 'folhas_de_carvalho', 48: 'tora_de_cerejeira', 49: 'folhas_de_cerejeira', 50: 'tora_de_betula', 51: 'folhas_de_betula', 52: 'tabuas_de_carvalho', 53: 'tabuas_de_cerejeira', 54: 'tabuas_de_betula', 56: 'mesa_de_carpintaria', 57: 'pedra_lisa', 58: 'tijolo_de_pedra', 59: 'laje_de_pedra', 60: 'degrau_de_pedra', 61: 'mureta_de_pedra', 62: 'terra_arada_seca', 63: 'terra_arada_umida', 64: 'caminho_de_terra', 65: 'terra_infertil', 66: 'bloco_de_argila', 67: 'bloco_de_tijolos', 83: 'fornalha', 88: 'bloco_de_carvao', 156: 'laje_de_carvalho', 157: 'laje_de_cerejeira', 158: 'laje_de_betula', 159: 'degrau_de_carvalho', 160: 'degrau_de_cerejeira', 161: 'degrau_de_betula'}
OUT_ITEMS, OUT_REED = 'src/assets/titan-itens-32px.webp', 'src/assets/titan-junco-variantes-32px.webp'
OUT_LAKE = {16: 'src/assets/titan-lago-16px.webp', 8: 'src/assets/titan-lago-8px.webp'}  # a água do mundo: 16 px (padrão) e 8 px (isométrica), ADR 0106
NEW = {  # id do item -> arte de 32 px
    1: 'areia_ocre_32px.png', 2: 'areia_umida_32px.png', 3: 'rocha_escura_32px.png', 4: 'gelo_fosco_32px.png',
    5: 'fragmento_de_rocha_32px.png', 6: 'fragmento_de_gelo_32px.png', 8: 'lanterna_da_margem_32px.png',
    9: 'mesa_de_trabalho_32px.png', 10: 'Lente_de_Gelo_32px.png', 11: 'Brasa_de_Ambar_32px.png', 12: 'Junco_de_Vidro_Item_32px.png', 13: 'laje_de_rocha_32px.png',
    14: 'Marco_de_Margem_Icone_32px.png', 15: 'Painel_de_Junco_Icone_32px.png', 16: 'Noz_de_Duna_Item_32px.png',
    17: 'Fragmento_de_Cobre_de_Duna_Item_32px.png', 18: 'Lingote_de_Cobre_de_Duna_Item_32px.png', 19: 'Haste_Seca_de_Junco_Item_32px.png',
    21: 'Braseiro_de_Rocha_Item_32px.png',
    25: 'Placa_de_Carapaca_Item_32px.png', 26: 'Revestimento_de_Carapaca_Item_32px.png',
    27: 'Carne_Crua_de_Farejador_Item_32px.png', 28: 'Carne_Assada_de_Farejador_Item_32px.png',
    29: 'Bloco_de_Ambar_Compactado_Item_32px.png', 30: 'Noz_Torrada_Item_32px.png',
    31: 'Esteira_de_Junco_Item_32px.png', 37: 'Bloco_de_Junco_Item_32px.png', 38: 'Laje_de_Junco_Item_32px.png', 39: 'Degrau_de_Junco_Item_32px.png', 40: 'Cadeira_de_Junco_Item_32px.png', 41: 'Porta_de_Junco_Item_32px.png', 32: 'Escada_de_Junco_Item_32px.png', 33: 'Bau_de_Rocha_e_Junco_Item_32px.png', 34: 'Cama_de_Junco_Item_32px.png',
}


def main() -> None:
    if os.path.exists(BASE):
        base = Image.open(BASE).convert('RGBA')
        assert base.size == (64, 64), base.size
        atlas = Image.new('RGBA', (128, 1344), (0, 0, 0, 0))  # 4 colunas × 42 linhas de 32 px (168 células, ids até 167, cercas e portões ADR 0140; antes 41 linhas, ids até 161, lajes e degraus de madeira ADR 0139; antes 39 linhas, ids até 155, ADR 0133, 0135, 0136 e 0137: pesca, flora marinha, corais e botes; 113 e 119–122 são só texturas; antes 27 linhas, ids até 105; os de 89 a 99 são a fauna de fazenda, ADR 0124, 100–101 a beterraba, ADR 0127, e 102–105 a abóbora e a melancia, ADR 0128; 86 em uso: 85 = Tocha e 86 = textura da Tocha de parede, que não é item; o CSS lê `4 × 27`; ADR 0089, 0102, 0105, 0107, 0108, 0121)
        atlas.paste(base.resize((128, 128), Image.NEAREST), (0, 0))  # a base 2×, sem suavização
    else:  # a base de 16 px saiu com a arte do 2.5D (ADR 0115): o atlas já gravado (cápsula legada e demais células) passa a ser o ponto de partida
        old = Image.open(OUT_ITEMS).convert('RGBA')
        assert old.size[0] == 128 and old.size[1] in (672, 704, 800, 832, 864, 928, 992, 1216, 1248, 1312, 1344), old.size  # 21 linhas (antes da Tocha) ou 22
        atlas = Image.new('RGBA', (128, 1344), (0, 0, 0, 0))
        atlas.paste(old, (0, 0))
    for item, name in NEW.items():
        t = Image.open(SRC + name).convert('RGBA')
        assert t.size == (32, 32), (name, t.size)
        idx = item - 1
        x, y = (idx % 4) * 32, (idx // 4) * 32
        atlas.paste(Image.new('RGBA', (32, 32), (0, 0, 0, 0)), (x, y))  # limpa a célula antes (paste com alfa não substitui o fundo)
        atlas.paste(t, (x, y))
    for item, name in ORV_ICONS.items():
        t = Image.open(f'{SRC_ORV}{name}.png').convert('RGBA')
        assert t.size == (32, 32), (name, t.size)
        atlas.paste(t, (((item - 1) % 4) * 32, ((item - 1) // 4) * 32))
    atlas.save(OUT_ITEMS, lossless=True, quality=100, method=6)
    for item, name in json.load(open(SRC16 + 'itens.json')).items():  # arte de 16 px: ampliada 2× sem suavização para a célula de 32 px (a extrusão lê a grade de 16: `make-titan-item-masks.py`)
        t = Image.open(SRC16 + name).convert('RGBA')
        assert t.size == (16, 16), (name, t.size)
        idx = int(item) - 1
        x, y = (idx % 4) * 32, (idx // 4) * 32
        assert item not in {str(k) for k in NEW}, f'item {item} está nas duas tabelas'
        atlas.paste(Image.new('RGBA', (32, 32), (0, 0, 0, 0)), (x, y))
        atlas.paste(t.resize((32, 32), Image.NEAREST), (x, y))
    atlas.save(OUT_ITEMS, lossless=True, quality=100, method=6)
    reed = Image.open(SRC + 'titan-junco-variantes-32px.png').convert('RGBA')
    assert reed.size == (128, 32), reed.size
    reed.save(OUT_REED, lossless=True, quality=100, method=6)
    top1, top2, side = (Image.open(SRC + n).convert('RGBA') for n in ('lago_topo_01_32px.png', 'lago_topo_02_32px.png', 'lago_lateral_exposta_32px.png'))
    for t in (top1, top2, side):
        assert t.size == (32, 32), t.size
    for px, out in OUT_LAKE.items():  # 4 células (topo 1, topo 2, lateral, lateral) por tamanho; a fonte de 32 px é reduzida por média
        lake = Image.new('RGBA', (4 * px, px), (0, 0, 0, 0))
        for k, t in enumerate((top1, top2, side, side)):
            lake.paste(t.resize((px, px), Image.BOX), (k * px, 0))
        lake.save(out, lossless=True, quality=100, method=6)
    print(OUT_ITEMS, atlas.size, '|', OUT_REED, reed.size, '|', ', '.join(OUT_LAKE.values()))


if __name__ == '__main__':
    main()
