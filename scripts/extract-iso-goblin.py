#!/usr/bin/env python3
"""Goblin 3D do Vale com rig (v0.93.161; corpo refinado na v0.93.167, musculoso e verde-musgo na v0.93.168): `assets-src/iso-set/goblin/Goblin_Orvalis_Musculoso.glb` (Blender: 4 primitivas — crânio e traje com o atlas `base_rgb`, cabelo com a pintura `Cabelo_Pintura_2K`,
corpo/pele só em cor de vértice —, 10 756 vértices, 17 268 triângulos, esqueleto de 26 ossos (com orelhas), atlas PBR 2K) → malha única com pesos de pele, grupos por material, ossos e texturas de cor.

O Santuário monta uma `THREE.SkinnedMesh` por goblin (`render/three/isoGoblins.ts`, um material por grupo) e anda os ossos por código (`goblinPose.ts`: ciclo de caminhada procedural); a animação de teste do
GLB não é usada. A normal e a rugosidade do pacote também não (a cena não tem luzes). Saídas:
  src/assets/iso-goblin.json  { height, positions, normals, uvs, skinIndex, skinWeight, indices, groups, skinColors, bones, ibm }  (26 ossos)
      posições nas UNIDADES do modelo (altura 2,0, pés em y = 0, frente = +z, x = lateral); normais em centésimos (inteiros); `skinWeight` em 1/255; `bones` na ordem de `JOINTS_0`:
      { name, parent (−1 = raiz), t, q, s } = posição, quaternion (x, y, z, w) e escala locais de repouso; `ibm` = as matrizes inversas de bind (16 floats cada).
      `groups` = [{ material: 'base' | 'hair' | 'skin', start, count, firstVertex, vertexCount }] (faixas de `indices`/de vértices); `skinColors` = cor de vértice (linear, 1/255) dos vértices do grupo 'skin'.
  src/assets/iso-goblin.webp       atlas de cor 'base' (cabeça e traje) reduzido a 1024 × 1024.
  src/assets/iso-goblin-hair.webp  pintura do cabelo reduzida a 512 × 512.
Uso: python3 scripts/extract-iso-goblin.py
"""
import json
import struct
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'assets-src/iso-set/goblin/Goblin_Orvalis_Musculoso.glb'
d = SRC.read_bytes()
_, _, total = struct.unpack('<III', d[:12])
off, chunks = 12, []
while off < total:
    n, _k = struct.unpack('<II', d[off:off + 8])
    chunks.append(d[off + 8:off + 8 + n])
    off += 8 + n
gltf, blob = json.loads(chunks[0]), chunks[1]
nodes = gltf['nodes']


def accessor(i):
    a = gltf['accessors'][i]
    view = gltf['bufferViews'][a['bufferView']]
    comps = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}[a['type']]
    dtype = {5126: '<f4', 5125: '<u4', 5123: '<u2', 5121: 'u1'}[a['componentType']]
    start = view.get('byteOffset', 0) + a.get('byteOffset', 0)
    return np.frombuffer(blob, dtype=dtype, count=a['count'] * comps, offset=start).reshape(a['count'], comps)


MATERIAL_OF = {0: 'base', 1: 'hair', 2: 'skin'}  # índices dos materiais do GLB: pintura vibrante (atlas), cabelo, pele (cor de vértice)
pos, nor, uv, joints, weights, idx, groups, skin_colors = [], [], [], [], [], [], [], []
base_v = base_i = 0
for mesh in gltf['meshes']:
    for prim in mesh['primitives']:
        at = prim['attributes']
        p = accessor(at['POSITION']).astype(np.float64)
        pos.append(p)
        nor.append(accessor(at['NORMAL']).astype(np.float64))
        uv.append(accessor(at['TEXCOORD_0']).astype(np.float64) if 'TEXCOORD_0' in at else np.zeros((len(p), 2)))
        joints.append(accessor(at['JOINTS_0']).astype(np.int64))
        weights.append(accessor(at['WEIGHTS_0']).astype(np.float64))
        ii = accessor(prim['indices']).reshape(-1).astype(np.int64) + base_v
        idx.append(ii)
        material = MATERIAL_OF[prim['material']]
        groups.append({'material': material, 'start': base_i, 'count': len(ii), 'firstVertex': base_v, 'vertexCount': len(p)})
        if material == 'skin':
            skin_colors.append(accessor(at['COLOR_0'])[:, :3])
        base_v += len(p)
        base_i += len(ii)
