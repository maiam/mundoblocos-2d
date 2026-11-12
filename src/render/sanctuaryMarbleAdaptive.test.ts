import { describe, expect, it, vi } from 'vitest';
import { Block, type BlockId } from '../world/blocks';
import { classifySanctuaryBlock, sanctuaryBlockTransform } from './sanctuaryThreeLayout';
import {
  classifyMarbleProfile, drawMarbleAdaptiveTop, marbleExposureKey,
  marbleTopExposure, marbleFootprint, type MarbleEdgeExposure,
} from './sanctuaryMarbleAdaptive';
import {
  sanctuaryCameraOffset, SANCTUARY_CAMERA_ELEVATION_DEG,
} from './sanctuaryCameraRig';

const marble=Block.MARBLE_CELESTIAL;
const build=(points:Array<[number,number,number,BlockId]>)=>{
  const cells=new Map(points.map(([x,y,z,id])=>[`${x}:${y}:${z}`,id]));
  return {getLevel(x:number,y:number,z:number):BlockId {
    return cells.get(`${x}:${y}:${z}`)??Block.AIR;
  }};
};
const rectangle=(w:number,h:number):Array<[number,number,number,BlockId]>=>{
  const a:Array<[number,number,number,BlockId]>=[];
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)
    if(x===0||y===0||x===w-1||y===h-1)a.push([x,y,0,marble]);
  return a;
};
const exposure=(world:ReturnType<typeof build>,x:number,y:number,z=0)=>
  marbleTopExposure(world,x,y,z,
    classifySanctuaryBlock(world,marble,x,y,z),
    (xx,yy,zz)=>classifySanctuaryBlock(world,marble,xx,yy,zz));

