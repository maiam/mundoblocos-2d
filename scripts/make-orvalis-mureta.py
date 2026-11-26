"""Textura da Mureta de Pedra do Orvalis em voxel (ADR 0110): tira de 2 tiles (topo | face) de 16 px, a partir da arte do pacote Texturas16px.

Entradas : assets-src/orvalis-voxel/texturas32/mureta-pedra/{topo,face}.png   quadrados (16 px ou maiores; reduzidos a 16 por face). Fonte editável: o script não os altera.
           topo = o trecho de 16 × 8 (linhas 4 a 11 do PNG); face = a lateral de 16 × 12 (linhas 4 a 15): a mureta tem 12/16 de altura e 8/16 de espessura
Saída    : src/assets/titan-mureta-pedra.webp   32 × 16 (topo | face)
O modelo (poste + braços por máscara de conexão) é gerado em TypeScript por `render/muretaModel.ts` com as UV direto sobre esta tira. Uso: python3 scripts/make-orvalis-mureta.py   (precisa do Pillow: `pip3 install pillow`)
"""
from PIL import Image

SRC = 'assets-src/orvalis-voxel/texturas32/mureta-pedra/'
OUT = 'src/assets/titan-mureta-pedra.webp'


def tile(name: str) -> Image.Image:
    im = Image.open(SRC + name + '.png').convert('RGBA')
    assert im.width == im.height, (name, im.size)
    return im if im.width == 16 else im.resize((16, 16), Image.BOX if im.width % 16 == 0 else Image.LANCZOS)


if __name__ == '__main__':
    out = Image.new('RGBA', (32, 16), (0, 0, 0, 0))
    out.paste(tile('topo'), (0, 0))
    out.paste(tile('face'), (16, 0))
    out.save(OUT, lossless=True, quality=100, method=6)
    print(OUT, out.size)
