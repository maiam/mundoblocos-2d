"""Arte da água (bloco + enchimento) → texturas do jogo.

Fontes: assets-src/water-block.png (cubo 3/4 transparente) e assets-src/water-flow-sheet.png (4 linhas × 4 quadros;
cada quadro é um par origem→destino: linha 1 a água vem da esquerda, 2 da direita, 3 de baixo enchendo a célula de
cima, 4 de cima enchendo a de baixo).

Saídas (src/assets/, depois `python3 scripts/optimize-assets.py`):
  water-top.png   topo do cubo, 64×64, contínuo (vira o chão de água)
  water-flow.png  4×4 quadros 64×64 da célula que está enchendo (linhas: vem de oeste, leste, sul, norte), só a face
                  de cima do destino — desenhada sobre a célula do buraco enquanto ele enche

Uso: python3 scripts/extract-water.py   (requer Pillow e numpy)
"""
import numpy as np
from PIL import Image

SRC, OUT = 'assets-src/', 'src/assets/'
N = 64


def seamless(tile):
    a = np.asarray(tile).astype(np.float32)
    n = a.shape[0]
    rolled = np.roll(np.roll(a, n // 2, 0), n // 2, 1)
    yy, xx = np.mgrid[0:n, 0:n]
    d = np.minimum(np.minimum(xx, n - 1 - xx), np.minimum(yy, n - 1 - yy)) / (n / 2)
    w = np.clip((0.6 - d) / 0.6, 0, 1)[..., None] ** 1.1
    return Image.fromarray((a * (1 - w) + rolled * w).astype(np.uint8))


def bbox(im, thr=100):
    a = np.asarray(im)[..., 3] >= thr
    ys, xs = np.nonzero(a)
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


# ---- Topo do bloco → chão de água ----
block = Image.open(SRC + 'water-block.png').convert('RGBA')
x0, y0, x1, y1 = bbox(block)
w = x1 - x0
top_end = y0 + (y1 - y0) * 0.36   # a face de cima ocupa ~36% da altura do cubo (borda frontal em ~y=420/990)
g = w * 0.12
quad = [(x0 + g, y0 + g * 0.8), (x0 + g, top_end - g * 0.3), (x1 - g, top_end - g * 0.3), (x1 - g, y0 + g * 0.8)]
top = block.transform((N, N), Image.QUAD, [v for p in quad for v in p], Image.BICUBIC).convert('RGB')
seamless(top).save(OUT + 'water-top.png', optimize=True)
print(OUT + 'water-top.png')

# ---- Enchimento: a célula de destino de cada par (sem a célula de origem), ajustada ao quadrado da célula ----
flow = Image.open(SRC + 'water-flow-sheet.png').convert('RGBA')
HC = [212, 556, 897, 1250]   # centro de cada par horizontal (fronteira entre origem e destino)
VC = [210, 556, 897, 1240]   # centro de cada par vertical
# (x0, y0, x1, y1) relativos ao centro c do par: só a célula que está enchendo.
ROWS = [
    lambda c: (c + 6, 37, c + 172, 213),     # vem de oeste (origem à esquerda)
    lambda c: (c - 172, 247, c - 6, 425),    # vem de leste (origem à direita)
    lambda c: (c - 95, 448, c + 95, 568),    # vem do sul (enche a de cima; só a parte acima da origem)
    lambda c: (c - 95, 905, c + 95, 1042),   # vem do norte (enche a de baixo; só a parte abaixo da origem)
]
sheet = Image.new('RGBA', (N * 4, N * 4))
for r, box in enumerate(ROWS):
    for k, c in enumerate(HC if r < 2 else VC):
        if k == 0:
            continue  # 1º quadro = célula ainda vazia (só o contorno): fica transparente
        part = flow.crop(box(c))
        a = np.asarray(part).copy()
        a[..., 3][a[..., 3] < 60] = 0   # tira o contorno fraco da célula vazia e respingos quase invisíveis
        sheet.alpha_composite(Image.fromarray(a, 'RGBA').resize((N, N), Image.LANCZOS), (k * N, r * N))
sheet.save(OUT + 'water-flow.png', optimize=True)
print(OUT + 'water-flow.png', sheet.size)
