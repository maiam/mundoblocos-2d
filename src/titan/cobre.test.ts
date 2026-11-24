import { describe, expect, it } from 'vitest';
import { breakOrCollect, collectItem, collectNearby, COPPER_YIELD } from './actions';
import { breakTotalMs, BREAK_MS, PICK_FACTOR } from './breaking';
import { TitanGenerator } from './generator';
import { isPick, isTool, Item, maxStack, toolOf } from './items';
import { RECIPES } from './recipes';
import { MemoryTitanStorage } from './save';
import { flush, openSession, visibleItems } from './session';
import { isCopperVein, isSolid, T } from './voxel';

const SEEDS = [1, 2, 7, 42, 99, 150];
const key = (x: number, z: number): number => x * 1000 + z;

describe('gerador v7: afloramentos de cobre e hastes secas (ADR 0063)', () => {
  it('2 afloramentos com 3 veios de cobre no topo, longe da toca e da chegada, sobre rocha escura; a v5 não tem', () => {
    for (const seed of SEEDS) {
      const g = new TitanGenerator(seed), a = g.arrival;
      expect(g.copperSites).toHaveLength(2); expect(g.copperCells).toHaveLength(6);
      for (const c of g.copperCells) {
        expect(g.blockAt(c.x, c.y, c.z)).toBe(T.VEIN_COPPER); expect(g.blockAt(c.x, c.y + 1, c.z)).toBe(T.AIR);
        expect(g.column(c.x, c.z).surface).toBe(T.DARK_ROCK);
        expect(Math.hypot(c.x - a.x, c.z - a.z)).toBeGreaterThan(14);
        expect(g.inRegion(c.x, c.z)).toBe(true);
      }
      if (g.den) for (const s of g.copperSites) expect(Math.hypot(s.x - g.den.x, s.z - g.den.z)).toBeGreaterThanOrEqual(26); // fora do território do Farejador
      expect(g.nutPlants.every((p) => g.copperSites.every((s) => Math.hypot(s.x - p.x, s.z - p.z) >= 6))).toBe(true);
    }
    for (const v of [5, 6]) { const old = new TitanGenerator(42, v); expect(old.copperCells).toHaveLength(0); expect(old.dryReeds).toHaveLength(0); expect(old.blockAt(-9, 68, -34)).not.toBe(T.VEIN_COPPER); }
    expect(new TitanGenerator(42, 6).region).toEqual(new TitanGenerator(42).region); // a v6 e a v7 têm a mesma região
  });
  it('os afloramentos são alcançáveis a pé (a coluna ao lado do monte está na área andável) e a geração é determinística', () => {
    for (const seed of SEEDS) {
      const g = new TitanGenerator(seed), g2 = new TitanGenerator(seed);
      expect(g2.copperCells).toEqual(g.copperCells);
      // BFS por degraus de 1 bloco sobre o relevo bruto das colunas reais, desde a chegada
      const seen = new Set<number>([key(Math.floor(g.arrival.x), Math.floor(g.arrival.z))]), q: Array<[number, number]> = [[Math.floor(g.arrival.x), Math.floor(g.arrival.z)]];
      while (q.length) {
        const [x, z] = q.pop()!;
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, nz = z + dz;
          if (!g.inRegion(nx, nz) || seen.has(key(nx, nz))) continue;
          const t = g.column(nx, nz).top;
          if (t < 63 || Math.abs(t - g.column(x, z).top) > 1) continue;
          seen.add(key(nx, nz)); q.push([nx, nz]);
        }
      }
      for (const s of g.copperSites) {
        const near = [-4, -3, 3, 4].some((d) => seen.has(key(s.x + d, s.z)) || seen.has(key(s.x, s.z + d)));
        expect(near, `seed ${seed} afloramento ${s.x},${s.z}`).toBe(true);
      }
    }
  });
  it('hastes secas (v7–v12): até 8 por seed, perto dos juncos, em areia, ids únicos e determinísticos', () => {
    for (const seed of SEEDS) {
      const g = new TitanGenerator(seed, 12); // a v13 só deixa as 2 mais próximas da chegada (ADR 0086)
      expect(g.dryReeds.length).toBeGreaterThanOrEqual(3); expect(g.dryReeds.length).toBeLessThanOrEqual(8);
      expect(new Set(g.dryReeds.map((d) => d.id)).size).toBe(g.dryReeds.length);
      for (const d of g.dryReeds) {
        expect([T.SAND, T.DAMP_SAND]).toContain(g.blockAt(d.x, d.y - 1, d.z)); expect(g.blockAt(d.x, d.y, d.z)).toBe(T.AIR);
        expect(g.reeds.some((r) => Math.max(Math.abs(r.x - d.x), Math.abs(r.z - d.z)) <= 7)).toBe(true);
        expect(g.reeds.some((r) => r.x === d.x && r.z === d.z)).toBe(false);
        expect(d.item).toBe(Item.DRY_REED); expect(d.id).toBe(`dry:${d.x},${d.y},${d.z}`);
      }
      expect(new TitanGenerator(seed, 12).dryReeds).toEqual(g.dryReeds);
    }
  });
});

