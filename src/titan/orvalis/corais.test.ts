import { describe, expect, it } from 'vitest';
import { breakOrCollect, placeFromSlot } from '../actions';
import { CORAL_DRY_MAX_S, CORAL_DRY_MIN_S, coralWet, stepCoral, watchCoral } from '../coral';
import { blockOfItem, isItem, ITEM_NAMES, Item, itemOfBlock } from '../items';
import { OrvalisGenerator, REEF } from './generator';
import { newBody, stepBody } from '../physics';
import { MemoryTitanStorage } from '../save';
import { openSession } from '../session';
import { CORAL_KINDS, coralFamily, deadCoral, isCoral, isCoralBlock, isCoralFan, isCoralLive, isCoralPlant, isLiquidCell, isSolid, isWaterPlant, modelOf, T, T_MAX } from '../voxel';
import { hardnessOf } from '../breaking';

/** Corais (ADR 0136): 5 famílias × coral, gorgônia e bloco × vivo e morto; recifes da v6; o bloco vivo morre sem água. */
const Y = 150;
const hit = (x: number, y: number, z: number, ny = 1) => ({ x, y, z, nx: 0, ny, nz: 0 });
const pool = async () => {
  const s = await openSession(new MemoryTitanStorage(), 42, () => 1, undefined, 2);
  const a = s.volume.gen.arrival, x = Math.floor(a.x) + 6, z = Math.floor(a.z) + 6, v = s.volume;
  for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) for (let yy = Y - 6; yy < Y + 4; yy++) v.set(x + dx, yy, z + dz, yy < Y - 5 ? T.STONE : yy < Y ? T.LAKE : T.AIR);
  return { s, x, z };
};
const slotOf = (s: Awaited<ReturnType<typeof pool>>['s'], item: number) => Array.from({ length: 36 }, (_, i) => i).find((i) => s.inventory.get(i)?.item === item)!;

