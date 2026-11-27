import { describe, expect, it } from 'vitest';
import { Block } from './blocks';
import { buildDungeon, buildMaze, dungeonEntry, dungeonSize, inRect, isDungeonExit, type Side, upsampleDungeon } from './dungeon';
import { SUBDIV } from '../config';
import { World } from './world';

const SEEDS = [1, 7, 42, 1234, 98765];

/** Células andáveis alcançáveis a partir de (sx, sy), limitadas a uma caixa (inclui a borda dela). */
function reachable(w: World, sx: number, sy: number, box: { x0: number; y0: number; x1: number; y1: number }): Set<string> {
  const seen = new Set<string>([`${sx},${sy}`]);
  const q: Array<[number, number]> = [[sx, sy]];
  for (let h = 0; h < q.length; h++) {
    const [x, y] = q[h];
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      const k = `${nx},${ny}`;
      if (seen.has(k) || !inRect(box, nx, ny) || w.standHeight(nx, ny) !== 0) continue;
      seen.add(k);
      q.push([nx, ny]);
    }
  }
  return seen;
}

describe('Covil das Aranhas — labirinto procedural', () => {
  it('só no mundo principal; tamanho ~9× a versão anterior, sorteado pela seed; mesma seed → mesmo labirinto', () => {
    const sizes = new Set<string>();
    for (const seed of SEEDS) {
      const [w, h] = dungeonSize(seed);
      sizes.add(`${w}x${h}`);
      expect(w * h).toBeGreaterThan(7 * 816);
      expect(w * h).toBeLessThan(11 * 816);
      const a = new World(seed).dungeon!;
      const b = new World(seed).dungeon!;
      expect(a.area).toEqual(b.area);
      expect(Array.from(a.objects)).toEqual(Array.from(b.objects));
      expect(a.spawns).toEqual(b.spawns);
      const [sx, sy] = new World(seed).findSpawn();
      expect(inRect(a.area, sx, sy)).toBe(false);
    }
    expect(sizes.size).toBeGreaterThan(1); // o tamanho varia entre gerações
  });

  it('uma única entrada no perímetro; nenhuma outra saída; todo o chão alcançável por ela (plano)', () => {
    for (const seed of SEEDS) {
      const w = new World(seed);
      const d = w.dungeon!;
      const { area } = d;
      const open: string[] = [];
      for (let x = area.x0; x <= area.x1; x++) for (const y of [area.y0, area.y1]) if (w.standHeight(x, y) === 0) open.push(`${x},${y}`);
      for (let y = area.y0 + 1; y < area.y1; y++) for (const x of [area.x0, area.x1]) if (w.standHeight(x, y) === 0) open.push(`${x},${y}`);
      expect(open).toHaveLength(3 * SUBDIV);
      const seen = reachable(w, ...d.doorstep, area);
      let floor = 0;
      for (let y = area.y0; y <= area.y1; y++) {
        for (let x = area.x0; x <= area.x1; x++) {
          const h = w.standHeight(x, y);
          expect(h === null || h === 0).toBe(true); // terreno plano: nada para subir
          if (h === 0 && w.getObject(x, y) === Block.AIR) {
            floor++;
            expect(seen.has(`${x},${y}`)).toBe(true);
          }
        }
      }
      expect(floor).toBeGreaterThan(2000);
    }
  });

  it('labirinto: becos sem saída, bifurcações e câmaras; paredes sólidas', () => {
    const sides: Side[] = ['west', 'east', 'north', 'south'];
    for (const [k, seed] of SEEDS.entries()) {
      const m = buildMaze(seed, 102, 72, sides[k % 4]);
      let deadEnds = 0;
      let forks = 0;
      for (let y = 1; y < m.h - 1; y++) {
        for (let x = 1; x < m.w - 1; x++) {
          if (!m.floor[y * m.w + x]) continue;
          const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => m.floor[(y + dy) * m.w + x + dx]).length;
          if (n === 1) deadEnds++;
          if (n >= 3) forks++;
        }
      }
      expect(deadEnds).toBeGreaterThan(5);
      expect(forks).toBeGreaterThan(20);
      expect(m.chambers.length).toBeGreaterThanOrEqual(3);
    }
    expect(new World(42).getObject(new World(42).dungeon!.area.x0 + SUBDIV, new World(42).dungeon!.area.y0 + SUBDIV)).toBe(Block.DUNGEON_WALL);
  });

  it('câmara da Rainha: terminal, com uma única passagem, e o chefe dentro dela', () => {
    for (const seed of SEEDS) {
      const w = new World(seed);
      const d = w.dungeon!;
      const r = d.bossRoom;
      // Células de chão no anel logo fora da câmara = a passagem (2 células vizinhas, em linha).
      const ring: Array<[number, number]> = [];
      for (let x = r.x0 - 1; x <= r.x1 + 1; x++) for (const y of [r.y0 - 1, r.y1 + 1]) if (w.standHeight(x, y) === 0) ring.push([x, y]);
      for (let y = r.y0; y <= r.y1; y++) for (const x of [r.x0 - 1, r.x1 + 1]) if (w.standHeight(x, y) === 0) ring.push([x, y]);
      expect(ring).toHaveLength(2 * SUBDIV);
      expect(Math.abs(ring[0][0] - ring[ring.length - 1][0]) + Math.abs(ring[0][1] - ring[ring.length - 1][1])).toBe(2 * SUBDIV - 1);
      expect((r.x1 - r.x0 + 1) * (r.y1 - r.y0 + 1)).toBeGreaterThan(200); // área maior
      const boss = d.spawns.filter((s) => s.kind === 'spider-boss');
      expect(boss).toHaveLength(1);
      expect(inRect(r, Math.floor(boss[0].x), Math.floor(boss[0].y))).toBe(true);
      // A Rainha é alcançável pela entrada.
      expect(reachable(w, ...d.doorstep, d.area).has(`${d.bossHome[0]},${d.bossHome[1]}`)).toBe(true);
    }
  });

  it('monstros proporcionais ao labirinto, em chão livre do interior, fora da câmara da Rainha', () => {
    for (const seed of SEEDS) {
      const w = new World(seed);
      const d = w.dungeon!;
      const small = d.spawns.filter((s) => s.kind === 'spider-small').length;
      const big = d.spawns.filter((s) => s.kind === 'spider-big').length;
      expect(small).toBeGreaterThan(15);
      expect(big).toBeGreaterThan(4);
      for (const s of d.spawns) {
        const [x, y] = [Math.floor(s.x), Math.floor(s.y)];
        expect(inRect(d.interior, x, y)).toBe(true);
        expect(w.standHeight(x, y)).toBe(0);
        if (s.kind !== 'spider-boss') expect(inRect(d.bossRoom, x, y)).toBe(false);
      }
    }
  });

  it('área protegida: nada quebra, nada é colocado, arado, amassado nem plantado', () => {
    const w = new World(42);
    const d = w.dungeon!;
    const [x, y] = d.bossHome;
    expect(w.canBreak(x, y)).toBe(false);
    expect(w.breakBlock(x, y)).toBeNull();
    expect(w.breakBlock(d.area.x0, d.area.y0)).toBeNull();
    expect(w.getObject(d.area.x0, d.area.y0)).toBe(Block.DUNGEON_MOUNTAIN);
    expect(w.canPlace(x, y, Block.STONE)).toBe(false);
    expect(w.canTill(x, y) || w.canFlatten(x, y) || w.canPlant(x, y)).toBe(false);
    const [sx, sy] = w.outsideGate();
    expect(w.canBreak(sx, sy) || w.canPlace(sx, sy, Block.STONE)).toBe(true);
  });
});

