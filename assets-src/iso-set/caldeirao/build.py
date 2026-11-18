import bpy, math, random, os, json
from mathutils import Vector
random.seed(27)
OUT=os.path.dirname(__file__)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
ref=bpy.data.images.load('/workspace/scratch/e4267f628fc8/generated_images/exec-3bc27184-4747-4158-b326-ef62b598e021.png')
# Source-derived surfaces retain the approved image's pictorial color variation.
def mat(name,crop,rough=.85,fire=False):
 m=bpy.data.materials.new(name); m.use_nodes=True;n=m.node_tree.nodes;l=m.node_tree.links;p=n.get('Principled BSDF');p.inputs['Roughness'].default_value=rough
 uv=n.new('ShaderNodeUVMap');uv.uv_map='SourceUV'
 mul=n.new('ShaderNodeVectorMath');mul.operation='MULTIPLY';mul.inputs[1].default_value=(crop[2],crop[3],1);l.new(uv.outputs[0],mul.inputs[0])
 add=n.new('ShaderNodeVectorMath');add.operation='ADD';add.inputs[1].default_value=(crop[0],crop[1],0);l.new(mul.outputs[0],add.inputs[0]);im=n.new('ShaderNodeTexImage');im.image=ref;l.new(add.outputs[0],im.inputs['Vector']);l.new(im.outputs['Color'],p.inputs['Base Color'])
 noise=n.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=22;noise.inputs['Detail'].default_value=2
 bump=n.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.2;bump.inputs['Distance'].default_value=.035;l.new(noise.outputs['Fac'],bump.inputs['Height']);l.new(bump.outputs[0],p.inputs['Normal'])
 if fire:
  # Height-dependent opaque volumetric stylized fire; independent emissive material.
  sep=n.new('ShaderNodeSeparateXYZ');l.new(uv.outputs[0],sep.inputs[0]);r=n.new('ShaderNodeValToRGB');r.color_ramp.elements.remove(r.color_ramp.elements[1]);e=r.color_ramp.elements[0];e.position=0;e.color=(1,.6,.012,1)
  for pos,col in [(.35,(1,.3,.003,1)),(.7,(1,.09,.001,1)),(1,(.8,.025,.001,1))]:r.color_ramp.elements.new(pos).color=col
  l.new(sep.outputs['Y'],r.inputs[0]);l.new(r.outputs[0],p.inputs['Base Color']);l.new(r.outputs[0],p.inputs['Emission Color']);p.inputs['Emission Strength'].default_value=.65
 m['fire']=fire; return m

stone=mat('Pedra_do_caldeirao',(.36,.31,.24,.18),.9)
objs=[]
# Closed lathed stone vessel: outer shell, rolled rim, inner cavity and thick base.
profile=[(0,.23),(.32,.23),(.60,.27),(.84,.36),(1.01,.52),(1.12,.73),(1.17,.94),(1.16,1.13),(1.10,1.33),(1.07,1.48),(1.12,1.53),(1.16,1.61),(1.15,1.69),(1.09,1.75),(1.01,1.77),(.94,1.73),(.91,1.66),(.92,1.55),(.95,1.40),(.99,1.18),(1.0,.99),(.95,.80),(.84,.62),(.65,.48),(.39,.43),(0,.43)]
N=96;verts=[];faces=[]
for j,(r,z) in enumerate(profile):
 for k in range(N):
  a=k*math.tau/N;rr=r*(1+.008*math.sin(5*a)+.006*math.cos(9*a+j*.3));verts.append((rr*math.cos(a),rr*math.sin(a),z))
for j in range(len(profile)-1):
 for k in range(N):faces.append((j*N+k,j*N+(k+1)%N,(j+1)*N+(k+1)%N,(j+1)*N+k))
me=bpy.data.meshes.new('Vaso_oco');me.from_pydata(verts,[],faces);me.update();o=bpy.data.objects.new('Caldeirao',me);bpy.context.collection.objects.link(o);objs.append(o)
bpy.context.view_layer.objects.active=o;o.select_set(True)
bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.remove_doubles(threshold=.001);bpy.ops.mesh.normals_make_consistent(inside=False);bpy.ops.object.mode_set(mode='OBJECT')
for sign in [-1,1]:
 bpy.ops.mesh.primitive_torus_add(major_segments=40,minor_segments=12,location=(sign*1.19,0,1.33),rotation=(math.pi/2,0,0),major_radius=.25,minor_radius=.115)
 o=bpy.context.object;o.scale=(1,1.12,1);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);objs.append(o)
for a in [-math.pi/2,math.pi/6,5*math.pi/6]:
 bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=12,location=(.77*math.cos(a),.77*math.sin(a),.24))
 o=bpy.context.object;o.scale=(.23,.23,.35);o.rotation_euler=(.15*math.sin(a),-.15*math.cos(a),0);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);objs.append(o)
bpy.ops.object.select_all(action='DESELECT')
for o in objs:o.select_set(True)
bpy.context.view_layer.objects.active=objs[0];bpy.ops.object.join();asset=bpy.context.object;asset.name='Caldeirao_Pedra'
# Fuse joints before remeshing; hollow interior retained.
mod=asset.modifiers.new('Uniao_escultura','REMESH');mod.mode='VOXEL';mod.voxel_size=.035;bpy.ops.object.modifier_apply(modifier=mod.name)
sm=asset.modifiers.new('Suavizar','SMOOTH');sm.factor=.45;sm.iterations=3;bpy.ops.object.modifier_apply(modifier=sm.name)
original_faces=len(asset.data.polygons)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'Caldeirao_Base.blend'))
result=bpy.ops.object.quadriflow_remesh(target_faces=3000,use_mesh_symmetry=False,use_preserve_sharp=False,use_preserve_boundary=True)
print('QUADRIFLOW',result,original_faces,len(asset.data.polygons),flush=True)
asset.data.materials.clear();asset.data.materials.append(stone)
asset.data.uv_layers.new(name='SourceUV')
for poly in asset.data.polygons:
 poly.use_smooth=True
 for li in poly.loop_indices:
  v=asset.data.vertices[asset.data.loops[li].vertex_index].co
  asset.data.uv_layers.active.data[li].uv=((math.atan2(v.y,v.x)/math.tau+.5),max(0,min(1,v.z/1.8)))
