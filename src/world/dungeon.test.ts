import { describe, expect, it } from 'vitest';
import { Block } from './blocks';
import { DUNGEON_H, DUNGEON_W, inRect, MONSTER_COUNTS } from './dungeon';
import { WORLD_PROFILES } from './profiles';
import { World } from './world';

const SEEDS = [1, 7, 42, 1234, 98765];

/** Células andáveis alcançáveis a partir de (sx, sy), limitadas a uma caixa. */
function reachable(w: World, sx: number, sy: number, box: { x0: number; y0: number; x1: number; y1: number }): Set<string> {
  const seen = new Set<string>([`${sx},${sy}`]);
  const q: Array<[number, number]> = [[sx, sy]];
  while (q.length) {
    const [x, y] = q.shift()!;
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      const k = `${nx},${ny}`;
      if (seen.has(k) || !inRect(box, nx, ny) || w.standHeight(nx, ny) !== 0) continue;
      seen.add(k);
      q.push([nx, ny]);
    }
  }
  return seen;
}

describe('Dungeon', () => {
  it('só no mundo principal; mesma seed → mesma dungeon; spawn fora dela', () => {
    expect(new World(7, WORLD_PROFILES.santuario).dungeon).toBeNull();
    for (const seed of SEEDS) {
      const a = new World(seed).dungeon!;
      const b = new World(seed).dungeon!;
      expect(a.area).toEqual(b.area);
      expect(a.spawns).toEqual(b.spawns);
      expect(a.area.x1 - a.area.x0 + 1).toBe(DUNGEON_W);
      expect(a.area.y1 - a.area.y0 + 1).toBe(DUNGEON_H);
      const [sx, sy] = new World(seed).findSpawn();
      expect(inRect(a.area, sx, sy)).toBe(false);
    }
  });

  it('muralha fechada com uma única entrada; todo o interior livre é alcançável por ela', () => {
    for (const seed of SEEDS) {
      const w = new World(seed);
      const d = w.dungeon!;
      const { area, interior } = d;
      // Na borda externa, só as células da entrada são andáveis.
      const open: string[] = [];
      for (let x = area.x0; x <= area.x1; x++) for (const y of [area.y0, area.y1]) if (w.standHeight(x, y) === 0) open.push(`${x},${y}`);
      for (let y = area.y0 + 1; y < area.y1; y++) for (const x of [area.x0, area.x1]) if (w.standHeight(x, y) === 0) open.push(`${x},${y}`);
      expect(open).toHaveLength(3);
      // A partir da frente da entrada, alcança todas as células livres do interior.
      const seen = reachable(w, ...d.doorstep, area);
      for (let y = interior.y0; y <= interior.y1; y++) {
        for (let x = interior.x0; x <= interior.x1; x++) {
          if (w.standHeight(x, y) === 0) expect(seen.has(`${x},${y}`)).toBe(true);
        }
      }
    }
  });

  it('monstros: 10 aranhas pequenas, 5 grandes e 1 chefe, todos em células livres do interior', () => {
    for (const seed of SEEDS) {
      const w = new World(seed);
      const d = w.dungeon!;
      const count = (k: string) => d.spawns.filter((s) => s.kind === k).length;
      expect(count('spider-small')).toBe(MONSTER_COUNTS['spider-small']);
      expect(count('spider-big')).toBe(MONSTER_COUNTS['spider-big']);
      expect(count('spider-boss')).toBe(1);
      for (const s of d.spawns) {
        expect(inRect(d.interior, Math.floor(s.x), Math.floor(s.y))).toBe(true);
        expect(w.standHeight(Math.floor(s.x), Math.floor(s.y))).toBe(0);
      }
    }
  });

  it('área protegida: nada quebra, nada é colocado, arado, amassado nem plantado', () => {
    const w = new World(42);
    const { interior, area } = w.dungeon!;
    const [x, y] = [interior.x0 + 2, interior.y0 + 2];
    const wallCell: [number, number] = [area.x0, area.y0];
    expect(w.canBreak(x, y)).toBe(false);
    expect(w.breakBlock(x, y)).toBeNull();
    expect(w.breakBlock(...wallCell)).toBeNull();
    expect(w.getObject(...wallCell)).toBe(Block.DUNGEON_MOUNTAIN);
    expect(w.canPlace(x, y, Block.STONE)).toBe(false);
    expect(w.canTill(x, y) || w.canFlatten(x, y) || w.canPlant(x, y)).toBe(false);
    // Fora da área, tudo segue normal.
    const [sx, sy] = w.findSpawn();
    expect(w.canBreak(sx, sy) || w.canPlace(sx, sy, Block.STONE)).toBe(true);
  });
});
