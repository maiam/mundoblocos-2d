import { describe, expect, it } from 'vitest';
import { Block } from '../world/blocks';
import { World } from '../world/world';
import { WORLD_PROFILES } from '../world/profiles';
import { marbleTopExposure } from './sanctuaryMarbleAdaptive';
import {
  classifySanctuaryBlock, sanctuary3DGeometryCells, sanctuaryBlockTransform,
} from './sanctuaryThreeLayout';
import { createSanctuaryV3Surfaces } from './sanctuaryV3Surfaces';

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
    expect(face).toEqual({x:1.5,y:1,z:5.5,width:1,height:2,depth:0});
    expect(half).toEqual({x:1.5,y:2,z:4.5,width:1,height:0,depth:0.5});
    expect(full).toEqual({x:1.5,y:2,z:4.5,width:1,height:0,depth:1});
    // O plano frontal está na borda norte da base: z=5.
    expect(face.z-0.5).toBe(half.z+0.5);
    expect(half.z+0.5).toBe(full.z+0.5);
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