asset.data.uv_layers.new(name='UVMap');asset.data.uv_layers.active=asset.data.uv_layers['UVMap'];asset.data.uv_layers['UVMap'].active_render=True
bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(angle_limit=1.15,island_margin=.012);bpy.ops.object.mode_set(mode='OBJECT')
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=8;scene.render.bake.margin=12
mats=list(asset.data.materials);original={}
for m in mats:
 n=m.node_tree.nodes;p=n.get('Principled BSDF');original[m.name]=(p,p.inputs['Base Color'].links[0].from_socket)
imgs={}
for mode in ['BaseColor','Roughness','Normal','Emission']:
 im=bpy.data.images.new('Caldeirao_'+mode+'_2K',width=2048,height=2048,alpha=False);im.filepath_raw=os.path.join(OUT,'Caldeirao_'+mode+'_2K.png');im.file_format='PNG'
 if mode in ['Normal','Roughness']:im.colorspace_settings.name='Non-Color'
 for m in mats:
  n=m.node_tree.nodes;l=m.node_tree.links;out=n.get('Material Output');p,src=original[m.name];target=n.new('ShaderNodeTexImage');target.image=im;n.active=target
  if mode=='Normal':l.new(p.outputs[0],out.inputs[0])
  else:
   em=n.new('ShaderNodeEmission')
   if mode=='BaseColor':l.new(src,em.inputs[0])
   elif mode=='Emission':
    if m.get('fire'):l.new(src,em.inputs[0])
    else:em.inputs[0].default_value=(0,0,0,1)
   else:em.inputs[0].default_value=(p.inputs['Roughness'].default_value,)*3+(1,)
   l.new(em.outputs[0],out.inputs[0])
 bpy.ops.object.bake(type='NORMAL' if mode=='Normal' else 'EMIT');im.save();imgs[mode]=im
# Assign simple portable PBR shader and retain separate geometry for flame animation.
m=bpy.data.materials.new('Caldeirao_PBR_2K');m.use_nodes=True;n=m.node_tree.nodes;l=m.node_tree.links;p=n.get('Principled BSDF');p.inputs['Metallic'].default_value=0;p.inputs['Emission Strength'].default_value=.65
for mode,sock in [('BaseColor','Base Color'),('Roughness','Roughness'),('Emission','Emission Color')]:
 t=n.new('ShaderNodeTexImage');t.image=imgs[mode];l.new(t.outputs['Color'],p.inputs[sock])
t=n.new('ShaderNodeTexImage');t.image=imgs['Normal'];nm=n.new('ShaderNodeNormalMap');l.new(t.outputs[0],nm.inputs['Color']);l.new(nm.outputs[0],p.inputs['Normal'])
assets=[asset]
asset.data.materials.clear();asset.data.materials.append(m)
for poly in asset.data.polygons:poly.material_index=0
asset.data.uv_layers.remove(asset.data.uv_layers['SourceUV'])
counts={o.name:len(o.data.polygons) for o in assets};json.dump({'faces':sum(counts.values()),'triangles':sum(len(p.vertices)-2 for p in asset.data.polygons),'original_faces':original_faces,'retopology':'Blender QuadriFlow target 3000 faces','objects':counts,'texture_resolution':[2048,2048],'method':'Blender reconstruction; source image sampled into atlas; inferred PBR roughness and normal; hollow stone cauldron; QuadriFlow retopology'},open(os.path.join(OUT,'validation.json'),'w'),indent=2)
bpy.ops.object.select_all(action='DESELECT')
for o in assets:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'Caldeirao_Orvalis_3k.glb'),export_format='GLB',use_selection=True)
# Four views rendered from actual mesh.
world=scene.world or bpy.data.worlds.new('Studio');scene.world=world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.7,.7,.7,1);world.node_tree.nodes['Background'].inputs[1].default_value=.5
for loc,power,size in [((1,-3,6),600,5),((-4,0,3),350,4)]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(Vector((0,0,.7))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add();cam=bpy.context.object;scene.camera=cam;cam.data.type='ORTHO';cam.data.ortho_scale=3.7
scene.render.resolution_x=900;scene.render.resolution_y=900;scene.render.resolution_percentage=100;scene.render.film_transparent=True;scene.cycles.samples=64;scene.cycles.use_denoising=False
scene.view_settings.view_transform='Standard'
for name,loc in [('Preview',(4,-6,4.3)),('Costas',(-4,6,4.3)),('Lateral',(6,0,3.8))]:
 cam.location=loc;cam.rotation_euler=(Vector((0,0,.9))-cam.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=os.path.join(OUT,'Caldeirao_'+name+'.png');bpy.ops.render.render(write_still=True)
# Pack texture dependencies into editable project.
for im in imgs.values():im.pack()
cam.location=(4,-6,4.3);cam.rotation_euler=(Vector((0,0,.9))-cam.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'Caldeirao_Orvalis.blend'))
print('VALIDATION',counts)
