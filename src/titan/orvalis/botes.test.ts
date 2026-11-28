import { describe, expect, it } from 'vitest';
import { dismountBoat, mountBoat, pickBoat, placeBoat, placeFromSlot, collectItem } from '../actions';
import { BOAT_HALF_LENGTH, BOAT_KINDS, BOAT_MAX_SPEED, BOAT_Y, boatAim, boatBox, boatFits, boatsFromData, boatsToData, boatWater, stepBoat } from '../boat';
import { isBoatItem, isItem, ITEM_NAMES, Item, aimsLiquid } from '../items';
import { RECIPES } from '../recipes';
import { MemoryTitanStorage } from '../save';
import { flush, openSession } from '../session';
import { LAKE_LAST_Y, LAKE_SURFACE_Y, T } from '../voxel';

/** Botes do Orvalis (ADR 0137): itens, receitas, física na água, embarque, recolher e save. */
const open = async (st = new MemoryTitanStorage()) => ({ st, s: await openSession(st, 42, () => 1, undefined, 2) });
/** Lagoa de 21 × 21 (superfície em Y = 64) ao lado da chegada, cercada de pedra; devolve o centro. */
const lagoon = async (st?: MemoryTitanStorage) => {
  const { s, st: store } = await open(st);
  const a = s.volume.gen.arrival, cx = Math.floor(a.x) + 8, cz = Math.floor(a.z) + 8, v = s.volume;
  for (let dx = -11; dx <= 11; dx++) for (let dz = -11; dz <= 11; dz++) for (let y = 56; y <= 68; y++) {
    const rim = Math.abs(dx) === 11 || Math.abs(dz) === 11;
    v.set(cx + dx, y, cz + dz, y < 58 ? T.STONE : rim ? (y <= 66 ? T.STONE : T.AIR) : y <= LAKE_LAST_Y ? T.LAKE : T.AIR);
  }
  return { s, st: store, cx, cz };
};
const slotOf = (s: Awaited<ReturnType<typeof open>>['s'], item: number) => Array.from({ length: 36 }, (_, i) => i).find((i) => s.inventory.get(i)?.item === item)!;
const hit = (x: number, z: number) => ({ x, y: LAKE_LAST_Y, z, nx: 0, ny: 1, nz: 0 });

