"""Converte a Lanterna da Margem (GLB do pacote de arte, ADR 0043) no que o motor do Titã usa.

Entrada : assets-src/titan/lanterna/Lanterna_da_Margem.glb  (26 cuboides, 312 triângulos, atlas 32 × 32 embutido, pivô no centro da base)
Saídas  : src/assets/titan-lantern.json         geometria em dois lotes: `structure` (Pedra, Cobre e Grade) e `core` (Âmbar, o único emissivo)
          src/assets/titan-lantern-atlas.webp   atlas pixel art 32 × 32 RGBA, WebP SEM perdas (não passa pelo optimize-assets.py)

Cada lote: `pos` (x, y, z em metros), `nrm` (normais), `uv` (origem no canto superior esquerdo, como no glTF: a textura entra com flipY = false) e `idx`.
Os UVs e a silhueta ficam exatamente como no GLB; só se juntam os cuboides por material. Uso: python3 scripts/extract-titan-lantern.py
"""
import io
import json
import struct
import sys

from PIL import Image

SRC = 'assets-src/titan/lanterna/Lanterna_da_Margem.glb'
CORE_MATERIAL = 'Âmbar'
CT = {5126: ('f', 4), 5123: ('H', 2), 5125: ('I', 4)}
N = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3}


def load(path):
    b = open(path, 'rb').read()
    magic, ver, _ = struct.unpack('<III', b[:12])
    assert magic == 0x46546C67 and ver == 2, 'não é um GLB 2.0'
    off, chunks = 12, []
    while off < len(b):
        cl, _ct = struct.unpack('<II', b[off:off + 8])
        chunks.append(b[off + 8:off + 8 + cl])
        off += 8 + cl
    return json.loads(chunks[0]), chunks[1]


def read(j, binb, i):
    a = j['accessors'][i]
    v = j['bufferViews'][a['bufferView']]
    n = N[a['type']]
    fmt, size = CT[a['componentType']]
    base = v.get('byteOffset', 0) + a.get('byteOffset', 0)
    return [struct.unpack_from('<' + fmt * n, binb, base + k * n * size) for k in range(a['count'])]


def main():
    j, binb = load(SRC)
    assert not any(k in n for n in j['nodes'] for k in ('translation', 'rotation', 'scale', 'matrix')), 'o GLB tem transformações de nó; o script supõe nós sem transformação'
    lots = {'structure': {'pos': [], 'nrm': [], 'uv': [], 'idx': []}, 'core': {'pos': [], 'nrm': [], 'uv': [], 'idx': []}}
    for mesh in j['meshes']:
        p = mesh['primitives'][0]
        lot = lots['core' if j['materials'][p['material']]['name'] == CORE_MATERIAL else 'structure']
        pos, nrm, uv, idx = (read(j, binb, p['attributes']['POSITION']), read(j, binb, p['attributes']['NORMAL']), read(j, binb, p['attributes']['TEXCOORD_0']), read(j, binb, p['indices']))
        base = len(lot['pos']) // 3
        for q in pos: lot['pos'] += [round(c, 6) for c in q]
        for q in nrm: lot['nrm'] += [round(c, 4) for c in q]
        for q in uv: lot['uv'] += [round(c, 6) for c in q]
        lot['idx'] += [base + i[0] for i in idx]
    tris = {k: len(v['idx']) // 3 for k, v in lots.items()}
    assert sum(tris.values()) == 312, f'esperava 312 triângulos, veio {tris}'
    xs = [c for lot in lots.values() for c in lot['pos'][0::3]]
    ys = [c for lot in lots.values() for c in lot['pos'][1::3]]
    zs = [c for lot in lots.values() for c in lot['pos'][2::3]]
    size = [round(max(xs) - min(xs), 6), round(max(ys) - min(ys), 6), round(max(zs) - min(zs), 6)]
    assert size == [0.375, 0.625, 0.375] and min(ys) == 0, f'dimensões/pivô inesperados: {size}, y mín {min(ys)}'
    out = {'size': size, **lots}
    json.dump(out, open('src/assets/titan-lantern.json', 'w'), separators=(',', ':'))
    bv = j['bufferViews'][j['images'][0]['bufferView']]
    png = binb[bv.get('byteOffset', 0):bv.get('byteOffset', 0) + bv['byteLength']]
    atlas = Image.open(io.BytesIO(png)).convert('RGBA')
    assert atlas.size == (32, 32)
    atlas.save('src/assets/titan-lantern-atlas.webp', 'WEBP', lossless=True, method=6)
    print(f'src/assets/titan-lantern.json: structure {tris["structure"]} triângulos, core {tris["core"]}, tamanho {size} m')
    print('src/assets/titan-lantern-atlas.webp:', atlas.size)


if __name__ == '__main__':
    sys.exit(main())
