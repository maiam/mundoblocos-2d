from pathlib import Path
import json, zipfile
import numpy as np
from scipy.interpolate import PchipInterpolator
from scipy.ndimage import label
from PIL import Image
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.colors import LightSource, LinearSegmentedColormap
from mpl_toolkits.mplot3d.art3d import Poly3DCollection

OUT=Path(__file__).resolve().parent
# Coordenadas locais u,v em [0,64], norte v=0. Mundo X=u-32, Z=v-32.
# Controle manual interpretado da referência; não é extração da luminância.
RIVER=[[0,40],[4,40],[9,43],[13,48],[17,47],[21,41],[25,37],[30,36],[35,39],[39,38],[43,42],[46,49],[50,55],[54,56],[59,54],[64,53]]
curve=PchipInterpolator(*np.array(RIVER).T)
def smooth(a,b,x):
    t=np.clip((x-a)/(b-a),0,1)
    return t*t*(3-2*t)

def terrain(u,v):
    # Três patamares irregulares, todos dissolvidos antes do pátio e campos.
    t1=24+1.2*np.sin(u*.17)
    t2=17+1.8*np.sin(u*.14+.4)
    t3=9+1.4*np.sin(u*.19+1)
    base=2+2*(1-smooth(t1-2,t1+1,v))+2*(1-smooth(t2-2,t2+1,v))+2*(1-smooth(t3-2,t3+1,v))
    # Acesso suave do pátio à clareira, ao lado oeste do rio.
    pathx=30-3*np.sin(v*.16)
    ramp=2+6*(1-smooth(3,28,v))
    w=1-smooth(.8,2.3,np.abs(u-pathx))
    base=base*(1-w)+ramp*w
    # Rio: distância aproximada ao eixo compensada pela inclinação local.
    cx=curve(v)
    slope=curve.derivative()(v)
    d=np.abs(u-cx)/np.sqrt(1+slope*slope)
    half=1.65+.3*np.sin(v*.2)**2
    channel=d/half
    # Alargamento lacustre no sudeste, conectado ao canal principal.
    lake=np.sqrt(((u-51)/5.5)**2+((v-52)/4.2)**2)
    q=np.minimum(channel,lake)
    # Superfície d'água decresce para sul; queda curta ao norte.
    water=1.2-.3*v/64+5.3*(1-smooth(5.5,9,v))
    bed=water-(.65+.2*(1-np.minimum(q,1)))
    # Margens até q=1.55, sem cristas dentro do leito.
    blend=smooth(.72,1.55,q)
    h=bed*(1-blend)+base*blend
    wet=h<water
    return h,wet,water

v,u=np.meshgrid(np.arange(64)+.5,np.arange(64)+.5,indexing='ij')
h,wet,water=terrain(u,v)
vv,uu=np.meshgrid(np.arange(65),np.arange(65),indexing='ij')
hv,_,_=terrain(uu,vv)
def save16(name,arr):
    Image.fromarray(np.rint(np.clip(arr/8,0,1)*65535).astype(np.uint16)).save(OUT/name)
save16('heightmap_64x64_16bit.png',h)
save16('heightmap_vertices_65x65_16bit.png',hv)
Image.fromarray(wet.astype(np.uint8)*255).save(OUT/'agua_mask_64x64.png')
np.savetxt(OUT/'alturas_celulas_64x64.csv',h,fmt='%.6f',delimiter=',')
np.savetxt(OUT/'agua_superficie_64x64.csv',np.where(wet,water,np.nan),fmt='%.6f',delimiter=',')
Image.fromarray(np.rint(h/8*255).astype('uint8')).resize((768,768),Image.Resampling.NEAREST).save(OUT/'heightmap_previa_768.png')

