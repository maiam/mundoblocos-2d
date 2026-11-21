"""Converte o Baú de Rocha e Junco de Titã (GLB de jogo 1K do pacote de arte, ADR 0089) no que o motor usa, com o Blender (`pip install bpy`).

Entrada : assets-src/titan/bau/Bau_de_Rocha_e_Junco_Jogo_1K.glb   (corpo oco de basalto + tampa trançada, 8.124 triângulos, 3 PNG de 1K; dobradiça atrás (−z), frente em +z)
Saídas  : src/assets/titan-bau.json        geometria única: `pos`, `nrm`, `uv` (origem no canto superior esquerdo, como no glTF), `idx`, `size` (largura × altura × profundidade, em metros). Reduzida a
                                           `TARGET_TRIS` triângulos pelo decimador do Blender (colapso de arestas, UVs mantidas), **centrada em x e z** e com a base em y = 0 (pivô no centro da base, como
                                           os outros modelos; `turn` gira em torno do centro; `titan/models.ts`).
          src/assets/titan-bau-atlas.webp   a cor-base do GLB reduzida de 1024 para `ATLAS` px; WebP SEM perdas (o jogo usa luz própria, sem normal nem ORM).
O script confere o tamanho. Uso: python3 -I scripts/extract-titan-bau.py
"""
import json
import os
import sys
import tempfile

import bpy
from PIL import Image

SRC = 'assets-src/titan/bau/Bau_de_Rocha_e_Junco_Jogo_1K.glb'
OUT_JSON, OUT_ATLAS = 'src/assets/titan-bau.json', 'src/assets/titan-bau-atlas.webp'
TARGET_TRIS, ATLAS = 1800, 256


def main() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=SRC)
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    assert meshes, 'sem malhas'
    bpy.ops.object.select_all(action='DESELECT')
    for o in meshes:
        o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    tris0 = sum(len(p.vertices) - 2 for p in ob.data.polygons)
    mod = ob.modifiers.new('decimar', 'DECIMATE')
    mod.decimate_type = 'COLLAPSE'
    mod.ratio = min(1.0, TARGET_TRIS / tris0)
    bpy.ops.object.modifier_apply(modifier=mod.name)
    me = ob.data
    me.calc_loop_triangles()
    uvl = me.uv_layers.active.data
    nrm = me.corner_normals
    xs0 = [v.co.x for v in me.vertices]; ys0 = [-v.co.y for v in me.vertices]; zs0 = [v.co.z for v in me.vertices]  # Blender (x, y, z) -> glTF (x, z, -y): z do glTF = -y do Blender
    cx, cz, y0 = (max(xs0) + min(xs0)) / 2, (max(ys0) + min(ys0)) / 2, min(zs0)  # centro em x e z (glTF) e base em y
    pos, nor, uv, idx = [], [], [], []
    seen = {}
    for t in me.loop_triangles:
        for li in t.loops:
            vi = me.loops[li].vertex_index
            co = me.vertices[vi].co
            n = nrm[li].vector
            u = uvl[li].uv
            p = (round(co.x - cx, 5), round(co.z - y0, 5), round(-co.y - cz, 5))
            nn = (round(n.x, 4), round(n.z, 4), round(-n.y, 4))
            k = (p, nn, round(u.x, 5), round(u.y, 5))
            if k not in seen:
                seen[k] = len(pos) // 3
                pos.extend(p); nor.extend(nn); uv.extend((round(u.x, 5), round(1 - u.y, 5)))
            idx.append(seen[k])
    xs, ys, zs = pos[0::3], pos[1::3], pos[2::3]
    size = (round(max(xs) - min(xs), 4), round(max(ys) - min(ys), 4), round(max(zs) - min(zs), 4))
    assert 0.8 < size[0] < 1.05 and 0.55 < size[1] < 1.05 and 0.8 < size[2] < 1.05, f'tamanho inesperado: {size}'
    json.dump({'size': list(size), 'pos': pos, 'nrm': nor, 'uv': uv, 'idx': idx}, open(OUT_JSON, 'w'), separators=(',', ':'))
    img = None
    for m in bpy.data.materials:
        if m.use_nodes:
            for n in m.node_tree.nodes:
                if n.type == 'BSDF_PRINCIPLED' and n.inputs['Base Color'].links:
                    src = n.inputs['Base Color'].links[0].from_node
                    if src.type == 'TEX_IMAGE':
                        img = src.image
    assert img is not None, 'sem textura de cor-base'
    tmp = os.path.join(tempfile.mkdtemp(), 'base.png')
    img.filepath_raw = tmp
    img.file_format = 'PNG'
    img.save()
    Image.open(tmp).convert('RGB').resize((ATLAS, ATLAS), Image.LANCZOS).save(OUT_ATLAS, 'WEBP', lossless=True, quality=100, method=6)
    print(OUT_JSON, len(idx) // 3, 'triângulos', len(pos) // 3, 'vértices', size, '|', OUT_ATLAS, (ATLAS, ATLAS))


if __name__ == '__main__':
    sys.exit(main())
