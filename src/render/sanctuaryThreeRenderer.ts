import * as THREE from 'three';
import { CHUNK_SIZE, TILE } from '../config';
import type { Camera } from '../game/camera';
import { ActorSprites } from './character';
import type { RenderOptions } from './renderer';
import type { GameRenderer } from './rendererContract';
import { celestialFaces } from './celestialArt';
import { art } from './art';
import { Block, type BlockId } from '../world/blocks';
import type { World } from '../world/world';
import type { Hit } from '../world/progression';
import { sanctuary3DGeometryCells, sanctuaryBlockTransform, type SanctuaryBlockShape } from './sanctuaryThreeLayout';
import {
  drawMarbleAdaptiveTop, marbleExposureKey, marbleTopExposure,
  type MarbleEdgeExposure,
} from './sanctuaryMarbleAdaptive';
import marbleBorderTop from '../assets/santuario-marmore-celestial-topo-ornamentado.jpg';
import { sanctuaryCameraOffset } from './sanctuaryCameraRig';
import { GODDESS_BILLBOARD_CANVAS, sanctuaryGoddessVisualPlacement } from './sanctuaryGoddessVisual';

type Cell = {x:number;y:number;level:number;id:BlockId};
type MeshGroup = {mesh:any;cells:Cell[]};
type Materials = {block:any[];ground:any[];textures:any[]};
type MarbleCap = { block:any[]; topMaterial:any; texture:any };

/**
 * Official Three.js VIEW of the same World/Player that the original Game owns.
 *
 * Does NOT own game state: construction, two-level limit, collision, movement,
 * interaction, hotbar and saves remain the existing authoritative Game/World.
 * The main World is never initialized with this class; its Canvas 2D stays intact.
 */
export class SanctuaryThreeRenderer implements GameRenderer {
  private readonly scene:any;
  private readonly camera:any;
  private readonly gpu:any;
  private readonly floorGeometry:any;
  private readonly solidGeometry:any;
  private readonly wallGeometry:any;
  private readonly groups:MeshGroup[]=[];
  private readonly materials=new Map<number,Materials>();
  private readonly marbleCapVariants=new Map<string,MarbleCap>();
  private readonly marbleTopImage=new Image();
  private readonly raycaster:any;
  private readonly pointer:any;
  private readonly dummy:any;
  private readonly actorSprites=new ActorSprites();
  private readonly actorCanvas=document.createElement('canvas');
  private readonly actorContext:CanvasRenderingContext2D;
  private readonly actorTexture:any;
  private readonly goddess:any;
  private readonly goddessGhost:any;
  private readonly goddessShadow:any;
  private readonly highlight:any;
  private readonly breakHighlight:any;
  private readonly bounds:{x0:number;x1:number;y0:number;y1:number};
  private signature='';
  private disposed=false;
  private lastWidth=0;
  private lastHeight=0;
  private lastPixelRatio=0;

  constructor(canvas:HTMLCanvasElement,private readonly world:World){
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
    this.goddess.scale.set(2.45,3.0,1);
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
    const toTexture=(canvas:HTMLCanvasElement):any=>{
      const t=new THREE.CanvasTexture(canvas);
      t.colorSpace=THREE.SRGBColorSpace;
      t.anisotropy=Math.min(4,this.gpu.capabilities.getMaxAnisotropy());
      return t;
    };
    const top=toTexture(faces.top);
    const front=toTexture(faces.front);
    const ground=toTexture(faces.ground);
    const topMaterial=new THREE.MeshLambertMaterial({map:top,color:0xffffff});
    const sideMaterial=new THREE.MeshLambertMaterial({map:front,color:0xffffff});
    const groundMaterial=new THREE.MeshLambertMaterial({map:ground,color:0xffffff});
    // Three BoxGeometry: +X,-X,+Y,-Y,+Z,-Z.
    cached={
      block:[sideMaterial,sideMaterial,topMaterial,sideMaterial,sideMaterial,sideMaterial],
      ground:[sideMaterial,sideMaterial,groundMaterial,sideMaterial,sideMaterial,sideMaterial],
      textures:[top,front,ground],
    };
    this.materials.set(id,cached);
    return cached;
  }

  /** The uploaded ornate image replaces ONLY the celestial marble top.
   * Exposed edge masks are cached (up to 64 variants), leaving the existing
   * side/front textures untouched.
   */
  private marbleCapMaterial(exposure:MarbleEdgeExposure):any[] {
    const base=this.material(Block.MARBLE_CELESTIAL).block;
    if(!this.marbleTopImage.complete || this.marbleTopImage.naturalWidth===0)
      return base;
    const key=marbleExposureKey(exposure);
    const cached=this.marbleCapVariants.get(key);
    if(cached)return cached.block;
    const canvas=document.createElement('canvas');
    canvas.width=canvas.height=256;
    const ctx=canvas.getContext('2d');
    if(!ctx)return base;
    drawMarbleAdaptiveTop(ctx,this.marbleTopImage,exposure);
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
      const cap=!ground && id===Block.MARBLE_CELESTIAL
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
        entry.shape==='solid'?this.solidGeometry:this.wallGeometry;
      const mats=this.material(entry.id);
      const mesh=new THREE.InstancedMesh(
        geometry,entry.ground?mats.ground:
          entry.cap?this.marbleCapMaterial(entry.cap):mats.block,entry.cells.length,
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
    const offset=sanctuaryCameraOffset();
    this.camera.position.set(focusX,offset.height,focusZ+offset.depth);
    this.camera.lookAt(focusX,0,focusZ);
    this.camera.updateMatrixWorld();
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
      this.highlight.position.set(cell.x+0.5,top+0.03,cell.y+0.5);
      this.highlight.visible=true;
    }else this.highlight.visible=false;
    const breaking=opts.breaking;
    if(breaking&&this.world.inBounds(breaking.x,breaking.y)){
      const h=this.world.stackHeight(breaking.x,breaking.y);
      this.breakHighlight.position.set(breaking.x+0.5,h+0.04,breaking.y+0.5);
      this.breakHighlight.material.opacity=Math.min(0.58,0.12+0.46*breaking.progress);
      this.breakHighlight.visible=true;
    }else this.breakHighlight.visible=false;
  }

  draw(cam:Camera,opts:RenderOptions):void{
    if(this.disposed)return;
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
    this.raycaster.setFromCamera(this.pointer,this.camera);
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