describe('Covil na grade fina (ADR 0032, F4): upsampleDungeon', () => {
  const base = buildDungeon(7, 1000, 2000, 'south');
  const fine = upsampleDungeon(base, 2);

  it('com 1 devolve o mesmo covil', () => {
    expect(upsampleDungeon(base, 1)).toBe(base);
  });

  it('dobra dimensões, áreas, câmaras e posições dos monstros', () => {
    expect([fine.w, fine.h]).toEqual([base.w * 2, base.h * 2]);
    expect(fine.area).toEqual({ x0: base.area.x0 * 2, y0: base.area.y0 * 2, x1: (base.area.x1 + 1) * 2 - 1, y1: (base.area.y1 + 1) * 2 - 1 });
    expect(fine.chambers).toHaveLength(base.chambers.length);
    expect(fine.spawns).toHaveLength(base.spawns.length);
    expect(fine.spawns[0]).toMatchObject({ kind: 'spider-boss', x: base.spawns[0].x * 2, y: base.spawns[0].y * 2 });
    expect(fine.scale).toBe(2);
  });

  it('chão, paredes e montanhas repetem nas 4 células (o labirinto não muda de forma)', () => {
    for (let y = 0; y < base.h; y++) {
      for (let x = 0; x < base.w; x++) {
        const o = base.objects[y * base.w + x];
        if (o !== Block.DUNGEON_WALL && o !== Block.DUNGEON_MOUNTAIN) continue;
        for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) expect(fine.objects[(y * 2 + dy) * fine.w + x * 2 + dx]).toBe(o);
      }
    }
  });

  it('a entrada e o vão de saída acompanham a escala', () => {
    const [ex, ey] = dungeonEntry(fine);
    const [bx, by] = dungeonEntry(base);
    expect([ex, ey]).toEqual([bx * 2, by * 2]);
    const g = fine.gate[0];
    expect(isDungeonExit(fine, g[0], g[1])).toBe(true);
    expect(isDungeonExit(fine, g[0] + 1, g[1] + 1)).toBe(true); // as 4 células da célula antiga
    expect(isDungeonExit(fine, ex, ey)).toBe(false);
  });
});
