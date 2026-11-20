"""Converte a planta da Noz de Duna de Titã (GLB low-poly do pacote de arte, ADR 0060) no que o motor usa.

Entrada : assets-src/titan/noz/Noz_de_Duna_Planta_Low_Poly.glb   (22 malhas, 3.008 triângulos, 0,88 × 0,44 × 0,74 m, pivô no centro da implantação, ao nível do solo)
Saídas  : src/assets/titan-noz-planta.json   coroa, hastes, folhas e raízes (o que fica depois da colheita)
          src/assets/titan-noz-frutos.json   as 4 nozes (grupo `Frutos colhíveis`): só desenhadas enquanto a planta está madura
          src/assets/titan-noz-atlas.webp    atlas de 144 × 36 (4 células de 32 px com borda de 2 px); WebP SEM perdas
          cada JSON: `pos`, `nrm`, `uv` (origem no canto superior esquerdo, como no glTF), `idx`, `size` (largura × altura × profundidade, m)
O script falha se a contagem de triângulos, o tamanho ou o pivô mudarem. Uso: python3 -I scripts/extract-titan-noz.py
"""
import io
import json
import struct
import sys

from PIL import Image

CT = {5126: ('f', 4), 5123: ('H', 2), 5125: ('I', 4)}
N = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3}
SRC = 'assets-src/titan/noz/Noz_de_Duna_Planta_Low_Poly.glb'
FRUITS = 'Frutos colhíveis'


def main():
    b = open(SRC, 'rb').read()
    magic, ver, _ = struct.unpack('<III', b[:12])
    assert magic == 0x46546C67 and ver == 2
    off, chunks = 12, []
    while off < len(b):
        cl, _t = struct.unpack('<II', b[off:off + 8]); chunks.append(b[off + 8:off + 8 + cl]); off += 8 + cl
    j, binb = json.loads(chunks[0]), chunks[1]
    assert len(j['images']) == 1, 'esperava um atlas embutido'

    def read(i):
        a = j['accessors'][i]; v = j['bufferViews'][a['bufferView']]; n = N[a['type']]; f, s = CT[a['componentType']]
        base = v.get('byteOffset', 0) + a.get('byteOffset', 0)
        return [struct.unpack_from('<' + f * n, binb, base + k * n * s) for k in range(a['count'])]

    root = j['nodes'][j['scenes'][0]['nodes'][0]]
    assert not any(k in root for k in ('translation', 'rotation', 'scale', 'matrix')), 'raiz com transformação'
    parts = {'planta': ([], [], [], []), 'frutos': ([], [], [], [])}

    def visit(ni, which, t0):
        nd = j['nodes'][ni]
        assert not any(k in nd for k in ('rotation', 'scale', 'matrix')), 'só translação é suportada'
        t = [t0[a] + nd.get('translation', [0, 0, 0])[a] for a in range(3)]
        which = 'frutos' if nd.get('name') == FRUITS else which
        if 'mesh' in nd:
            pos, nrm, uv, idx = parts[which]
            for p in j['meshes'][nd['mesh']]['primitives']:
                at = p['attributes']
                P, Nn, U, I = read(at['POSITION']), read(at['NORMAL']), read(at['TEXCOORD_0']), read(p['indices'])
                base = len(pos)
                pos += [(q[0] + t[0], q[1] + t[1], q[2] + t[2]) for q in P]; nrm += Nn; uv += U
                idx += [base + i[0] for i in I]
        for c in nd.get('children', []):
            visit(c, which, t)

    for c in root['children']:
        visit(c, 'planta', [0, 0, 0])
    expected = {'planta': None, 'frutos': None}
    total = sum(len(v[3]) // 3 for v in parts.values())
    assert total == 3008, f'esperava 3.008 triângulos, vieram {total}'
    allpos = parts['planta'][0] + parts['frutos'][0]
    mins = [min(q[a] for q in allpos) for a in range(3)]; maxs = [max(q[a] for q in allpos) for a in range(3)]
    size = [round(maxs[0] - mins[0], 3), round(maxs[1] - mins[1], 3), round(maxs[2] - mins[2], 3)]
    print('caixa', [round(m, 3) for m in mins], [round(m, 3) for m in maxs], 'tamanho', size)
    assert abs(size[0] - 0.88) < 0.03 and abs(size[2] - 0.74) < 0.03 and abs(size[1] - 0.53) < 0.03, f'tamanho inesperado {size}'
    for name, (pos, nrm, uv, idx) in parts.items():
        out = {'size': size, 'pos': [round(c, 6) for q in pos for c in q], 'nrm': [round(c, 4) for q in nrm for c in q], 'uv': [round(c, 6) for q in uv for c in q], 'idx': idx}
        json.dump(out, open(f'src/assets/titan-noz-{name}.json', 'w'), separators=(',', ':'))
        print(f'src/assets/titan-noz-{name}.json: {len(idx) // 3} triângulos')
    bv = j['bufferViews'][j['images'][0]['bufferView']]
    atlas = Image.open(io.BytesIO(binb[bv.get('byteOffset', 0):bv.get('byteOffset', 0) + bv['byteLength']])).convert('RGBA')
    assert atlas.size == (144, 36), atlas.size
    atlas.save('src/assets/titan-noz-atlas.webp', 'WEBP', lossless=True, method=6)
    print('src/assets/titan-noz-atlas.webp · 144 × 36')


if __name__ == '__main__':
    sys.exit(main())
