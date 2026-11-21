"""Ícone provisório da Esteira de Junco do Titã (ADR 0085): peça fina de piso em vista 3/4, 32 × 32 px.

Entradas : `assets-src/titan/texturas32/02-Texturas-PNG/20-esteira-de-junco/topo.png` (trama) e `lateral.png` (borda).
Saída    : `assets-src/titan/arte32/Esteira_de_Junco_Item_32px.png` (item 31); rode depois `make-titan-arte32.py`, que o põe no atlas de itens.
Projeta a trama num losango (vista de cima em 3/4) e dá 3 px de espessura com a borda nas duas faces visíveis. Arte provisória gerada por código (determinística); o dono do produto pode
trocar o arquivo pelo desenho final. Uso: python3 -I scripts/make-titan-esteira-icone.py
"""
from PIL import Image

TOPO = 'assets-src/titan/texturas32/02-Texturas-PNG/20-esteira-de-junco/topo.png'
LATERAL = 'assets-src/titan/texturas32/02-Texturas-PNG/20-esteira-de-junco/lateral.png'
OUT = 'assets-src/titan/arte32/Esteira_de_Junco_Item_32px.png'
CX, CY, HW, HH, THICK = 16, 15, 15, 8, 3  # centro do topo, meia largura, meia altura do losango e espessura


def main() -> None:
    top, side = Image.open(TOPO).convert('RGBA'), Image.open(LATERAL).convert('RGBA')
    out = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
    po = out.load()
    for y in range(32):
        for x in range(32):
            dx, dy = (x + 0.5 - CX) / HW, (y + 0.5 - CY) / HH
            u, v = (dx + dy) / 2 + 0.5, (dy - dx) / 2 + 0.5  # eixos do losango -> coordenadas da textura
            if abs(dx) + abs(dy) <= 1:
                p = top.getpixel((min(31, int(u * 32)), min(31, int(v * 32))))
                po[x, y] = p[:3] + (255,)
    # espessura: copia o losango 1..THICK px para baixo, só onde o topo ainda não pintou (faces da frente, escurecidas)
    base = out.copy().load()
    for k in range(1, THICK + 1):
        for y in range(31, -1, -1):
            for x in range(32):
                if base[x, y][3] and y + k < 32 and po[x, y + k][3] == 0:
                    sp = side.getpixel((x, min(31, k - 1)))
                    c = tuple(int(sp[i] * (0.78 if x < CX else 0.62)) for i in range(3))
                    po[x, y + k] = c + (255,)
    out.save(OUT)
    print(OUT, out.size)


if __name__ == '__main__':
    main()
