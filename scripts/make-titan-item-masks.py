"""Máscaras de pixels dos ícones de item do Titã (ADR 0087): `src/titan/itemMasks.json`.

Entrada : `src/assets/titan-itens-32px.webp` (atlas de itens 4 × 8 de 32 px; célula = id − 1; gerado por `make-titan-arte32.py`).
Saída   : `{ "w": 32, "h": 32, "items": { "<id>": "<256 dígitos hexadecimais>" } }`: 1 bit por pixel (alfa > 128), linha por linha de cima para baixo, o bit mais alto de cada dígito primeiro.
Serve à extrusão do item na mão (`titan/extrude.ts`): o renderer constrói a malha 3D do sprite SEM ler o canvas (ler canvas pode ser bloqueado no Artifact). Itens sem pixel opaco ficam de fora.
Rode depois de `make-titan-arte32.py` (ícone novo ou trocado). Uso: python3 -I scripts/make-titan-item-masks.py
"""
import json

from PIL import Image

ATLAS = 'src/assets/titan-itens-32px.webp'
OUT = 'src/titan/itemMasks.json'
COLS, CELL = 4, 32


def main() -> None:
    im = Image.open(ATLAS).convert('RGBA')
    rows = im.size[1] // CELL
    items = {}
    for item in range(1, COLS * rows + 1):
        idx = item - 1
        x0, y0 = (idx % COLS) * CELL, (idx // COLS) * CELL
        bits = []
        for y in range(CELL):
            for x in range(CELL):
                bits.append(1 if im.getpixel((x0 + x, y0 + y))[3] > 128 else 0)
        if not any(bits):
            continue
        s = ''.join(str(b) for b in bits)
        items[str(item)] = ''.join(format(int(s[i:i + 4], 2), 'x') for i in range(0, len(s), 4))
    with open(OUT, 'w') as f:
        json.dump({'w': CELL, 'h': CELL, 'items': items}, f, separators=(',', ':'))
    print(OUT, len(items), 'itens')


if __name__ == '__main__':
    main()
