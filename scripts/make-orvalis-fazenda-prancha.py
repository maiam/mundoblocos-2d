"""Atlas UV de um animal de fazenda a partir da prancha ortográfica (ADR 0143, adendo).

Entrada : assets-src/orvalis-voxel/mobs/pranchas/<animal>_ortografica.png   (fundo transparente, pixels quadrados e inteiros; planificações em cruz de cada peça)
          assets-src/orvalis-voxel/mobs/fazenda-uv.json                     (a ficha: tamanho em unidades e retângulo UV de cada face)
Saída   : assets-src/orvalis-voxel/mobs/<animal>_uv_128x128.png             (lido por make-orvalis-fazenda.py)

A prancha traz, por peça, a planificação em cruz (topo em cima da frente; esquerda, frente, direita e costas em fila; base embaixo). O tamanho do
pixel da arte na imagem e quantos pixels de arte cabem em uma unidade do modelo saem das medidas da cruz — nada é informado à mão. Cada face é
reamostrada por vizinho mais próximo para 2 px por unidade (atlas de 128 × 128) e **confere-se que nenhuma face fica com pixel transparente**.
Orientação (BoxGeometry, frente = −Z): −Z = frente, +Z = costas, +X = esquerda da frente, −X = direita da frente (vistas de fora, em pé);
+Y e −Y ficam girados 180° em relação à cruz (o topo do atlas é a frente em +Y e as costas em −Y).
Uso: python3 -I scripts/make-orvalis-fazenda-prancha.py ovelha   (Pillow + numpy). Depois: make-orvalis-fazenda.py.
"""
import json
import sys

import numpy as np
from PIL import Image

MOBS = 'assets-src/orvalis-voxel/mobs/'
ATLAS = 128
PX_UNIT = ATLAS // 64  # pixels do atlas por unidade do modelo

def ordem(pid):
    """Peças iguais (patas, asas, chifres…): frente antes de trás, esquerda (_e) antes de direita (_d); a prancha as traz nessa ordem, da esquerda para a direita."""
    return (1 if 'tras' in pid else 0, 1 if pid.endswith('_d') else 0)


def componentes(opaco):
    """Caixas (x, y, w, h) das manchas opacas, sem scipy."""
    h, w = opaco.shape
    visto = np.zeros_like(opaco)
    caixas = []
    for y in range(h):
        for x in range(w):
            if opaco[y, x] and not visto[y, x]:
                pilha = [(y, x)]
                visto[y, x] = True
                x0 = x1 = x
                y0 = y1 = y
                while pilha:
                    cy, cx = pilha.pop()
                    x0, x1, y0, y1 = min(x0, cx), max(x1, cx), min(y0, cy), max(y1, cy)
                    for dy in (-1, 0, 1):
                        for dx in (-1, 0, 1):
                            ny, nx = cy + dy, cx + dx
                            if 0 <= ny < h and 0 <= nx < w and opaco[ny, nx] and not visto[ny, nx]:
                                visto[ny, nx] = True
                                pilha.append((ny, nx))
                caixas.append((x0, y0, x1 - x0 + 1, y1 - y0 + 1))
    return caixas


def tamanho_pixel(a):
    """Menor sequência de cores iguais em linhas e colunas = o pixel da arte na imagem."""
    menor = 10 ** 9
    for v in (a[::5], a.transpose(1, 0, 2)[::5]):
        for linha in v:
            c = 1
            for i in range(1, len(linha)):
                if (linha[i] == linha[i - 1]).all():
                    c += 1
                else:
                    menor = min(menor, c) if linha[i - 1][3] else menor
                    c = 1
    return menor


def main(nome):
    a = np.array(Image.open(f'{MOBS}pranchas/{nome}_ortografica.png').convert('RGBA'))
    s = tamanho_pixel(a)
    assert s > 0 and a.shape[0] % s == 0 and a.shape[1] % s == 0, ('tamanho de pixel', s, a.shape)
    art = a[s // 2::s, s // 2::s]  # um pixel por pixel de arte
    chk = a.reshape(a.shape[0] // s, s, a.shape[1] // s, s, 4)
    assert (chk == chk[:, :1, :, :1]).all(), 'os pixels da prancha não são blocos uniformes'
    opaco = art[..., 3] > 0
    caixas = componentes(opaco)
    ficha = json.load(open(MOBS + 'fazenda-uv.json'))['mobs'][nome]['parts']
    saida = np.zeros((ATLAS, ATLAS, 4), np.uint8)
    usadas = set()
    pecas = sorted(ficha, key=lambda p: ordem(p['id']))
    for p in pecas:
        w, h, d = p['sizePx']
        # medidas da cruz em unidades × k (pixels de arte por unidade)
        alvo = (2 * d + 2 * w, 2 * d + h)
        # planificações exatamente desse tamanho (k pixels de arte por unidade), em fileiras e da esquerda para a direita, ainda não usadas
        achadas = sorted([c for c in caixas if c not in usadas and c[2] % alvo[0] == 0 and c[3] % alvo[1] == 0 and c[2] // alvo[0] == c[3] // alvo[1]], key=lambda c: (c[2] // alvo[0], c[1] // 40, c[0]))  # menor k primeiro: a cruz de uma peça pequena não rouba a de uma grande
        assert achadas, ('sem planificação para', p['id'], alvo)
        c = achadas[0]
        usadas.add(c)
        k = c[2] // alvo[0]  # pixels de arte por unidade do modelo
        x0, y0 = c[0], c[1]
        cruz = art[y0:y0 + c[3], x0:x0 + c[2]]

        def face(ux, uy, fw, fh):
            return cruz[uy * k:(uy + fh) * k, ux * k:(ux + fw) * k]

        faces = {
            '-Z': face(d, d, w, h), '+X': face(0, d, d, h), '-X': face(d + w, d, d, h), '+Z': face(2 * d + w, d, w, h),
            '+Y': np.rot90(face(d, 0, w, d), 2), '-Y': np.rot90(face(d, d + h, w, d), 2),
        }
        for nome_face, img in faces.items():
            x, y, fw, fh = p['uvPx'][nome_face]
            # reamostra de k para PX_UNIT px por unidade (vizinho mais próximo)
            ys = (np.arange(int(fh) * PX_UNIT) * k // PX_UNIT).astype(int)
            xs = (np.arange(int(fw) * PX_UNIT) * k // PX_UNIT).astype(int)
            rs = img[ys][:, xs]
            assert (rs[..., 3] == 255).all(), ('pixel transparente dentro da face', p['id'], nome_face)
            saida[int(y * PX_UNIT):int((y + fh) * PX_UNIT), int(x * PX_UNIT):int((x + fw) * PX_UNIT)] = rs
    Image.fromarray(saida).save(f'{MOBS}{nome}_uv_{ATLAS}x{ATLAS}.png')
    print('ok', nome, 'pixel da imagem', s, 'px de arte por unidade', k)


if __name__ == '__main__':
    main(sys.argv[1])
