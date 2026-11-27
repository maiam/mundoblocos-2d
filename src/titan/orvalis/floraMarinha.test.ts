import { describe, expect, it } from 'vitest';
import { breakOrCollect, placeFromSlot } from '../actions';
import { foodOf, isItem, Item, itemOfBlock, blockOfItem } from '../items';
import { FUEL_TIME_S } from '../furnace';
import { OrvalisGenerator, FLORA } from './generator';
import { newBody, stepBody } from '../physics';
import { RECIPES } from '../recipes';
import { MemoryTitanStorage } from '../save';
import { openSession } from '../session';
import { eyesSubmerged } from '../underwater';
import { isLiquidCell, isSolid, isTarget, isWaterPlant, modelOf, T } from '../voxel';
import { settleDrops } from '../drops';

/** Flora marinha (ADR 0135): erva marinha e alga contam como água, vêm da v5 do gerador, se plantam e quebram com cascata. */
const Y = 150;
const hit = (x: number, y: number, z: number, ny = 1) => ({ x, y, z, nx: 0, ny, nz: 0 });
const pool = async () => {
  const s = await openSession(new MemoryTitanStorage(), 42, () => 1, undefined, 2);
  const a = s.volume.gen.arrival, x = Math.floor(a.x) + 6, z = Math.floor(a.z) + 6, v = s.volume;
  for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) for (let yy = Y - 6; yy < Y + 4; yy++) v.set(x + dx, yy, z + dz, yy < Y - 5 ? T.STONE : yy < Y ? T.LAKE : T.AIR);
  return { s, x, z };
};

