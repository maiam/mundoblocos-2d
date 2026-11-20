"""Converte o Marco de Margem e o Painel de Junco de Titã (GLB low-poly do pacote de arte, ADR 0058) no que o motor usa.

Entradas : assets-src/titan/margem/Marco_de_Margem_Low_Poly.glb   (5 malhas, 148 triângulos, 0,56 × 0,43 × 0,63 m, pivô no centro da base)
           assets-src/titan/margem/Painel_de_Junco_Low_Poly.glb   (10 malhas, 832 triângulos, 1,00 × 0,224 × 0,944 m, eixo de encaixe X, pivô no centro da base)
Saídas   : src/assets/titan-marco.json / titan-painel.json         geometria única por modelo (as malhas com a translação do nó aplicada): `pos`, `nrm`, `uv` (origem no canto superior
                                                                   esquerdo como no glTF), `idx`, `size` (largura × altura × profundidade, em metros)
           src/assets/titan-margem-atlas.webp                         atlas embutido de 144 × 72 RGBA (basalto e junco), igual nos dois GLBs: um arquivo só; WebP SEM perdas (fora do optimize-assets.py)
O script falha se a contagem de triângulos, o tamanho ou o pivô mudarem. Uso: python3 -I scripts/extract-titan-margem.py
"""
import io
import json
import struct
import sys

from PIL import Image

CT = {5126: ('f', 4), 5123: ('H', 2), 5125: ('I', 4)}
N = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3}
MODELS = [
    ('assets-src/titan/margem/Marco_de_Margem_Low_Poly.glb', 'marco', 148, (0.56, 0.629, 0.43)),
    ('assets-src/titan/margem/Painel_de_Junco_Low_Poly.glb', 'painel', 832, (1.0, 0.944, 0.224)),
]


def convert(src, name, tris, size_expected):
    b = open(src, 'rb').read()
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
    assert not any(k in root for k in ('translation', 'rotation', 'scale', 'matrix'))
    pos, nrm, uv, idx = [], [], [], []
    for ni in root['children']:
        nd = j['nodes'][ni]
        assert not any(k in nd for k in ('rotation', 'scale', 'matrix')), 'só translação é suportada'
        t = nd.get('translation', [0, 0, 0])
        for p in j['meshes'][nd['mesh']]['primitives']:
            at = p['attributes']
            P, Nn, U, I = read(at['POSITION']), read(at['NORMAL']), read(at['TEXCOORD_0']), read(p['indices'])
            base = len(pos)
            pos += [(q[0] + t[0], q[1] + t[1], q[2] + t[2]) for q in P]; nrm += Nn; uv += U
            idx += [base + i[0] for i in I]
    assert len(idx) // 3 == tris, f'{name}: esperava {tris} triângulos, veio {len(idx) // 3}'
    mins = [min(q[a] for q in pos) for a in range(3)]; maxs = [max(q[a] for q in pos) for a in range(3)]
    size = [round(maxs[0] - mins[0], 3), round(maxs[1] - mins[1], 3), round(maxs[2] - mins[2], 3)]
    assert mins[1] > -0.02 and abs((mins[0] + maxs[0]) / 2) < 0.02 and abs((mins[2] + maxs[2]) / 2) < 0.02, f'{name}: pivô inesperado {mins} {maxs}'
    assert all(abs(size[a] - size_expected[a]) < 0.01 for a in range(3)), f'{name}: tamanho inesperado {size}'
    out = {'size': size, 'pos': [round(c, 6) for q in pos for c in q], 'nrm': [round(c, 4) for q in nrm for c in q], 'uv': [round(c, 6) for q in uv for c in q], 'idx': idx}
    json.dump(out, open(f'src/assets/titan-{name}.json', 'w'), separators=(',', ':'))
    bv = j['bufferViews'][j['images'][0]['bufferView']]
    atlas = Image.open(io.BytesIO(binb[bv.get('byteOffset', 0):bv.get('byteOffset', 0) + bv['byteLength']])).convert('RGBA')
    assert atlas.size == (144, 72), atlas.size
    return atlas, print_info(name, tris, size)


def print_info(name, tris, size):
    print(f'src/assets/titan-{name}.json: {tris} triângulos, {size} m')


def main():
    atlases = [convert(*m)[0] for m in MODELS]
    assert atlases[0].tobytes() == atlases[1].tobytes(), 'os dois GLBs deviam trazer o mesmo atlas'
    atlases[0].save('src/assets/titan-margem-atlas.webp', 'WEBP', lossless=True, method=6)
    print('src/assets/titan-margem-atlas.webp · 144 × 72')


if __name__ == '__main__':
    sys.exit(main())
