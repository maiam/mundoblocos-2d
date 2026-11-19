"""Converte a Mesa de Trabalho de Titã (GLB do pacote de arte, ADR 0045) no que o motor usa.

Entrada : assets-src/titan/fabricacao/Mesa_de_Trabalho_Tita.glb  (8 cuboides, 96 triângulos, 1 × 1 × 1 bloco, pivô no centro da base, atlas embutido 60 × 40)
Saídas  : src/assets/titan-workbench.json         geometria única (`pos`, `nrm`, `uv` com origem no canto superior esquerdo como no glTF, `idx`)
          src/assets/titan-workbench-atlas.webp   atlas 60 × 40 RGBA, WebP SEM perdas (fora do optimize-assets.py)
O script falha se a contagem de triângulos, o tamanho ou o pivô mudarem. Uso: python3 -I scripts/extract-titan-workbench.py
"""
import io
import json
import struct
import sys

from PIL import Image

SRC = 'assets-src/titan/fabricacao/Mesa_de_Trabalho_Tita.glb'
CT = {5126: ('f', 4), 5123: ('H', 2), 5125: ('I', 4)}
N = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3}


def main():
    b = open(SRC, 'rb').read()
    magic, ver, _ = struct.unpack('<III', b[:12])
    assert magic == 0x46546C67 and ver == 2
    off, chunks = 12, []
    while off < len(b):
        cl, _t = struct.unpack('<II', b[off:off + 8]); chunks.append(b[off + 8:off + 8 + cl]); off += 8 + cl
    j, binb = json.loads(chunks[0]), chunks[1]
    assert len(j['meshes']) == 1 and not any(k in n for n in j['nodes'] for k in ('translation', 'rotation', 'scale', 'matrix'))

    def read(i):
        a = j['accessors'][i]; v = j['bufferViews'][a['bufferView']]; n = N[a['type']]; f, s = CT[a['componentType']]
        base = v.get('byteOffset', 0) + a.get('byteOffset', 0)
        return [struct.unpack_from('<' + f * n, binb, base + k * n * s) for k in range(a['count'])]

    p = j['meshes'][0]['primitives'][0]
    pos, nrm, uv, idx = read(p['attributes']['POSITION']), read(p['attributes']['NORMAL']), read(p['attributes']['TEXCOORD_0']), read(p['indices'])
    assert len(idx) // 3 == 96, f'esperava 96 triângulos, veio {len(idx) // 3}'
    mins = [min(q[a] for q in pos) for a in range(3)]; maxs = [max(q[a] for q in pos) for a in range(3)]
    size = [round(maxs[a] - mins[a], 6) for a in range(3)]
    assert size == [1, 1, 1] and mins[1] == 0 and abs(mins[0] + 0.5) < 1e-6 and abs(mins[2] + 0.5) < 1e-6, f'tamanho/pivô inesperados: {size} {mins}'
    out = {'size': size, 'pos': [round(c, 6) for q in pos for c in q], 'nrm': [round(c, 4) for q in nrm for c in q], 'uv': [round(c, 6) for q in uv for c in q], 'idx': [i[0] for i in idx]}
    json.dump(out, open('src/assets/titan-workbench.json', 'w'), separators=(',', ':'))
    bv = j['bufferViews'][j['images'][0]['bufferView']]
    png = binb[bv.get('byteOffset', 0):bv.get('byteOffset', 0) + bv['byteLength']]
    atlas = Image.open(io.BytesIO(png)).convert('RGBA')
    assert atlas.size == (60, 40)
    atlas.save('src/assets/titan-workbench-atlas.webp', 'WEBP', lossless=True, method=6)
    print('src/assets/titan-workbench.json: 96 triângulos, 1 × 1 × 1 · atlas', atlas.size)


if __name__ == '__main__':
    sys.exit(main())
