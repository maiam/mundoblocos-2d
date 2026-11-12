import * as THREE from 'three';
import { CHUNK_SIZE, TILE } from '../config';
import type { Camera } from '../game/camera';
import { ActorSprites } from './character';
import type { RenderOptions } from './renderer';
import type { GameRenderer, RendererStats } from './rendererContract';
import { celestialFaces } from './celestialArt';
import { art } from './art';
import { Block, type BlockId } from '../world/blocks';
import type { World } from '../world/world';
import type { Hit } from '../world/progression';
import { sanctuary3DGeometryCells, sanctuaryBlockTransform, sanctuaryV3ScreenAnchorOffset, type SanctuaryBlockShape } from './sanctuaryThreeLayout';
import {
  drawMarbleAdaptiveTop, drawMarbleCornerTop, marbleCornerParts,
  marbleExposureKey, marbleTopExposure, type MarbleEdgeExposure,
} from './sanctuaryMarbleAdaptive';
import marbleBorderTop from '../assets/santuario-marmore-celestial-topo-ornamentado.jpg';
import { sanctuaryCameraOffset, sanctuaryV3VisualHeight } from './sanctuaryCameraRig';
import { OBLIQUE_CAMERA_HEIGHT, OBLIQUE_K, obliqueProjection, obliqueRay } from './sanctuaryObliqueView';
import { characterScale, createWallProportionTest, type ScalePreset } from './sanctuaryWallProportionTest';
import { createSanctuaryV3Surfaces } from './sanctuaryV3Surfaces';
import { GODDESS_BILLBOARD_CANVAS, sanctuaryGoddessVisualPlacement } from './sanctuaryGoddessVisual';

type Cell = {x:number;y:number;level:number;id:BlockId};
type MeshGroup = {mesh:THREE.InstancedMesh;cells:Cell[]};
type SurfaceMaterial = THREE.MeshLambertMaterial|THREE.MeshBasicMaterial;
type Materials = {block:SurfaceMaterial[];ground:SurfaceMaterial[];textures:THREE.Texture[]};

/**
 * `tilt`: câmera inclinada a 67° (padrão, iluminada). `oblique`: câmera reta para baixo com a altura como deslocamento
 * fixo na tela (`?vista=obliqua`, experimento da ADR 0026) e materiais sem luz, para a arte aprovada manter as cores.
 */
export type SanctuaryView = 'tilt'|'oblique';
type MarbleCap = { block:THREE.Material[]; topMaterial:THREE.MeshLambertMaterial; texture:THREE.Texture };

/**
 * Official Three.js VIEW of the same World/Player that the original Game owns.
 *
 * Does NOT own game state: construction, two-level limit, collision, movement,
 * interaction, hotbar and saves remain the existing authoritative Game/World.
 * The main World is never initialized with this class; its Canvas 2D stays intact.
 */
export class SanctuaryThreeRenderer implements GameRenderer {
  private readonly scene:THREE.Scene;
  private readonly camera:THREE.OrthographicCamera;
  private readonly gpu:THREE.WebGLRenderer;
  private readonly floorGeometry:THREE.BufferGeometry;
  private readonly solidGeometry:THREE.BufferGeometry;
  private readonly wallGeometry:THREE.BufferGeometry;
  private readonly v3FaceGeometry:THREE.BufferGeometry;
  private readonly v3TopGeometry:THREE.BufferGeometry;
  private readonly v3HalfTopGeometry:THREE.BufferGeometry;
  private readonly cornerLeftGeometry:THREE.BufferGeometry;
  private readonly cornerRightGeometry:THREE.BufferGeometry;
  private readonly groups:MeshGroup[]=[];
  private readonly materials=new Map<number,Materials>();
  private readonly marbleCapVariants=new Map<string,MarbleCap>();
  private readonly marbleTopImage=new Image();
  private readonly raycaster:THREE.Raycaster;
  private readonly pointer:THREE.Vector2;
  private readonly dummy:THREE.Object3D;
  private readonly actorSprites=new ActorSprites();
  private readonly actorCanvas=document.createElement('canvas');
  private readonly actorContext:CanvasRenderingContext2D;
  private readonly actorTexture:THREE.CanvasTexture;
  private readonly goddess:THREE.Mesh<THREE.PlaneGeometry,THREE.MeshBasicMaterial>;
  private readonly goddessGhost:THREE.Mesh<THREE.PlaneGeometry,THREE.MeshBasicMaterial>;
  private readonly goddessShadow:THREE.Mesh<THREE.BufferGeometry,THREE.MeshBasicMaterial>;
  private readonly highlight:THREE.Mesh<THREE.BufferGeometry,THREE.MeshBasicMaterial>;
  private readonly breakHighlight:THREE.Mesh<THREE.BufferGeometry,THREE.MeshBasicMaterial>;
  private readonly bounds:{x0:number;x1:number;y0:number;y1:number};
  private signature='';
  private disposed=false;
  private contextLost=false;
  private readonly canvas:HTMLCanvasElement;
  private readonly view:SanctuaryView;
  private obliqueHalf={w:8,h:5};
  private obliqueFocus={x:0,z:0};
  private lastWidth=0;
  private lastHeight=0;
  private lastPixelRatio=0;

