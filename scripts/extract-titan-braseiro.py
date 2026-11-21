"""Converte o Braseiro de Rocha de Titã (GLBs de jogo 1K do pacote de arte, ADR 0092) no que o motor usa, com o Blender (`pip install bpy`).

Entradas : assets-src/titan/braseiro/Braseiro_de_Rocha_{Apagado,Aceso}_Jogo_1K.glb  (basalto e carvão, 1.068 triângulos, textura de cor-base de 1K; o aceso soma 126 triângulos de brasas
           emissivas em três cores lisas; 0,934 × 0,934 m na base e 0,774 m de altura; pivô no centro da base)
Saídas   : src/assets/titan-braseiro.json e src/assets/titan-braseiro-aceso.json   geometria única de cada modelo: `pos`, `nrm`, `uv` (origem no canto superior esquerdo, como no glTF), `idx`, `size`.
           src/assets/titan-braseiro-atlas.webp   256 × 320 px, SEM perdas: as 256 linhas de cima trazem a cor-base do basalto (reduzida de 1K); as 64 de baixo, três amostras lisas
           (crosta rubra, núcleo quente e âmbar aceso) para onde apontam os UVs das brasas. O jogo usa luz própria (sem normal nem ORM); o aceso ganha brilho fixo no renderer.
Não decima: os dois modelos já são leves. O script confere o tamanho. Uso: python3 -I scripts/extract-titan-braseiro.py
"""
import json
import os
import sys
import tempfile

import bpy
from PIL import Image

DIR = 'assets-src/titan/braseiro/'
SRC = {'': DIR + 'Braseiro_de_Rocha_Apagado_Jogo_1K.glb', '-aceso': DIR + 'Braseiro_de_Rocha_Aceso_Jogo_1K.glb'}
ATLAS_W, ATLAS_H, BASE = 256, 320, 256
# cores lisas das brasas (as emissivas do pacote, clareadas para ler bem com a luz própria do jogo)
SWATCH = {'Crosta rubra': (110, 24, 10), 'Núcleo quente': (255, 176, 72), 'Âmbar aceso': (255, 84, 22)}
SWATCH_ORDER = list(SWATCH)


def convert(suffix: str, src: str) -> Image.Image:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=src)
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    assert meshes, 'sem malhas'
    bpy.ops.object.select_all(action='DESELECT')
    for o in meshes:
        o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    me = ob.data
    me.calc_loop_triangles()
    uvl = me.uv_layers.active.data
    nrm = me.corner_normals
    names = [m.name if m else '' for m in me.materials]
    pos, nor, uv, idx = [], [], [], []
    seen = {}
    for t in me.loop_triangles:
        mat = names[t.material_index]
        for li in t.loops:
            vi = me.loops[li].vertex_index
            co = me.vertices[vi].co
            n = nrm[li].vector
            u = uvl[li].uv
            p = (round(co.x, 5), round(co.z, 5), round(-co.y, 5))  # Blender (x, y, z) -> glTF (x, z, -y)
            nn = (round(n.x, 4), round(n.z, 4), round(-n.y, 4))
            if mat in SWATCH:  # brasas: o centro da amostra lisa correspondente
                k = SWATCH_ORDER.index(mat)
                uu, vv = (k * 2 + 1) / 6, (BASE + (ATLAS_H - BASE) / 2) / ATLAS_H
            else:
                uu, vv = u.x, (1 - u.y) * BASE / ATLAS_H
            key = (p, nn, round(uu, 5), round(vv, 5))
            if key not in seen:
                seen[key] = len(pos) // 3
                pos.extend(p); nor.extend(nn); uv.extend((round(uu, 5), round(vv, 5)))
            idx.append(seen[key])
    xs, ys, zs = pos[0::3], pos[1::3], pos[2::3]
    size = (round(max(xs) - min(xs), 4), round(max(ys) - min(ys), 4), round(max(zs) - min(zs), 4))
    assert 0.9 < size[0] < 0.97 and 0.9 < size[2] < 0.97 and 0.75 < size[1] < 0.8, f'tamanho inesperado: {size}'
    assert abs(min(ys)) < 1e-3 and abs(max(xs) + min(xs)) < 0.01 and abs(max(zs) + min(zs)) < 0.01, 'base em y = 0 e centrado na célula'
    out = f'src/assets/titan-braseiro{suffix}.json'
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
        if base is None:
            base = im
        else:
            assert im.size == base.size  # a textura é a mesma nos dois
    atlas = Image.new('RGB', (ATLAS_W, ATLAS_H), (0, 0, 0))
    atlas.paste(base.resize((ATLAS_W, BASE), Image.LANCZOS), (0, 0))
    for k, name in enumerate(SWATCH_ORDER):
        atlas.paste(Image.new('RGB', (ATLAS_W // 3 + 1, ATLAS_H - BASE), SWATCH[name]), (k * ATLAS_W // 3, BASE))
    atlas.save('src/assets/titan-braseiro-atlas.webp', 'WEBP', lossless=True, quality=100, method=6)
    print('src/assets/titan-braseiro-atlas.webp', (ATLAS_W, ATLAS_H))


if __name__ == '__main__':
    sys.exit(main())