describe('picareta e veio de cobre', () => {
  it('só picareta quebra o veio; com ela a rocha cede em 60% do tempo; ferramenta não empilha', () => {
    expect(isCopperVein(T.VEIN_COPPER)).toBe(true); expect(isSolid(T.VEIN_COPPER)).toBe(true);
    expect(breakTotalMs('block', T.VEIN_COPPER)).toBeNull(); expect(breakTotalMs('block', T.VEIN_COPPER, true)).toBe(Math.round(BREAK_MS.rock * PICK_FACTOR.rock));
    expect(breakTotalMs('block', T.DARK_ROCK, true)).toBe(Math.round(BREAK_MS.rock * PICK_FACTOR.rock));
    expect(breakTotalMs('block', T.SAND, true)).toBe(BREAK_MS.sand); // areia não muda
    expect(isPick(Item.STONE_PICK)).toBe(true); expect(isPick(Item.NOZ)).toBe(false); expect(isTool(Item.STONE_PICK)).toBe(true);
    expect(toolOf(Item.STONE_PICK)).toEqual({ kind: 'pick', tier: 'rock' }); expect(maxStack(Item.STONE_PICK)).toBe(1);
  });
  it('receita: 3 fragmentos de rocha + 2 hastes secas (mesa) → 1 Picareta de Rocha', () => {
    const r = RECIPES.find((x) => x.id === 'picareta-rocha')!;
    expect(r.station).toBe('workbench'); expect(r.group).toBe('ferramentas'); expect(r.result).toEqual({ item: Item.STONE_PICK, count: 1 });
    expect(r.ingredients).toEqual([{ item: Item.ROCK_SHARD, count: 3 }, { item: Item.DRY_REED, count: 2 }]);
  });
  it('fluxo: colhe a haste seca, sem picareta o veio dá só pó, com ela solta 2 fragmentos que se recolhem ao passar e tudo persiste', async () => {
    const st = new MemoryTitanStorage();
    const s = await openSession(st, 42, () => 1);
    const dry = s.volume.gen.dryReeds[0];
    expect(s.items.at(dry.x, dry.y, dry.z)).toBe(dry.id);
    expect(visibleItems(s).some((i) => i.id === dry.id && i.item === Item.DRY_REED)).toBe(true); // desenhada como item no chão
    expect(collectItem(s, dry.id).ok).toBe(true); expect(s.inventory.total(Item.DRY_REED)).toBe(1);
    expect(collectItem(s, dry.id).ok).toBe(false); expect(s.items.at(dry.x, dry.y, dry.z)).toBeNull();
    const c = (s.volume.gen as TitanGenerator).copperCells[0];
    const hit = { x: c.x, y: c.y, z: c.z, nx: 0, ny: 1, nz: 0 };
    const none = breakOrCollect(s, hit);
    expect(none.ok).toBe(false); expect(none.msg).toBe('Só pó nos dedos. Falta uma picareta.'); expect(s.volume.get(c.x, c.y, c.z)).toBe(T.VEIN_COPPER);
    s.inventory.add(Item.STONE_PICK); s.selected = Array.from({ length: 9 }, (_, i) => i).find((i) => s.inventory.get(i)?.item === Item.STONE_PICK)!;
    expect(breakOrCollect(s, hit).ok).toBe(true);
    expect(s.volume.get(c.x, c.y, c.z)).not.toBe(T.VEIN_COPPER);
    const drop = [...s.drops.values()].find((d) => d.item === Item.COPPER_SHARD)!;
    expect(drop.count).toBe(COPPER_YIELD);
    expect(s.inventory.total(Item.COPPER_SHARD)).toBe(0); // cai no chão, não vai direto
    await flush(st, s);
    const r = await openSession(st, null, () => 1);
    expect(r.volume.get(c.x, c.y, c.z)).not.toBe(T.VEIN_COPPER);
    expect([...r.drops.values()].find((d) => d.item === Item.COPPER_SHARD)?.count).toBe(COPPER_YIELD);
    expect(r.items.at(dry.x, dry.y, dry.z)).toBeNull(); // a haste colhida não volta
    const got = collectNearby(r, drop.x + 0.5, drop.y, drop.z + 0.5);
    expect(got.collected).toBe(1); expect(r.inventory.total(Item.COPPER_SHARD)).toBe(COPPER_YIELD);
  });
});