  constructor(canvas:HTMLCanvasElement,private readonly world:World,options:{view?:SanctuaryView;wallTest?:boolean;testScale?:ScalePreset}={}){
    this.view=options.view??'tilt';
    const profile=world.profile;
    if(profile.id!=='santuario'||!profile.bounds)
      throw new Error('SanctuaryThreeRenderer só pode renderizar o perfil Santuário.');
    this.bounds={
      x0:profile.bounds.cx0*CHUNK_SIZE,
      x1:(profile.bounds.cx1+1)*CHUNK_SIZE-1,
      y0:profile.bounds.cy0*CHUNK_SIZE,
      y1:(profile.bounds.cy1+1)*CHUNK_SIZE-1,
    };
    this.marbleTopImage.onload=()=>{
      if(!this.disposed)this.signature=''; // rebuild material variants with the real user image
    };
    this.marbleTopImage.onerror=()=>{
      console.warn('Topo ornamentado do mármore não carregou; mantendo material anterior');
    };
    this.marbleTopImage.src=marbleBorderTop;
    this.canvas=canvas;
    // O aparelho pode tirar a GPU do jogo (aba em segundo plano, pouca memória): sem preventDefault o contexto nunca
    // volta. Ao voltar, o Three recria seus recursos sozinho; aqui só refazemos o que é nosso (malhas e texturas de canvas).
    canvas.addEventListener('webglcontextlost',this.onContextLost);
    canvas.addEventListener('webglcontextrestored',this.onContextRestored);
    this.scene=new THREE.Scene();
    this.scene.background=new THREE.Color('#b5c7f5');
    this.camera=new THREE.OrthographicCamera(-8,8,5,-5,0.1,220);
    this.gpu=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
    this.gpu.outputColorSpace=THREE.SRGBColorSpace;
    this.gpu.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
    this.scene.add(new THREE.HemisphereLight(0xfff7ed,0xa99cc4,2.0));
    const sunlight=new THREE.DirectionalLight(0xffe9c7,1.15);
    sunlight.position.set(-15,27,19);
    this.scene.add(sunlight);
    this.floorGeometry=new THREE.BoxGeometry(1,0.18,1);
    this.solidGeometry=new THREE.BoxGeometry(1,1,1);
    this.wallGeometry=new THREE.BoxGeometry(1,1,0.5);
    // V3 desenha uma face OU um topo por célula; nenhuma peça cria
    // uma segunda face/cobertura escondida em outro nível.
    const v3Surfaces=createSanctuaryV3Surfaces();
    this.v3FaceGeometry=v3Surfaces.face;
    this.v3TopGeometry=v3Surfaces.top;
    this.v3HalfTopGeometry=v3Surfaces.halfTop;
    this.cornerLeftGeometry=this.createCornerGeometry('left');
    this.cornerRightGeometry=this.createCornerGeometry('right');
    this.raycaster=new THREE.Raycaster();
    this.pointer=new THREE.Vector2();
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
    const charScale=options.wallTest?characterScale(options.testScale??'core'):1;
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
      this.scene.add(createWallProportionTest({x:sx,z:sy},makeReference));
    }

