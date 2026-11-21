"""Converte o Baú de Rocha e Junco de Titã (GLB de jogo 1K do pacote de arte, ADR 0089) no que o motor usa, com o Blender (`pip install bpy`).

Entrada : assets-src/titan/bau/Bau_de_Rocha_e_Junco_Jogo_1K.glb   (corpo oco de basalto + tampa trançada, 8.124 triângulos, 3 PNG de 1K; dobradiça atrás (−z), frente em +z)
Saídas  : src/assets/titan-bau.json        o **corpo** (basalto): `pos`, `nrm`, `uv` (origem no canto superior esquerdo, como no glTF), `idx`, `size` (largura × altura × profundidade da peça fechada, em metros),
                                           **centrado em x e z** e com a base em y = 0 (pivô no centro da base, como os outros modelos; `turn` gira em torno do centro; `titan/models.ts`).
          src/assets/titan-bau-tampa.json   a **tampa** trançada, reduzida a `LID_TRIS` triângulos pelo decimador do Blender (colapso de arestas, UVs mantidas), com os vértices **relativos à dobradiça**
                                           (o GLB traz um vazio "Dobradiça" atrás, em −z) e `pivot`: a posição da dobradiça no espaço do baú. O renderer gira a tampa em torno dela (ADR 0093).
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
LID_TRIS, ATLAS = 1700, 256
OUT_LID = 'src/assets/titan-bau-tampa.json'


def mesh_data(ob, shift, pivot=(0.0, 0.0, 0.0)):
    """Triângulos do objeto no espaço glTF (x, z, −y do Blender), com o deslocamento do baú (centro e base) e o pivô descontados."""
    me = ob.data
    me.calc_loop_triangles()
    uvl = me.uv_layers.active.data
    nrm = me.corner_normals
    cx, cz, y0 = shift
    pos, nor, uv, idx = [], [], [], []
    seen = {}
    for t in me.loop_triangles:
        for li in t.loops:
            vi = me.loops[li].vertex_index
            co = me.vertices[vi].co
            n = nrm[li].vector
            u = uvl[li].uv
            p = (round(co.x - cx - pivot[0], 5), round(co.z - y0 - pivot[1], 5), round(-co.y - cz - pivot[2], 5))
            nn = (round(n.x, 4), round(n.z, 4), round(-n.y, 4))
            k = (p, nn, round(u.x, 5), round(u.y, 5))
            if k not in seen:
                seen[k] = len(pos) // 3
                pos.extend(p); nor.extend(nn); uv.extend((round(u.x, 5), round(1 - u.y, 5)))
            idx.append(seen[k])
    return pos, nor, uv, idx


def main() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=SRC)
    objs = {o.name: o for o in bpy.context.scene.objects}
    body = next(o for n, o in objs.items() if o.type == 'MESH' and n.startswith('Corpo'))
    lid = next(o for n, o in objs.items() if o.type == 'MESH' and n.startswith('Tampa'))
    hinge = next(o for n, o in objs.items() if o.type == 'EMPTY' and n.startswith('Dobra'))
    hw = hinge.matrix_world.translation
    hinge_b = (hw.x, hw.y, hw.z)  # espaço do Blender
    for o in (body, lid):
        bpy.ops.object.select_all(action='DESELECT')
        o.select_set(True)
        bpy.context.view_layer.objects.active = o
        mw = o.matrix_world.copy()
        o.parent = None
        o.matrix_world = mw  # solta do vazio sem mexer na posição no mundo
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    tris_lid = sum(len(p.vertices) - 2 for p in lid.data.polygons)
    mod = lid.modifiers.new('decimar', 'DECIMATE')
    mod.decimate_type = 'COLLAPSE'
    mod.ratio = min(1.0, LID_TRIS / tris_lid)
    bpy.context.view_layer.objects.active = lid
    bpy.ops.object.modifier_apply(modifier=mod.name)
    # centro em x e z (glTF) e base em y, a partir do corpo e da tampa fechada juntos
    allv = [body.data.vertices, lid.data.vertices]
    xs0 = [v.co.x for vs in allv for v in vs]; ys0 = [-v.co.y for vs in allv for v in vs]; zs0 = [v.co.z for vs in allv for v in vs]
    shift = ((max(xs0) + min(xs0)) / 2, (max(ys0) + min(ys0)) / 2, min(zs0))
    # a dobradiça no espaço do baú (glTF): x, altura, profundidade
    pivot = (round(hinge_b[0] - shift[0], 5), round(hinge_b[2] - shift[2], 5), round(-hinge_b[1] - shift[1], 5))
    pos, nor, uv, idx = mesh_data(body, shift)
    lpos, lnor, luv, lidx = mesh_data(lid, shift, pivot)
    # tamanho da peça fechada: corpo + tampa na posição de repouso
    ap = [pos[i::3] for i in range(3)]
    al = [[v + pivot[k] for v in lpos[k::3]] for k in range(3)]
    size = tuple(round(max(ap[k] + al[k]) - min(ap[k] + al[k]), 4) for k in range(3))
    assert 0.8 < size[0] < 1.05 and 0.55 < size[1] < 1.05 and 0.8 < size[2] < 1.05, f'tamanho inesperado: {size}'
    assert -0.5 < pivot[2] < -0.3 and 0.5 < pivot[1] < 0.7, f'dobradiça fora do lugar: {pivot}'
    json.dump({'size': list(size), 'pos': pos, 'nrm': nor, 'uv': uv, 'idx': idx}, open(OUT_JSON, 'w'), separators=(',', ':'))
    json.dump({'size': list(size), 'pivot': list(pivot), 'pos': lpos, 'nrm': lnor, 'uv': luv, 'idx': lidx}, open(OUT_LID, 'w'), separators=(',', ':'))
    print(OUT_JSON, len(idx) // 3, 'triângulos |', OUT_LID, len(lidx) // 3, 'triângulos, dobradiça', pivot, '| tamanho fechado', size)
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
    print(OUT_ATLAS, (ATLAS, ATLAS))


if __name__ == '__main__':
    sys.exit(main())
