"""Espadas de madeira e de pedra do Orvalis (ADR 0145): ícone de 32 × 32 a partir da arte grande enviada pelo dono.

Entradas : assets-src/orvalis-voxel/espadas/espada_{madeira,pedra}_fonte.png  (1254 × 1254, pixel art ampliada e suavizada, fundo transparente)
Saídas   : assets-src/orvalis-voxel/assets32/orvalis_espada_{madeira,pedra}_32x32.png  (o item entra em assets-src/titan/arte32/itens.json; regra 32 px, ADR 0143)
Método   : recorta a caixa opaca, centraliza num quadrado, reduz as cores a uma paleta pequena (a suavização da ampliação some) e reduz a imagem a 32 × 32 pela cor MAIS
           FREQUENTE de cada célula (nada de média: sem cores novas nas bordas); a célula só é opaca se mais da metade dela for opaca. Repetível.
Uso: python3 -I scripts/make-orvalis-espadas.py (Pillow + numpy). Depois: make-titan-arte32.py e make-titan-item-masks.py.
"""
import numpy as np
from PIL import Image

SRC = 'assets-src/orvalis-voxel/espadas/'
OUT = 'assets-src/orvalis-voxel/assets32/'
N = 32
PALETA = 32
MARGEM = 1  # células transparentes de cada lado


def reduz(arq):
    im = Image.open(SRC + arq).convert('RGBA')
    a = np.array(im)
    ys, xs = np.where(a[..., 3] > 127)
    im = im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    w, h = im.size
    lado = max(w, h)
    quad = Image.new('RGBA', (lado, lado), (0, 0, 0, 0))
    quad.paste(im, ((lado - w) // 2, (lado - h) // 2))
    a = np.array(quad)
    opaco = a[..., 3] > 127
    # paleta pequena só com os pixels opacos
    rgb = Image.fromarray(a[..., :3]).quantize(colors=PALETA, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    pal = np.array(rgb.getpalette()[:PALETA * 3]).reshape(-1, 3)
    idx = np.array(rgb).astype(np.int16)
    # índice -1 onde transparente
    idx = np.where(opaco, idx, -1)
    lado_ut = N - 2 * MARGEM
    cel = lado / lado_ut
    saida = np.zeros((N, N, 4), np.uint8)
    for cy in range(lado_ut):
        for cx in range(lado_ut):
            blk = idx[int(cy * cel):int((cy + 1) * cel), int(cx * cel):int((cx + 1) * cel)].ravel()
            if blk.size == 0:
                continue
            if (blk >= 0).mean() <= 0.5:
                continue
            v = np.bincount(blk[blk >= 0]).argmax()
            saida[cy + MARGEM, cx + MARGEM] = (*pal[v], 255)
    return Image.fromarray(saida)


for nome in ('madeira', 'pedra'):
    reduz(f'espada_{nome}_fonte.png').save(f'{OUT}orvalis_espada_{nome}_32x32.png')
    print('ok', nome)
