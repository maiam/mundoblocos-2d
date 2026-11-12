import { describe, expect, it } from 'vitest';
import { Block } from '../world/blocks';
import { World } from '../world/world';
import { WORLD_PROFILES } from '../world/profiles';
import { marbleTopExposure } from './sanctuaryMarbleAdaptive';
import {
  classifySanctuaryBlock, sanctuary3DGeometryCells, sanctuaryBlockTransform, sanctuaryV3ScreenAnchorOffset,
} from './sanctuaryThreeLayout';
import { createSanctuaryV3Surfaces } from './sanctuaryV3Surfaces';
import { SANCTUARY_CAMERA_ELEVATION_DEG } from './sanctuaryCameraRig';

const id=Block.MARBLE_CELESTIAL;
const create=()=>new World(77,WORLD_PROFILES.santuario);
const pos=(world:World):[number,number]=>{
  const [sx,sy]=world.findSpawn();
  return [sx+3,sy+4];
};
const shapes=(world:World,x:number,lo:number,hi:number)=>
  Array.from({length:hi-lo+1},(_,i)=>classifySanctuaryBlock(world,id,x,lo+i,1));

describe('Malhas visuais V3 — uma face + cobertura sem duplicação',()=>{
  it('malhas são somente superfícies: 1 face +Y? não, +Z; topo +Y',()=>{
    const {face,top,halfTop}=createSanctuaryV3Surfaces();
    try {
      expect(face.index?.count).toBe(6);
      expect(top.index?.count).toBe(6);
      expect(halfTop.index?.count).toBe(6);
      expect(face.groups).toEqual([{start:0,count:6,materialIndex:4}]);
      expect(top.groups).toEqual([{start:0,count:6,materialIndex:2}]);
      expect(halfTop.groups).toEqual([{start:0,count:6,materialIndex:2}]);

      const bounds=(geo:typeof face)=>{
        const p=geo.getAttribute('position');
        const xs:number[]=[],ys:number[]=[],zs:number[]=[];
        for(let i=0;i<p.count;i++){
          xs.push(p.getX(i));ys.push(p.getY(i));zs.push(p.getZ(i));
        }
        const six=(v:number)=>{const n=Math.round(v*1_000_000)/1_000_000;return n===0?0:n;};
        return {
          x:[six(Math.min(...xs)),six(Math.max(...xs))],
          y:[six(Math.min(...ys)),six(Math.max(...ys))],
          z:[six(Math.min(...zs)),six(Math.max(...zs))],
        };
      };
      expect(bounds(face)).toEqual({x:[-0.5,0.5],y:[-1,1],z:[-0.5,-0.5]});
      expect(bounds(top)).toEqual({x:[-0.5,0.5],y:[0,0],z:[-0.5,0.5]});
      expect(bounds(halfTop)).toEqual({x:[-0.5,0.5],y:[0,0],z:[0,0.5]});

      for(const geo of [face,top,halfTop])expect(geo.getAttribute('normal').count).toBe(4);
    } finally {
      face.dispose(); top.dispose(); halfTop.dispose();
    }
  });

  it('face se alinha ao meio-topo acima: sem faixa de topo extra na base',()=>{
    const face=sanctuaryBlockTransform({x:1,y:5,level:1,shape:'v3_face'});
    const half=sanctuaryBlockTransform({x:1,y:4,level:1,shape:'v3_top_half'});
    const full=sanctuaryBlockTransform({x:1,y:4,level:1,shape:'v3_top'});
    const offset=sanctuaryV3ScreenAnchorOffset();
    expect(face).toEqual({x:1.5,y:1,z:5.5+offset,width:1,height:2,depth:0});
    expect(half).toEqual({x:1.5,y:2,z:4.5+offset,width:1,height:0,depth:0.5});
    expect(full).toEqual({x:1.5,y:2,z:4.5+offset,width:1,height:0,depth:1});
    // A face está na borda norte da base, transladada para corrigir a
    // projeção da câmera; a meia superfície de cima encosta nela.
    expect(face.z-0.5).toBeCloseTo(half.z+0.5);
    expect(half.z+0.5).toBeCloseTo(full.z+0.5);

    // Projeção ortográfica: a elevação da câmera faz Y>0 parecer
    // mais ao norte. O deslocamento cancela exatamente esse efeito no
    // topo da face e nas coberturas. A face deve caber na célula clicada.
    const tan=Math.tan(SANCTUARY_CAMERA_ELEVATION_DEG*Math.PI/180);
    const projectedRow=(z:number,height:number)=>z-height/tan;
    const faceZ=face.z-0.5;
    expect(projectedRow(faceZ,2)).toBeCloseTo(5); // topo da face na base clicada
    expect(projectedRow(faceZ,0)).toBeGreaterThan(5);
    expect(projectedRow(faceZ,0)).toBeLessThan(6);
    // O meio-topo só pode aparecer na célula imediatamente acima (4,1).
    expect(projectedRow(half.z,2)).toBeCloseTo(4.5);
    expect(projectedRow(half.z+0.5,2)).toBeCloseTo(5);
    // Não mover a câmera nem os blocos lógicos para obter esse resultado.
    expect(faceZ).toBeCloseTo(5+offset);
  });

  it('isolada ocupa duas células físicas e desenha exatamente F + meio-topo',()=>{
    const world=create(),[x,y]=pos(world);
    expect(world.placeBlock(x,y,id)).toBe(true);
    expect(shapes(world,x,y-1,y)).toEqual(['v3_top_half','v3_face']);
    const scene=sanctuary3DGeometryCells(world,{x0:x,x1:x,y0:y-1,y1:y});
    expect(scene.blocks.map(c=>[c.y,c.level,c.shape])).toEqual([
      [y-1,1,'v3_top_half'],[y,1,'v3_face'],
    ]);
    expect(world.stackHeight(x,y)).toBe(2);
    expect(world.stackHeight(x,y-1)).toBe(2);
  });

  it('muda a aparência ao adicionar uma parede sem mover nenhuma base lógica',()=>{
    const world=create(),[x,y]=pos(world);
    expect(world.placeBlock(x,y,id)).toBe(true);
    const original=sanctuary3DGeometryCells(world,{x0:x,x1:x,y0:y-3,y1:y});
    const face=original.blocks.find(b=>b.shape==='v3_face');
    const half=original.blocks.find(b=>b.shape==='v3_top_half');
    expect(face).toMatchObject({x,y});
    expect(half).toMatchObject({x,y:y-1});
    expect(world.placeBlock(x,y-2,id)).toBe(true);
    const after=sanctuary3DGeometryCells(world,{x0:x,x1:x,y0:y-3,y1:y});
    expect(after.blocks.map(b=>[b.y,b.shape])).toEqual([
      [y-3,'v3_top_half'],[y-2,'v3_top'],[y-1,'v3_top'],[y,'v3_face'],
    ]);
    const tan=Math.tan(SANCTUARY_CAMERA_ELEVATION_DEG*Math.PI/180);
    for(const item of after.blocks){
      const tr=sanctuaryBlockTransform(item);
      const logicalScreenRow=tr.z-(item.shape==='v3_face'?0.5:0)-tr.y/tan;
      // O topo inteiro se projeta sobre sua própria linha lógica,
      // e a face ocupa a linha clicada (com comprimento projetado < 1).
      expect(logicalScreenRow).toBeGreaterThanOrEqual(item.y-0.01);
      expect(logicalScreenRow).toBeLessThanOrEqual(item.y+1.01);
    }
    expect(world.marbleV3PlacementBases()).toEqual([[x,y],[x,y-2]]);
  });

  it('sequência vertical não repete faces: F + topos inteiros + meio-topo',()=>{
    const world=create(),[x,y]=pos(world);
    expect(world.placeBlock(x,y,id)).toBe(true);
    expect(world.placeBlock(x,y-2,id)).toBe(true);
    expect(shapes(world,x,y-3,y)).toEqual([
      'v3_top_half','v3_top','v3_top','v3_face',
    ]);
    const scene=sanctuary3DGeometryCells(world,{x0:x,x1:x,y0:y-3,y1:y});
    expect(scene.blocks).toHaveLength(4);
    expect(scene.blocks.filter(c=>c.shape==='v3_face')).toHaveLength(1);
    expect(scene.blocks.filter(c=>c.shape==='v3_top_half')).toHaveLength(1);
    expect(scene.blocks.filter(c=>c.shape==='v3_top')).toHaveLength(2);
  });

  it('horizontal de cinco tem só cinco faces + cinco meios-topos',()=>{
    const world=create(),[x,y]=pos(world);
    for(let dx=0;dx<5;dx++)expect(world.placeBlock(x+dx,y,id)).toBe(true);
    const scene=sanctuary3DGeometryCells(world,{x0:x,x1:x+4,y0:y-1,y1:y});
    expect(scene.blocks).toHaveLength(10);
    expect(scene.blocks.filter(c=>c.shape==='v3_face')).toHaveLength(5);
    expect(scene.blocks.filter(c=>c.shape==='v3_top_half')).toHaveLength(5);
    expect(scene.blocks.filter(c=>c.shape==='v3_top')).toHaveLength(0);
    const shapeAt=(xx:number,yy:number,ll:number)=>
      classifySanctuaryBlock(world,id,xx,yy,ll);
    const middle=marbleTopExposure(world,x+2,y-1,1,'v3_top_half',shapeAt);
    expect(middle.west.every(hidden=>hidden===false)).toBe(true);
    expect(middle.east.every(hidden=>hidden===false)).toBe(true);
    expect(middle.south).toBe(true); // topo encontra a face, não outro topo
  });
});
