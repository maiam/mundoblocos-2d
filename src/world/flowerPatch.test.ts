import { describe, expect, it } from 'vitest';
import { SUBDIV } from '../config';
import { Block, FLOWER_BLOCKS, blockDef } from './blocks';
import { PATCH_FLOWERS, patchSpecies } from './flowerPatch';
import { World } from './world';

describe('canteiro da missão Ervas de cura (v0.93.119)', () => {
  const seeds = [1, 7, 42, 99, 12345, 20261106, 555, 31337];

  it('toda seed tem o canteiro perto do portão: flores da espécie da seed, em chão livre e fora das áreas protegidas', () => {
    for (const seed of seeds) {
      const w = new World(seed);
      const p = w.flowerPatch;
      expect(p, `seed ${seed}`).not.toBeNull();
      expect(p!.species).toBe(patchSpecies(seed));
      expect(FLOWER_BLOCKS).toContain(p!.species);
      expect(p!.cells).toHaveLength(PATCH_FLOWERS);
      const [gx, gy] = w.outsideGate();
      const cx = (p!.area.x0 + p!.area.x1) / 2, cy = (p!.area.y0 + p!.area.y1) / 2;
      expect(Math.hypot(cx - gx, cy - gy)).toBeLessThanOrEqual(140 * SUBDIV); // por perto (no máximo ~140 células)
      let flowers = 0;
      for (const [x, y] of p!.cells) {
        expect(w.getObject(x, y)).toBe(p!.species); // geradas no mundo
        expect(blockDef(w.getGround(x, y)).liquid).toBe(false);
        expect(w.isProtected(x, y)).toBe(false); // dá para quebrar
        expect(w.canBreak(x, y)).toBe(true);
        flowers++;
      }
      expect(flowers).toBeGreaterThanOrEqual(6); // a missão pede 6
    }
  });

  it('é função da seed: o mesmo mundo, o mesmo canteiro; seeds diferentes, espécies variadas', () => {
    expect(new World(42).flowerPatch).toEqual(new World(42).flowerPatch);
    const species = new Set(seeds.map((s) => new World(s).flowerPatch!.species));
    expect(species.size).toBeGreaterThan(3);
  });

  it('o Santuário e mundos sem cidade não têm canteiro; a flor quebrada volta como o próprio item', () => {
    expect(new World(1, { ...new World(1).profile, town: false, dungeon: false } as never).flowerPatch).toBeNull();
    const w = new World(42);
    const [x, y] = w.flowerPatch!.cells[0];
    expect(w.breakBlock(x, y)).toBe(w.flowerPatch!.species);
    expect(w.getObject(x, y)).toBe(Block.AIR);
  });
});
