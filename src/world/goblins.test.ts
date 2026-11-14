import { describe,expect,it } from 'vitest';
import { World } from './world';
import { Block } from './blocks';
import { WORLD_PROFILES } from './profiles';
import { CHUNK_SIZE, SUBDIV } from '../config';
import { GOBLIN_PACK_SIZE, GOBLIN_CAMP_SLOTS, goblinRoam, LIZARD_PACK_SIZE, PACK_REGION } from './goblins';
import { toChunk, toLocal } from './coords';

describe('Acampamentos goblins — mapa aberto de Orvalis',()=>{
  it('gera um acampamento por região (1 a cada 16 chunks) com fogueiras reais e sete lugares em torno delas',()=>{
    for(const seed of [42,20261106,7]){
      const w=new World(seed);
      // Muito mais que os 4 de antes (densidade por região), no máximo um por região.
      expect(w.goblinCamps.length).toBeGreaterThan(100);
      const regions=new Set(w.goblinCamps.map(c=>`${Math.floor(c.x/PACK_REGION)},${Math.floor(c.y/PACK_REGION)}`));
      expect(regions.size).toBe(w.goblinCamps.length);
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

  it('bandos de homem-lagarto: três por bando, na margem de rios, em chão livre e determinísticos',()=>{
    for(const seed of [42,7,1234]){
      const w=new World(seed);
      expect(w.lizardPacks.length).toBeGreaterThan(10);
      for(const p of w.lizardPacks){
        expect(p.slots).toHaveLength(LIZARD_PACK_SIZE);
        for(const [x,y] of p.slots){
          expect(w.isWalkable(x,y)).toBe(true);
          expect(w.getObject(x,y)).toBe(Block.AIR);
        }
        // Perto de água (o rio fica a até 4 células da margem escolhida).
        let water=false;
        for(let dy=-5*SUBDIV;dy<=5*SUBDIV&&!water;dy++)for(let dx=-5*SUBDIV;dx<=5*SUBDIV;dx++){
          if(w.generator.groundAt(p.x+dx,p.y+dy)===Block.WATER){water=true;break;}
        }
        expect(water).toBe(true);
      }
      expect(new World(seed).lizardPacks).toEqual(w.lizardPacks);
    }
  });

  it('Santuário não recebe acampamentos, goblins nem novas fogueiras',()=>{
    const w=new World(42,WORLD_PROFILES.santuario);
    expect(w.goblinCamps).toEqual([]);
    expect(w.lizardPacks).toEqual([]);
    expect(w.findSpawn()).toBeTruthy();
  });
});