describe('corais (ADR 0136)', () => {
  it('30 blocos e 30 itens: tipos, vivos e mortos, nomes, modelos e regras', () => {
    expect(T_MAX).toBeGreaterThanOrEqual(189); // lajes e degraus de madeira vieram depois (ADR 0139)
    for (let n = 0; n < 30; n++) {
      const item = 123 + n, block = blockOfItem(item)!, base = [T.CORAL, T.CORAL_FAN, T.CORAL_BLOCK][Math.floor(n / 10)];
      expect(block).toBe(base + (n % 10)); expect(isItem(item)).toBe(true); expect(itemOfBlock(block)).toBe(item); expect(ITEM_NAMES[item]).toBeTruthy();
      expect(isCoral(block)).toBe(true); expect(isCoralLive(block)).toBe(n % 10 < 5); expect(coralFamily(block)).toBe(n % 5);
    }
    expect(isItem(176)).toBe(false); expect(isItem(122)).toBe(false);
    expect(ITEM_NAMES[Item.CORAL_VIVO]).toBe('Coral de Tubo'); expect(ITEM_NAMES[Item.BLOCO_CORAL_MORTO + 4]).toBe('Bloco de Coral de Chifre Morto');
    expect(deadCoral(T.CORAL_BLOCK + 3)).toBe(T.CORAL_BLOCK + 8); expect(deadCoral(T.CORAL_BLOCK + 8)).toBe(T.CORAL_BLOCK + 8);
    for (let i = 0; i < 10; i++) {
      expect(isCoralPlant(T.CORAL + i) && isWaterPlant(T.CORAL + i) && isWaterPlant(T.CORAL_FAN + i)).toBe(true);
      expect(isLiquidCell(T.CORAL + i) && !isSolid(T.CORAL + i) && !isSolid(T.CORAL_FAN + i)).toBe(true);
      expect(isCoralBlock(T.CORAL_BLOCK + i) && isSolid(T.CORAL_BLOCK + i) && !isWaterPlant(T.CORAL_BLOCK + i)).toBe(true);
      expect(modelOf(T.CORAL + i)?.kind).toBe(CORAL_KINDS[i]); expect(modelOf(T.CORAL_FAN + i)?.kind).toBe(CORAL_KINDS[10 + i]); expect(modelOf(T.CORAL_BLOCK + i)).toBeNull();
      expect(hardnessOf(T.CORAL_BLOCK + i)).toBe(1.5);
    }
    expect(isCoralFan(T.CORAL_FAN)).toBe(true);
  });
  it('a v6 gera recifes (blocos e plantas de coral vivos); a v5 não; sem coral morto; é determinística', () => {
    const g6 = new OrvalisGenerator(42, 6), g5 = new OrvalisGenerator(42, 5), seen = new Set<number>();
    let n5 = 0;
    for (let x = -64; x < 64; x++) for (let z = -64; z < 64; z++) for (let y = 40; y <= 63; y++) {
      const b = g6.blockAt(x, y, z); if (isCoral(b)) { seen.add(b); expect(isCoralLive(b)).toBe(true); }
      if (isCoral(g5.blockAt(x, y, z))) n5++;
    }
    expect(n5).toBe(0); expect([...seen].some(isCoralBlock)).toBe(true); expect([...seen].some(isCoralPlant)).toBe(true);
    expect(new OrvalisGenerator(42, 6).blockAt(0, 50, 0)).toBe(g6.blockAt(0, 50, 0)); expect(REEF.threshold).toBeGreaterThan(0);
  });
  it('o recife fica dentro da água, sem tocar a superfície, sobre areia e sem erva marinha nem alga', () => {
    const g = new OrvalisGenerator(42, 6);
    for (let x = -64; x < 64; x++) for (let z = -64; z < 64; z++) {
      const top = g.column(x, z).top; let reef = false;
      for (let y = top + 1; y <= 63; y++) { const b = g.blockAt(x, y, z); if (isCoral(b)) { reef = true; expect(y).toBeLessThanOrEqual(62); expect(g.column(x, z).surface).toBe(T.BEACH); } }
      if (reef) for (let y = top + 1; y <= 63; y++) expect([T.SEAGRASS, T.SEAGRASS_TALL, T.SEAGRASS_TALL_TOP, T.KELP, T.KELP_TOP]).not.toContain(g.blockAt(x, y, z));
      expect(isCoral(g.blockAt(x, 63, z))).toBe(false);
    }
  });
  it('planta coral e gorgônia só dentro da água, sobre piso firme; o bloco de coral serve de piso', async () => {
    const { s, x, z } = await pool();
    s.inventory.add(Item.CORAL_VIVO, 1); s.inventory.add(Item.GORGONIA_VIVA + 2, 1); s.inventory.add(Item.BLOCO_CORAL_VIVO + 1, 2);
    expect(placeFromSlot(s, hit(x, Y - 6, z), slotOf(s, Item.CORAL_VIVO)).ok).toBe(true); expect(s.volume.get(x, Y - 5, z)).toBe(T.CORAL);
    expect(placeFromSlot(s, hit(x + 1, Y - 3, z), slotOf(s, Item.GORGONIA_VIVA + 2)).ok).toBe(false); // sem piso
    expect(placeFromSlot(s, hit(x + 2, Y - 6, z), slotOf(s, Item.BLOCO_CORAL_VIVO + 1)).ok).toBe(true); // bloco em cima da pedra
    expect(s.volume.get(x + 2, Y - 5, z)).toBe(T.CORAL_BLOCK + 1);
    expect(placeFromSlot(s, hit(x + 2, Y - 5, z), slotOf(s, Item.GORGONIA_VIVA + 2)).ok).toBe(true); // gorgônia sobre o bloco de coral
    expect(s.volume.get(x + 2, Y - 4, z)).toBe(T.CORAL_FAN + 2);
    const b = newBody(x + 2.5, Y - 4, z + 0.5); stepBody(s.volume, b, { dirX: 0, dirZ: 0, jump: false }, 0.02); expect(b.inLiquid).toBe(true);
  });
  it('quebrar solta o próprio item (vivo continua vivo), deixa água e leva as plantas de cima', async () => {
    const { s, x, z } = await pool();
    s.volume.set(x, Y - 5, z, T.CORAL_BLOCK + 4); s.volume.set(x, Y - 4, z, T.CORAL_FAN + 4);
    expect(breakOrCollect(s, hit(x, Y - 5, z)).ok).toBe(true);
    expect(s.volume.get(x, Y - 5, z)).not.toBe(T.CORAL_BLOCK + 4); expect(s.volume.get(x, Y - 4, z)).toBe(T.LAKE);
    const dropped = [...s.drops.values()].map((d) => d.item).sort();
    expect(dropped).toEqual([Item.GORGONIA_VIVA + 4, Item.BLOCO_CORAL_VIVO + 4].sort());
  });
  it('o bloco de coral vivo posto sem água morre em 3 a 6 s; dentro da água, não', async () => {
    const { s, x, z } = await pool();
    s.inventory.add(Item.BLOCO_CORAL_VIVO + 3, 2);
    const slot = slotOf(s, Item.BLOCO_CORAL_VIVO + 3);
    expect(placeFromSlot(s, hit(x, Y - 6, z), slot).ok).toBe(true); // dentro da água: nada a vigiar
    expect(s.coralWatch.size).toBe(0);
    s.volume.set(x + 3, Y + 2, z - 3, T.CORAL_BLOCK + 3); watchCoral(s, x + 3, Y + 2, z - 3, () => 0); // no ar, longe da água
    expect(coralWet(s, x + 3, Y + 2, z - 3)).toBe(false); expect(s.coralWatch.size).toBe(1);
    expect(stepCoral(s, CORAL_DRY_MIN_S - 0.5)).toBe(0); expect(s.volume.get(x + 3, Y + 2, z - 3)).toBe(T.CORAL_BLOCK + 3);
    expect(stepCoral(s, 1)).toBe(1); expect(s.volume.get(x + 3, Y + 2, z - 3)).toBe(T.CORAL_BLOCK + 8); expect(s.coralWatch.size).toBe(0);
    expect(CORAL_DRY_MAX_S).toBeGreaterThan(CORAL_DRY_MIN_S);
  });
  it('se a água chega antes, o relógio some', async () => {
    const { s, x, z } = await pool();
    s.volume.set(x + 3, Y + 2, z - 3, T.CORAL_BLOCK); watchCoral(s, x + 3, Y + 2, z - 3, () => 0.5); expect(s.coralWatch.size).toBe(1);
    s.volume.set(x + 3, Y + 2, z - 2, T.LAKE);
    expect(stepCoral(s, 10)).toBe(0); expect(s.coralWatch.size).toBe(0); expect(s.volume.get(x + 3, Y + 2, z - 3)).toBe(T.CORAL_BLOCK);
  });
});
