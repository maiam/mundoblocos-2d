"""Converte a Cama de Junco de Titã (GLB de jogo 1K do pacote de arte, ADR 0090) no que o motor usa, com o Blender (`pip install bpy`).

Entrada : assets-src/titan/cama/Cama_de_Junco_Jogo_1K.glb   (1 malha, 8.828 triângulos, 3 PNG de 1K; 0,96 × 0,45 × 1,97 m; no GLB a célula dos pés é a origem e a cabeceira fica em −z)
Saídas  : src/assets/titan-cama.json        geometria única: `pos`, `nrm`, `uv` (origem no canto superior esquerdo, como no glTF), `idx`, `size` (largura × altura × comprimento, em metros). Reduzida
                                           a `TARGET_TRIS` triângulos pelo decimador do Blender (colapso de arestas, UVs mantidas) e **girada 180° em Y**: a célula dos pés é a origem e a **cabeceira
                                           fica em +z** (a frente do giro 0, como a Escada); centrada em x, com a base em y = 0. O bloco dos pés guarda a instância; a cabeceira é outra célula (`titan/voxel.ts`).
          src/assets/titan-cama-atlas.webp   a cor-base do GLB reduzida de 1024 para `ATLAS` px; WebP SEM perdas (o jogo usa luz própria, sem normal nem ORM).
O script confere o tamanho. Uso: python3 -I scripts/extract-titan-cama.py
"""
import json
import os
import sys
import tempfile

import bpy
from PIL import Image

SRC = 'assets-src/titan/cama/Cama_de_Junco_Jogo_1K.glb'
OUT_JSON, OUT_ATLAS = 'src/assets/titan-cama.json', 'src/assets/titan-cama-atlas.webp'
TARGET_TRIS, ATLAS = 2200, 256


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
    cx, y0 = (max(xs0) + min(xs0)) / 2, min(zs0)  # centro em x e base em y (z fica onde está: a célula dos pés é a origem)
    pos, nor, uv, idx = [], [], [], []
    seen = {}
    for t in me.loop_triangles:
        for li in t.loops:
            vi = me.loops[li].vertex_index
            co = me.vertices[vi].co
            n = nrm[li].vector
            u = uvl[li].uv
            # glTF (x, z, −y) e depois 180° em Y (x → −x, z → −z): a cabeceira que ficava em −z passa para +z
            p = (round(-(co.x - cx), 5), round(co.z - y0, 5), round(co.y, 5))
            nn = (round(-n.x, 4), round(n.z, 4), round(n.y, 4))
            k = (p, nn, round(u.x, 5), round(u.y, 5))
            if k not in seen:
                seen[k] = len(pos) // 3
                pos.extend(p); nor.extend(nn); uv.extend((round(u.x, 5), round(1 - u.y, 5)))
            idx.append(seen[k])
    xs, ys, zs = pos[0::3], pos[1::3], pos[2::3]
    size = (round(max(xs) - min(xs), 4), round(max(ys) - min(ys), 4), round(max(zs) - min(zs), 4))
    assert 0.85 < size[0] < 1.05 and 0.3 < size[1] < 0.6 and 1.8 < size[2] < 2.05, f'tamanho inesperado: {size}'
    assert -0.55 < min(zs) < -0.4 and 1.4 < max(zs) < 1.55, f'a cama deve cobrir a célula dos pés (z −0,5…0,5) e a cabeceira (0,5…1,5): z {min(zs)}…{max(zs)}'
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
