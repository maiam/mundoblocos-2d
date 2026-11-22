"""Sprites de 16 × 16 px de armas, ferramentas e itens do Titã (ADR 0097): reduz as ilustrações do pacote de arte ao grid 16 × 16 que o jogo extruda.

Entradas : assets-src/titan/sprites16/<Nome>_Arte.png   (ilustração grande, RGBA; pasta do Drive "Armas, Ferramentas e Itens: Sprite 2D Extrudado")
Saídas   : assets-src/titan/arte16/<Nome>_Item_16px.png  (16 × 16, alfa binário)
           assets-src/titan/arte16/itens.json             `{ "<id do item>": "<arquivo>" }`: quais itens têm arte de 16 px (lido por `make-titan-arte32.py` e `make-titan-item-masks.py`)
Regra visual (ADR 0097): arma, ferramenta e item são **sprite 2D extrudado** (frente, verso e as bordas onde o pixel toca o transparente, espessura 1/16 do item; `titan/extrude.ts`), nunca modelo 3D
esculpido. A arte de partida é um PNG de 16 × 16. Convenção de orientação do Minecraft: armas e ferramentas na diagonal, **cabo no canto de baixo à esquerda**, ponta/cabeça para cima e à direita
(o pivô do golpe é o canto de baixo à esquerda do sprite). Por isso a adaga, desenhada com a ponta embaixo, gira 180° aqui.
Redução: recorta a caixa do desenho, ajusta o lado maior a 16 px (centrado, com a proporção), tira a franja do contorno (erosão de 1 px do alfa na origem), calcula a média em área com alfa
pré-multiplicado, realça um pouco a saturação e o contraste (para ler bem em 16 px) e deixa o alfa binário. Repetível e determinístico. Uso: python3 -I scripts/make-titan-sprites16.py
"""
import json

import numpy as np
from PIL import Image, ImageFilter

SRC, OUT = 'assets-src/titan/sprites16/', 'assets-src/titan/arte16/'
N = 16
# id do item -> (nome do arquivo de origem sem "_Arte.png", giro em graus (sentido horário), margem em px dentro do 16 × 16)
ITEMS = {
    20: ('Picareta_de_Rocha', 0, 0), 22: ('Adaga_de_Rocha', 180, 0), 23: ('Picareta_de_Cobre', 0, 0), 24: ('Adaga_de_Cobre', 180, 0),
    35: ('Balde_de_Cobre_Vazio', 0, 1), 36: ('Balde_de_Cobre_Cheio', 0, 1),
}


def reduce(name: str, rot: int, margin: int) -> Image.Image:
    im = Image.open(SRC + name + '_Arte.png').convert('RGBA')
    a = im.getchannel('A')
    core = a.point(lambda v: 255 if v > 128 else 0).filter(ImageFilter.MinFilter(3))  # tira a franja de 1 px do contorno
    im.putalpha(Image.fromarray((np.array(a) * (np.array(core) > 0)).astype(np.uint8)))
    if rot:
        im = im.rotate(-rot, expand=True)
    bb = im.getchannel('A').point(lambda v: 255 if v > 128 else 0).getbbox()
    im = im.crop(bb)
    inner = N - 2 * margin
    s = inner / max(im.size)
    w, h = max(1, round(im.size[0] * s)), max(1, round(im.size[1] * s))
    arr = np.array(im).astype(float)
    al = arr[..., 3] / 255
    pm = arr[..., :3] * al[..., None]
    chans = [np.array(Image.fromarray(c.astype(np.float32), 'F').resize((w, h), Image.BOX)) for c in (pm[..., 0], pm[..., 1], pm[..., 2], al)]
    pa = chans[3]
    rgb = np.stack(chans[:3], axis=-1) / np.maximum(pa[..., None], 1e-3)
    # saturação e contraste leves
    lum = rgb @ np.array([0.299, 0.587, 0.114])
    rgb = lum[..., None] + (rgb - lum[..., None]) * 1.25
    rgb = (rgb - 128) * 1.1 + 128
    out = np.zeros((N, N, 4), dtype=np.uint8)
    ox, oy = (N - w) // 2, (N - h) // 2
    out[oy:oy + h, ox:ox + w, :3] = np.clip(rgb, 0, 255).astype(np.uint8)
    out[oy:oy + h, ox:ox + w, 3] = np.where(pa > 0.5, 255, 0)
    return Image.fromarray(out, 'RGBA')


def main() -> None:
    table = {}
    for item, (name, rot, margin) in ITEMS.items():
        f = f'{name}_Item_16px.png'
        reduce(name, rot, margin).save(OUT + f)
        table[str(item)] = f
    json.dump(table, open(OUT + 'itens.json', 'w'), indent=1, ensure_ascii=False)
    print(len(table), 'sprites de 16 × 16 em', OUT)


if __name__ == '__main__':
    main()
