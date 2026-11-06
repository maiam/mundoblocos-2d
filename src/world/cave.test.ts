import { describe, expect, it } from 'vitest';
import { Block } from './blocks';
import { CAVE_MIN_CASTLE_DIST, DUNGEON_ORIGIN, dungeonGuard } from './dungeon';
import { inRect } from './dungeon';
import { World } from './world';

describe('Covil isolado e entrada de caverna (ADR 0019)', () => {
  for (const seed of [1, 7, 42, 2024, 99]) {
    it(`seed ${seed}: caverna a ≥ 10 chunks do castelo, em terra firme, entrada livre; labirinto longe do mundo`, () => {
      const w = new World(seed);
      const cave = w.cave!;
      const castle = w.town!.buildings.find((b) => b.id === Block.CASTLE)!;
      const [cx, cy] = [castle.x + castle.w / 2, castle.y - castle.d / 2];
      expect(Math.hypot(cave.outside[0] - cx, cave.outside[1] - cy)).toBeGreaterThanOrEqual(CAVE_MIN_CASTLE_DIST);
      // Base da caverna sólida e protegida; a arte fica no canto inferior esquerdo.
      expect(w.getObject(cave.x, cave.y)).toBe(Block.DUNGEON_CAVE);
      expect(w.getObject(cave.x + 1, cave.y)).toBe(Block.TOWN_PART);
      expect(w.isWalkable(cave.x + 2, cave.y)).toBe(false);
      expect(w.isProtected(cave.x, cave.y)).toBe(true);
      expect(w.canBreak(cave.x, cave.y)).toBe(false);
      // Diante da boca: andável e é a porta.
      expect(w.isWalkable(...cave.outside)).toBe(true);
      expect(w.isCaveDoor(...cave.outside)).toBe(true);
      // O labirinto fica no canto isolado, longe da cidade e da caverna.
      const d = w.dungeon!;
      expect(d.area.x0).toBe(DUNGEON_ORIGIN[0]);
      expect(Math.abs(d.area.x0 - cave.x)).toBeGreaterThan(50000);
      // Chegada dentro do covil é andável; o vão de saída está na borda; em volta, só montanha (ninguém sai a pé).
      const entry = w.dungeonEntry()!;
      expect(w.inDungeon(...entry)).toBe(true);
      expect(w.isWalkable(...entry)).toBe(true);
      expect(w.isDungeonExit(...entry)).toBe(false);
      const exit = d.gate[1];
      expect(w.isDungeonExit(...exit)).toBe(true);
      expect(exit[1]).toBe(d.area.y1);
      const g = dungeonGuard(d);
      expect(inRect(g, d.area.x0 - 3, d.area.y0)).toBe(true);
      expect(w.isWalkable(d.area.x0 - 3, d.area.y0)).toBe(false);
      expect(w.isProtected(d.area.x0 - 3, d.area.y0)).toBe(true);
    });
  }
});
