#!/usr/bin/env python3
"""Goblin 3D do Vale (v0.93.160): `assets-src/iso-set/goblin/Goblin_Orvalis_Pose_A.glb` (Blender, 50 peças, pose A) → malha única + textura de cor.

O Santuário desenha cada goblin como malha 3D (`render/three/isoGoblins.ts`) com a cor base do atlas do modelo (`Goblin_BaseColor_2K.png`, extraída do GLB PBR); a normal e a
rugosidade do pacote não são usadas (a cena não tem luzes). Saídas:
  src/assets/iso-goblin.json   { positions, normals, uvs, indices }: UNIDADES de altura (altura total = 1, pés em y = 0, centrado em x/z), UV do atlas (origem no canto
                               superior esquerdo, como no glTF), normais em centésimos (inteiros −100..100).
  src/assets/iso-goblin.webp   cor base reduzida a 1024 × 1024.
Uso: python3 scripts/extract-iso-goblin.py
"""
import json
import struct
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'assets-src/iso-set/goblin'
d = (SRC / 'Goblin_Orvalis_Pose_A.glb').read_bytes()
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
    comps = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3}[a['type']]
    dtype = {5126: '<f4', 5125: '<u4', 5123: '<u2'}[a['componentType']]
    start = view.get('byteOffset', 0) + a.get('byteOffset', 0)
    return np.frombuffer(blob, dtype=dtype, count=a['count'] * comps, offset=start).reshape(a['count'], comps)


P, N, T, I = [], [], [], []
base = 0
for node in gltf['nodes']:
    assert not any(k in node for k in ('matrix', 'rotation', 'scale', 'translation')), node['name']
    prim = gltf['meshes'][node['mesh']]['primitives'][0]
    pos = accessor(prim['attributes']['POSITION']).astype(np.float64)
    P.append(pos)
    N.append(accessor(prim['attributes']['NORMAL']).astype(np.float64))
    T.append(accessor(prim['attributes']['TEXCOORD_0']).astype(np.float64))
    I.append(accessor(prim['indices']).reshape(-1).astype(np.int64) + base)
    base += len(pos)
pos, nor, uv, idx = np.vstack(P), np.vstack(N), np.vstack(T), np.concatenate(I)
lo, hi = pos.min(0), pos.max(0)
height = hi[1] - lo[1]
pos = (pos - np.array([(lo[0] + hi[0]) / 2, lo[1], (lo[2] + hi[2]) / 2])) / height
out = {
    'positions': [round(float(v), 4) for v in pos.reshape(-1)],
    'normals': [int(round(float(v) * 100)) for v in nor.reshape(-1)],
    'uvs': [round(float(v), 4) for v in uv.reshape(-1)],
    'indices': [int(i) for i in idx],
}
(ROOT / 'src/assets/iso-goblin.json').write_text(json.dumps(out, separators=(',', ':')))
Image.open(SRC / 'Goblin_BaseColor_2K.png').convert('RGB').resize((1024, 1024), Image.LANCZOS).save(ROOT / 'src/assets/iso-goblin.webp', quality=88)
print('ok', len(pos), 'vértices,', len(idx) // 3, 'triângulos; largura/altura', round(float((hi[0] - lo[0]) / height), 3), 'profundidade/altura', round(float((hi[2] - lo[2]) / height), 3), '; json', (ROOT / 'src/assets/iso-goblin.json').stat().st_size // 1024, 'KB; webp', (ROOT / 'src/assets/iso-goblin.webp').stat().st_size // 1024, 'KB')