describe('Santuário — teste de mármore celestial com bordas dinâmicas',()=>{
  it('classifica faixa traseira e dianteira da sala 3x3 e mantém colunas nos cantos',()=>{
    const w=build(rectangle(3,3));
    expect(classifyMarbleProfile(w,1,0)).toBe('wall_back');
    expect(classifyMarbleProfile(w,1,2)).toBe('wall_front');
    expect(classifyMarbleProfile(w,0,0)).toBe('pillar');
    expect(classifyMarbleProfile(w,2,2)).toBe('pillar');
    expect(classifyMarbleProfile(w,0,1)).toBe('pillar'); // sem paredes verticais
    expect(classifySanctuaryBlock(w,marble,1,0,0)).toBe('wall_back');
    expect(classifySanctuaryBlock(w,marble,1,2,0)).toBe('wall_front');
  });

  it('identifica paredes largas 5x5, sem afinar uma massa 3x3 sólida',()=>{
    const w=build(rectangle(5,5));
    for(const x of [1,2,3]){
      expect(classifySanctuaryBlock(w,marble,x,0,0)).toBe('wall_back');
      expect(classifySanctuaryBlock(w,marble,x,4,0)).toBe('wall_front');
    }
    const full:Array<[number,number,number,BlockId]>=[];
    for(let x=0;x<3;x++)for(let y=0;y<3;y++)full.push([x,y,0,marble]);
    const block=build(full);
    for(const [x,y] of full) expect(classifyMarbleProfile(block,x,y)).toBe('pillar');
  });

  it('mantém uma fileira solta alinhada à frente, como antes',()=>{
    const w=build([0,1,2,3,4].map(x=>[x,7,0,marble]));
    for(const x of [1,2,3])expect(classifyMarbleProfile(w,x,7)).toBe('wall_front');
  });

  it('ancora a parede do fundo no fundo do pilar e a da frente na frente',()=>{
    const pillar=sanctuaryBlockTransform({x:1,y:0,level:0,shape:'solid'});
    const back=sanctuaryBlockTransform({x:1,y:0,level:0,shape:'wall_back'});
    const front=sanctuaryBlockTransform({x:1,y:0,level:0,shape:'wall_front'});
    expect(pillar).toMatchObject({z:0.5,depth:1});
    expect(back).toMatchObject({z:0.25,depth:0.5});
    expect(front).toMatchObject({z:0.75,depth:0.5});
    expect(back.z-back.depth/2).toBe(pillar.z-pillar.depth/2);
    expect(front.z+front.depth/2).toBe(pillar.z+pillar.depth/2);
    expect(marbleFootprint(0,'wall_back')).toEqual({rear:0,front:0.5});
    expect(marbleFootprint(0,'wall_front')).toEqual({rear:0.5,front:1});
  });

  it('o segundo nível herda a mesma âncora mesmo com textura diferente',()=>{
    const cells=rectangle(3,3);
    cells.push([1,0,1,Block.MARBLE_ORNATE],[1,2,1,Block.STONE_GOLDEN]);
    const w=build(cells);
    expect(classifySanctuaryBlock(w,Block.MARBLE_ORNATE,1,0,1)).toBe('wall_back');
    expect(classifySanctuaryBlock(w,Block.STONE_GOLDEN,1,2,1)).toBe('wall_front');
    expect(classifySanctuaryBlock(w,Block.CLOUD_SOLID,1,0,1)).toBe('solid');
  });

  it('oculta a moldura do pilar somente na meia face que encontra a parede',()=>{
    const w=build(rectangle(3,3));
    // Rear wall joins rear half of left pillar at (0,0).
    const backPillar=exposure(w,0,0);
    expect(backPillar.eastBack).toBe(false);
    expect(backPillar.eastFront).toBe(true);
    // Front wall joins front half of left pillar at (0,2).
    const frontPillar=exposure(w,0,2);
    expect(frontPillar.eastBack).toBe(true);
    expect(frontPillar.eastFront).toBe(false);
    // The thin top itself has no redundant side frame towards the pillars.
    const topBack=exposure(w,1,0);
    expect(topBack.westBack).toBe(false);
    expect(topBack.westFront).toBe(false);
    expect(topBack.eastBack).toBe(false);
    expect(topBack.eastFront).toBe(false);
    // Outer and inner north/south edges remain decorated.
    expect(topBack.north).toBe(true);
    expect(topBack.south).toBe(true);
  });

  it('gera no máximo 64 variantes previsíveis de moldura',()=>{
    const mask:MarbleEdgeExposure={
      north:true,south:false,westBack:true,westFront:false,
      eastBack:false,eastFront:true,
    };
    expect(marbleExposureKey(mask)).toBe('101001');
    expect(marbleExposureKey({...mask,north:false})).not.toBe(marbleExposureKey(mask));
  });

  it('usa o novo topo no perímetro e apaga a moldura das bordas internas',()=>{
    const calls:unknown[][]=[];
    const ctx={
      clearRect:vi.fn(),
      drawImage:vi.fn((...args:unknown[])=>calls.push(args)),
    } as unknown as CanvasRenderingContext2D;
    const source={width:1254,height:1254} as HTMLImageElement;
    const noEdges:MarbleEdgeExposure={
      north:false,south:false,westBack:false,westFront:false,
      eastBack:false,eastFront:false,
    };
    drawMarbleAdaptiveTop(ctx,source,noEdges,256);
    expect(calls).toHaveLength(1); // only the unframed marble center
    expect(ctx.clearRect).toHaveBeenCalledWith(0,0,256,256);
    calls.length=0;
    drawMarbleAdaptiveTop(ctx,source,{...noEdges,north:true,westBack:true},256);
    expect(calls.length).toBe(4); // center, north rail, west half, corner
    calls.length=0;
    drawMarbleAdaptiveTop(ctx,source,{
      north:true,south:true,westBack:true,westFront:true,
      eastBack:true,eastFront:true,
    },256);
    expect(calls).toHaveLength(1); // isolated block uses the exact new picture
    expect(calls[0].slice(1)).toEqual([0,0,1254,1254,0,0,256,256]);
  });

  it('câmera superior fica a 67° sem yaw isométrico',()=>{
    const {height,depth}=sanctuaryCameraOffset();
    expect(SANCTUARY_CAMERA_ELEVATION_DEG).toBe(67);
    expect(height).toBe(37);
    expect(depth).toBeGreaterThan(15);
    expect(depth).toBeLessThan(17);
    expect(Math.atan2(height,depth)*180/Math.PI).toBeCloseTo(67,5);
  });
});
