"""Gera o atlas de rachaduras do Titã: 10 estágios de 16 × 16 px lado a lado (160 × 16, RGBA, fundo transparente).

Arte própria do projeto (ADR 0042), em pixel art: cada estágio mostra as rachaduras do anterior mais algumas pixels novas, crescendo do centro para as bordas,
com um núcleo escuro e uma sombra mais fraca ao lado (leitura em areia, gelo e rocha). Determinístico (LCG fixo): rodar de novo gera os mesmos pixels.

Uso: python3 scripts/make-titan-cracks.py   → src/assets/titan-cracks-16px.webp (WebP SEM perdas: pixel art não pode passar pelo optimize-assets com perdas).
Prévia ampliada: python3 scripts/make-titan-cracks.py --preview /caminho/prancha.png
"""
import sys
from PIL import Image

STAGES, SIZE = 10, 16
CORE = (24, 16, 14, 235)      # fio da rachadura
SHADE = (24, 16, 14, 90)      # sombra mais fraca ao lado (lê bem em areia e gelo)
RIM = (236, 224, 202, 120)    # contorno claro discreto no lado oposto: faz a rachadura aparecer também na rocha escura
# fração do traçado que já aparece em cada estágio (crescimento suave: poucos pixels no começo, a teia cheia no fim)
SHOWN_FRAC = [0.04, 0.08, 0.14, 0.21, 0.30, 0.40, 0.52, 0.66, 0.82, 1.0]


def lcg(seed):
    s = seed & 0xFFFFFFFF
    while True:
        s = (s * 1664525 + 1013904223) & 0xFFFFFFFF
        yield (s >> 16) / 65536.0


def trace():
    """Lista ordenada de pixels (x, y): ramos que partem do centro e se bifurcam, em ordem de distância."""
    r = lcg(2024)
    pts, seen = [], set()
    # ramos principais saindo do centro (7.5, 7.5) em direções espalhadas
    heads = [(7, 7, 1, -1), (8, 8, -1, 1), (7, 8, -1, -1), (8, 7, 1, 1), (7, 7, -1, 0), (8, 8, 1, 0), (7, 7, 0, -1), (8, 8, 0, 1), (8, 7, 1, 0), (7, 8, -1, 0)]
    for hx, hy, dx, dy in heads:
        x, y = hx, hy
        for step in range(14):
            if 0 <= x < SIZE and 0 <= y < SIZE and (x, y) not in seen:
                seen.add((x, y)); pts.append((x, y, step))
            n = next(r)
            # segue na direção geral, com desvios para a vizinha ortogonal (cara de rachadura)
            if n < 0.38: x += dx
            elif n < 0.76: y += dy
            else: x += dx; y += dy
            # bifurcação eventual
            if step in (2, 5, 8, 11) and next(r) < 0.6:
                bx, by, bdx, bdy = x, y, (dy if dx == 0 else -dy), (dx if dy == 0 else dx)
                for k in range(5):
                    bx += bdx if next(r) < 0.6 else 0; by += bdy if next(r) < 0.6 else 0
                    if 0 <= bx < SIZE and 0 <= by < SIZE and (bx, by) not in seen:
                        seen.add((bx, by)); pts.append((bx, by, step + k + 1))
    pts.sort(key=lambda p: (p[2], p[1], p[0]))  # do centro para fora, empate por coordenada
    return [(x, y) for x, y, _ in pts]


def build():
    pts = trace()
    atlas = Image.new('RGBA', (SIZE * STAGES, SIZE), (0, 0, 0, 0))
    px = atlas.load()
    for s in range(STAGES):
        n = max(1, round(len(pts) * SHOWN_FRAC[s]))
        shown = set(pts[:n])
        for (x, y) in pts[:n]:
            px[s * SIZE + x, y] = CORE
        for (x, y) in pts[:n]:  # sombra no pixel à direita/abaixo e contorno claro à esquerda/acima, se livres
            for sx, sy, col in ((x + 1, y, SHADE), (x, y + 1, SHADE), (x - 1, y, RIM), (x, y - 1, RIM)):
                if 0 <= sx < SIZE and 0 <= sy < SIZE and (sx, sy) not in shown and px[s * SIZE + sx, sy][3] == 0:
                    px[s * SIZE + sx, sy] = col
    return atlas, len(pts)


if __name__ == '__main__':
    atlas, total = build()
    atlas.save('src/assets/titan-cracks-16px.webp', 'WEBP', lossless=True, method=6)
    print(f'src/assets/titan-cracks-16px.webp: {atlas.size[0]}x{atlas.size[1]}, {total} pixels de traçado')
    if '--preview' in sys.argv:
        out = sys.argv[sys.argv.index('--preview') + 1]
        # prévia sobre os três materiais: areia ocre, gelo fosco e rocha escura
        big = atlas.resize((SIZE * STAGES * 6, SIZE * 6), Image.NEAREST)
        sheet = Image.new('RGBA', (SIZE * STAGES * 6, SIZE * 6 * 3))
        for row, bg in enumerate(((181, 134, 92, 255), (140, 161, 188, 255), (44, 42, 48, 255))):
            tile = Image.new('RGBA', big.size, bg); tile.alpha_composite(big); sheet.paste(tile, (0, row * SIZE * 6))
        sheet.convert('RGB').save(out)
        print('prévia:', out)
