"""Gera os dados de intercâmbio e a planta de REGION_V6."""
from pathlib import Path
from collections import deque
import json

import numpy as np
from scipy.ndimage import gaussian_filter, distance_transform_edt, label
from PIL import Image
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.colors import to_rgb
from matplotlib.patches import Rectangle
from matplotlib import patheffects

OUT = Path(__file__).resolve().parent
SEED, SEA, LOW, HIGH = 128064, 63, -64, 319
Z, X = np.mgrid[-64:64, -64:64]
rng = np.random.default_rng(SEED)


def noise(blur):
    a = gaussian_filter(rng.normal(size=X.shape), blur, mode='reflect')
    return np.clip(a / a.std(), -2.5, 2.5)


def mound(x, z, sx, sz):
    return np.exp(-.5 * (((X-x)/sx)**2 + ((Z-z)/sz)**2))


def box(r):
    x0,z0,x1,z1 = r
    return (X>=x0)&(X<=x1)&(Z>=z0)&(Z<=z1)


def fade(distance, radius):
    t = np.clip(distance/radius,0,1)
    return 1-t*t*(3-2*t)


wide, fine, grain = noise(5), noise(2), noise(.75)
theta = np.arctan2((Z+3)/53, (X+3)/53)
radius = .96 + .075*np.sin(3*theta+.7) + .045*np.cos(5*theta-1.2)
shore = (radius - np.hypot((X+3)/54,(Z+3)/54))*51 + .9*wide+.35*fine + 10*mound(30,34,16,14)
land = shore>=0
coast_height = 64 + np.minimum(6, np.maximum(0,shore)*.85)
mountains = 46*mound(-24,-28,13,12)+28*mound(16,-30,14,11)+14*mound(-32,8,15,17)
height = np.where(land,coast_height+(mountains+1.4*wide+.9*fine)*np.clip(shore/17,0,1),
                  63+np.maximum(-29,shore*1.36))
village = (-15,-1,29,35)
vx0,vz0,vx1,vz1=village
pad = fade(np.maximum.reduce([vx0-2-X,X-vx1-2,vz0-2-Z,Z-vz1-2,np.zeros_like(X)]),8)
assert np.all(land[box(village)])
height = height*(1-pad)+70*pad

