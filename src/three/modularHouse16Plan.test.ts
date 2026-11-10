import { describe, expect, it } from 'vitest';
import { Player } from '../game/player';
import { sanctuaryV2Plan } from './sanctuaryV2Plan';
import { makeV2Heightfield } from './sanctuaryV2Collision';
import { HOUSE16, HOUSE16_STAIRS, ModularHouse16, makeHouse16Navigation } from './modularHouse16Plan';

const x0 = -48, y0 = -16;
const base = makeV2Heightfield(sanctuaryV2Plan().filter(
  c => c.x < HOUSE16.x || c.x >= HOUSE16.x + HOUSE16.width
    || c.y < HOUSE16.y || c.y >= HOUSE16.y + HOUSE16.depth,
), x0, y0);

describe('Construção Modular V1 — casa 16×12 por blocos', () => {
  it('has correctly spaced footprint, door, partitions and separately stored upper floors', () => {
    const house = new ModularHouse16();
    expect(HOUSE16.width).toBe(16);
    expect(HOUSE16.depth).toBe(12);
    expect(house.contains(54,18)).toBe(true);
    expect(house.contains(69,29)).toBe(true);
    expect(house.contains(70,29)).toBe(false);
    expect(house.hasWall(61,29,0)).toBe(false);
    expect(house.hasWall(61,29,4)).toBe(true);
    expect(house.hasWall(54,22,0)).toBe(true);
    expect(house.hasFloor(58,20,4)).toBe(true);
    expect(house.hasFloor(65,25,4)).toBe(false);
    expect(house.hasWall(58,23,0)).toBe(false);
    expect(house.hasWall(61,21,0)).toBe(false);
    const keys = house.pieces().map(p => `${p.x}:${p.y}:${p.level}:${p.kind}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('edits individual pieces without altering any other height or existing World', () => {
    const house = new ModularHouse16();
    const original = house.pieces().length;
    expect(house.toggle(56,20,0,'wall')).toBe(true);
    expect(house.hasWall(56,20,0)).toBe(true);
    expect(house.toggle(56,20,0,'wall')).toBe(true);
    expect(house.hasWall(56,20,0)).toBe(false);
    expect(house.toggle(56,20,4,'floor')).toBe(true);
    expect(house.hasFloor(56,20,4)).toBe(false);
    expect(house.toggle(56,20,4,'floor')).toBe(true);
    expect(house.pieces()).toHaveLength(original);
    expect(house.toggle(65,25,4,'floor')).toBe(false);
    expect(house.toggle(65,25,0,'wall')).toBe(false);
    expect(house.toggle(61,30,0,'wall')).toBe(false);
    expect(house.toggle(54,20,4,'floor')).toBe(false);
    expect(house.toggle(58,23,0,'floor')).toBe(false);
  });

  it('supports a true 4-level upstairs occupying the same (x,y) as the ground floor', () => {
    const house = new ModularHouse16();
    expect(house.support(58,20,0)).toBe(0);
    expect(house.support(58,20,4)).toBe(4);
    expect(house.support(58,20,3)).toBe(4);
    expect(house.support(58,20,2)).toBe(0);
    expect(house.support(54,20,0)).toBeNull();
    expect(house.support(55,20,0)).toBe(0);
    expect(house.support(65,25,1)).toBe(2);
    expect(house.support(65,23,3)).toBe(4);
    expect(house.support(70,20,4)).toBeUndefined();
    expect(house.floorName(61,22,0)).toBe('Térreo');
    expect(house.floorName(61,22,4)).toBe('2º pavimento');
  });

  it('climbs and descends four stairs with the real Walker and rejects walls', () => {
    const house = new ModularHouse16();
    const player = new Player(x0 + HOUSE16.visit[0], y0 + HOUSE16.visit[1]);
    const w = makeHouse16Navigation(house,base,x0,y0,()=>player.z);
    const go=(x:number,y:number)=>{
      const tx=x0+x, ty=y0+y;
      for(let k=0;k<220&&Math.hypot(tx-player.x,ty-player.y)>.07;k++){
        const dx=tx-player.x,dy=ty-player.y,n=Math.hypot(dx,dy);
        player.move(1/60,dx/n,dy/n,w);
      }
      expect(Math.hypot(tx-player.x,ty-player.y)).toBeLessThan(.14);
    };
    go(61.5,29.5);
    go(63.5,28.5);
    go(65.5,27.5);
    for (const step of [26,25,24,23]) {
      go(65.5,step+.5);
      expect(player.z).toBe(27-step);
    }
    go(65.5,22.5); expect(player.z).toBe(4);
    go(64.5,22.5); expect(player.z).toBe(4);
    go(65.5,22.5);
    for(const [y,z] of [[23,4],[24,3],[25,2],[26,1],[27,0]] as const){
      go(65.5,y+.5);expect(player.z).toBe(z);
    }
    go(61.5,28.5);go(61.5,30.5);expect(player.z).toBe(0);
    const wallPlayer=new Player(x0+53.5,y0+21.5);
    const wallW=makeHouse16Navigation(house,base,x0,y0,()=>wallPlayer.z);
    for(let i=0;i<60;i++)wallPlayer.move(1/60,1,0,wallW);
    expect(wallPlayer.x).toBeLessThan(x0+54);
  });

  it('does not permit stairwell holes to turn into upper-floor tiles', () => {
    const house = new ModularHouse16();
    for(const s of HOUSE16_STAIRS){
      expect(house.stairHeight(s.x,s.y)).toBe(s.height);
      expect(house.toggle(s.x,s.y,4,'floor')).toBe(false);
    }
  });
});
