"""Ladrilho de basalto do Titã para os painéis da interface (ADR 0049): carvão e violeta escuro, relevo discreto, 32 × 32 px, SEM emenda (repete sem costura).

Referência de material: a Mesa de Trabalho da Margem Silenciosa (`assets-src/titan/fabricacao/Atlas_Texturas_Margem_16px.png`, basalto das faces). Construído por células (placas de basalto)
com distância circular (a textura se repete nas quatro bordas): cada célula tem um tom do conjunto carvão/violeta, uma borda mais escura de 1 px e um leve brilho no canto de cima à esquerda
(o relevo), mais pontinhos de grão. Determinístico (semente fixa), WebP SEM perdas (fora do optimize-assets.py).
Saída: src/assets/titan-basalt-32px.webp. Uso: python3 -I scripts/make-titan-basalt.py [--preview prancha.png]
"""
import random
import sys

from PIL import Image

N = 32
SEED = 20261119
# carvão e violeta escuro (sRGB), do mais escuro ao mais claro; o brilho de relevo usa o degrau seguinte
TONES = [(24, 22, 30), (30, 27, 38), (37, 33, 47), (44, 39, 56), (52, 46, 66)]
EDGE = (14, 12, 18)


def build():
    rnd = random.Random(SEED)
    pts = [(rnd.uniform(0, N), rnd.uniform(0, N)) for _ in range(11)]
    tone = [rnd.randrange(0, 3) for _ in pts]  # placas escuras; o degrau 3-4 só entra no relevo
    def wrap(d):
        d = abs(d) % N
        return min(d, N - d)
    owner = [[0] * N for _ in range(N)]
    for y in range(N):
        for x in range(N):
            best, bi = 1e9, 0
            for i, (px, py) in enumerate(pts):
                d = wrap(x - px) ** 2 + wrap(y - py) ** 2
                if d < best: best, bi = d, i
            owner[y][x] = bi
    img = Image.new('RGB', (N, N))
    for y in range(N):
        for x in range(N):
            o = owner[y][x]
            edge = owner[y][(x + 1) % N] != o or owner[(y + 1) % N][x] != o  # borda de baixo/direita da placa: sombra
            lit = owner[y][(x - 1) % N] != o or owner[(y - 1) % N][x] != o    # borda de cima/esquerda: leve brilho (relevo)
            c = TONES[tone[o]]
            if edge: c = EDGE
            elif lit: c = TONES[min(len(TONES) - 1, tone[o] + 2)]
            img.putpixel((x, y), c)
    for _ in range(46):  # grão: pontinhos 1 px, mais claros ou mais escuros, sem sair da paleta
        x, y = rnd.randrange(N), rnd.randrange(N)
        base = img.getpixel((x, y))
        if base == EDGE: continue
        k = rnd.choice((-1, 1))
        i = max(0, min(len(TONES) - 1, min(range(len(TONES)), key=lambda t: sum(abs(a - b) for a, b in zip(TONES[t], base))) + k))
        img.putpixel((x, y), TONES[i])
    return img


def main():
    img = build()
    img.save('src/assets/titan-basalt-32px.webp', 'WEBP', lossless=True, method=6)
    print('src/assets/titan-basalt-32px.webp', img.size)
    if '--preview' in sys.argv:
        out = sys.argv[sys.argv.index('--preview') + 1]
        pv = Image.new('RGB', (N * 6, N * 6))
        for ty in range(3):
            for tx in range(3): pv.paste(img.resize((N * 2, N * 2), Image.NEAREST), (tx * N * 2, ty * N * 2))
        pv.save(out)


if __name__ == '__main__':
    main()