# Uma trilha segue da entrada sul à praia. A grade central tem uma unidade
# de diferença por passo no máximo e termina antes da primeira célula molhada.
beach_z = max(z for z in range(36,61) if land[z+64,7+64] and np.all(land[36+64:z+65,7+64]))
route = np.zeros_like(land)
route[35+64:beach_z+65,7+64]=True
dist, indices = distance_transform_edt(~route, return_indices=True)
w = fade(np.maximum(0,dist-1),3.0) * land * (Z>=35)
approach_y = np.maximum(64, 70 - np.maximum(0, indices[0]-64-35)//2)
approach_y[beach_z+64:, :] = 64
height = height*(1-w)+approach_y*w
height = np.where(land,np.maximum(64,height),np.minimum(62,height))
height = np.rint(height).astype(np.int16)

# IDs da máscara de superfície. Elementos verticais ficam no JSON.
OCEAN,SAND,GRASS,FOREST,STONE,PATH,CROP,PASTURE,YARD = range(9)
s = np.full_like(height,GRASS,dtype=np.uint8)
s[(shore<=5.9) & land] = SAND
s[(shore>6) & land & (wide*.75+fine*.28+1.02*mound(-20,-15,26,24)>.22) & (height<=93)] = FOREST
s[land & (height>=94)] = STONE
s[~land] = OCEAN
s[box(village)]=GRASS
inside_path = box((5,-1,9,35)) | box((-14,15,28,17))
s[inside_path | ((dist<=1)&land&(Z>35)&(Z<beach_z-1))] = PATH
for r in [(-12,22,-4,30),(-1,22,3,30),(12,5,18,11),(21,5,27,11)]:
    s[box(r)] = YARD

gates=[{'nome':'Portão norte','x_incl':[5,9],'z':-1,'altura_livre':4},
       {'nome':'Portão da praia','x_incl':[5,9],'z':35,'altura_livre':4}]
perimeter = box(village) & ((X==vx0)|(X==vx1)|(Z==vz0)|(Z==vz1))
wall = perimeter & ~((X>=5)&(X<=9)&((Z==vz0)|(Z==vz1)))

plots=[{'nome':f'Talhão {i+1}','limites_x0_z0_x1_z1':r}
       for i,r in enumerate([(-12,3,-7,12),(-5,3,0,12),(12,18,17,23)])]
for p in plots:
    r=p['limites_x0_z0_x1_z1']
    s[box(r)] = CROP
pens=[{'nome':'Cercado A','limites_x0_z0_x1_z1':(12,25,18,32),'porteira_xz':[15,25]},
      {'nome':'Cercado B','limites_x0_z0_x1_z1':(21,20,27,32),'porteira_xz':[24,20]}]
fences=[]
for p in pens:
    r=p['limites_x0_z0_x1_z1']
    s[box(r)]=PASTURE
    x0,z0,x1,z1=r
    border=box(r)&((X==x0)|(X==x1)|(Z==z0)|(Z==z1))
    gx,gz=p['porteira_xz']
    border &= ~((X==gx)&(Z==gz))
    fences.extend(np.column_stack((X[border],Z[border])).tolist())
houses = [{'nome':name,'limites_x0_z0_x1_z1':r} for name,r in [
    ('Casa 1',(-12,22,-4,30)),('Casa 2',(-1,22,3,30)),
    ('Casa 3',(12,5,18,11)),('Celeiro',(21,5,27,11))]]

# Árvores ocupam apenas a máscara florestal e guardam distância entre troncos.
trees=[]
selection=np.argwhere(s==FOREST)
for iz,ix in selection[rng.permutation(len(selection))]:
    x,z=int(ix)-64,int(iz)-64
    if all((x-a)**2+(z-b)**2>=19 for a,b in trees) and rng.random()<.71:
        trees.append([x,z])

materials=['oceano','areia','grama','floresta','pedra','caminho','plantio','pasto','base_edificavel']
spec = {
    'schema':'orvalis-region-v6-heightmap-v1','region':'REGION_V6','seed':SEED,
    'limites_inclusivos':{'x':[-64,63],'z':[-64,63],'y':[LOW,HIGH]},
    'limites_geometricos_xz':[-64,64],'chunk_size':16,'chunks_por_eixo':8,
    'png':{'arquivo':'REGION_V6_heightmap_128x128_16bit.png','origem_xz':[-64,-64],
           'colunas':'+X','linhas':'+Z','interpretacao':'Y do voxel sólido mais alto',
           'decode':'round(pixel * 383 / 65535) - 64'},
    'rocha_mae_y':LOW,'mar_y':SEA,
    'limite_invisivel':{'plano_x':[-64,64],'plano_z':[-64,64],'submerso_na_borda':True,
                         'implementacao':'configuração do motor'},
    'superficies':{'arquivo':'REGION_V6_superficies.png','formato':'PNG escala de cinza, valores brutos',
                   'ids':dict(enumerate(materials))},
    'aldeia':{'limites_x0_z0_x1_z1':village,'solo_y':70,'muro':{
        'material':'pedra','y_incl':[71,74],'celulas_xz':np.column_stack((X[wall],Z[wall])).tolist()
    },'portoes':gates,'talhoes':plots,'cercados':pens,
    'cercas':{'material':'madeira','y_base':71,'celulas_xz':fences},'bases_edificaveis':houses},
    'arvores_xz':trees,'trilha_praia_xz':[[7,z] for z in range(35,beach_z+1)]
}

pixels=np.rint((height.astype(float)-LOW)*65535/(HIGH-LOW)).astype(np.uint16)
png_path=OUT/spec['png']['arquivo']
Image.fromarray(pixels).save(png_path)
Image.fromarray(s).save(OUT/spec['superficies']['arquivo'])
(OUT/'REGION_V6_implantacao.json').write_text(json.dumps(spec,ensure_ascii=False,indent=2)+'\n')

# Verificação dos valores efetivamente gravados e da navegação proposta.
assert png_path.read_bytes()[24:26]==bytes([16,0])
read=np.asarray(Image.open(png_path))
assert read.shape==(128,128) and np.array_equal(np.rint(read*383./65535)-64,height)
assert np.array_equal(np.asarray(Image.open(OUT/spec['superficies']['arquivo'])),s)
assert np.all(height[box(village)]==70)
assert height.min()>LOW and height.max()<=HIGH
assert np.all(s[[0,-1],:]==OCEAN) and np.all(s[:,[0,-1]]==OCEAN)
edge_depth=min(int((SEA-height[e]).min()) for e in (
    (0,slice(None)),(-1,slice(None)),(slice(None),0),(slice(None),-1)))
_,n=label(land)
assert n==1
_,n=label(~land)
assert n==1
assert perimeter.sum()-wall.sum()==10
for p in plots:
    assert np.all(s[box(p['limites_x0_z0_x1_z1'])]==CROP)
fence_set={tuple(p) for p in fences}
blocked=wall.copy()
for x,z in fence_set:
    blocked[z+64,x+64]=True
for h in houses:
    blocked |= box(h['limites_x0_z0_x1_z1'])
def reachable(start):
    seen={start}
    queue=deque([start])
    while queue:
        x,z=queue.popleft()
        for a,b in ((x+1,z),(x-1,z),(x,z+1),(x,z-1)):
            if -64<=a<64 and -64<=b<64 and (a,b) not in seen:
                if land[b+64,a+64] and not blocked[b+64,a+64] and abs(int(height[b+64,a+64])-int(height[z+64,x+64]))<=1:
                    seen.add((a,b))
                    queue.append((a,b))
    return seen
seen=reachable((7,16))
assert (7,beach_z) in seen and s[beach_z+64,71]==SAND and (7,-2) in seen
for p in pens:
    gx,gz=p['porteira_xz']
    assert (gx,gz+1) in seen and (gx,gz) not in fence_set
for p in plots:
    x0,z0,x1,z1=p['limites_x0_z0_x1_z1']
    assert ((x0+x1)//2,(z0+z1)//2) in seen
assert all(abs(int(height[z+64,71])-int(height[z+65,71]))<=1 for z in range(35,beach_z))
print('Superfície Y',int(height.min()),int(height.max()),'borda submersa',edge_depth,
      'árvores',len(trees),'células de muro',int(wall.sum()),'fim trilha',beach_z)

# Planta cartográfica derivada dos dados exportados.
palette=['#458b9d','#ead397','#a5bd76','#5b8453','#919592','#cbbb8d',
         '#bf9459','#c7cd8a','#d4baa1']
rgb=np.array([to_rgb(c) for c in palette])[s]
dz,dx=np.gradient(gaussian_filter(height.astype(float),1.1))
shading=np.clip(1+.068*(dx+dz)+.012*grain,.74,1.22)
rgb[land]*=shading[land,None]
water_mix=np.clip((SEA-height)/28,0,1)
deep=np.array(to_rgb('#225773'))
shallow=np.array(to_rgb('#81b6b5'))
rgb[~land]=((1-water_mix[...,None])*shallow+water_mix[...,None]*deep)[~land]
rgb=np.clip(rgb,0,1)
fig=plt.figure(figsize=(15.7,10.0),dpi=106,facecolor='#f3eee1')
ink,muted='#233a38','#4d665e'
fig.text(.046,.949,'ORVALIS  /  REGION_V6',fontsize=13,weight='bold',color=muted)
fig.text(.043,.876,'Aldeia da Costa',fontsize=47,fontfamily='DejaVu Serif',color=ink)
fig.text(.955,.914,'SEED 128064',ha='right',fontsize=14,fontfamily='monospace',color=ink)
fig.text(.955,.880,'128 × 128 blocos  ·  64 chunks',ha='right',fontsize=12,color=muted)
fig.add_artist(plt.Line2D([.046,.954],[.855,.855],lw=1,color='#b9bbad'))
fig.text(.046,.821,'TERRENO E LITORAL',fontsize=13,weight='bold',color=ink)
fig.text(.572,.821,'PLANTA DA ALDEIA',fontsize=13,weight='bold',color=ink)
ax=fig.add_axes([.046,.170,.463,.63])
bx=fig.add_axes([.572,.245,.382,.555])


def map_base(a):
    a.imshow(rgb,extent=(-64,64,64,-64),interpolation='nearest')
    a.set_aspect('equal')
    a.tick_params(length=0,pad=6,labelsize=9,colors=muted)
    for sp in a.spines.values():
        sp.set_color('#778981')


map_base(ax)
ax.set(xlim=(-64,64),ylim=(64,-64),
       xticks=range(-64,65,16),yticks=range(-64,65,16))
for axis in range(-48,64,16):
    ax.axhline(axis,color='#edf1df',alpha=.15,lw=.65)
    ax.axvline(axis,color='#edf1df',alpha=.15,lw=.65)
tx,tz=np.array(trees).T+.5
ax.scatter(tx,tz,s=6,c='#224e40',marker='^',linewidths=0,alpha=.8)
ax.add_patch(Rectangle((vx0,vz0),vx1-vx0+1,vz1-vz0+1,fill=False,edgecolor='#fff2cc',lw=1.5))
ax.annotate('N',xy=(-55,-49),xytext=(-55,-58),ha='center',va='center',color='#f9f5dc',
            fontweight='bold',arrowprops=dict(arrowstyle='<-',color='#f9f5dc',lw=1.4))
for x,z,t,color,outline in [(-18,-37,'ENCOSTAS DE PEDRA','#fff5df','#454e48'),
                            (-30,0,'FLORESTA','#f1f2d5','#3c5845'),
                            (7,54,'PRAIA SUL','#fff5df','#285660')]:
    label_text=ax.text(x,z,t,ha='center',va='center',color=color,fontsize=10,weight='bold')
    label_text.set_path_effects([patheffects.withStroke(linewidth=2.3,foreground=outline)])

map_base(bx)
bx.set(xlim=(-18,33),ylim=(42,-7),xticks=[-16,0,16,32],yticks=[0,16,32])
for iz,ix in np.argwhere(wall):
    bx.add_patch(Rectangle((ix-64,iz-64),1,1,facecolor='#525954',edgecolor='#7d8175',lw=.36))
for x,z in fences:
    bx.add_patch(Rectangle((x,z),1,1,facecolor='#8d7549',edgecolor='none'))
for p in plots:
    x0,z0,x1,z1=p['limites_x0_z0_x1_z1']
    for x in np.arange(x0+.6,x1+.8,1):
        bx.plot([x,x],[z0+.7,z1+.3],color='#79542f',lw=.65,alpha=.65)
for house in houses:
    x0,z0,x1,z1=house['limites_x0_z0_x1_z1']
    bx.add_patch(Rectangle((x0,z0),x1-x0+1,z1-z0+1,fill=False,
                           edgecolor='#875f45',lw=.9,linestyle=(0,(3,2))))
    bx.text((x0+x1+1)/2,(z0+z1+1)/2,house['nome'],ha='center',va='center',fontsize=8,color='#543f31')
for p in pens:
    x0,z0,x1,z1=p['limites_x0_z0_x1_z1']
    bx.text((x0+x1+1)/2,(z0+z1+1)/2,p['nome'].split()[-1],
            ha='center',va='center',color='#634c2f',fontsize=12,weight='bold')
for x,z,t in [(7.5,-4,'Portão norte'),(7.5,39,'À praia'),(-5,1.3,'Plantio'),(21.5,17.4,'Criação')]:
    bx.text(x,z,t,ha='center',va='center',fontsize=9,color=ink,weight='bold')

def key(x,y,color,title):
    fig.patches.append(Rectangle((x,y-.001),.012,.015,transform=fig.transFigure,facecolor=color,edgecolor='none'))
    fig.text(x+.019,y,title,fontsize=10,color=ink)
for i,(c,t) in enumerate([(palette[0],'Mar'),(palette[SAND],'Areia'),(palette[GRASS],'Campo'),
                            (palette[FOREST],'Floresta'),(palette[STONE],'Pedra')]):
    key(.046+i*.094,.122,c,t)
for i,(c,t) in enumerate([('#525954','Muro de pedra'),(palette[CROP],'Talhões'),(palette[PASTURE],'Cercados')]):
    key(.573+i*.126,.193,c,t)
fig.text(.573,.147,'3 talhões · 2 cercados · 2 portões',fontsize=12,color=ink,weight='bold')
fig.text(.573,.115,'Solo da aldeia em Y=70. Trilha sul até a praia.',fontsize=10,color=muted)
fig.add_artist(plt.Line2D([.046,.954],[.086,.086],lw=1,color='#b9bbad'))
fig.text(.046,.049,'X aumenta para leste · Z aumenta para sul',fontsize=10,color=muted)
fig.text(.954,.049,f'Mar Y={SEA}  /  Rocha-mãe Y={LOW}  /  Superfície Y={height.min()}–{height.max()}',
         ha='right',fontsize=10,color=muted,fontfamily='monospace')
fig.savefig(OUT/'REGION_V6_planta.png',facecolor=fig.get_facecolor())
plt.close(fig)