describe('flora marinha (ADR 0135)', () => {
  it('ids, itens, modelos e regras de bloco', () => {
    for (const id of [T.SEAGRASS, T.SEAGRASS_TALL, T.SEAGRASS_TALL_TOP, T.KELP, T.KELP_TOP]) {
      expect(isWaterPlant(id)).toBe(true); expect(isLiquidCell(id)).toBe(true); expect(isSolid(id)).toBe(false); expect(isTarget(id)).toBe(true); expect(modelOf(id)).not.toBeNull();
    }
    expect(isWaterPlant(T.DRIED_KELP_BLOCK)).toBe(false); expect(isSolid(T.DRIED_KELP_BLOCK)).toBe(true);
    expect(isItem(115) && isItem(116) && isItem(117) && isItem(118)).toBe(true); expect(isItem(119)).toBe(false);
    expect(blockOfItem(Item.ERVA_MARINHA)).toBe(T.SEAGRASS); expect(blockOfItem(Item.ALGA)).toBe(T.KELP); expect(itemOfBlock(T.KELP_TOP)).toBe(Item.ALGA); expect(itemOfBlock(T.SEAGRASS_TALL_TOP)).toBe(Item.ERVA_MARINHA);
    expect(foodOf(Item.ALGA_SECA)).toEqual({ hunger: 1, saturation: 0.6 }); expect(FUEL_TIME_S[Item.ALGA_SECA]).toBe(200); expect(FUEL_TIME_S[Item.BLOCO_ALGA_SECA]).toBe(2000);
  });
  it('receitas: alga assa em alga seca, 9 alga seca = 1 bloco e de volta', () => {
    const r = (id: string) => RECIPES.find((x) => x.id === id)!;
    expect(r('alga-seca').station).toBe('furnace'); expect(r('bloco-alga-seca').ingredients).toEqual([{ item: Item.ALGA_SECA, count: 9 }]); expect(r('alga-seca-do-bloco').result.count).toBe(9);
  });
  it('a v5 gera flora no fundo de areia; a v4 não; é determinística', () => {
    const g5 = new OrvalisGenerator(42, 5), g4 = new OrvalisGenerator(42, 4), seen = new Set<number>();
    let n4 = 0;
    for (let x = -64; x < 64; x++) for (let z = -64; z < 64; z++) for (let y = 40; y <= 63; y++) {
      const b = g5.blockAt(x, y, z); if (isWaterPlant(b)) seen.add(b);
      if (isWaterPlant(g4.blockAt(x, y, z))) n4++;
    }
    expect(n4).toBe(0); expect(seen.has(T.SEAGRASS)).toBe(true); expect(seen.has(T.KELP)).toBe(true); expect(seen.has(T.KELP_TOP)).toBe(true);
    expect(new OrvalisGenerator(42, 5).blockAt(10, 50, 10)).toBe(g5.blockAt(10, 50, 10));
    expect(FLORA.seagrass).toBeGreaterThan(0);
  });
  it('a flora fica dentro da água: nunca na superfície, sempre sobre areia, alga com a ponta no alto', () => {
    const g = new OrvalisGenerator(42, 5);
    for (let x = -64; x < 64; x++) for (let z = -64; z < 64; z++) {
      const top = g.column(x, z).top;
      if (g.blockAt(x, 63, z) !== T.LAKE) { expect(isWaterPlant(g.blockAt(x, 63, z))).toBe(false); }
      for (let y = top + 1; y <= 63; y++) if (isWaterPlant(g.blockAt(x, y, z))) { expect(g.column(x, z).surface).toBe(T.BEACH); expect(y).toBeLessThanOrEqual(62); }
    }
  });
  it('o corpo na célula da planta está na água e mergulha', async () => {
    const { s, x, z } = await pool();
    s.volume.set(x, Y - 5, z, T.SEAGRASS);
    const b = newBody(x + 0.5, Y - 5, z + 0.5); stepBody(s.volume, b, { dirX: 0, dirZ: 0, jump: false }, 0.02);
    expect(b.inLiquid).toBe(true); expect(eyesSubmerged(60, T.SEAGRASS, T.LAKE)).toBe(true);
  });
  it('planta erva marinha e alga só na água, sobre piso, e quebrar devolve água, item e leva a coluna', async () => {
    const { s, x, z } = await pool();
    s.inventory.add(Item.ERVA_MARINHA, 2); s.inventory.add(Item.ALGA, 3);
    const idx = (it: number) => Array.from({ length: 36 }, (_, i) => i).find((i) => s.inventory.get(i)?.item === it)!;
    expect(placeFromSlot(s, hit(x, Y - 6, z), idx(Item.ERVA_MARINHA)).ok).toBe(true); // piso de pedra (face de cima)
    expect(s.volume.get(x, Y - 5, z)).toBe(T.SEAGRASS);
    expect(placeFromSlot(s, hit(x + 1, Y - 3, z), idx(Item.ERVA_MARINHA)).ok).toBe(false); // sem piso (água embaixo)
    for (let k = 0; k < 3; k++) expect(placeFromSlot(s, hit(x + 2, k === 0 ? Y - 6 : Y - 6 + k, z), idx(Item.ALGA)).ok).toBe(true); // a alga se estende para cima
    expect(s.volume.get(x + 2, Y - 5, z)).toBe(T.KELP); expect(s.volume.get(x + 2, Y - 4, z)).toBe(T.KELP); expect(s.volume.get(x + 2, Y - 3, z)).toBe(T.KELP_TOP);
    const r = breakOrCollect(s, hit(x + 2, Y - 5, z)); // quebrar a base leva a coluna acima
    expect(r.ok).toBe(true); settleDrops(s);
    for (const yy of [Y - 5, Y - 4, Y - 3]) expect(s.volume.get(x + 2, yy, z)).toBe(T.LAKE); // a água ocupa o lugar, sem buraco
    expect([...s.drops.values()].filter((d) => d.item === Item.ALGA).reduce((a, d) => a + (d.count ?? 1), 0)).toBe(3);
  });
  it('quebrar o piso leva a erva marinha; quebrar a metade de cima da erva alta leva as duas', async () => {
    const { s, x, z } = await pool();
    s.volume.set(x, Y - 5, z, T.SEAGRASS_TALL); s.volume.set(x, Y - 4, z, T.SEAGRASS_TALL_TOP);
    breakOrCollect(s, hit(x, Y - 4, z));
    expect(s.volume.get(x, Y - 5, z)).toBe(T.LAKE); expect(s.volume.get(x, Y - 4, z)).toBe(T.LAKE);
    s.volume.set(x + 1, Y - 5, z, T.SEAGRASS);
    breakOrCollect(s, hit(x + 1, Y - 6, z)); // o piso
    expect(s.volume.get(x + 1, Y - 5, z)).not.toBe(T.SEAGRASS);
  });
});
