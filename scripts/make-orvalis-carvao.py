"""Ícone PROVISÓRIO do Carvão Vegetal do Orvalis (item 84, ADR 0120): 16 × 16 px, alfa binário, desenhado em código porque nenhum pacote do Drive traz o carvão.

Saída: assets-src/titan/arte16/orvalis_carvao_vegetal_16x16.png (lido por make-titan-arte32.py e make-titan-item-masks.py, via `itens.json`). Quando o dono mandar a arte definitiva, é só trocar o PNG.
Determinístico (sem sorteio). Uso: python3 -I scripts/make-orvalis-carvao.py
"""
from PIL import Image

OUT = 'assets-src/titan/arte16/orvalis_carvao_vegetal_16x16.png'
# três tons de carvão (o mais claro é o brilho do veio) e o contorno; cada linha é um pedaço do tronco queimado, x de 0 a 15
DARK, MID, LIGHT, EDGE, EMBER = (30, 26, 28), (52, 46, 50), (84, 76, 82), (16, 14, 16), (150, 62, 30)
ROWS = [  # (y, x0, x1) do contorno de uma lasca de tronco inclinada
    (3, 9, 12), (4, 7, 13), (5, 5, 13), (6, 3, 12), (7, 2, 11), (8, 2, 10), (9, 2, 9), (10, 3, 8), (11, 4, 7),
    (6, 1, 3), (7, 1, 2),
]


def main() -> None:
    im = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    px = im.load()
    for y, x0, x1 in ROWS:
        for x in range(x0, x1 + 1):
            edge = x in (x0, x1) or y in (ROWS[0][0], ROWS[-3][0])
            tone = EDGE if edge else (LIGHT if (x + y) % 5 == 0 else MID if (x * 3 + y) % 4 else DARK)
            px[x, y] = (*tone, 255)
    for x, y in ((6, 7), (8, 8), (10, 6)):  # três pontos de brasa, só para ler como "queimado"
        px[x, y] = (*EMBER, 255)
    # segundo pedaço, menor, em baixo à direita
    for y, x0, x1 in ((11, 9, 13), (12, 8, 13), (13, 9, 12)):
        for x in range(x0, x1 + 1):
            edge = x in (x0, x1) or y in (11, 13)
            px[x, y] = (*(EDGE if edge else (MID if (x + y) % 3 else DARK)), 255)
    im.save(OUT)
    print(OUT, im.size)


if __name__ == '__main__':
    main()
