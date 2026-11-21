"""Ícones do Balde de Cobre (ADR 0091): reduz a arte 2D do pacote (vazio e cheio, RGBA) a 32 × 32 px.

Entradas : assets-src/titan/balde/Balde_de_Cobre_{Vazio,Cheio}_Arte.png
Saídas   : assets-src/titan/arte32/Balde_de_Cobre_{Vazio,Cheio}_Item_32px.png (alfa binário); rode depois `make-titan-arte32.py` e `make-titan-item-masks.py`.
Recorta a caixa do desenho, deixa quadrado e reduz com alfa pré-multiplicado (sem franja vermelha nas bordas). Arte provisória: o dono pode trocar o PNG de 32 px.
Uso: python3 -I scripts/make-titan-balde-icone.py
"""
import numpy as np
from PIL import Image

for nome in ('Vazio', 'Cheio'):
    a = np.array(Image.open(f'assets-src/titan/balde/Balde_de_Cobre_{nome}_Arte.png').convert('RGBA')).astype(float)
    al = a[..., 3] / 255
    ys, xs = np.where(al > 0.5)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    rgb = a[y0:y1, x0:x1, :3] * al[y0:y1, x0:x1, None]  # pré-multiplicado
    alc = al[y0:y1, x0:x1]
    h, w = alc.shape
    lado = max(h, w)
    pad_y, pad_x = (lado - h) // 2, (lado - w) // 2
    canvas = np.zeros((lado, lado, 4))
    canvas[pad_y:pad_y + h, pad_x:pad_x + w, :3] = rgb
    canvas[pad_y:pad_y + h, pad_x:pad_x + w, 3] = alc * 255
    # reduz cada canal pré-multiplicado e depois desfaz a multiplicação
    out = []
    for c in range(4):
        out.append(np.array(Image.fromarray(canvas[..., c].astype(np.float32), 'F').resize((30, 30), Image.BOX if lado > 120 else Image.LANCZOS)))
    p = np.stack(out, axis=-1)
    alfa = p[..., 3] / 255
    rgbf = np.where(alfa[..., None] > 0.01, p[..., :3] / np.maximum(alfa[..., None], 0.01) * 255 / 255, 0)
    img = np.zeros((32, 32, 4), dtype=np.uint8)
    img[1:31, 1:31, :3] = np.clip(rgbf, 0, 255).astype(np.uint8)
    img[1:31, 1:31, 3] = np.where(alfa > 0.5, 255, 0)
    Image.fromarray(img, 'RGBA').save(f'assets-src/titan/arte32/Balde_de_Cobre_{nome}_Item_32px.png')
    print(nome, 'ok')
