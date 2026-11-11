import { describe, expect, it } from 'vitest';
import { Player } from '../game/player';
import { FREE_BUILD, FreeBuildFive, makeFreeBuildNavigation } from './freeBuildFive';

describe('Santuário — editor livre de cinco níveis', () => {
  it('allows adjacent cubes, 5 vertical layers, unsupported slabs and holes without changing World', () => {
    const editor = new FreeBuildFive();
    expect(editor.set(35, 14, 0, 82)).toEqual({ok:true,action:'placed'});
    expect(editor.set(36, 14, 0, 82)).toEqual({ok:true,action:'placed'});
    expect(editor.set(35, 14, 4, 84)).toEqual({ok:true,action:'placed'});
    expect(editor.set(35, 14, 3, 85)).toEqual({ok:true,action:'placed'});
    expect(editor.get(35,14,1)).toBeUndefined(); // true empty air
    expect(editor.size).toBe(4);
    expect(editor.set(35,14,4,84)).toEqual({ok:false,reason:'occupied'});
    expect(editor.set(35,14,5,84)).toEqual({ok:false,reason:'invalid-level'});
    expect(editor.set(35,14,-1,84)).toEqual({ok:false,reason:'invalid-level'});
    expect(editor.set(100,14,0,84)).toEqual({ok:false,reason:'outside'});
    expect(editor.set(35,14,0,999)).toEqual({ok:false,reason:'invalid-material'});
    expect(editor.remove(35,14,3)).toEqual({ok:true,action:'removed'});
    expect(editor.remove(35,14,3)).toEqual({ok:false,reason:'empty'});
    expect(editor.list().map(v=>v.z)).toEqual([0,0,4]);
    editor.clear();
    expect(editor.size).toBe(0);
  });

  it('places a separate stone door as a solid structural voxel with normal occupancy', () => {
    const ed = new FreeBuildFive();
    expect(ed.setDoor(36, 14, 0, 84)).toEqual({ok:true,action:'placed'});
    expect(ed.get(36, 14, 0)).toMatchObject({id:84,kind:'door'});
    expect(ed.support(36, 14, 0)).toBe(1); // Closed door is a full pillar.
    expect(ed.setDoor(36, 14, 0, 84)).toEqual({ok:false,reason:'occupied'});
    expect(ed.setDoor(37, 14, 0, 80)).toEqual({ok:false,reason:'invalid-material'});
    expect(ed.remove(36, 14, 0)).toEqual({ok:true,action:'removed'});
    expect(ed.get(36, 14, 0)).toBeUndefined();
  });

  it('creates example staircase of 1→5 and 5×5 upper slab with stable adjacency', () => {
    const ed = new FreeBuildFive();
    ed.example();
    for(let i=0;i<5;i++) for(let z=0;z<=i;z++) {
      expect(ed.get(35+i,15,z)?.id).toBe(84);
    }
    for(let x=40;x<=44;x++)for(let y=13;y<=17;y++) {
      expect(ed.get(x,y,4)?.id).toBe(82);
    }
    expect(ed.get(40,15,0)).toBeUndefined();
    expect(ed.support(40,15,0)).toBe(0);
    expect(ed.support(40,15,4)).toBe(5);
    expect(ed.support(39,15,0)).toBeNull(); // cannot leap 5 cubes
    expect(ed.support(39,15,4)).toBe(5);
    expect(ed.size).toBe(15+25+8);
  });

  it('uses Walker collision, climbing adjacent steps and camera-ready visualZ', () => {
    const ed = new FreeBuildFive();
    ed.example();
    const p=new Player(34.5, 15.5);
    const w=makeFreeBuildNavigation(ed,0,0,()=>p.z);
    const go=(target:number)=>{
      for (let i=0; i<240 && Math.abs(p.x-target)>0.07; i++) {
        const dx = target-p.x;
        p.move(1/60, Math.sign(dx), 0, w);
      }
      expect(Math.abs(p.x-target)).toBeLessThan(0.12);
    };
    for(let height=1;height<=5;height++){
      go(34.5+height);
      expect(p.z).toBe(height);
    }
    go(40.5);
    expect(p.z).toBe(5);
    p.move(1/40,0,0,w);
    expect(p.visualZ).toBeGreaterThan(0);
    expect(p.visualZ).toBeLessThanOrEqual(5);
  });

  it('cannot walk through a two-block roof at head level; can walk beneath a high slab', () => {
    const ed = new FreeBuildFive();
    ed.set(38,16,1,84); // low obstacle in the upper body area
    ed.set(40,16,4,82); // high slab
    expect(ed.support(38,16,0)).toBeNull();
    expect(ed.support(40,16,0)).toBe(0);
    const w=makeFreeBuildNavigation(ed,0,0,()=>0);
    expect(w.standHeight(38,16)).toBeNull();
    expect(w.standHeight(40,16)).toBe(0);
    expect(w.standHeight(32,9)).toBe(0);
    expect(w.standHeight(80,10)).toBeNull();
    expect(FREE_BUILD.maxLevels).toBe(5);
  });
});
