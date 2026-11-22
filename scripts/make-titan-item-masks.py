"""Máscaras de pixels dos ícones de item do Titã (ADR 0087): `src/titan/itemMasks.json`.

Entrada : `src/assets/titan-itens-32px.webp` (atlas de itens 4 × 8 de 32 px; célula = id − 1; gerado por `make-titan-arte32.py`).
Saída   : `{ "w": 32, "h": 32, "items": { "<id>": "<256 dígitos hexadecimais>" }, "small": { "w": 16, "h": 16, "items": { "<id>": "<64 dígitos>" } } }`: 1 bit por pixel (alfa > 128), linha por linha de cima para baixo,
          o bit mais alto de cada dígito primeiro. Os itens com arte de 16 × 16 (`assets-src/titan/arte16/itens.json`, ADR 0097) saem em `small`, lidos direto do PNG de 16 (a grade que a extrusão usa);
          os demais, do atlas de 32.
Serve à extrusão do item na mão (`titan/extrude.ts`): o renderer constrói a malha 3D do sprite SEM ler o canvas (ler canvas pode ser bloqueado no Artifact). Itens sem pixel opaco ficam de fora.
Rode depois de `make-titan-arte32.py` (ícone novo ou trocado). Uso: python3 -I scripts/make-titan-item-masks.py
"""
import json
import os

from PIL import Image

ATLAS = 'src/assets/titan-itens-32px.webp'
OUT = 'src/titan/itemMasks.json'
COLS, CELL = 4, 32
SRC16 = 'assets-src/titan/arte16/'


def hexmask(bits: list) -> str:
    s = ''.join(str(b) for b in bits)
    return ''.join(format(int(s[i:i + 4], 2), 'x') for i in range(0, len(s), 4))


def main() -> None:
    im = Image.open(ATLAS).convert('RGBA')
    rows = im.size[1] // CELL
    small16 = json.load(open(SRC16 + 'itens.json'))
    items, small = {}, {}
    for item, name in small16.items():  # arte de 16 × 16: a grade da extrusão
        t = Image.open(SRC16 + name).convert('RGBA')
        assert t.size == (16, 16), (name, t.size)
        bits = [1 if t.getpixel((x, y))[3] > 128 else 0 for y in range(16) for x in range(16)]
        assert any(bits), name
        small[item] = hexmask(bits)
    for item in range(1, COLS * rows + 1):
        if str(item) in small16:
            continue
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
        json.dump({'w': CELL, 'h': CELL, 'items': items, 'small': {'w': 16, 'h': 16, 'items': small}}, f, separators=(',', ':'))
    print(OUT, len(items), 'itens de 32 px e', len(small), 'de 16 px')


if __name__ == '__main__':
    main()