describe('botes (ADR 0137)', () => {
  it('itens 153–155: nomes, mira no líquido e receita de 5 tábuas da mesma madeira', () => {
    for (const [i, w] of [Item.BOTE_CARVALHO, Item.BOTE_BETULA, Item.BOTE_CEREJEIRA].entries()) {
      expect(isItem(w) && isBoatItem(w) && aimsLiquid(w)).toBe(true); expect(ITEM_NAMES[w]).toContain('Bote'); expect(w).toBe(153 + i);
      const r = RECIPES.find((x) => x.id === `bote-${BOAT_KINDS[i]}`)!;
      expect(r.station).toBe('workbench'); expect(r.world).toBe('orvalis'); expect(r.ingredients).toEqual([{ item: [Item.TABUA_CARVALHO, Item.TABUA_BETULA, Item.TABUA_CEREJEIRA][i], count: 5 }]); expect(r.result).toEqual({ item: w, count: 1 });
    }
    expect(isItem(176)).toBe(false); expect(isBoatItem(Item.VARA_PESCA)).toBe(false);
  });
  it('põe o bote na superfície; recusa em terra, sem espaço e por cima de outro', async () => {
    const { s, cx, cz } = await lagoon();
    s.inventory.add(Item.BOTE_CARVALHO, 3);
    const slot = slotOf(s, Item.BOTE_CARVALHO);
    expect(boatWater(s.volume, cx + 0.5, cz + 0.5)).toBe(true); expect(LAKE_SURFACE_Y).toBe(64);
    expect(placeFromSlot(s, { x: cx + 11, y: 66, z: cz, nx: 0, ny: 1, nz: 0 }, slot).ok).toBe(false); // na pedra da margem
    expect(placeFromSlot(s, hit(cx + 10, cz), slot).ok).toBe(false); // casco não cabe encostado na margem
    const ok = placeFromSlot(s, hit(cx, cz), slot);
    expect(ok.ok).toBe(true); expect(s.boats).toHaveLength(1); expect(s.boats[0]).toMatchObject({ kind: 0, x: cx + 0.5, z: cz + 0.5, y: BOAT_Y }); expect(s.inventory.total(Item.BOTE_CARVALHO)).toBe(2);
    expect(placeFromSlot(s, hit(cx, cz + 1), slot).ok).toBe(false); // por cima de outro
  });
  it('o bote só anda sobre água: acelera até 8 m/s, gira, desacelera e para na margem', async () => {
    const { s, cx, cz } = await lagoon();
    s.boats.push({ id: 'boat:0', kind: 0, x: cx + 0.5, y: BOAT_Y, z: cz + 0.5, yaw: 0 });
    const b = s.boats[0]; let speed = 0;
    for (let t = 0; t < 1; t += 0.05) speed = stepBoat(s.volume, b, speed, { forward: 1, turn: 0 }, 0.05);
    expect(speed).toBeGreaterThan(4); expect(speed).toBeLessThanOrEqual(BOAT_MAX_SPEED); expect(b.z).toBeLessThan(cz + 0.5); // proa em −Z com giro 0
    const yaw0 = b.yaw; stepBoat(s.volume, b, speed, { forward: 0, turn: 1 }, 0.1); expect(b.yaw).toBeGreaterThan(yaw0);
    for (let t = 0; t < 4; t += 0.05) speed = stepBoat(s.volume, b, speed, { forward: 0, turn: 0 }, 0.05);
    expect(speed).toBe(0);
    b.yaw = 0; b.x = cx + 0.5; b.z = cz + 0.5; speed = 0;
    for (let t = 0; t < 12; t += 0.05) speed = stepBoat(s.volume, b, speed, { forward: 1, turn: 0 }, 0.05);
    expect(speed).toBe(0); expect(boatFits(s.volume, b.x, b.z, b.yaw)).toBe(true); expect(b.z).toBeGreaterThan(cz - 11 + BOAT_HALF_LENGTH - 0.01); // parou antes da margem
  });
  it('mira, embarca, pilota, desembarca e recolhe', async () => {
    const { s, cx, cz } = await lagoon();
    s.boats.push({ id: 'boat:0', kind: 1, x: cx + 0.5, y: BOAT_Y, z: cz + 0.5, yaw: 0 });
    const box = boatBox(s.boats[0]);
    expect(box.x1 - box.x0).toBeCloseTo(2 * 0.62, 5); expect(box.z1 - box.z0).toBeCloseTo(2 * BOAT_HALF_LENGTH, 5);
    expect(boatAim(s.boats, cx + 0.5, 64.9, cz + 4, 0, -0.3, -1, 6)?.index).toBe(0); expect(boatAim(s.boats, cx + 0.5, 64.9, cz + 4, 0, 0.3, 1, 6)).toBeNull();
    s.body.x = cx + 0.5; s.body.y = 65; s.body.z = cz + 3;
    expect(mountBoat(s, 'boat:0').ok).toBe(true); expect(s.boatRide?.id).toBe('boat:0'); expect(s.body.y).toBeGreaterThan(BOAT_Y);
    expect(mountBoat(s, 'boat:0').ok).toBe(false); expect(pickBoat(s, 'boat:0').ok).toBe(false); // a bordo: não recolhe
    dismountBoat(s); expect(s.boatRide).toBeNull();
    const r = collectItem(s, 'bt:boat:0'); // segurar recolhe
    expect(r.ok).toBe(true); expect(s.boats).toHaveLength(0); expect(s.inventory.total(Item.BOTE_BETULA)).toBe(1);
  });
  it('os botes vão ao save e voltam (sem quem estava a bordo); dados inválidos são descartados', async () => {
    const { s, st } = await lagoon();
    s.boats.push({ id: 'boat:0', kind: 2, x: 3.5, y: BOAT_Y, z: -7.25, yaw: 1.2 });
    s.boatRide = { id: 'boat:0', speed: 3 };
    await flush(st, s);
    const saved = st.games.get(42)!;
    expect(saved.boats).toEqual(boatsToData(s.boats)); expect(saved.boats).toEqual([{ k: 2, x: 3.5, y: BOAT_Y, z: -7.25, r: 1.2 }]);
    const { s: s2 } = await open(st);
    expect(s2.boats).toEqual([{ id: 'boat:0', kind: 2, x: 3.5, y: BOAT_Y, z: -7.25, yaw: 1.2 }]); expect(s2.boatRide).toBeNull();
    expect(boatsFromData([{ k: 9, x: 0, y: 64, z: 0, r: 0 }, { k: 0, x: NaN, y: 64, z: 0, r: 0 }, { k: 0, x: 1, y: 9999, z: 0, r: 0 }, null, 'x', { k: 1, x: 1, y: 64, z: 2, r: 0.5 }])).toEqual([{ id: 'boat:0', kind: 1, x: 1, y: 64, z: 2, yaw: 0.5 }]);
    expect(boatsFromData(undefined)).toEqual([]);
  });
  it('sem lugar na mochila, o bote recolhido cai ao lado', async () => {
    const { s, cx, cz } = await lagoon();
    s.boats.push({ id: 'boat:0', kind: 0, x: cx + 0.5, y: BOAT_Y, z: cz + 0.5, yaw: 0 });
    while (s.inventory.canAdd(Item.TIJOLO, 64)) s.inventory.add(Item.TIJOLO, 64);
    const before = s.drops.size;
    expect(pickBoat(s, 'boat:0').ok).toBe(true); expect(s.drops.size).toBe(before + 1);
    void placeBoat;
  });
});
