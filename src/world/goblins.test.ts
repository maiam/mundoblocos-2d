import { describe,expect,it } from 'vitest';
import { World } from './world';
import { Block } from './blocks';
import { WORLD_PROFILES } from './profiles';
import { CHUNK_SIZE, SUBDIV } from '../config';
import { GOBLIN_PACK_SIZE, GOBLIN_CAMP_COUNT, GOBLIN_CAMP_SLOTS, goblinRoam } from './goblins';
import { toChunk, toLocal } from './coords';

describe('Acampamentos goblins — mapa aberto de Orvalis',()=>{
  it('sempre gera quatro acampamentos com fogueiras reais e sete lugares em torno delas',()=>{
    for(const seed of [42,20261106,7]){
      const w=new World(seed);
      expect(w.goblinCamps).toHaveLength(GOBLIN_CAMP_COUNT);
      for(const c of w.goblinCamps){
        expect(c.slots).toHaveLength(GOBLIN_PACK_SIZE);
        expect(w.generator.objectAt(c.x,c.y)).toBe(Block.CAMPFIRE);
        expect(w.getObject(c.x,c.y)).toBe(Block.CAMPFIRE);
        expect(w.isProtected(c.x,c.y)).toBe(false);
        const positions=new Set<string>();
        for(const [x,y] of c.slots){
          expect(w.isWalkable(x,y)).toBe(true);
          expect(Math.hypot(x-c.x,y-c.y)).toBeGreaterThanOrEqual(2*SUBDIV);
          expect(Math.hypot(x-c.x,y-c.y)).toBeLessThanOrEqual(4*SUBDIV);
          positions.add(x+','+y);
        }
        expect(positions.size).toBe(7);
        const rect=goblinRoam(c.x,c.y);
        expect(rect.x0).toBe(c.x-11*SUBDIV);
        expect(rect.y1).toBe(c.y+11*SUBDIV);
      }
    }
    expect(GOBLIN_CAMP_SLOTS).toHaveLength(7);
  });

  it('geração pura: recarregar mesma seed preserva todos os centros e posições',()=>{
    const a=new World(20261106),b=new World(20261106);
    expect(a.goblinCamps).toEqual(b.goblinCamps);
    expect(a.goblinCamps.some((c,i)=>JSON.stringify(c)!==
      JSON.stringify(new World(42).goblinCamps[i]))).toBe(true);
  });

  it('fogueira fica no array real do chunk e pode ser quebrada normalmente',()=>{
    const w=new World(42);
    const c=w.goblinCamps[0];
    const chunk=w.loadChunk(toChunk(c.x),toChunk(c.y));
    expect(chunk.objects[toLocal(c.y)*CHUNK_SIZE+toLocal(c.x)]).toBe(Block.CAMPFIRE);
    expect(w.breakBlock(c.x,c.y)).toBe(Block.CAMPFIRE);
    expect(w.getObject(c.x,c.y)).toBe(Block.AIR);
    expect(chunk.modified).toBe(true);
  });

  it('Santuário não recebe acampamentos, goblins nem novas fogueiras',()=>{
    const w=new World(42,WORLD_PROFILES.santuario);
    expect(w.goblinCamps).toEqual([]);
    expect(w.findSpawn()).toBeTruthy();
  });
});
