import { describe,expect,it } from 'vitest';
import { Block } from '../world/blocks';
import { MONSTER_STATS } from '../world/progression';
import { World } from '../world/world';
import { GOBLIN_PACK_SIZE } from '../world/goblins';
import { Entities } from './entities';
import { Monster, GOBLIN_SIGHT, MONSTERS } from './monster';
import { Player } from './player';

function camp(seed=42){
  const w=new World(seed);
  const [sx,sy]=w.findSpawn();
  const p=new Player(sx+0.5,sy+0.6);
  const e=new Entities(p,()=>0.5);
  e.spawnWildlife(w);
  return {w,p,e};
}

describe('Goblin do Orvalis',()=>{
  it('forma grupos de sete em volta de cada fogueira, nunca dentro da cidade',()=>{
    const {w,e}=camp();
    const goblins=e.monsters.filter(m=>m.kind==='goblin');
    expect(goblins).toHaveLength(w.goblinCamps.length*GOBLIN_PACK_SIZE);
    for(const c of w.goblinCamps){
      const pack=goblins.filter(m=>
        Math.hypot(m.homeX-(c.x+0.5),m.homeY-(c.y+0.5))<5);
      expect(pack).toHaveLength(7);
      expect(w.getObject(c.x,c.y)).toBe(Block.CAMPFIRE);
      expect(pack.every(m=>m.maxHp===60&&m.hp===60)).toBe(true);
      expect(pack.every(m=>m.insideAt(m.x,m.y))).toBe(true);
    }
  });

  it('vida 60, ataque nominal 15 e visão exatamente 3 células, como os lobos',()=>{
    expect(MONSTER_STATS.goblin).toMatchObject({hp:60,attack:15});
    expect(GOBLIN_SIGHT).toBe(3);
    expect(MONSTERS.goblin.sight).toBe(3);
    expect(MONSTERS.goblin.open).toBe(true);
    const {w}=camp();
    const c=w.goblinCamps[0];
    const x=c.slots[0][0]+0.5,y=c.slots[0][1]+0.5;
    const mon=new Monster('goblin',x,y,{x0:x-12,y0:y-12,x1:x+12,y1:y+12},()=>0.5);
    expect(mon.maxHp).toBe(60);
    const far={x:x+3.2,y};
    mon.update(0.1,w,far);
    expect(mon.visualState).not.toBe('run');
    const near={x:x+2.8,y};
    mon.update(0.1,w,near);
    expect(['alert','run']).toContain(mon.visualState);
    expect(mon.visualFrame).toBeGreaterThanOrEqual(0);
  });

  it('goblin só ataca ao alcance físico, com ritmo de combate e animação',()=>{
    const {w}=camp();
    const c=w.goblinCamps[0];
    const [cx,cy]=c.slots[0];
    const m=new Monster('goblin',cx+0.5,cy+0.5,goblinBounds(cx,cy),()=>0.5);
    expect(m.tryBite({x:m.x+3.1,y:m.y})).toBe(false);
    expect(m.tryBite({x:m.x+1.1,y:m.y})).toBe(true);
    expect(m.visualState).toBe('attack');
    expect(m.tryBite({x:m.x+1,y:m.y})).toBe(false);
    m.update(1.3,w,{x:m.x+30,y:m.y+30});
    expect(m.tryBite({x:m.x+1,y:m.y})).toBe(true);
  });

  it('leva dano, mostra reação e é possível derrotá-lo',()=>{
    const {w}=camp();
    const c=w.goblinCamps[0], [cx,cy]=c.slots[0];
    const m=new Monster('goblin',cx+0.5,cy+0.5,goblinBounds(cx,cy),()=>0.5);
    m.takeHit(20,m.x+1,m.y,w);
    expect(m.hp).toBe(40);
    expect(m.visualState).toBe('hurt');
    m.takeHit(40,m.x+1,m.y,w);
    expect(m.dead).toBe(true);
    expect(MONSTERS.goblin.deathSeconds).toBeGreaterThan(0.8);
  });

  it('os 7 sprites de estado usam os IDs de atores adequados',()=>{
    const {e}=camp();
    const m=e.monsters.find(m=>m.kind==='goblin')!;
    const initial=e.actors.find(a=>a.x===m.x&&a.y===m.y);
    expect(initial?.kind).toBe('goblin-idle');
    m.presentationState='alert';
    m.presentationFrame=2;
    const alert=e.actors.find(a=>a.x===m.x&&a.y===m.y);
    expect(alert?.kind).toBe('goblin-alert');
    expect(alert?.frame).toBe(2);
    m.presentationState='attack';
    expect(e.actors.find(a=>a.x===m.x&&a.y===m.y)?.kind).toBe('goblin-attack');
    m.presentationState='run';
    expect(e.actors.find(a=>a.x===m.x&&a.y===m.y)?.kind).toBe('goblin-run');
  });

  it('uma fogueira removida não mantém um bando fantasma após recarregar',()=>{
    const {w,e}=camp();
    const fire=w.goblinCamps[0];
    const before=e.monsters.filter(m=>m.kind==='goblin').length;
    expect(w.breakBlock(fire.x,fire.y)).toBe(Block.CAMPFIRE);
    e.reconcileGoblinCamps(w);
    const after=e.monsters.filter(m=>m.kind==='goblin').length;
    expect(after).toBe(before-7);
  });
});

function goblinBounds(x:number,y:number){
  return {x0:x-11,y0:y-11,x1:x+11,y1:y+11};
}
