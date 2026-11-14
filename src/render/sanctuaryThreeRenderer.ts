import * as THREE from 'three';
import { CHUNK_SIZE, TILE } from '../config';
import { ThreeStage, type StageView } from './three/stage';
import { SelectionMarkers } from './three/selection';
import { BlockMaterials } from './three/blockMaterials';
import type { Camera } from '../game/camera';
import { ActorSprites } from './character';
import type { RenderOptions } from './renderer';
import type { GameRenderer, RendererStats } from './rendererContract';
import { celestialFaces, installCelestialGrassNet } from './celestialArt';
import { Block } from '../world/blocks';
import { SanctuaryCameraJoystick } from './sanctuaryCameraJoystick';
import { CELESTIAL_GRASS_NET_DATA_URI } from './celestialGrassNetAsset';
import { art } from './art';
import { type BlockId } from '../world/blocks';
import type { World } from '../world/world';
import type { Hit } from '../world/progression';
import { sanctuary3DGeometryCells, sanctuaryBlockTransform, type SanctuaryBlockShape } from './sanctuaryThreeLayout';
import { OBLIQUE_K } from './sanctuaryObliqueView';
import { characterScale, createWallProportionTest, GRADE_COMPARE, type ScaleChoice } from './sanctuaryWallProportionTest';
import { CHARACTER_SCALE_FACTOR, SANCTUARY_CELLS_TALL } from './worldScale';
import { buildWallPrototype, wallPlaceholderIcon, type WallPrototype } from './sanctuaryWallPrototype';
import { buildWallArt, type WallArtGroup } from './sanctuaryWallArt';
import { wallArtBase } from './wallAtlas';
import { DEFAULT_WALL_THICKNESS, type WallThickness } from '../world/walls';
import { flickerFactor, glowLightFor, type LightSource, PLAYER_LIGHT, pickLights } from './lighting';
import { SanctuaryLighting } from './sanctuaryLighting';
import { GODDESS_BILLBOARD_CANVAS, sanctuaryGoddessVisualPlacement } from './sanctuaryGoddessVisual';

type Cell = {x:number;y:number;level:number;id:BlockId};
type MeshGroup = {mesh:THREE.InstancedMesh;cells:Cell[]};
/** Duração do quadro intermediário da porta ao abrir/fechar (ms). */
const DOOR_HALF_MS=140;

/**
 * `tilt`: câmera inclinada a 67° (padrão, iluminada). `oblique`: câmera reta para baixo com a altura como deslocamento
 * fixo na tela (`?vista=obliqua`, experimento da ADR 0026) e materiais sem luz, para a arte aprovada manter as cores.
 */
export type SanctuaryView = StageView;

/**
 * Official Three.js VIEW of the same World/Player that the original Game owns.
 *
 * Does NOT own game state: construction, two-level limit, collision, movement,
 * interaction, hotbar and saves remain the existing authoritative Game/World.
 * The main World is never initialized with this class; its Canvas 2D stays intact.
 */
