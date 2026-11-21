#!/usr/bin/env python3
"""Picareta de Rocha do Titã (ADR 0078): do GLB do dono do produto (3,1 MB, com rig, clipe e 3 texturas 1K) para o GLB leve que o jogo carrega na mão.

Entrada: `Picareta_de_Rocha.glb` (pivô = centro da empunhadura; Y para cima no glTF; osso `Grip` com peso 1; clipe `Minerar`). Saída: GLB só com a malha (4.632 triângulos, sem osso nem clipe: o golpe é
procedural, `render/heldPose.ts`) e só o BaseColor, reduzido para `--size` px em WebP (o jogo usa material sem luzes de cena: normal e ORM não entram). Requer `pip install bpy` e Pillow. Uso:
  python3 scripts/export-titan-picareta.py --glb Picareta_de_Rocha.glb [--size 1024] [--out src/assets/titan-picareta-rocha.glb]
"""
import argparse, io, json, os, struct, tempfile
from PIL import Image
import bpy

ap = argparse.ArgumentParser()
ap.add_argument('--glb', required=True); ap.add_argument('--size', type=int, default=1024); ap.add_argument('--out', default='src/assets/titan-picareta-rocha.glb')
a = ap.parse_args()

raw = open(a.glb, 'rb').read()
jl = struct.unpack('<I', raw[12:16])[0]; j = json.loads(raw[20:20 + jl])
binoff = 20 + jl + 8
img = next(i for i in j['images'] if 'BaseColor' in i.get('name', ''))
bv = j['bufferViews'][img['bufferView']]
base = Image.open(io.BytesIO(raw[binoff + bv.get('byteOffset', 0): binoff + bv.get('byteOffset', 0) + bv['byteLength']])).convert('RGB').resize((a.size, a.size), Image.LANCZOS)
tmp = os.path.join(tempfile.mkdtemp(), 'base.png'); base.save(tmp)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.abspath(a.glb))
for o in list(bpy.data.objects):
    if o.type == 'MESH':
        o.parent = None; o.modifiers.clear(); o.vertex_groups.clear()
for o in list(bpy.data.objects):
    if o.type != 'MESH': bpy.data.objects.remove(o)
for act in list(bpy.data.actions): bpy.data.actions.remove(act)
mat = bpy.data.materials.new('Picareta'); mat.use_nodes = True
nt = mat.node_tree; bsdf = nt.nodes['Principled BSDF']
tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = bpy.data.images.load(tmp); tex.image.colorspace_settings.name = 'sRGB'
nt.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
bsdf.inputs['Roughness'].default_value = 0.85; bsdf.inputs['Metallic'].default_value = 0.0
for o in bpy.data.objects:
    o.data.materials.clear(); o.data.materials.append(mat)
bpy.ops.export_scene.gltf(filepath=os.path.abspath(a.out), export_format='GLB', export_image_format='WEBP', export_yup=True, export_apply=True, export_cameras=False, export_lights=False, export_animations=False, export_skins=False)
print('GLB:', os.path.getsize(a.out), 'bytes')
