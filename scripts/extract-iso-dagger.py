#!/usr/bin/env python3
"""Adaga do goblin (v0.93.166): `assets-src/iso-set/goblin/Adaga_Goblin_Orvalis.glb` (Blender: 4 materiais — aço azulado, couro, bronze, esmeralda — pintados em cor de vértice, sem textura) → `src/assets/iso-dagger.json`.

Saída: { length, positions, normals, colors, indices } — malha única juntando as 4 primitivas. Posições nas UNIDADES do modelo, com a origem no meio do cabo (onde a mão segura) e a lâmina
apontando para +y (comprimento total ~0,585); normais em centésimos (inteiros); `colors` = cor de vértice (linear) em 1/255. O Santuário a prende ao osso `hand.R` (`render/three/isoGoblins.ts`).
Uso: python3 scripts/extract-iso-dagger.py
"""
import json
import struct
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
d = (ROOT / 'assets-src/iso-set/goblin/Adaga_Goblin_Orvalis.glb').read_bytes()
_, _, total = struct.unpack('<III', d[:12])
off, chunks = 12, []
while off < total:
    n, _k = struct.unpack('<II', d[off:off + 8])
    chunks.append(d[off + 8:off + 8 + n])
    off += 8 + n
gltf, blob = json.loads(chunks[0]), chunks[1]


def accessor(i):
    a = gltf['accessors'][i]
    view = gltf['bufferViews'][a['bufferView']]
    comps = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}[a['type']]
    dtype = {5126: '<f4', 5125: '<u4', 5123: '<u2', 5121: 'u1'}[a['componentType']]
    start = view.get('byteOffset', 0) + a.get('byteOffset', 0)
    arr = np.frombuffer(blob, dtype=dtype, count=a['count'] * comps, offset=start).reshape(a['count'], comps).astype(np.float64)
    if a.get('normalized'):
        arr /= {5121: 255.0, 5123: 65535.0}[a['componentType']]
    return arr


pos, nor, col, idx = [], [], [], []
base = 0
for prim in gltf['meshes'][0]['primitives']:
    at = prim['attributes']
    p = accessor(at['POSITION'])
    pos.append(p)
    nor.append(accessor(at['NORMAL']))
    col.append(accessor(at['COLOR_0'])[:, :3])
    idx.append(accessor(prim['indices']).reshape(-1).astype(np.int64) + base)
    base += len(p)
pos, nor, col, idx = np.vstack(pos), np.vstack(nor), np.vstack(col), np.concatenate(idx)
assert pos[:, 1].max() > 0.4, 'lâmina deve apontar para +y'
grip = np.array([0.0, -0.01, 0.0])  # meio do cabo
pos = pos - grip
out = {
    'length': round(float(pos[:, 1].max() - pos[:, 1].min()), 4),
    'positions': [round(float(v), 4) for v in pos.reshape(-1)],
    'normals': [int(round(float(v) * 100)) for v in nor.reshape(-1)],
    'colors': [int(round(float(v) * 255)) for v in col.reshape(-1)],
    'indices': [int(i) for i in idx],
}
(ROOT / 'src/assets/iso-dagger.json').write_text(json.dumps(out, separators=(',', ':')))
print('ok', len(pos), 'vértices,', len(idx) // 3, 'triângulos; comprimento', out['length'], '; json', (ROOT / 'src/assets/iso-dagger.json').stat().st_size // 1024, 'KB')
