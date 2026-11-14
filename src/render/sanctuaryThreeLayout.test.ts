import { describe, expect, it } from 'vitest';
import { SANCTUARY_MAX_STACK } from '../config';
import { Block, type BlockId } from '../world/blocks';
import { classifySanctuaryBlock, sanctuaryBlockTransform, sanctuary3DGeometryCells } from './sanctuaryThreeLayout';

const map = (entries:Array<[number,number,number,BlockId]>,ground:BlockId=Block.CLOUD_SOLID) => {
  const cells=new Map(entries.map(([x,y,z,id])=>[x+':'+y+':'+z,id]));
  return {
    getLevel(x:number,y:number,z:number):BlockId {
      return cells.get(x+':'+y+':'+z)??Block.AIR;
    },
    getGround():BlockId {return ground;},
  };
};

describe('renderer oficial Three.js do Santuário',()=>{
  it('usa cinco níveis oficiais do Santuário (sem alterar o limite do Mundo)',()=>{
    expect(SANCTUARY_MAX_STACK).toBe(5);
    const w=map([
      [0,0,0,Block.STONE_CELESTIAL],[1,0,0,Block.STONE_CELESTIAL],
      [2,0,0,Block.STONE_CELESTIAL],[1,0,1,Block.MARBLE_ORNATE],
      [1,0,2,Block.MARBLE_ORNATE],
      [1,0,3,Block.MARBLE_ORNATE],
      [1,0,4,Block.MARBLE_ORNATE],
      [1,0,5,Block.MARBLE_ORNATE],
    ]);
    const scene=sanctuary3DGeometryCells(w,{x0:0,x1:2,y0:0,y1:0});
    expect(scene.grounds).toHaveLength(3);
    expect(scene.blocks).toHaveLength(7);
    expect(scene.blocks.some(b=>b.level===4)).toBe(true);
    expect(scene.blocks.some(b=>b.level===5)).toBe(false);
    const middle=scene.blocks.find(b=>b.level===1);
    expect(middle).toMatchObject({id:Block.MARBLE_ORNATE,shape:'thin'});
  });

  it('ancora a frente da parede no mesmo plano que o pilar',()=>{
    const pillar=sanctuaryBlockTransform({x:10,y:5,level:1,shape:'solid'});
    const wall=sanctuaryBlockTransform({x:10,y:5,level:1,shape:'thin'});
    expect(pillar).toMatchObject({x:10.5,y:1.5,z:5.5,depth:1});
    expect(wall).toMatchObject({x:10.5,y:1.5,z:5.75,depth:0.5});
    expect(pillar.z+pillar.depth/2).toBe(wall.z+wall.depth/2);
    expect(wall.z-wall.depth/2).toBe(5.5); // espaço vazio fica atrás
  });

  it('usa só a base para decidir pilar/parede dos cinco níveis',()=>{
    const w=map([
      [0,0,0,Block.STONE_CELESTIAL],[1,0,0,Block.STONE_CELESTIAL],
      [2,0,0,Block.STONE_CELESTIAL],[1,0,1,Block.MARBLE_ORNATE],
      [1,-1,1,Block.MARBLE_ORNATE], // não interfere, por ser nível alto
    ]);
    expect(classifySanctuaryBlock(w,Block.STONE_CELESTIAL,1,0,0)).toBe('thin');
    expect(classifySanctuaryBlock(w,Block.MARBLE_ORNATE,1,0,1)).toBe('thin');
    const noWall=map([[0,0,0,Block.STONE_CELESTIAL],[1,0,0,Block.STONE_CELESTIAL],
      [2,0,0,Block.STONE_CELESTIAL],[1,-1,0,Block.STONE_CELESTIAL],
      [1,0,1,Block.MARBLE_ORNATE]]);
    expect(classifySanctuaryBlock(noWall,Block.MARBLE_ORNATE,1,0,1)).toBe('solid');
  });

  it('não afina nuvem, terreno e materiais sem base construtiva',()=>{
    const w=map([[0,0,0,Block.CLOUD_SOLID],[1,0,0,Block.CLOUD_SOLID],[2,0,0,Block.CLOUD_SOLID],
      [1,0,1,Block.MARBLE_CELESTIAL]]);
    expect(classifySanctuaryBlock(w,Block.CLOUD_SOLID,1,0,0)).toBe('solid');
    expect(classifySanctuaryBlock(w,Block.MARBLE_CELESTIAL,1,0,1)).toBe('solid');
    expect(classifySanctuaryBlock(w,Block.STONE_CELESTIAL,1,0,2)).toBe('solid');
  });

  it('respeita os limites exatos de 80x32 células do perfil do Santuário',()=>{
    const w=map([]);
    const scene=sanctuary3DGeometryCells(w,{x0:-48,x1:31,y0:-16,y1:15});
    expect(scene.grounds).toHaveLength(80*32);
    expect(scene.blocks).toHaveLength(0);
    expect(scene.grounds[0]).toMatchObject({x:-48,y:-16,id:Block.CLOUD_SOLID});
    expect(scene.grounds.at(-1)).toMatchObject({x:31,y:15,id:Block.CLOUD_SOLID});
  });
});
