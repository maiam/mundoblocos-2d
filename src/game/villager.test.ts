import { describe, expect, it } from 'vitest';
import { Block } from '../world/blocks';
import { inRect } from '../world/dungeon';
import { mulberry32 } from '../world/random';
import { World } from '../world/world';
import { Entities } from './entities';
import { Player } from './player';
import { CASUAL_OUTFITS, VILLAGER_BASES, villagerOutfit } from './villager';

function setup(seed: number) {
  const w = new World(seed);
  const [sx, sy] = w.town!.start;
  const p = new Player(sx + 0.5, sy + 0.6);
  const e = new Entities(p, mulberry32(seed));
  e.spawnVillagers(w);
  const [gx, gy] = w.outsideGate();
  e.spawnHorse(w, gx + 9, gy + 10);
  return { w, p, e };
}

describe('Moradores da cidade e cavalo', () => {
  it('quatro moradores, um de cada personagem-base, com roupa sorteada pela seed (fixa por seed), e o ferreiro', () => {
    const { w, e } = setup(42);
    const town = e.villagers.slice(0, 4);
    expect(town.map((v) => v.base)).toEqual([...VILLAGER_BASES]);
    for (const v of town) expect(CASUAL_OUTFITS).toContain(v.outfit);
    // Ferreiro: roupa de ferreiro, dentro da Ferraria (interior), atrás do balcão.
    const smith = e.villagers[4];
    expect(smith.outfit).toBe('smith');
    expect(smith.role).toBe('smith');
    expect(w.interiorAt(smith.cellX, smith.cellY)?.def.id).toBe('smithy');
    expect(smith.speak()).toContain('Ferreiro');
    expect(setup(42).e.villagers.map((v) => v.outfit)).toEqual(e.villagers.map((v) => v.outfit));
    // Seeds diferentes variam as roupas.
    const looks = new Set<string>();
    for (let s = 1; s <= 30; s++) looks.add(VILLAGER_BASES.map((_, i) => villagerOutfit(s, i)).join());
    expect(looks.size).toBeGreaterThan(1);
  });

  it('moradores só andam por ruas e praças, sem sair pela muralha nem pelo portão', () => {
    for (const seed of [3, 42]) {
      const { w, e } = setup(seed);
      const t = w.town!;
      for (let f = 0; f < 60 * 90; f++) {
        e.update(1 / 60, w);
        if (f % 30) continue;
        // O ferreiro fica no interior: só anda nas linhas do ofício, no chão do cômodo.
        const smith = e.villagers.find((v) => v.role === 'smith')!;
        const room = w.interiorAt(smith.cellX, smith.cellY)!;
        expect(smith.cellY).toBeGreaterThanOrEqual(room.keeper!.rows[0]);
        expect(smith.cellY).toBeLessThanOrEqual(room.keeper!.rows[1]);
        for (const v of e.villagers.filter((x) => !x.role)) {
          expect(inRect(t.area, v.cellX, v.cellY)).toBe(true);
          expect(v.cellY).toBeLessThan(t.gate.y0);
          expect(t.street[(v.cellY - t.area.y0) * t.w + (v.cellX - t.area.x0)]).toBe(1);
        }
      }
      expect(e.villagers.some((v) => Math.hypot(v.x - v.homeX, v.y - v.homeY) > 0.5)).toBe(true);
    }
  });

  it('o golpe não atinge moradores', () => {
    const { w, p, e } = setup(5);
    const v = e.villagers[0];
    p.x = v.x - 0.8;
    p.y = v.y;
    expect(e.strike('right', w, 'sword')).toBe(0);
    expect(e.villagers).toHaveLength(5);
  });

  it('um cavalo no campo fora da cidade, em grama, que passeia', () => {
    const { w, e } = setup(42);
    expect(e.horses).toHaveLength(1);
    const h = e.horses[0];
    expect(inRect(w.town!.area, h.cellX, h.cellY)).toBe(false);
    expect(w.getGround(h.cellX, h.cellY)).toBe(Block.GRASS);
    const [x0, y0] = [h.x, h.y];
    for (let f = 0; f < 60 * 30; f++) e.update(1 / 60, w);
    expect(Math.hypot(h.x - x0, h.y - y0)).toBeGreaterThan(0.3);
    expect(e.actors.some((a) => a.kind === 'horse')).toBe(true);
    expect(e.actors.filter((a) => a.kind.startsWith('villager-') && a.outfit)).toHaveLength(5);
  });
});
