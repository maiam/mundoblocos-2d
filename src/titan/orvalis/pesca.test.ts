import { describe, expect, it } from 'vitest';
import { placeFromSlot } from '../actions';
import { FISH_MAX_DISTANCE, FISH_TABLE, FISH_WAIT_MAX_S, FISH_WAIT_MIN_S, FISH_WINDOW_MAX_S, FISH_WINDOW_MIN_S, newBobber, rollFish, stepFishing, tickBobber } from '../fishing';
import { aimsLiquid, foodOf, isItem, Item } from '../items';
import { maxDurability } from '../wear';
import { MemoryTitanStorage } from '../save';
import { openSession, visibleItems } from '../session';
import { T } from '../voxel';
import { RECIPES } from '../recipes';
import { SLOTS } from '../inventory';

/** Pesca do Orvalis (ADR 0133): vara, boia, espera, fisgada, peixes e comida pela Wiki. */
const Y = 150;
const setup = async () => {
  const s = await openSession(new MemoryTitanStorage(), 42, () => 1, undefined, 2);
  const a = s.volume.gen.arrival, x = Math.floor(a.x) + 6, z = Math.floor(a.z) + 6, v = s.volume;
  for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) for (let yy = Y - 6; yy < Y + 4; yy++) v.set(x + dx, yy, z + dz, yy < Y - 5 ? T.DARK_ROCK : yy < Y ? T.LAKE : T.AIR);
  s.body.x = x + 0.5; s.body.y = Y; s.body.z = z + 3.5;
  s.inventory.add(Item.VARA_PESCA, 1);
  s.selected = Array.from({ length: SLOTS }, (_, i) => i).find((i) => s.inventory.get(i)?.item === Item.VARA_PESCA) ?? 0;
  return { s, x, z };
};
const hitAt = (x: number, y: number, z: number) => ({ x, y, z, nx: 0, ny: 1, nz: 0 });

describe('pesca (ADR 0133)', () => {
  it('itens, comida e durabilidade da Wiki', () => {
    expect(isItem(106)).toBe(true); expect(isItem(112)).toBe(true); expect(isItem(113)).toBe(false);
    expect(foodOf(Item.BACALHAU_CRU)).toEqual({ hunger: 2, saturation: 0.4 }); expect(foodOf(Item.SALMAO_ASSADO)).toEqual({ hunger: 6, saturation: 9.6 });
    expect(foodOf(Item.BACALHAU_ASSADO)).toEqual({ hunger: 5, saturation: 6 }); expect(foodOf(Item.PEIXE_TROPICAL)).toEqual({ hunger: 1, saturation: 0.2 });
    expect(foodOf(Item.BAIACU)).toBeNull(); // sem efeitos de status, o baiacu não se come
    expect(maxDurability(Item.VARA_PESCA)).toBe(64); expect(aimsLiquid(Item.VARA_PESCA)).toBe(true);
  });
  it('a tabela de peixes soma 100 e o sorteio respeita os pesos', () => {
    expect(FISH_TABLE.reduce((a, e) => a + e.weight, 0)).toBe(100);
    expect(rollFish(() => 0)).toBe(Item.BACALHAU_CRU); expect(rollFish(() => 0.61)).toBe(Item.SALMAO_CRU); expect(rollFish(() => 0.9)).toBe(Item.BAIACU); expect(rollFish(() => 0.995)).toBe(Item.PEIXE_TROPICAL);
  });
  it('espera de 5 a 30 s, fisgada e janela de 1 a 2 s; sem recolher, o peixe escapa', () => {
    expect(newBobber(0, 0, 0, () => 0).t).toBe(FISH_WAIT_MIN_S); expect(newBobber(0, 0, 0, () => 1).t).toBe(FISH_WAIT_MAX_S);
    const b = newBobber(0, 0, 0, () => 0);
    expect(tickBobber(b, 4.9, () => 0)).toBeNull(); expect(tickBobber(b, 0.2, () => 0)).toBe('bite');
    expect(b.phase).toBe('bite'); expect(b.t).toBe(FISH_WINDOW_MIN_S); expect(FISH_WINDOW_MAX_S).toBe(2);
    expect(tickBobber(b, 1.1, () => 0)).toBe('escape'); expect(b.phase).toBe('wait');
  });
  it('lança na água, a boia aparece e o toque na fisgada traz o peixe e gasta 1 uso', async () => {
    const { s, x, z } = await setup();
    const r = placeFromSlot(s, hitAt(x, Y - 1, z), s.selected);
    expect(r.ok).toBe(true); expect(s.fishing).toMatchObject({ x, y: Y, z, phase: 'wait' });
    expect(visibleItems(s).some((i) => i.id === 'boia' && i.item === Item.BOIA)).toBe(true);
    s.fishing!.t = 0.01; expect(stepFishing(s, 0.1)).toBe('bite');
    const got = placeFromSlot(s, hitAt(x, Y - 1, z), s.selected);
    expect(got.ok).toBe(true); expect(got.msg).toMatch(/Pescou/); expect(s.fishing).toBeNull();
    const n = [Item.BACALHAU_CRU, Item.SALMAO_CRU, Item.BAIACU, Item.PEIXE_TROPICAL].reduce((a, i) => a + s.inventory.total(i), 0);
    expect(n).toBe(1); expect(s.inventory.get(s.selected)?.wear).toBe(1);
  });
  it('recolher antes da fisgada não pega nada nem gasta a vara', async () => {
    const { s, x, z } = await setup();
    placeFromSlot(s, hitAt(x, Y - 1, z), s.selected);
    const r = placeFromSlot(s, hitAt(x, Y - 1, z), s.selected);
    expect(r.msg).toBe('Linha recolhida'); expect(s.fishing).toBeNull(); expect(s.inventory.get(s.selected)?.wear ?? 0).toBe(0);
  });
  it('só lança na água', async () => {
    const { s, x, z } = await setup();
    expect(placeFromSlot(s, hitAt(x, Y - 6, z), s.selected).ok).toBe(false); expect(s.fishing).toBeNull(); // o fundo de rocha
  });
  it('a linha se solta com a vara fora da mão ou longe demais', async () => {
    const { s, x, z } = await setup();
    placeFromSlot(s, hitAt(x, Y - 1, z), s.selected);
    s.body.z += FISH_MAX_DISTANCE + 1; expect(stepFishing(s, 0.1)).toBe('lost'); expect(s.fishing).toBeNull();
    s.body.z -= FISH_MAX_DISTANCE + 1; placeFromSlot(s, hitAt(x, Y - 1, z), s.selected);
    s.selected = (s.selected + 1) % 9; expect(stepFishing(s, 0.1)).toBe('lost');
  });
  it('bacalhau e salmão assam na fornalha; a vara ainda não tem receita (espera o fio)', () => {
    const ids = RECIPES.filter((r) => r.world === 'orvalis').map((r) => r.id);
    expect(ids).toContain('assar-bacalhau'); expect(ids).toContain('assar-salmao');
    expect(RECIPES.some((r) => r.result.item === Item.VARA_PESCA)).toBe(false);
  });
  it('sem lugar na mochila, o peixe cai ao lado da boia', async () => {
    const { s, x, z } = await setup();
    placeFromSlot(s, hitAt(x, Y - 1, z), s.selected); s.fishing!.t = 0; stepFishing(s, 0.1);
    while (s.inventory.canAdd(Item.TIJOLO, 64)) s.inventory.add(Item.TIJOLO, 64); // lota a mochila
    const before = s.drops.size;
    placeFromSlot(s, hitAt(x, Y - 1, z), s.selected);
    expect(s.drops.size).toBe(before + 1);
  });
});
