import { SUBDIV } from '../config';
import { describe,expect,it } from 'vitest';
import { Block } from '../world/blocks';
import { MONSTER_STATS } from '../world/progression';
import { Item, monsterDrops } from '../world/items';
import { World } from '../world/world';
import { GOBLIN_PACK_SIZE } from '../world/goblins';
import { Entities } from './entities';
import { Monster, GOBLIN_SIGHT, GOBLIN_WINDUP, MONSTERS } from './monster';
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
        Math.hypot(m.homeX-(c.x+0.5),m.homeY-(c.y+0.5))<5*SUBDIV);
      expect(pack).toHaveLength(7);
      expect(w.getObject(c.x,c.y)).toBe(Block.CAMPFIRE);
      expect(pack.every(m=>m.maxHp===60&&m.hp===60)).toBe(true);
      expect(pack.every(m=>m.insideAt(m.x,m.y))).toBe(true);
    }
  });

  it('vida 60, ataque nominal 15 e visão exatamente 3 células, como os lobos',()=>{
    expect(MONSTER_STATS.goblin).toMatchObject({hp:60,attack:15});
    expect(GOBLIN_SIGHT).toBe(3*SUBDIV); // 3 células na grade 1: a mesma distância em pixels
    expect(MONSTERS.goblin.sight).toBe(3*SUBDIV);
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

  it('goblin só ataca ao alcance físico: arma o ataque (pose + tempo) e o dano sai depois, com ritmo de combate',()=>{
    const {w}=camp();
    const c=w.goblinCamps[0];
    const [cx,cy]=c.slots[0];
    const m=new Monster('goblin',cx+0.5,cy+0.5,goblinBounds(cx,cy),()=>0.5);
    const near={x:m.x+1.1,y:m.y};
    expect(m.tryBite({x:m.x+3.1,y:m.y})).toBe(false);
    // Ao chegar: começa a armar (sem dano ainda), tocando a pose de ataque.
    expect(m.tryBite(near)).toBe(false);
    expect(m.visualState).toBe('attack');
    m.update(GOBLIN_WINDUP/2,w,near);
    expect(m.tryBite(near)).toBe(false);
    // Passado o tempo de armar, o dano sai uma vez e começa a espera entre mordidas.
    m.update(GOBLIN_WINDUP,w,near);
    expect(m.tryBite(near)).toBe(true);
    expect(m.tryBite(near)).toBe(false);
    m.update(1.3,w,{x:m.x+30,y:m.y+30});
    expect(m.tryBite(near)).toBe(false); // arma de novo
    m.update(GOBLIN_WINDUP+0.01,w,near);
    expect(m.tryBite(near)).toBe(true);
  });

  it('dá para esquivar do ataque armado, e um golpe recebido durante o armar o cancela',()=>{
    const {w}=camp();
    const [cx,cy]=w.goblinCamps[0].slots[0];
    const mk=()=>new Monster('goblin',cx+0.5,cy+0.5,goblinBounds(cx,cy),()=>0.5);
    // Esquiva: a personagem sai do alcance antes do dano.
    const a=mk();
    const near={x:a.x+1.1,y:a.y}, far={x:a.x+4,y:a.y};
    a.tryBite(near);
    for(let i=0;i<9;i++)a.update(0.05,w,far);
    expect(a.tryBite(far)).toBe(false);
    // Interrupção: levar um golpe no meio do armar não deixa o dano sair.
    const b=mk();
    b.tryBite(near);
    b.takeHit(1,b.x-1,b.y,w);
    b.update(1,w,near);
    expect(b.tryBite(near)).toBe(false); // recomeça a armar do zero
    b.update(GOBLIN_WINDUP+0.01,w,near);
    expect(b.tryBite(near)).toBe(true);
  });

  it('aranhas continuam mordendo na hora (sem armar)',()=>{
    const {w}=camp();
    const m=new Monster('spider-small',0.5,0.5,{x0:-9,y0:-9,x1:9,y1:9},()=>0.5);
    void w;
    expect(m.tryBite({x:m.x+0.3,y:m.y})).toBe(true);
  });

  it('o recuo cresce com o dano e com o crítico (knock)',()=>{
    const {w}=camp();
    const [cx,cy]=w.goblinCamps[0].slots[0];
    const dist=(knock:number)=>{
      const m=new Monster('goblin',cx+0.5,cy+0.5,goblinBounds(cx,cy),()=>0.5);
      const x0=m.x,y0=m.y;
      m.takeHit(1,m.x-1,m.y,w,undefined,knock);
      return Math.hypot(m.x-x0,m.y-y0);
    };
    expect(dist(1.6)).toBeGreaterThan(dist(1));
    expect(dist(1)).toBeGreaterThan(0);
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

describe('Homem-lagarto e streaming dos bandos (v0.93.60)',()=>{
  it('ficha: vida 100, ataque 15 e 2 moedas de cobre; folhas de pose como as do goblin',()=>{
    expect(MONSTER_STATS.lizard).toMatchObject({hp:100,attack:15});
    expect(monsterDrops('lizard')).toEqual([{item:Item.COPPER_COIN,count:2}]);
    const {w,e}=camp();
    const m=new Monster('lizard',0.5,0.5,{x0:-5,y0:-5,x1:5,y1:5},()=>0.5);
    e.monsters.push(m);
    m.presentationState='attack';
    expect(e.actors.find(a=>a.x===m.x&&a.y===m.y)?.kind).toBe('lizard-attack');
    m.presentationState='walk';
    expect(e.actors.find(a=>a.x===m.x&&a.y===m.y)?.kind).toBe('lizard');
    void w;
  });

  it('spawnWildlife(stream) não cria bandos; update cria só os que têm jogador perto e remove ao se afastar',()=>{
    const w=new World(42);
    const [sx,sy]=w.findSpawn();
    const p=new Player(sx+0.5,sy+0.6);
    const e=new Entities(p,()=>0.5);
    e.spawnWildlife(w,true);
    expect(e.monsters.filter(m=>m.kind==='goblin'||m.kind==='lizard')).toHaveLength(0);
    // Põe o jogador no acampamento mais longe da cidade e deixa o streaming rodar.
    const c=w.goblinCamps[0];
    p.x=c.x+0.5;p.y=c.y+0.5+3;
    e.update(0.6,w);
    const near=e.monsters.filter(m=>m.kind==='goblin');
    expect(near.length).toBeGreaterThanOrEqual(7);
    expect(near.length).toBeLessThan(7*30);
    // Longe de tudo: os bandos saem.
    p.x=c.x+0.5+200*SUBDIV;p.y=c.y+0.5;
    e.update(0.6,w);
    expect(e.monsters.some(m=>m.homeX>c.x-6*SUBDIV&&m.homeX<c.x+6*SUBDIV&&m.homeY>c.y-6*SUBDIV&&m.homeY<c.y+6*SUBDIV&&m.kind==='goblin')).toBe(false);
  });

  it('bandos de lagarto nascem com três e voltam completos',()=>{
    const w=new World(42);
    const pack=w.lizardPacks[0];
    const e=new Entities(new Player(pack.x+0.5,pack.y+0.5+2),()=>0.5);
    e.spawnWildlife(w,true);
    e.update(0.6,w);
    const mine=e.monsters.filter(m=>m.kind==='lizard'&&Math.abs(m.homeX-pack.x-0.5)<5*SUBDIV&&Math.abs(m.homeY-pack.y-0.5)<5*SUBDIV);
    expect(mine).toHaveLength(3);
    expect(mine.every(m=>m.hp===100&&m.maxHp===100)).toBe(true);
  });
});
