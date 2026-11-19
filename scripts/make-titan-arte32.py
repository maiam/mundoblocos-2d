"""Arte de 32 × 32 px do Titã (ADR 0053): atlas de itens e junco com mais definição, a partir do pacote de arte em `assets-src/titan/arte32/`.

Entradas : src/assets/titan-hotbar-sprites-16px.webp (atlas de itens 4 × 4 de 16 px, gerado por make-titan-fabricacao.py; é a base dos itens que ainda não têm arte de 32 px),
           assets-src/titan/arte32/fragmento_de_rocha_32px.png (id 5), fragmento_de_gelo_32px.png (id 6), lanterna_da_margem_32px.png (id 8),
           titan-junco-variantes-32px.png (128 × 32, 3 silhuetas + 1 célula vazia).
Saídas   : src/assets/titan-itens-32px.webp          128 × 128 (grade 4 × 4 de 32 px, índice = id do item − 1): a base ampliada 2× (vizinho mais próximo) e, por cima, as células 5, 6 e 8 em 32 px de verdade
           src/assets/titan-junco-variantes-32px.webp 128 × 32 (colunas 0–2 = broto baixo, haste bifurcada, tufo aberto; coluna 3 vazia)
Tudo em WebP SEM perdas (fora do optimize-assets.py). Repetível: lê só a base de 16 px e o pacote, nunca o próprio resultado. Uso: python3 -I scripts/make-titan-arte32.py
"""
from PIL import Image

BASE = 'src/assets/titan-hotbar-sprites-16px.webp'
SRC = 'assets-src/titan/arte32/'
OUT_ITEMS, OUT_REED = 'src/assets/titan-itens-32px.webp', 'src/assets/titan-junco-variantes-32px.webp'
NEW = {5: 'fragmento_de_rocha_32px.png', 6: 'fragmento_de_gelo_32px.png', 8: 'lanterna_da_margem_32px.png'}  # id do item -> arte de 32 px


def main() -> None:
    base = Image.open(BASE).convert('RGBA')
    assert base.size == (64, 64), base.size
    atlas = base.resize((128, 128), Image.NEAREST)  # a base 2×, sem suavização
    for item, name in NEW.items():
        t = Image.open(SRC + name).convert('RGBA')
        assert t.size == (32, 32), (name, t.size)
        idx = item - 1
        x, y = (idx % 4) * 32, (idx // 4) * 32
        atlas.paste(Image.new('RGBA', (32, 32), (0, 0, 0, 0)), (x, y))  # limpa a célula antes (paste com alfa não substitui o fundo)
        atlas.paste(t, (x, y))
    atlas.save(OUT_ITEMS, lossless=True, quality=100, method=6)
    reed = Image.open(SRC + 'titan-junco-variantes-32px.png').convert('RGBA')
    assert reed.size == (128, 32), reed.size
    reed.save(OUT_REED, lossless=True, quality=100, method=6)
    print(OUT_ITEMS, atlas.size, '|', OUT_REED, reed.size)


if __name__ == '__main__':
    main()
