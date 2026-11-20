#!/usr/bin/env python3
"""Adaga de Rocha do Titã (ADR 0071): da cena Blender do dono do produto para o GLB leve que o jogo carrega.

Entrada: `Adaga_de_Rocha_Rig.blend` (3 peças sob o pivô CTRL_Adaga = palma da mão; ponta +Z no Blender, +Y no glTF) e o BaseColor 4K.
Saída: GLB só com a malha (~6 mil triângulos) e o BaseColor reduzido em WebP (o jogo usa material sem luzes de cena: normal/ORM não entram).
Requer `pip install bpy` e Pillow. Uso:
  python3 scripts/export-titan-adaga.py --blend Adaga_de_Rocha_Rig.blend --base Adaga_BaseColor_4K.png [--size 1024] [--out src/assets/titan-adaga-rocha.glb]
"""
import argparse, os, tempfile
from PIL import Image
import bpy

ap = argparse.ArgumentParser()
ap.add_argument('--blend', required=True); ap.add_argument('--base', required=True)
ap.add_argument('--size', type=int, default=1024); ap.add_argument('--out', default='src/assets/titan-adaga-rocha.glb')
a = ap.parse_args()

tmp = os.path.join(tempfile.mkdtemp(), 'base.png')
Image.open(a.base).convert('RGB').resize((a.size, a.size), Image.LANCZOS).save(tmp)
bpy.ops.wm.open_mainfile(filepath=os.path.abspath(a.blend))
for o in list(bpy.data.objects):
    if o.type in ('CAMERA', 'LIGHT'): bpy.data.objects.remove(o)
mat = bpy.data.materials.new('Adaga'); mat.use_nodes = True
nt = mat.node_tree; bsdf = nt.nodes['Principled BSDF']
img = nt.nodes.new('ShaderNodeTexImage'); img.image = bpy.data.images.load(tmp); img.image.colorspace_settings.name = 'sRGB'
nt.links.new(img.outputs['Color'], bsdf.inputs['Base Color'])
bsdf.inputs['Roughness'].default_value = 0.85; bsdf.inputs['Metallic'].default_value = 0.0
for o in bpy.data.objects:
    if o.type == 'MESH': o.data.materials.clear(); o.data.materials.append(mat)
bpy.ops.export_scene.gltf(filepath=os.path.abspath(a.out), export_format='GLB', export_image_format='WEBP', export_yup=True, export_apply=True, export_cameras=False, export_lights=False)
print('GLB:', os.path.getsize(a.out), 'bytes')