export class SanctuaryThreeRenderer implements GameRenderer {
  /** Núcleo genérico (ADR 0031, M1): cena/câmera/GPU/contexto/mira, realces e materiais de bloco. */
  private readonly stage:ThreeStage;
  private readonly orbitControls:SanctuaryCameraJoystick;
  private cameraYaw=0;
  private readonly scene:THREE.Scene;
  private readonly selection:SelectionMarkers;
  private readonly blockMaterials:BlockMaterials;
  private readonly floorGeometry:THREE.BufferGeometry;
  private readonly solidGeometry:THREE.BufferGeometry;
  private readonly wallGeometry:THREE.BufferGeometry;
  private readonly groups:MeshGroup[]=[];
  private readonly dummy:THREE.Object3D;
  private readonly actorSprites=new ActorSprites();
  private readonly actorCanvas=document.createElement('canvas');
  private readonly actorContext:CanvasRenderingContext2D;
  private readonly actorTexture:THREE.CanvasTexture;
  private readonly goddess:THREE.Mesh<THREE.PlaneGeometry,THREE.MeshBasicMaterial>;
  private readonly goddessGhost:THREE.Mesh<THREE.PlaneGeometry,THREE.MeshBasicMaterial>;
  private readonly goddessShadow:THREE.Mesh<THREE.BufferGeometry,THREE.MeshBasicMaterial>;
  private readonly bounds:{x0:number;x1:number;y0:number;y1:number};
  private signature='';
  private disposed=false;
  private readonly view:SanctuaryView;
  /** Paredes (ADR 0027): protótipo de cores lisas até a arte chegar; refeito junto com as malhas. */
  private walls:WallPrototype|null=null;
  /** Paredes com arte (W3): atlas por bloco carregados do pacote de arte; os materiais sem atlas usam o protótipo. */
  private wallArt:WallArtGroup|null=null;
  private readonly wallAtlases=new Map<BlockId,HTMLImageElement>();
  /** Portas de parede: estado anterior (para detectar abrir/fechar) e quadro intermediário em andamento (ms até acabar). */
  private doorStates=new Map<string,BlockId>();
  private readonly halfDoors=new Map<string,number>();
  private halfTimer:ReturnType<typeof setTimeout>|null=null;
  private readonly wallThickness:WallThickness;
  /** Iluminação (ADR 0029): só na vista oblíqua e quando `?luz=` liga; `glowLights` = blocos que brilham, refeito com as malhas. */
  private readonly lighting:SanctuaryLighting|null;
  private glowLights:LightSource[]=[];
  /** Células visíveis na vertical (a câmera usa; ADR 0028): a vista oblíqua mostra mais mundo que a antiga. */
  readonly preferredCellsTall?:number;

