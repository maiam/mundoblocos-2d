"""Converte a Escada de Junco de Titã (GLB de jogo 1K do pacote de arte, ADR 0088) no que o motor usa, com o Blender (`pip install bpy`).

Entrada : assets-src/titan/escada/Escada_de_Junco_Jogo_1K.glb   (1 malha, 5.448 triângulos, 0,634 × 1,0 × 0,12 m; a face de apoio é o plano z = 0 e a frente aponta para +z; 3 PNG de 1K)
Saídas  : src/assets/titan-escada.json       geometria única: `pos`, `nrm`, `uv` (origem no canto superior esquerdo, como no glTF), `idx`, `size` (largura × altura × profundidade, em metros). Reduzida
                                             a `TARGET_TRIS` triângulos pelo decimador do Blender (colapso de arestas, UVs mantidas) e **deslocada −0,5 em z**: o plano de apoio fica na borda da célula
                                             e o pivô no centro da base, como os outros modelos (`turn` gira em torno do centro; `titan/models.ts`).
          src/assets/titan-escada-atlas.webp  a cor-base do GLB reduzida de 1024 para `ATLAS` px (as ilhas da UV ficam; o jogo usa luz própria, sem normal nem ORM); WebP SEM perdas.
O script confere o tamanho e o pivô. Uso: python3 -I scripts/extract-titan-escada.py
"""
import json
import os
import sys
import tempfile

import bpy
from PIL import Image

SRC = 'assets-src/titan/escada/Escada_de_Junco_Jogo_1K.glb'
OUT_JSON, OUT_ATLAS = 'src/assets/titan-escada.json', 'src/assets/titan-escada-atlas.webp'
TARGET_TRIS, ATLAS = 1400, 256
SIZE_EXPECTED = (0.6336, 1.0, 0.1193)  # largura × altura × profundidade da malha original


def main() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=SRC)
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    assert len(meshes) == 1, f'esperava 1 malha, achei {len(meshes)}'
    ob = meshes[0]
    bpy.context.view_layer.objects.active = ob
    ob.select_set(True)
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
    pos, nor, uv, idx = [], [], [], []
    seen = {}
    for t in me.loop_triangles:
        for li in t.loops:
            vi = me.loops[li].vertex_index
            co = me.vertices[vi].co
            n = nrm[li].vector
            u = uvl[li].uv
            # Blender é Z para cima (y = −z do glTF); volta ao glTF (Y para cima) e desloca o apoio para a borda da célula
            p = (round(co.x, 5), round(co.z, 5), round(-co.y - 0.5, 5))
            nn = (round(n.x, 4), round(n.z, 4), round(-n.y, 4))
            k = (p, nn, round(u.x, 5), round(u.y, 5))
            if k not in seen:
                seen[k] = len(pos) // 3
                pos.extend(p); nor.extend(nn); uv.extend((round(u.x, 5), round(1 - u.y, 5)))  # v do glTF (origem no canto superior esquerdo)
            idx.append(seen[k])
    xs, ys, zs = pos[0::3], pos[1::3], pos[2::3]
    size = (round(max(xs) - min(xs), 4), round(max(ys) - min(ys), 4), round(max(zs) - min(zs), 4))
    assert all(abs(a - b) < 0.02 for a, b in zip(size, SIZE_EXPECTED)), f'tamanho mudou: {size}'
    assert abs(min(zs) + 0.5) < 0.03 and abs(min(ys)) < 0.01, f'pivô mudou: z0={min(zs)} y0={min(ys)}'
    json.dump({'size': list(size), 'pos': pos, 'nrm': nor, 'uv': uv, 'idx': idx}, open(OUT_JSON, 'w'), separators=(',', ':'))
    # cor-base: a imagem ligada ao "Base Color" do material
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
