"""Água do lago do Orvalis em voxel (ADR 0132): 8 quadros de animação a partir do pacote "Água, rios e mares" (Drive).

Entradas : assets-src/orvalis-voxel/agua/fonte/orvalis_agua_fonte_01..08_16x16.png   (16 × 16 RGBA, loop de 8 quadros; o alfa faz parte da arte)
Saídas   : src/assets/orvalis-agua-16px.webp  (64 × 128: uma linha por quadro, cada uma com 4 células de 16 px = topo, topo, lateral, lateral — o mesmo desenho do atlas do Lago do Titã)
           src/assets/orvalis-agua-8px.webp   (32 × 64: o mesmo, reduzido por média, para a isométrica)
O renderer lê o número de quadros pela proporção da imagem (largura/4 = lado da célula) e desloca o UV em V, um quadro por vez. A lateral é o próprio quadro a 90 % de brilho.
Repetível. Uso: python3 -I scripts/make-orvalis-agua.py (Pillow).
"""
from PIL import Image

SRC = 'assets-src/orvalis-voxel/agua/fonte/orvalis_agua_fonte_%02d_16x16.png'
OUT = {16: 'src/assets/orvalis-agua-16px.webp', 8: 'src/assets/orvalis-agua-8px.webp'}
frames = [Image.open(SRC % i).convert('RGBA') for i in range(1, 9)]
for f in frames:
    assert f.size == (16, 16), f.size


def side(im: Image.Image) -> Image.Image:
    out = im.copy()
    px = out.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            px[x, y] = (int(r * 0.9), int(g * 0.9), int(b * 0.9), a)
    return out


for size, path in OUT.items():
    sheet = Image.new('RGBA', (4 * size, 8 * size))
    for k, f in enumerate(frames):
        for i, c in enumerate((f, f, side(f), side(f))):
            sheet.paste(c.resize((size, size), Image.BOX if size < 16 else Image.NEAREST), (i * size, k * size))
    sheet.save(path, 'WEBP', lossless=True, method=6)
print('ok', ', '.join(OUT.values()))
