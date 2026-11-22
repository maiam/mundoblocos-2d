"""Modelos 3D do Degrau e da Cadeira de Junco (ADR 0101): peças feitas só de caixas, geradas por código, com a trama do junco repetida em cada face.

Saídas : src/assets/titan-degrau.json e src/assets/titan-cadeira.json   `pos`, `nrm`, `uv`, `idx`, `size` como os outros modelos instanciados (frente em +Z, giro 0; pivô no centro da base da
         célula; `turn` gira em torno do centro, `titan/models.ts`). As UVs vão **em metros** sobre a textura `titan-junco-tile.webp` (64 × 64 px = 1 m, `make-titan-junco.py`) com repetição:
         a trama mantém a densidade de 32 px por bloco em qualquer caixa, sem esticar (a laje e o degrau mostram só a parte de cima do painel). A face lateral tem v = 1 − y (a moldura de cima da
         trama fica no topo da caixa); o topo e a base usam u = x, v = z.
As caixas de colisão e mira são as de `titan/voxel.ts` (`STAIR_BASE`, `CHAIR_BASE`); aqui ficam também as pernas e a moldura do assento da cadeira, só visuais. Uso: python3 -I scripts/make-titan-junco-modelos.py
"""
import json

# caixas [x0, y0, z0, x1, y1, z1] em coordenadas da célula (0–1)
STAIR = [(0, 0, 0, 1, 0.5, 1), (0, 0.5, 0, 1, 1, 0.5)]
CHAIR = [
    (0.12, 0, 0.12, 0.26, 0.4, 0.26), (0.74, 0, 0.12, 0.88, 0.4, 0.26), (0.12, 0, 0.74, 0.26, 0.4, 0.88), (0.74, 0, 0.74, 0.88, 0.4, 0.88),  # pernas
    (0.1, 0.4, 0.1, 0.9, 0.5, 0.9),   # assento
    (0.1, 0.5, 0.1, 0.9, 1.0, 0.22),  # encosto
]


def box_faces(b):
    """Seis faces de uma caixa: (cantos em sentido anti-horário visto de fora, normal, função (x, y, z) -> (u, v))."""
    x0, y0, z0, x1, y1, z1 = b
    return [
        ([(x0, y1, z1), (x1, y1, z1), (x1, y1, z0), (x0, y1, z0)], (0, 1, 0), lambda x, y, z: (x, z)),     # topo
        ([(x0, y0, z0), (x1, y0, z0), (x1, y0, z1), (x0, y0, z1)], (0, -1, 0), lambda x, y, z: (x, z)),    # base
        ([(x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)], (0, 0, 1), lambda x, y, z: (x, 1 - y)),  # frente (+Z)
        ([(x1, y0, z0), (x0, y0, z0), (x0, y1, z0), (x1, y1, z0)], (0, 0, -1), lambda x, y, z: (1 - x, 1 - y)),  # trás
        ([(x1, y0, z1), (x1, y0, z0), (x1, y1, z0), (x1, y1, z1)], (1, 0, 0), lambda x, y, z: (1 - z, 1 - y)),  # direita (+X)
        ([(x0, y0, z0), (x0, y0, z1), (x0, y1, z1), (x0, y1, z0)], (-1, 0, 0), lambda x, y, z: (z, 1 - y)),  # esquerda (−X)
    ]


def build(boxes, out):
    pos, nrm, uv, idx = [], [], [], []
    for b in boxes:
        for corners, n, f in box_faces(b):
            base = len(pos) // 3
            for (x, y, z) in corners:
                pos += [round(x - 0.5, 4), round(y, 4), round(z - 0.5, 4)]
                nrm += list(n)
                u, v = f(x, y, z)
                uv += [round(u, 4), round(v, 4)]
            idx += [base, base + 1, base + 2, base, base + 2, base + 3]
    json.dump({'size': [1, 1, 1], 'pos': pos, 'nrm': nrm, 'uv': uv, 'idx': idx}, open(out, 'w'), separators=(',', ':'))
    print(out, len(idx) // 3, 'triângulos')


if __name__ == '__main__':
    build(STAIR, 'src/assets/titan-degrau.json')
    build(CHAIR, 'src/assets/titan-cadeira.json')
