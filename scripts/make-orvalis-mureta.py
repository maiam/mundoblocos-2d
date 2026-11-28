"""Textura da Mureta de Pedra do Orvalis em voxel (ADR 0110): tira de 2 tiles (topo | face) de 32 px (ADR 0143), a partir da arte do pacote Assets32px (ou, sem ela, da de 16 px ampliada por vizinho mais próximo).

Entradas : assets-src/orvalis-voxel/texturas32/mureta-pedra/{topo,face}.png   quadrados (16 px ou maiores; levados a 32 por face). A arte de `assets-src/orvalis-voxel/assets32/orvalis_mureta_pedra_{topo,face}_32x32.png` passa na frente. Fonte editável: o script não os altera.
           topo = o trecho de 16 × 8 (linhas 4 a 11 do PNG de 16; 8 a 23 no de 32); face = a lateral de 16 × 12 (linhas 4 a 15; 8 a 31): a mureta tem 12/16 de altura e 8/16 de espessura
Saída    : src/assets/titan-mureta-pedra.webp   64 × 32 (topo | face)
O modelo (poste + braços por máscara de conexão) é gerado em TypeScript por `render/muretaModel.ts` com as UV direto sobre esta tira. Uso: python3 scripts/make-orvalis-mureta.py   (precisa do Pillow: `pip3 install pillow`)
"""
import os

from PIL import Image

A32 = 'assets-src/orvalis-voxel/assets32/orvalis_mureta_pedra_%s_32x32.png'
T = 32
SRC = 'assets-src/orvalis-voxel/texturas32/mureta-pedra/'
OUT = 'src/assets/titan-mureta-pedra.webp'


def tile(name: str) -> Image.Image:
    im = Image.open(A32 % name if os.path.exists(A32 % name) else SRC + name + '.png').convert('RGBA')
    assert im.width == im.height, (name, im.size)
    if im.width == T:
        return im
    return im.resize((T, T), Image.NEAREST if im.width < T else Image.BOX if im.width % T == 0 else Image.LANCZOS)


if __name__ == '__main__':
    out = Image.new('RGBA', (2 * T, T), (0, 0, 0, 0))
    out.paste(tile('topo'), (0, 0))
    out.paste(tile('face'), (T, 0))
    out.save(OUT, lossless=True, quality=100, method=6)
    print(OUT, out.size)
