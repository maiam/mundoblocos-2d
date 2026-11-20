"""Converte o Farejador de Duna de Titã (GLB low-poly do pacote de arte, ADR 0061) no que o motor usa.

Entrada : assets-src/titan/farejador/Farejador_de_Duna_Low_Poly.glb   (81 malhas, 3.538 triângulos, 1,85 m do focinho à cauda, 0,65 m de largura, 0,70 m de altura; pivô no chão; **voltado para −X**)
Saídas  : src/assets/titan-farejador.json   `size` e `parts`: tronco, cabeça, cauda e as 4 patas, cada uma com `pivot` (posição do nó do grupo no modelo) e a geometria **relativa ao pivô**
                                            (`pos`, `nrm`, `uv` com origem no canto superior esquerdo, `idx`), para o jogo girar cada parte em torno do pivô (passo, cabeça, cauda) sem rig
          src/assets/titan-farejador-atlas.webp   atlas de 224 × 36: os 216 × 36 do pacote (6 células de 32 px com borda de 2 px) + 4 colunas de 1 px com as cores sólidas (contorno dos olhos e narinas, pupila, reflexo, íris: o GLB as traz
                                            como cor de material, sem UV; aqui viram um texel do atlas); WebP SEM perdas
O script falha se a contagem de triângulos, o tamanho ou os grupos mudarem. Uso: python3 -I scripts/extract-titan-farejador.py
"""
import io
import json
import struct
import sys

from PIL import Image

CT = {5126: ('f', 4), 5123: ('H', 2), 5125: ('I', 4)}
N = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3}
SRC = 'assets-src/titan/farejador/Farejador_de_Duna_Low_Poly.glb'
GROUPS = {'Cabeça': 'cabeca', 'Cauda': 'cauda', 'Pata Dianteira direita': 'pata_dd', 'Pata Dianteira esquerda': 'pata_de', 'Pata Traseira direita': 'pata_td', 'Pata Traseira esquerda': 'pata_te', 'Tronco e carapaça': 'tronco'}


ATLAS_W, SOLID_W = 224, 216  # largura final e onde começam as colunas de cor sólida


def srgb(c):
    c = max(0.0, min(1.0, c))
    return round((c * 12.92 if c <= 0.0031308 else 1.055 * c ** (1 / 2.4) - 0.055) * 255)


def main():
    b = open(SRC, 'rb').read()
    magic, ver, _ = struct.unpack('<III', b[:12])
    assert magic == 0x46546C67 and ver == 2
    off, chunks = 12, []
    while off < len(b):
        cl, _t = struct.unpack('<II', b[off:off + 8]); chunks.append(b[off + 8:off + 8 + cl]); off += 8 + cl
    j, binb = json.loads(chunks[0]), chunks[1]

    def read(i):
        a = j['accessors'][i]; v = j['bufferViews'][a['bufferView']]; n = N[a['type']]; f, s = CT[a['componentType']]
        base = v.get('byteOffset', 0) + a.get('byteOffset', 0)
        return [struct.unpack_from('<' + f * n, binb, base + k * n * s) for k in range(a['count'])]

    root = j['nodes'][j['scenes'][0]['nodes'][0]]
    assert not any(k in root for k in ('translation', 'rotation', 'scale', 'matrix'))
    parts, tris = {}, 0
    solids = {}  # índice do material sólido -> coluna
    for mi_, m_ in enumerate(j['materials']):
        if 'baseColorFactor' in m_['pbrMetallicRoughness']:
            solids[mi_] = len(solids)
    assert len(solids) == 4, solids
    for gi in root['children']:
        g = j['nodes'][gi]
        key = GROUPS[g['name']]
        assert not any(k in g for k in ('rotation', 'scale', 'matrix')), g['name']
        pv = g.get('translation', [0, 0, 0])
        pos, nrm, uv, idx = [], [], [], []
        for mi in g.get('children', []):
            nd = j['nodes'][mi]
            assert 'mesh' in nd and not any(k in nd for k in ('rotation', 'scale', 'matrix', 'children')), nd.get('name')
            t = nd.get('translation', [0, 0, 0])
            for p in j['meshes'][nd['mesh']]['primitives']:
                at = p['attributes']
                P, Nn, I = read(at['POSITION']), read(at['NORMAL']), read(p['indices'])
                if 'TEXCOORD_0' in at:
                    U = [((u * SOLID_W) / ATLAS_W, v) for u, v in read(at['TEXCOORD_0'])]
                else:  # cor sólida do material: um texel do atlas
                    U = [((SOLID_W + solids[p['material']] + 0.5) / ATLAS_W, 0.5)] * len(P)
                base = len(pos)
                pos += [(q[0] + t[0], q[1] + t[1], q[2] + t[2]) for q in P]; nrm += Nn; uv += U
                idx += [base + i[0] for i in I]
        tris += len(idx) // 3
        parts[key] = {'pivot': [round(c, 5) for c in pv], 'pos': [round(c, 5) for q in pos for c in q], 'nrm': [round(c, 3) for q in nrm for c in q], 'uv': [round(c, 5) for q in uv for c in q], 'idx': idx, '_p': pos}
    assert set(parts) == set(GROUPS.values()), parts.keys()
    assert tris == 3538, f'esperava 3.538 triângulos, vieram {tris}'
    allw = [(q[0] + p['pivot'][0], q[1] + p['pivot'][1], q[2] + p['pivot'][2]) for p in parts.values() for q in p['_p']]
    mins = [min(q[a] for q in allw) for a in range(3)]; maxs = [max(q[a] for q in allw) for a in range(3)]
    size = [round(maxs[a] - mins[a], 3) for a in range(3)]
    print('caixa', [round(m, 3) for m in mins], [round(m, 3) for m in maxs], 'tamanho', size)
    assert abs(size[0] - 1.85) < 0.06 and abs(size[2] - 0.65) < 0.06 and abs(size[1] - 0.70) < 0.06 and abs(mins[1]) < 0.03, f'tamanho inesperado {size} {mins}'
    # posições dos nós das partes são "locais ao grupo": o pivô é o do grupo; a geometria dos filhos já está no espaço do grupo (translação do filho).
    for p in parts.values():
        del p['_p']
    json.dump({'size': size, 'parts': parts}, open('src/assets/titan-farejador.json', 'w'), separators=(',', ':'))
    bv = j['bufferViews'][j['images'][0]['bufferView']]
    atlas = Image.open(io.BytesIO(binb[bv.get('byteOffset', 0):bv.get('byteOffset', 0) + bv['byteLength']])).convert('RGBA')
    assert atlas.size == (216, 36), atlas.size
    full = Image.new('RGBA', (ATLAS_W, 36), (0, 0, 0, 255))
    full.paste(atlas, (0, 0))
    for mi_, col in solids.items():
        f = j['materials'][mi_]['pbrMetallicRoughness']['baseColorFactor']
        for y in range(36):
            full.putpixel((SOLID_W + col, y), (srgb(f[0]), srgb(f[1]), srgb(f[2]), 255))
    atlas = full
    atlas.save('src/assets/titan-farejador-atlas.webp', 'WEBP', lossless=True, method=6)
    print('src/assets/titan-farejador.json:', tris, 'triângulos;', {k: len(v['idx']) // 3 for k, v in parts.items()})


if __name__ == '__main__':
    sys.exit(main())