meta={'name':'Fazenda do Santuário','version':'1.0','generator':'gerar_heightmap.py; NumPy/SciPy; reconstrução manual paramétrica da referência','seed':None,'deterministic':True,'grid_cells':[64,64],'chunks':[4,4],'chunk_size':16,'chunk_indices':[-2,-1,0,1],'cell_coordinates_inclusive':[-32,31],'world_bounds':[-32,32],'cell_size':1,'axis':'X leste, Y altura, Z sul','image_rows':'Norte para sul; linha 0 é Z=-32','sampling_cells':'X=coluna-32+0.5, Z=linha-32+0.5','sampling_vertices':'X=coluna-32, Z=linha-32','height_decode':'altura=valor_uint16/65535*8','color_space':'dados lineares; sem sRGB, gamma ou normalização automática','height_offset':0,'height_scale':8,'water':'máscara e superfície CSV separadas; NaN significa terra seca; superfície inclinada e queda ao norte','river_control_v_u':RIVER,'objects_in_heightmap':False,'integration_status':'Não integrado ao motor; medidas verticais propostas, não extraídas de código do jogo.'}
(OUT/'parametros.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2))

# Verificações da grade inteira e das áreas agrícolas.
assert h.shape==(64,64) and hv.shape==(65,65)
assert np.isfinite(h).all() and h.min()>=0 and h.max()<=8
regions={'pátio e construções':(7,27,28,34),'milho':(5,18,35,42),'abóboras':(21,31,35,42),'horta':(5,18,45,52),'trigo':(21,31,45,52),'talhão preparado':(5,18,55,60)}
for name,(x0,x1,z0,z1) in regions.items():
    a=h[z0:z1,x0:x1]
    assert np.allclose(a,2), (name,float(a.min()),float(a.max()))
labels,n=label(wet,np.ones((3,3)))
assert n==1 and wet[0].any() and wet[-1].any()
decoded=np.asarray(Image.open(OUT/'heightmap_64x64_16bit.png'))/65535*8
err=float(np.max(np.abs(decoded-h)))
assert err<=8/65535/2+1e-9
report={'cells':int(h.size),'height_min':float(h.min()),'height_max':float(h.max()),'water_cells':int(wet.sum()),'water_connected_components_8_neighbors':int(n),'flat_regions_at_height_2':list(regions),'max_png_roundtrip_error_units':err,'chunk_generation':'campo global único; sem normalização ou geração separada por chunk','corners_NW_NE_SW_SE':[float(h[0,0]),float(h[0,-1]),float(h[-1,0]),float(h[-1,-1])]}
(OUT/'validacao.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))

fig,axs=plt.subplots(1,2,figsize=(13,7.2),layout='constrained')
im=axs[0].imshow(h,cmap='gray',vmin=0,vmax=8,extent=(-32,32,32,-32),interpolation='nearest')
axs[0].set_title('HEIGHTMAP · 64 × 64 células',fontsize=13,weight='bold')
plt.colorbar(im,ax=axs[0],fraction=.04,pad=.03,label='Altura proposta (unidades)')
rgb=LightSource(315,45).shade(h,cmap=LinearSegmentedColormap.from_list('campo',['#927754','#8ba65e','#80a64c','#739448','#a1b46a']),vert_exag=1.2,vmin=0,vmax=8)
rgb[wet,:3]=[.12,.64,.76]
axs[1].imshow(rgb,extent=(-32,32,32,-32),interpolation='nearest')
axs[1].contour(u-32,v-32,h,levels=[2.5,4,6,7.5],colors='#665b3a',linewidths=.5,alpha=.65)
axs[1].set_title('RELEVO + MÁSCARA DE ÁGUA',fontsize=13,weight='bold')
for ax in axs:
    ax.set_xticks([-32,-16,0,16,32]);ax.set_yticks([-32,-16,0,16,32]);ax.grid(alpha=.2)
    ax.set_xlabel('X · oeste → leste');ax.set_ylabel('Z · norte → sul')
fig.suptitle('FAZENDA DO SANTUÁRIO | Relevo técnico v1',fontsize=19,weight='bold')
fig.savefig(OUT/'previa_tecnica.png',dpi=150)
plt.close(fig)

(OUT/'LEIA-ME.md').write_text('''# Fazenda do Santuário — heightmap v1

Reconstrução técnica interpretativa da referência ilustrada. Não é medição fotogramétrica nem conversão da luminosidade da imagem. Gerado numericamente com o script incluído; Terrain Studio não foi utilizado.

## Importação
- `heightmap_64x64_16bit.png`: 4.096 alturas nos centros das células; para terreno lógico por célula.
- `heightmap_vertices_65x65_16bit.png`: 4.225 amostras nas bordas/vértices para malha de 64 × 64 faces. Calculado pelo mesmo campo contínuo; não é uma borda duplicada do mapa de células.
- PNG grayscale de 16 bits, opaco e sem canal alfa: todos os pixels são dados. Preto = altura 0; branco = altura 8. Ler como dados lineares, não sRGB. Fórmula: Y = uint16 / 65535 × 8.
- 1 célula = 1 unidade horizontal proposta. X cresce para leste; Z cresce para sul; Y é altura. Linha superior = norte. Limites espaciais [-32,32]; células -32..31; chunks -2..1.
- Ao cortar chunks de 16 × 16 células não renormalizar alturas. Para a malha cada chunk usa 17 × 17 vértices e compartilha sua borda com o vizinho.
- A versão de células e a de vértices são convenções distintas; escolher conforme a implementação do motor.

## Água e relevo
Plantações e pátio no nível 2; floresta norte em patamares até nível 8. Rio escavado com saída ao sul, lago alargado no sudeste e queda ao norte. A distribuição é aproximada, pois a referência está em perspectiva.
`agua_mask_64x64.png`: branco = água; preto = seco. `agua_superficie_64x64.csv`: altura da superfície em cada célula molhada; NaN nas demais. O heightmap representa o fundo do rio, não sua superfície. A água requer malha própria, inclusive na queda. Ponte, casa, árvores, rochas, cercas e cultivos são objetos separados, não alturas do terreno.

## Arquivos auxiliares
`alturas_celulas_64x64.csv`: alturas em unidades, sem codificação de cor.
`heightmap_previa_768.png`: ampliação por vizinho mais próximo, 8 bits, apenas visualização — não importar como mapa principal.
`previa_tecnica.png`: relevo, água e limites de chunks para revisão.
`parametros.json`, `gerar_heightmap.py` e `validacao.json`: convenções, geração reproduzível e verificações. Não há seed aleatória; os pontos de controle determinam o terreno.

O script requer Python com NumPy, SciPy, Pillow e Matplotlib. Executar `python3 gerar_heightmap.py` para regenerar.
Não implementado no jogo. Rampas, colisões e limites de inclinação precisam ser testados com o controlador real do personagem; as checagens feitas aqui são de dados e áreas planas. Não há máscara de biomas/cultivos nem colisão neste pacote.
''',encoding='utf-8')
# Prévia isométrica ortográfica da mesma malha; sem objetos decorativos.
fig=plt.figure(figsize=(10,10))
ax=fig.add_subplot(111,projection='3d',proj_type='ortho')
colors=LightSource(315,45).shade(hv,cmap=LinearSegmentedColormap.from_list('grass',['#a28a65','#96b969','#7fa953','#72974b','#a6bc75']),vert_exag=1.2,vmin=0,vmax=8)
faces=[]; facecolors=[]
for r in range(64):
    for c in range(64):
        faces.append([(c-32,32-r,hv[r,c]),(c-31,32-r,hv[r,c+1]),(c-31,31-r,hv[r+1,c+1]),(c-32,31-r,hv[r+1,c])])
        facecolors.append(colors[r,c,:3])
# Água em células exatas da máscara, separada do terreno.
polys=[]
for r,c in zip(*np.where(wet)):
    a=c-32;b=32-r;level=float(water[r,c])+.025
    polys.append([(a,b,level),(a+1,b,level),(a+1,b-1,level),(a,b-1,level)])
faces.extend(polys);facecolors.extend(['#36b9c7']*len(polys))
# Espessura apenas visual: nenhuma borda é rebaixada no heightmap.
walls=[]
for j in range(64):
    walls.extend([[(j-32,-32,0),(j-31,-32,0),(j-31,-32,hv[-1,j+1]),(j-32,-32,hv[-1,j])],
    [(32,32-j,0),(32,31-j,0),(32,31-j,hv[j+1,-1]),(32,32-j,hv[j,-1])]])
faces.extend(walls);facecolors.extend(['#98734f']*len(walls))
ax.add_collection3d(Poly3DCollection(faces,facecolors=facecolors,edgecolors='none',zsort='average'))
ax.set_xlim(-32,32);ax.set_ylim(-32,32);ax.set_zlim(0,10)
ax.set_box_aspect((64,64,10),zoom=.8);ax.view_init(elev=35.26438968,azim=-45)
ax.set_axis_off();fig.patch.set_alpha(0);ax.patch.set_alpha(0)
fig.savefig(OUT/'previa_isometrica.png',dpi=170,transparent=True,bbox_inches='tight',pad_inches=.02)
plt.close(fig)

print(json.dumps(report,ensure_ascii=False))
with zipfile.ZipFile(OUT.parent/'Santuario_Fazenda_Heightmap_64x64.zip','w',zipfile.ZIP_DEFLATED) as z:
    for f in sorted(OUT.iterdir()):
        if f.is_file(): z.write(f,f.name)
