"""Converte o Balde de Cobre de Titã (GLBs de jogo 1K do pacote de arte, ADR 0095) na malha que o jogo desenha na mão, com o Blender (`pip install bpy`).

Entradas : assets-src/titan/balde/Balde_de_Cobre_{Vazio,Cheio}_Jogo_1K.glb  (corpo e alça de cobre com a textura PBR de 1K; o cheio soma um disco de líquido de 24 triângulos, cor lisa)
Saídas   : src/assets/titan-balde.json e src/assets/titan-balde-cheio.json   geometria única de cada modelo: `pos`, `nrm`, `uv` (origem no canto superior esquerdo, como no glTF), `idx`, `size`.
           O cobre (corpo + alça) é reduzido a `TARGET_TRIS` triângulos pelo decimador do Blender (colapso de arestas, UVs mantidas). **Pivô na mão**: no topo da alça, centrado em x e z, com o balde
           pendendo para −y (a mão segura a alça por cima).
           src/assets/titan-balde-atlas.webp   256 × 320 px, SEM perdas: as 256 linhas de cima trazem a cor-base do cobre (reduzida de 1K); as 64 de baixo, uma amostra lisa do líquido escuro do lago.
Uso: python3 -I scripts/extract-titan-balde.py
"""
import json
import os
import sys
import tempfile

import bpy
from PIL import Image

DIR = 'assets-src/titan/balde/'
SRC = {'': DIR + 'Balde_de_Cobre_Vazio_Jogo_1K.glb', '-cheio': DIR + 'Balde_de_Cobre_Cheio_Jogo_1K.glb'}
ATLAS_W, ATLAS_H, BASE = 256, 320, 256
TARGET_TRIS = 1400
LIQUID = (44, 32, 78)  # o líquido do lago, clareado para ler bem com a luz própria do jogo


def convert(suffix: str, src: str) -> Image.Image:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=src)
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    copper = [o for o in meshes if 'cobre' in o.name.lower()]
    liquid = [o for o in meshes if 'lago' in o.name.lower() or 'conteudo' in o.name.lower()]
    assert copper, 'sem malha de cobre'
    for o in meshes:
        mw = o.matrix_world.copy(); o.parent = None; o.matrix_world = mw
    bpy.ops.object.select_all(action='DESELECT')
    for o in copper:
        o.select_set(True)
    bpy.context.view_layer.objects.active = copper[0]
    bpy.ops.object.join()
    cu = bpy.context.view_layer.objects.active
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    tris0 = sum(len(p.vertices) - 2 for p in cu.data.polygons)
    mod = cu.modifiers.new('decimar', 'DECIMATE')
    mod.decimate_type = 'COLLAPSE'
    mod.ratio = min(1.0, TARGET_TRIS / tris0)
    bpy.ops.object.modifier_apply(modifier=mod.name)
    liq = None
    if liquid:
        bpy.ops.object.select_all(action='DESELECT')
        for o in liquid:
            o.select_set(True)
        bpy.context.view_layer.objects.active = liquid[0]
        bpy.ops.object.join()
        liq = bpy.context.view_layer.objects.active
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    vs = [v.co for v in cu.data.vertices]
    cx = (max(v.x for v in vs) + min(v.x for v in vs)) / 2
    cy = (max(v.y for v in vs) + min(v.y for v in vs)) / 2
    top = max(v.z for v in vs)  # topo da alça (Blender z = altura)
    pos, nor, uv, idx = [], [], [], []
    seen = {}
    for ob, swatch in ((cu, False), (liq, True)):
        if ob is None:
            continue
        me = ob.data
        me.calc_loop_triangles()
        uvl = me.uv_layers.active.data if me.uv_layers.active else None
        nrm = me.corner_normals
        for t in me.loop_triangles:
            for li in t.loops:
                co = me.vertices[me.loops[li].vertex_index].co
                n = nrm[li].vector
                p = (round(co.x - cx, 5), round(co.z - top, 5), round(-(co.y - cy), 5))  # Blender (x, y, z) -> glTF (x, z, −y), pivô no topo da alça
                nn = (round(n.x, 4), round(n.z, 4), round(-n.y, 4))
                if swatch:
                    uu, vv = 0.5, (BASE + (ATLAS_H - BASE) / 2) / ATLAS_H
                else:
                    u = uvl[li].uv
                    uu, vv = u.x, (1 - u.y) * BASE / ATLAS_H
                key = (p, nn, round(uu, 5), round(vv, 5))
                if key not in seen:
                    seen[key] = len(pos) // 3
                    pos.extend(p); nor.extend(nn); uv.extend((round(uu, 5), round(vv, 5)))
                idx.append(seen[key])
    xs, ys, zs = pos[0::3], pos[1::3], pos[2::3]
    size = (round(max(xs) - min(xs), 4), round(max(ys) - min(ys), 4), round(max(zs) - min(zs), 4))
    assert 0.35 < size[0] < 0.6 and 0.3 < size[1] < 0.7 and 0.3 < size[2] < 0.6, f'tamanho inesperado: {size}'
    assert abs(max(ys)) < 1e-3, 'o topo da alça deve ficar em y = 0'
    out = f'src/assets/titan-balde{suffix}.json'
    json.dump({'size': list(size), 'pos': pos, 'nrm': nor, 'uv': uv, 'idx': idx}, open(out, 'w'), separators=(',', ':'))
    print(out, len(idx) // 3, 'triângulos', len(pos) // 3, 'vértices', size)
    img = None
    for m in bpy.data.materials:
        if m.use_nodes:
            for n in m.node_tree.nodes:
                if n.type == 'BSDF_PRINCIPLED' and n.inputs['Base Color'].links:
                    s = n.inputs['Base Color'].links[0].from_node
                    if s.type == 'TEX_IMAGE':
                        img = s.image
    assert img is not None, 'sem textura de cor-base'
    tmp = os.path.join(tempfile.mkdtemp(), 'base.png')
    img.filepath_raw = tmp
    img.file_format = 'PNG'
    img.save()
    return Image.open(tmp).convert('RGB')


def main() -> None:
    base = None
    for suffix, src in SRC.items():
        im = convert(suffix, src)
        base = base or im
    atlas = Image.new('RGB', (ATLAS_W, ATLAS_H), LIQUID)
    atlas.paste(base.resize((ATLAS_W, BASE), Image.LANCZOS), (0, 0))
    atlas.save('src/assets/titan-balde-atlas.webp', 'WEBP', lossless=True, quality=100, method=6)
    print('src/assets/titan-balde-atlas.webp', (ATLAS_W, ATLAS_H))


if __name__ == '__main__':
    sys.exit(main())