pos, nor, uv, joints, weights, idx = (np.vstack(pos), np.vstack(nor), np.vstack(uv), np.vstack(joints), np.vstack(weights), np.concatenate(idx))
assert len(skin_colors) == 1, 'esperava uma primitiva de pele em cor de vértice'
skin = gltf['skins'][0]
ibm = accessor(skin['inverseBindMatrices']).astype(np.float64)
assert abs(pos[:, 1].min()) < 0.01, pos[:, 1].min()
assert joints.max() < len(gltf['skins'][0]['joints'])
order = skin['joints']
slot = {node: i for i, node in enumerate(order)}
parent = {}
for i, node in enumerate(nodes):
    for c in node.get('children', []):
        parent[c] = i
bones = []
for node_i in order:
    node = nodes[node_i]
    p = parent.get(node_i)
    bones.append({'name': node['name'], 'parent': slot.get(p, -1), 't': [round(v, 6) for v in node.get('translation', [0, 0, 0])],
                  'q': [round(v, 6) for v in node.get('rotation', [0, 0, 0, 1])], 's': [round(v, 6) for v in node.get('scale', [1, 1, 1])]})
# o nó do esqueleto (Goblin_Rig) e o da malha estão na identidade: os ossos já estão no espaço da malha
for n in nodes:
    if n['name'].startswith('Goblin_'):
        assert all(k not in n for k in ('translation', 'rotation', 'scale')), n['name']
out = {
    'height': round(float(pos[:, 1].max()), 4),
    'positions': [round(float(v), 4) for v in pos.reshape(-1)],
    'normals': [int(round(float(v) * 100)) for v in nor.reshape(-1)],
    'uvs': [round(float(v), 4) for v in uv.reshape(-1)],
    'skinIndex': [int(v) for v in joints.reshape(-1)],
    'skinWeight': [int(round(float(v) * 255)) for v in weights.reshape(-1)],
    'indices': [int(i) for i in idx],
    'groups': groups,
    'skinColors': [int(round(float(v) * 255)) for v in skin_colors[0].reshape(-1)],
    'bones': bones,
    'ibm': [round(float(v), 6) for v in ibm.reshape(-1)],
}
(ROOT / 'src/assets/iso-goblin.json').write_text(json.dumps(out, separators=(',', ':')))


def texture_png(index):
    tex = gltf['textures'][index]
    bv = gltf['bufferViews'][gltf['images'][tex['source']]['bufferView']]
    return blob[bv.get('byteOffset', 0):bv.get('byteOffset', 0) + bv['byteLength']]


import io
mats = gltf['materials']
base_tex = mats[0]['pbrMetallicRoughness']['baseColorTexture']['index']
hair_tex = mats[1]['pbrMetallicRoughness']['baseColorTexture']['index']
Image.open(io.BytesIO(texture_png(base_tex))).convert('RGB').resize((1024, 1024), Image.LANCZOS).save(ROOT / 'src/assets/iso-goblin.webp', quality=88)
Image.open(io.BytesIO(texture_png(hair_tex))).convert('RGB').resize((512, 512), Image.LANCZOS).save(ROOT / 'src/assets/iso-goblin-hair.webp', quality=88)
js = ROOT / 'src/assets/iso-goblin.json'
print('ok', len(pos), 'vértices,', len(idx) // 3, 'triângulos,', len(bones), 'ossos,', len(groups), 'grupos; json', js.stat().st_size // 1024, 'KB; webp', (ROOT / 'src/assets/iso-goblin.webp').stat().st_size // 1024, '+', (ROOT / 'src/assets/iso-goblin-hair.webp').stat().st_size // 1024, 'KB; altura', out['height'])