  constructor(canvas:HTMLCanvasElement,private readonly world:World,options:{view?:SanctuaryView;wallTest?:boolean;testScale?:ScaleChoice;wallThickness?:WallThickness;ambient?:number}={}){
    this.wallThickness=options.wallThickness??DEFAULT_WALL_THICKNESS;
    for(const [key,url] of Object.entries(art().wallAtlases??{})){
      if(!url)continue;
      const img=new Image();
      img.onload=()=>{
        if(this.disposed)return;
        this.wallAtlases.set(Number(key) as BlockId,img);
        this.signature=''; // refaz as paredes com a arte
      };
      img.onerror=()=>console.warn('Atlas de paredes não carregou; usando cores lisas');
      img.src=url;
    }
    this.lighting=options.ambient!==undefined&&(options.view??'tilt')==='oblique'?new SanctuaryLighting(options.ambient):null;
    this.view=options.view??'tilt';
    if(this.view==='oblique')this.preferredCellsTall=SANCTUARY_CELLS_TALL;
    const profile=world.profile;
    if(profile.id!=='santuario'||!profile.bounds)
      throw new Error('SanctuaryThreeRenderer só pode renderizar o perfil Santuário.');
    this.bounds={
      x0:profile.bounds.cx0*CHUNK_SIZE,
      x1:(profile.bounds.cx1+1)*CHUNK_SIZE-1,
      y0:profile.bounds.cy0*CHUNK_SIZE,
      y1:(profile.bounds.cy1+1)*CHUNK_SIZE-1,
    };
    this.stage=new ThreeStage(canvas,this.view,'#b5c7f5',()=>{
      this.signature=''; // refaz as malhas no próximo quadro
      this.actorTexture.needsUpdate=true;
      this.blockMaterials.reupload();
    });
    this.scene=this.stage.scene;
    this.orbitControls=new SanctuaryCameraJoystick(orbit=>{
      this.stage.setFreeOrbit(orbit);
      this.cameraYaw=(orbit?.azimuthDeg??0)*Math.PI/180;
    });
    const grassCubeSheet = new Image();
    grassCubeSheet.onload=()=>{
      if(this.disposed)return;
      installCelestialGrassNet(grassCubeSheet);
      this.blockMaterials.invalidate(Block.GRASS_CELESTIAL);
      this.signature='';
    };
    grassCubeSheet.onerror=()=>console.warn('Grama Celestial (6 faces): fallback para arte anterior');
    grassCubeSheet.src=CELESTIAL_GRASS_NET_DATA_URI;
    this.blockMaterials=new BlockMaterials(this.view,celestialFaces,this.stage.gpu);
    this.selection=new SelectionMarkers(this.scene,world);
    this.scene.add(new THREE.HemisphereLight(0xfff7ed,0xa99cc4,2.0));
    const sunlight=new THREE.DirectionalLight(0xffe9c7,1.15);
    sunlight.position.set(-15,27,19);
    this.scene.add(sunlight);
    this.floorGeometry=new THREE.BoxGeometry(1,0.18,1);
    this.solidGeometry=new THREE.BoxGeometry(1,1,1);
    this.wallGeometry=new THREE.BoxGeometry(1,1,0.5);
    this.dummy=new THREE.Object3D();

    // Preserve the official animated goddess sheet, painted on a transparent
    // canvas and uploaded as a billboard texture (not a new 3D avatar).
    this.actorCanvas.width=GODDESS_BILLBOARD_CANVAS.width;
    this.actorCanvas.height=GODDESS_BILLBOARD_CANVAS.height;
    const ctx=this.actorCanvas.getContext('2d');
    if(!ctx)throw new Error('Canvas auxiliar da Deusa indisponível');
    this.actorContext=ctx;
    this.actorTexture=new THREE.CanvasTexture(this.actorCanvas);
    this.actorTexture.colorSpace=THREE.SRGBColorSpace;
    this.actorTexture.minFilter=THREE.LinearFilter;
    // A THREE.Sprite tilts with the CAMERA's pitch. With our near top-down
    // view it pushed the goddess's head behind walls despite feet collision.
    // A vertical XY plane keeps head directly above the ground shadow.
    const billboardGeometry=new THREE.PlaneGeometry(1,1);
    billboardGeometry.translate(0,0.5,0); // local origin at the feet / shadow
    const spriteMaterial=new THREE.MeshBasicMaterial({
      map:this.actorTexture,transparent:true,depthTest:true,depthWrite:false,
      alphaTest:0.015,side:THREE.DoubleSide,
    });
    this.goddess=new THREE.Mesh(billboardGeometry,spriteMaterial);
    // Na vista oblíqua o que é vertical mostra só K por unidade: a altura do plano é dividida por K para a personagem
    // aparecer com a proporção da arte (3,0 células de altura em tela).
    // No teste da escala (ADR 0028) a Deusa usa a escala escolhida em `?escala=` (padrão: core).
    // Fora do teste: na vista oblíqua a Deusa usa a escala do mundo (ADR 0028); na inclinada (reserva) segue a antiga.
    const charScale=options.wallTest?characterScale(options.testScale??'core'):(this.view==='oblique'?CHARACTER_SCALE_FACTOR:1);
    this.goddess.scale.set(2.45*charScale,(this.view==='oblique'?3.0/OBLIQUE_K:3.0)*charScale,1);
    this.goddess.renderOrder=3;

    // Transparent 'through-wall' echo: if a wall is genuinely closer to the
    // camera, the normal (depth-tested) sprite remains hidden by the wall,
    // while only a faint spectral silhouette helps the player locate herself.
    // Never disable depth testing for the main goddess, which would flatten
    // every foreground obstacle.
    this.goddessGhost=new THREE.Mesh(billboardGeometry,new THREE.MeshBasicMaterial({
      map:this.actorTexture,color:0xc9b9ff,transparent:true,opacity:0.18,
      depthTest:false,depthWrite:false,alphaTest:0.015,side:THREE.DoubleSide,
    }));
    this.goddessGhost.scale.copy(this.goddess.scale);
    this.goddessGhost.renderOrder=2;

    // A shadow belongs to the horizontal physical support plane, not the
    // billboard (where it previously looked like a vertical sprite fragment).
    const shadowGeometry=new THREE.CircleGeometry(1,32);
    shadowGeometry.rotateX(-Math.PI/2);
    this.goddessShadow=new THREE.Mesh(shadowGeometry,new THREE.MeshBasicMaterial({
      color:0x241648,transparent:true,opacity:0.22,
      depthTest:true,depthWrite:false,side:THREE.DoubleSide,
      polygonOffset:true,polygonOffsetFactor:-2,
    }));
    this.goddessShadow.renderOrder=1;
    this.scene.add(this.goddessShadow);
    this.scene.add(this.goddessGhost);
    this.scene.add(this.goddess);
    if(options.wallTest){
      // Teste de proporção das paredes (ADR 0027): paredes lisas em 3 alturas perto do ponto inicial; descartável.
      const [sx,sy]=world.findSpawn();
      // Personagens de referência paradas: mesmo plano e textura animada da Deusa, só com altura de tela própria.
      const makeReference=(screenHeight:number):THREE.Object3D=>{
        const ref=new THREE.Mesh(billboardGeometry,spriteMaterial);
        ref.scale.set(2.45*screenHeight/3.0,screenHeight/OBLIQUE_K,1);
        ref.renderOrder=3;
        return ref;
      };
      this.scene.add(options.testScale==='grade'?createWallProportionTest({x:sx,z:sy},makeReference,GRADE_COMPARE):createWallProportionTest({x:sx,z:sy},makeReference));
    }

  }

