#!/usr/bin/env python3
"""Caldeirão de pedra 3D do Santuário (v0.93.149): `assets-src/iso-set/caldeirao/Caldeirao_Orvalis_3k.glb` (Blender, 2757 quadriláteros) → geometria enxuta.

O Santuário desenha o caldeirão como malha 3D (`render/three/isoCauldrons.ts`) no lugar do sprite do Mundo, com a textura da Pedra Rachada do próprio Mundo
(a textura pintada do GLB não é usada). Aqui só sai a forma:
  src/assets/iso-cauldron.json  { positions: [x, y, z, ...], indices: [...] } em CÉLULAS (y para cima), centrada em x/z e com a base em y = 0; vértices
                                repetidos (as costuras da UV) fundidos, normais calculadas na carga (ficam suaves).
Uso: python3 scripts/extract-iso-cauldron.py
"""
import json
import struct
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'assets-src/iso-set/caldeirao/Caldeirao_Orvalis_3k.glb'
OUT = ROOT / 'src/assets/iso-cauldron.json'
WIDTH = 0.92   # largura total (com as alças) em células: cabe na célula do Santuário

d = SRC.read_bytes()
_, _, total = struct.unpack('<III', d[:12])
off, chunks = 12, []
while off < total:
    n, kind = struct.unpack('<II', d[off:off + 8])
    chunks.append(d[off + 8:off + 8 + n])
    off += 8 + n
gltf, blob = json.loads(chunks[0]), chunks[1]
prim = gltf['meshes'][0]['primitives'][0]


def accessor(i):
    a = gltf['accessors'][i]
    view = gltf['bufferViews'][a['bufferView']]
    comps = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3}[a['type']]
    dtype = {5126: '<f4', 5125: '<u4', 5123: '<u2'}[a['componentType']]
    start = view.get('byteOffset', 0) + a.get('byteOffset', 0)
    return np.frombuffer(blob, dtype=dtype, count=a['count'] * comps, offset=start).reshape(a['count'], comps)


pos = accessor(prim['attributes']['POSITION']).astype(np.float64)
idx = accessor(prim['indices']).reshape(-1).astype(np.int64)
lo, hi = pos.min(0), pos.max(0)
scale = WIDTH / (hi[0] - lo[0])
pos = (pos - np.array([(lo[0] + hi[0]) / 2, lo[1], (lo[2] + hi[2]) / 2])) * scale
# funde os vértices que só diferem pela UV
key = np.round(pos, 4)
uniq, inverse = np.unique(key, axis=0, return_inverse=True)
idx = inverse.reshape(-1)[idx]
tri = idx.reshape(-1, 3)
tri = tri[(tri[:, 0] != tri[:, 1]) & (tri[:, 1] != tri[:, 2]) & (tri[:, 0] != tri[:, 2])]
OUT.write_text(json.dumps({'positions': [round(float(v), 4) for v in uniq.reshape(-1)], 'indices': [int(i) for i in tri.reshape(-1)]}, separators=(',', ':')))
print('ok', len(uniq), 'vértices,', len(tri), 'triângulos, altura', round(float(uniq[:, 1].max()), 3), 'células,', OUT.stat().st_size // 1024, 'KB')