    const selectGeometry=new THREE.PlaneGeometry(1,1);
    selectGeometry.rotateX(-Math.PI/2);
    this.highlight=new THREE.Mesh(selectGeometry,new THREE.MeshBasicMaterial({
      color:0xffeb8d,transparent:true,opacity:0.32,depthWrite:false,
      side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-3,
    }));
    this.highlight.renderOrder=4;
    this.highlight.visible=false;
    this.scene.add(this.highlight);
    this.breakHighlight=new THREE.Mesh(
      selectGeometry.clone(),new THREE.MeshBasicMaterial({
        color:0xff7389,transparent:true,opacity:0.35,depthWrite:false,
        side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-4,
      }),
    );
    this.breakHighlight.renderOrder=5;
    this.breakHighlight.visible=false;
    this.scene.add(this.breakHighlight);
  }

  private material(id:number):Materials{
    let cached=this.materials.get(id);
    if(cached)return cached;
    const faces=celestialFaces(id);
    const toTexture=(canvas:HTMLCanvasElement):THREE.CanvasTexture=>{
      const t=new THREE.CanvasTexture(canvas);
      t.colorSpace=THREE.SRGBColorSpace;
      t.anisotropy=Math.min(4,this.gpu.capabilities.getMaxAnisotropy());
      return t;
    };
    const top=toTexture(faces.top);
    const front=toTexture(faces.front);
    const ground=toTexture(faces.ground);
    const Mat=this.view==='oblique'?THREE.MeshBasicMaterial:THREE.MeshLambertMaterial;
    const topMaterial=new Mat({map:top,color:0xffffff});
    // Sem luz, topo e frente seriam a mesma imagem: a frente leva o escurecimento frio que a arte 2D pinta à mão.
    const sideMaterial=new Mat({map:front,color:this.view==='oblique'?0xc4c6dc:0xffffff});
    const groundMaterial=new Mat({map:ground,color:0xffffff});
    // Three BoxGeometry: +X,-X,+Y,-Y,+Z,-Z.
    cached={
      block:[sideMaterial,sideMaterial,topMaterial,sideMaterial,sideMaterial,sideMaterial],
      ground:[sideMaterial,sideMaterial,groundMaterial,sideMaterial,sideMaterial,sideMaterial],
      textures:[top,front,ground],
    };
    this.materials.set(id,cached);
    return cached;
  }

  /**
   * The L shape is formed by a rear half-depth wall and a narrow forward
   * connector. Its TOP UVs occupy the correct locations in a single 1×1
   * marble image, so the ornament does not restart on the narrow tongue.
   * Side/front surfaces continue to use the already approved texture.
   */
  private createCornerGeometry(side:'left'|'right'):THREE.BufferGeometry {
    const shape=side==='left'?'wall_corner_back_left':'wall_corner_back_right';
    const position:number[]=[],normal:number[]=[],uv:number[]=[],indices:number[]=[];
    const groups:Array<{start:number;count:number;materialIndex:number}>=[];
    let indexOffset=0,vertexOffset=0;
    for(const piece of marbleCornerParts(shape)){
      const box=new THREE.BoxGeometry(piece.width,1,piece.depth);
      box.translate(piece.x,0,piece.z);
      const p=box.getAttribute('position');
      const n=box.getAttribute('normal');
      const t=box.getAttribute('uv');
      const index=box.getIndex();
      if(!index)throw new Error("BoxGeometry sem índice");
      const topVertices=new Set<number>();
      for(const g of box.groups){
        groups.push({
          start:indexOffset+g.start,
          count:g.count,
          materialIndex:g.materialIndex??0,
        });
        if(g.materialIndex===2)
          for(let j=g.start;j<g.start+g.count;j++)
            topVertices.add(index.getX(j));
      }
      for(let i=0;i<p.count;i++){
        const x=p.getX(i),z=p.getZ(i);
        position.push(x,p.getY(i),z);
        normal.push(n.getX(i),n.getY(i),n.getZ(i));
        if(topVertices.has(i)){
          uv.push(x+0.5,0.5-z); // image NORTH starts at local Z -0.5
        }else uv.push(t.getX(i),t.getY(i));
      }
      for(let i=0;i<index.count;i++)indices.push(index.getX(i)+vertexOffset);
      indexOffset+=index.count;
      vertexOffset+=p.count;
      box.dispose();
    }
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.Float32BufferAttribute(position,3));
    geo.setAttribute('normal',new THREE.Float32BufferAttribute(normal,3));
    geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
    geo.setIndex(indices);
    for(const g of groups)geo.addGroup(g.start,g.count,g.materialIndex);
    geo.computeBoundingSphere();
    return geo;
  }

  /** The uploaded ornate image changes only the celestial marble top.
   * Cache one texture for each exposed-edge mask and L orientation.
   */
  private marbleCapMaterial(exposure:MarbleEdgeExposure,
    shape:SanctuaryBlockShape):THREE.Material[] {
    const base=this.material(Block.MARBLE_CELESTIAL).block;
    if(!this.marbleTopImage.complete || this.marbleTopImage.naturalWidth===0)
      return base;
    const key=shape+':'+marbleExposureKey(exposure);
    const cached=this.marbleCapVariants.get(key);
    if(cached)return cached.block;
    const canvas=document.createElement('canvas');
    canvas.width=canvas.height=256;
    const ctx=canvas.getContext('2d');
    if(!ctx)return base;
    if(shape==='wall_corner_back_left'||shape==='wall_corner_back_right')
      drawMarbleCornerTop(ctx,this.marbleTopImage,exposure,
        shape==='wall_corner_back_left'?'left':'right');
    else drawMarbleAdaptiveTop(ctx,this.marbleTopImage,exposure);
    const texture=new THREE.CanvasTexture(canvas);
    texture.colorSpace=THREE.SRGBColorSpace;
    texture.anisotropy=Math.min(4,this.gpu.capabilities.getMaxAnisotropy());
    const topMaterial=new THREE.MeshLambertMaterial({map:texture,color:0xffffff});
    const block=[...base];
    block[2]=topMaterial; // BoxGeometry top (+Y), all 5 other faces unchanged
    this.marbleCapVariants.set(key,{block,topMaterial,texture});
    return block;
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
    const cells=sanctuary3DGeometryCells(this.world,this.bounds);
    const shapeMap=new Map<string,SanctuaryBlockShape>();
    for(const b of cells.blocks)shapeMap.set(b.x+':'+b.y+':'+b.level,b.shape);
    const shapeAt=(x:number,y:number,level:number):SanctuaryBlockShape=>
      shapeMap.get(x+':'+y+':'+level)??'solid';
    const indexed=new Map<string,{
      ground:boolean;id:number;shape:SanctuaryBlockShape;
      cells:Cell[];cap?:MarbleEdgeExposure;
    }>();
    const add=(id:number,ground:boolean,shape:SanctuaryBlockShape,cell:Cell)=>{
      const cap=!ground && id===Block.MARBLE_CELESTIAL && shape!=='v3_face'
        ? marbleTopExposure(this.world,cell.x,cell.y,cell.level,shape,shapeAt)
        : undefined;
      const key=(ground?'g':'b')+':'+id+':'+shape+
        (cap?':'+marbleExposureKey(cap):'');
      let entry=indexed.get(key);
      if(!entry){entry={id,ground,shape,cells:[],cap};indexed.set(key,entry);}
      entry.cells.push(cell);
    };
    for(const g of cells.grounds)
      add(g.id,true,'solid',{...g,level:-1});
    for(const b of cells.blocks)
      add(b.id,false,b.shape,b);
    for(const entry of indexed.values()){
      const geometry=entry.ground?this.floorGeometry:
        entry.shape==='v3_face'?this.v3FaceGeometry:
        entry.shape==='v3_top'?this.v3TopGeometry:
        entry.shape==='v3_top_half'?this.v3HalfTopGeometry:
        entry.shape==='solid'?this.solidGeometry:
        entry.shape==='wall_corner_back_left'?this.cornerLeftGeometry:
        entry.shape==='wall_corner_back_right'?this.cornerRightGeometry:
        this.wallGeometry;
      const mats=this.material(entry.id);
      const mesh=new THREE.InstancedMesh(
        geometry,entry.ground?mats.ground:
          entry.cap?this.marbleCapMaterial(entry.cap,entry.shape):mats.block,entry.cells.length,
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

  private readonly onContextLost=(e:Event):void=>{
    e.preventDefault();
    this.contextLost=true;
  };

  private readonly onContextRestored=():void=>{
    this.contextLost=false;
    this.signature=''; // refaz as malhas no próximo quadro
    this.actorTexture.needsUpdate=true;
    for(const cap of this.marbleCapVariants.values())cap.texture.needsUpdate=true;
    for(const group of this.materials.values())for(const t of group.textures)t.needsUpdate=true;
  };

  stats():RendererStats{
    const i=this.gpu.info;
    return{
      calls:i.render.calls,triangles:i.render.triangles,
      geometries:i.memory.geometries,textures:i.memory.textures,
      contextLost:this.contextLost,
    };
  }

  private syncCamera(cam:Camera):void{
    const w=cam.width,h=cam.height;
    const halfH=h/(TILE*cam.zoom*2);
    const halfW=w/(TILE*cam.zoom*2);
    this.camera.left=-halfW;this.camera.right=halfW;
    this.camera.top=halfH;this.camera.bottom=-halfH;
    this.camera.updateProjectionMatrix();
    // Same world XY axes, orthographic perspective with real visible front
    // faces: elevated +Y is height; positive Z is the screen-facing front.
    const focusX=cam.x/TILE;
    const focusZ=cam.y/TILE;
    if(this.view==='oblique'){
      // Câmera reta para baixo (topo da tela = norte) e projeção oblíqua montada à mão (`sanctuaryObliqueView.ts`).
      this.camera.up.set(0,0,-1);
      this.camera.position.set(focusX,OBLIQUE_CAMERA_HEIGHT,focusZ);
      this.camera.lookAt(focusX,0,focusZ);
      this.camera.updateMatrixWorld();
      const m=obliqueProjection(halfW,halfH);
      this.camera.projectionMatrix.set(
        m[0],m[1],m[2],m[3],m[4],m[5],m[6],m[7],m[8],m[9],m[10],m[11],m[12],m[13],m[14],m[15],
      );
      this.camera.projectionMatrixInverse.copy(this.camera.projectionMatrix).invert();
      this.obliqueHalf={w:halfW,h:halfH};
      this.obliqueFocus={x:focusX,z:focusZ};
    }else{
      const offset=sanctuaryCameraOffset();
      this.camera.position.set(focusX,offset.height,focusZ+offset.depth);
      this.camera.lookAt(focusX,0,focusZ);
      this.camera.updateMatrixWorld();
    }
    const pixelRatio=Math.min(window.devicePixelRatio||1,2);
    // Do not resize the drawing buffer for every frame or pointer event.
    if(w!==this.lastWidth||h!==this.lastHeight||pixelRatio!==this.lastPixelRatio){
      this.gpu.setPixelRatio(pixelRatio);
      this.gpu.setSize(w,h,false);
      this.lastWidth=w;
      this.lastHeight=h;
      this.lastPixelRatio=pixelRatio;
    }
  }

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
    this.goddessShadow.position.set(
      visual.shadow.x,visual.shadow.y,visual.shadow.z,
    );
    this.goddessShadow.scale.set(
      visual.shadowRadii.x,1,visual.shadowRadii.z,
    );
  }

  private updateSelection(opts:RenderOptions):void{
    const cell=opts.hover??opts.focus;
    if(cell&&cell.valid&&this.world.inBounds(cell.x,cell.y)){
      const top=this.world.stackHeight(cell.x,cell.y);
      const v3=this.view==='tilt'&&this.world.isMarbleV3Cell(cell.x,cell.y);
      // O realce acompanha a mesma projeção em tela do topo V3.
      const visualZ=cell.y+0.5+(v3?sanctuaryV3ScreenAnchorOffset():0);
      this.highlight.position.set(cell.x+0.5,(v3?sanctuaryV3VisualHeight():top)+0.03,visualZ);
      this.highlight.visible=true;
    }else this.highlight.visible=false;
    const breaking=opts.breaking;
    if(breaking&&this.world.inBounds(breaking.x,breaking.y)){
      const h=this.world.stackHeight(breaking.x,breaking.y);
      const v3=this.view==='tilt'&&this.world.isMarbleV3Cell(breaking.x,breaking.y);
      const visualZ=breaking.y+0.5+(v3?sanctuaryV3ScreenAnchorOffset():0);
      this.breakHighlight.position.set(breaking.x+0.5,(v3?sanctuaryV3VisualHeight():h)+0.04,visualZ);
      this.breakHighlight.material.opacity=Math.min(0.58,0.12+0.46*breaking.progress);
      this.breakHighlight.visible=true;
    }else this.breakHighlight.visible=false;
  }

  draw(cam:Camera,opts:RenderOptions):void{
    if(this.disposed||this.contextLost)return;
    const signature=this.worldSignature();
    if(this.signature!==signature){
      this.buildWorld();
      this.signature=signature;
    }
    this.syncCamera(cam);
    this.drawGoddess(opts);
    this.updateSelection(opts);
    this.gpu.render(this.scene,this.camera);
  }

  pick(cam:Camera,sx:number,sy:number):{x:number;y:number;hasObject:boolean}{
    if(this.disposed)return{x:0,y:0,hasObject:false};
    this.syncCamera(cam);
    if(this.groups.length===0)this.buildWorld();
    this.pointer.set(sx/cam.width*2-1,1-sy/cam.height*2);
    if(this.view==='oblique'){
      // Na projeção oblíqua o raio não é perpendicular à tela: sobe 1 de altura a cada K de célula para o sul.
      const r=obliqueRay(this.pointer.x,this.pointer.y,this.obliqueHalf.w,this.obliqueHalf.h,this.obliqueFocus);
      this.raycaster.set(new THREE.Vector3(...r.origin),new THREE.Vector3(...r.dir));
    }else this.raycaster.setFromCamera(this.pointer,this.camera);
    const found=this.raycaster.intersectObjects(this.groups.map(e=>e.mesh),false);
    for(const hit of found){
      const group=this.groups.find(e=>e.mesh===hit.object);
      const cell=group?.cells[hit.instanceId??-1];
      if(cell)return{x:cell.x,y:cell.y,hasObject:cell.level>=0};
    }
    // Unoccupied space: derive a cell only from the floor plane.
    const plane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
    const point=new THREE.Vector3();
    if(this.raycaster.ray.intersectPlane(plane,point))
      return{x:Math.floor(point.x),y:Math.floor(point.z),hasObject:false};
    return{x:0,y:0,hasObject:false};
  }

  addDamage(_x:number,_y:number,_hit:Hit,_target:'enemy'|'player'):void {
    // The Santuário profile has no combat; the hook remains compatible with Game.
  }

  iconFor(id:BlockId):string{
    return art().celestialIcons[id]??'';
  }

  dispose():void{
    if(this.disposed)return;
    this.disposed=true;
    this.canvas.removeEventListener('webglcontextlost',this.onContextLost);
    this.canvas.removeEventListener('webglcontextrestored',this.onContextRestored);
    for(const group of this.groups){
      this.scene.remove(group.mesh);
      group.mesh.dispose();
    }
    this.groups.length=0;
    for(const group of this.materials.values()){
      for(const m of new Set([...group.block,...group.ground]))m.dispose();
      for(const t of group.textures)t.dispose();
    }
    this.materials.clear();
    for(const cap of this.marbleCapVariants.values()){
      cap.topMaterial.dispose();
      cap.texture.dispose();
    }
    this.marbleCapVariants.clear();
    for(const g of [this.floorGeometry,this.solidGeometry,this.wallGeometry,
      this.v3FaceGeometry,this.v3TopGeometry,this.v3HalfTopGeometry,
      this.cornerLeftGeometry,this.cornerRightGeometry,
      this.highlight.geometry,this.breakHighlight.geometry,
      this.goddessShadow.geometry,this.goddess.geometry])g.dispose();
    this.highlight.material.dispose();
    this.breakHighlight.material.dispose();
    this.actorTexture.dispose();
    this.goddess.material.dispose();
    this.goddessGhost.material.dispose();
    this.goddessShadow.material.dispose();
    this.gpu.dispose();
  }
}