  private worldSignature():string{
    const v:string[]=[];
    for(let cy=this.world.profile.bounds!.cy0;cy<=this.world.profile.bounds!.cy1;cy++)
      for(let cx=this.world.profile.bounds!.cx0;cx<=this.world.profile.bounds!.cx1;cx++){
        const chunk=this.world.getChunk(cx,cy);
        v.push(chunk?String(chunk.version):'absent');
      }
    return v.join(',');
  }

  private buildWorld():void{
    for(const entry of this.groups){
      this.scene.remove(entry.mesh);
      entry.mesh.dispose();
    }
    this.groups.length=0;
    if(this.walls){this.scene.remove(this.walls.group);this.walls.dispose();}
    if(this.wallArt){this.scene.remove(this.wallArt.group);this.wallArt.dispose();}
    const now=performance.now();
    for(const [k,until] of this.halfDoors)if(until<=now)this.halfDoors.delete(k);
    this.wallArt=buildWallArt(this.world,this.bounds,this.wallAtlases,this.wallThickness,new Set(this.halfDoors.keys()));
    this.scene.add(this.wallArt.group);
    // Porta que mudou de estado: mostra o quadro intermediário por um instante e depois o estado final.
    let changed=false;
    for(const [k,id] of this.wallArt.doors){
      const prev=this.doorStates.get(k);
      if(prev!==undefined&&prev!==id&&!this.halfDoors.has(k)){this.halfDoors.set(k,now+DOOR_HALF_MS);changed=true;}
    }
    this.doorStates=new Map(this.wallArt.doors);
    if(changed){
      this.signature=''; // refaz já com o quadro intermediário…
      if(this.halfTimer)clearTimeout(this.halfTimer);
      this.halfTimer=setTimeout(()=>{this.halfTimer=null;this.signature='';},DOOR_HALF_MS+20); // …e depois com o estado final
    }
    this.walls=buildWallPrototype(this.world,this.bounds,this.wallThickness,id=>this.wallAtlases.has(wallArtBase(id)));
    this.scene.add(this.walls.group);
    const cells=sanctuary3DGeometryCells(this.world,this.bounds);
    this.glowLights=[];
    for(const b of cells.blocks){
      const g=glowLightFor(b.id);
      if(g)this.glowLights.push({x:b.x+0.5,z:b.y+0.5,height:b.level+0.5,...g});
    }
    const indexed=new Map<string,{
      ground:boolean;id:number;shape:SanctuaryBlockShape;
      cells:Cell[];
    }>();
    const add=(id:number,ground:boolean,shape:SanctuaryBlockShape,cell:Cell)=>{
      const key=(ground?'g':'b')+':'+id+':'+shape;
      let entry=indexed.get(key);
      if(!entry){entry={id,ground,shape,cells:[]};indexed.set(key,entry);}
      entry.cells.push(cell);
    };
    for(const g of cells.grounds)
      add(g.id,true,'solid',{...g,level:-1});
    for(const b of cells.blocks)
      add(b.id,false,b.shape,b);
    for(const entry of indexed.values()){
      const geometry=entry.ground?this.floorGeometry:
        entry.shape==='solid'?this.solidGeometry:this.wallGeometry;
      const mats=this.blockMaterials.get(entry.id);
      const mesh=new THREE.InstancedMesh(
        geometry,entry.ground?mats.ground:mats.block,entry.cells.length,
      );
      mesh.name='Santuário oficial: '+(entry.ground?'chão':'bloco')+' '+entry.id;
      entry.cells.forEach((cell,i)=>{
        const transform=entry.ground
          ?{x:cell.x+0.5,y:-0.09,z:cell.y+0.5}
          :sanctuaryBlockTransform({
            x:cell.x,y:cell.y,level:cell.level,shape:entry.shape,
          });
        this.dummy.position.set(transform.x,transform.y,transform.z);
        this.dummy.rotation.set(0,0,0);
        this.dummy.scale.set(1,1,1);
        this.dummy.updateMatrix();
        mesh.setMatrixAt(i,this.dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate=true;
      mesh.frustumCulled=false;
      this.scene.add(mesh);
      this.groups.push({mesh,cells:entry.cells});
    }
  }

  stats():RendererStats{return this.stage.stats();}

  private drawGoddess(opts:RenderOptions):void{
    const player=opts.player;
    const actor={
      kind:'goddess' as const,
      x:player.x,y:player.y,
      visualZ:player.visualZ,
      facing:player.facing,
      moving:player.moving,
      walkTime:player.walkTime,
    };
    this.actorContext.clearRect(
      0,0,GODDESS_BILLBOARD_CANVAS.width,GODDESS_BILLBOARD_CANVAS.height,
    );
    this.actorSprites.get('goddess').draw(
      this.actorContext,
      GODDESS_BILLBOARD_CANVAS.drawX,
      GODDESS_BILLBOARD_CANVAS.groundY,
      GODDESS_BILLBOARD_CANVAS.zoom,
      actor,opts.elapsed,false, // no baked shadow on the vertical billboard
    );
    this.actorTexture.needsUpdate=true;
    const visual=sanctuaryGoddessVisualPlacement(player,opts.elapsed);
    this.goddess.position.set(
      visual.billboard.x,visual.billboard.y,visual.billboard.z,
    );
    this.goddessGhost.position.copy(this.goddess.position);
    // Os sprites 2D permanecem legiveis ao orbitar o cubo 3D.
    this.goddess.rotation.y=this.cameraYaw;
    this.goddessGhost.rotation.y=this.cameraYaw;
    this.goddessShadow.position.set(
      visual.shadow.x,visual.shadow.y,visual.shadow.z,
    );
    this.goddessShadow.scale.set(
      visual.shadowRadii.x,1,visual.shadowRadii.z,
    );
  }

  draw(cam:Camera,opts:RenderOptions):void{
    if(this.disposed||this.stage.contextLost)return;
    const signature=this.worldSignature();
    if(this.signature!==signature){
      this.buildWorld();
      this.signature=signature;
    }
    this.stage.syncCamera(cam);
    this.drawGoddess(opts);
    this.selection.update(opts);
    this.stage.render();
    if(this.lighting)this.drawLighting(cam,opts);
  }

  /** Escuridão ambiente com luzes (ADR 0029): a Deusa e os blocos que brilham, até `MAX_LIGHTS` por quadro. */
  private drawLighting(cam:Camera,opts:RenderOptions):void{
    if(!this.lighting)return;
    const focus={x:cam.x/TILE,z:cam.y/TILE};
    const cellPx=TILE*cam.zoom;
    const reach=Math.hypot(cam.width,cam.height)/(2*cellPx);
    const player:LightSource={x:opts.player.x,z:opts.player.y,...PLAYER_LIGHT};
    const chosen=[player,...pickLights(this.glowLights,focus,reach,11)];
    this.lighting.update(chosen,{
      focus,cellPx,width:cam.width,height:cam.height,
      pixelRatio:Math.min(window.devicePixelRatio||1,2),k:OBLIQUE_K,elapsed:opts.elapsed,
    },(l,i)=>flickerFactor(l.flicker,opts.elapsed,l.x*7+l.z*13+i));
    this.lighting.render(this.stage.gpu);
  }

  pick(cam:Camera,sx:number,sy:number):{x:number;y:number;hasObject:boolean}{
    if(this.disposed)return{x:0,y:0,hasObject:false};
    this.stage.syncCamera(cam);
    if(this.groups.length===0)this.buildWorld();
    this.stage.aim(cam,sx,sy);
    const found=this.stage.hits([...this.groups.map(e=>e.mesh),...(this.walls?.meshes??[]),...(this.wallArt?.meshes??[])]);
    for(const hit of found){
      const wallCell=hit.object.userData.cell as {x:number;y:number}|undefined;
      if(wallCell)return{x:wallCell.x,y:wallCell.y,hasObject:true};
      const artCells=hit.object.userData.cells as Array<{x:number;y:number}>|undefined;
      const artCell=artCells?.[hit.instanceId??-1];
      if(artCell)return{x:artCell.x,y:artCell.y,hasObject:true};
      const group=this.groups.find(e=>e.mesh===hit.object);
      const cell=group?.cells[hit.instanceId??-1];
      if(cell)return{x:cell.x,y:cell.y,hasObject:cell.level>=0};
    }
    // Unoccupied space: derive a cell only from the floor plane.
    const ground=this.stage.groundCell();
    if(ground)
      return{x:ground.x,y:ground.y,
        // a placa fina deixa vão na célula: clicar ao lado dela ainda é a parede
        hasObject:this.world.isWallAt(ground.x,ground.y)};
    return{x:0,y:0,hasObject:false};
  }

  addDamage(_x:number,_y:number,_hit:Hit,_target:'enemy'|'player'):void {
    // The Santuário profile has no combat; the hook remains compatible with Game.
  }

  iconFor(id:BlockId):string{
    return art().celestialIcons[id]??wallPlaceholderIcon(id);
  }

  dispose():void{
    if(this.disposed)return;
    this.disposed=true;
    this.orbitControls.dispose();
    if(this.halfTimer)clearTimeout(this.halfTimer);
    this.lighting?.dispose();
    for(const group of this.groups){
      this.scene.remove(group.mesh);
      group.mesh.dispose();
    }
    this.groups.length=0;
    if(this.walls){this.scene.remove(this.walls.group);this.walls.dispose();this.walls=null;}
    if(this.wallArt){this.scene.remove(this.wallArt.group);this.wallArt.dispose();this.wallArt=null;}
    this.blockMaterials.dispose();
    for(const g of [this.floorGeometry,this.solidGeometry,this.wallGeometry,
      this.goddessShadow.geometry,this.goddess.geometry])g.dispose();
    this.selection.dispose();
    this.actorTexture.dispose();
    this.goddess.material.dispose();
    this.goddessGhost.material.dispose();
    this.goddessShadow.material.dispose();
    this.stage.dispose();
  }
}
