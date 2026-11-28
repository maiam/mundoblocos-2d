import { describe, expect, it } from 'vitest';
import { breakOrCollect, collectNearby, dieAndRespawn, wearHeldTool } from './actions';
import { Inventory } from './inventory';
import { Item } from './items';
import { MemoryTitanStorage } from './save';
import { flush, openSession } from './session';
import { T } from './voxel';
import { durabilityHue, durabilityRatio, MAX_DURABILITY, maxDurability, wearCost } from './wear';

const slotOf = (s: { inventory: Inventory }, item: number): number => Array.from({ length: 9 }, (_, i) => i).find((i) => s.inventory.get(i)?.item === item)!;

describe('durabilidade das ferramentas (ADR 0067)', () => {
  it('tabela e custos do Minecraft: picareta −1 no bloco e −2 no golpe; adaga −2 no bloco e −1 no golpe; recolhimento instantâneo não gasta', () => {
    expect(maxDurability(Item.STONE_PICK)).toBe(131); expect(maxDurability(Item.COPPER_DAGGER)).toBe(190); expect(maxDurability(Item.NOZ)).toBeNull(); expect(Object.keys(MAX_DURABILITY)).toHaveLength(16); // as 4 do Titã e as 8 do Orvalis (ADR 0112)
    for (const [tool, block, atk] of [[Item.STONE_PICK, 1, 2], [Item.COPPER_PICK, 1, 2], [Item.STONE_DAGGER, 2, 1], [Item.COPPER_DAGGER, 2, 1]] as const) {
      expect(wearCost(tool, { type: 'break_block', block: T.DARK_ROCK })).toBe(block); expect(wearCost(tool, { type: 'attack' })).toBe(atk);
    }
    for (const b of [T.LANTERN, T.MARCO, T.PAINEL]) expect(wearCost(Item.STONE_PICK, { type: 'break_block', block: b })).toBe(0);
    expect(wearCost(Item.NOZ, { type: 'attack' })).toBe(0); // sem ferramenta
  });
  it('barra: só depois do primeiro desgaste, razão de 1 a 0 e matiz de verde (120°) a vermelho (0°)', () => {
    expect(durabilityRatio(Item.STONE_PICK, undefined)).toBeNull(); expect(durabilityRatio(Item.STONE_PICK, 0)).toBeNull(); expect(durabilityRatio(Item.NOZ, 5)).toBeNull();
    expect(durabilityRatio(Item.STONE_PICK, 1)).toBeCloseTo(130 / 131, 6); expect(durabilityRatio(Item.STONE_PICK, 131)).toBe(0);
    expect(durabilityHue(1)).toBe(120); expect(durabilityHue(0.5)).toBe(60); expect(durabilityHue(0)).toBe(0); expect(durabilityHue(-1)).toBe(0); expect(durabilityHue(2)).toBe(120);
  });
  it('Inventory.damage: soma ao contador, quebra no máximo e some; não mexe em item sem durabilidade; o desgaste vai e volta no save e acompanha a troca de espaço', () => {
    const inv = Inventory.starting(); inv.add(Item.STONE_PICK); inv.add(Item.SAND, 5);
    expect(inv.damage(0, 3)).toEqual({ broken: false, left: 128 }); expect(inv.get(0)!.wear).toBe(3);
    expect(inv.damage(1, 3)).toBeNull(); expect(inv.damage(0, 0)).toBeNull(); expect(inv.get(1)!.wear).toBeUndefined();
    expect(inv.move(0, 5)).toBe(true); expect(inv.get(5)!.wear).toBe(3); // a troca de espaço leva o desgaste junto
    const back = Inventory.fromData(JSON.parse(JSON.stringify(inv.toData())));
    expect(back.get(5)!.wear).toBe(3); expect(back.get(1)!.wear).toBeUndefined();
    const bad = Inventory.fromData({ v: 3, slots: [[Item.STONE_PICK, 1, 999], [Item.SAND, 2, 5], [Item.STONE_PICK, 1, -4], [Item.STONE_PICK, 1, 1.5]], craft: [] });
    expect([0, 2, 3].map((i) => bad.get(i)!.wear)).toEqual([undefined, undefined, undefined]); expect(bad.get(1)!.wear).toBeUndefined(); // limite, item sem durabilidade e valores estragados caem fora
    expect(inv.damage(5, 200)).toEqual({ broken: true, left: 0 }); expect(inv.get(5)).toBeNull();
  });
  it('quebrar bloco gasta a ferramenta na mão (picareta −1; adaga −2; recolher lanterna 0); a 131ª quebra o item some, avisa e a mão fica vazia', async () => {
    const s = await openSession(new MemoryTitanStorage(), 42, () => 1);
    const Y = 150;
    s.inventory.add(Item.STONE_PICK); s.inventory.add(Item.STONE_DAGGER);
    const pick = slotOf(s, Item.STONE_PICK), dag = slotOf(s, Item.STONE_DAGGER);
    const hit = (x: number) => ({ x, y: Y, z: 10, nx: 0, ny: 1, nz: 0 });
    s.volume.place(1, Y, 10, T.DARK_ROCK); s.volume.place(2, Y, 10, T.DARK_ROCK); s.volume.place(3, Y, 10, T.LANTERN);
    s.selected = pick; expect(breakOrCollect(s, hit(1)).ok).toBe(true); expect(s.inventory.get(pick)!.wear).toBe(1);
    s.selected = dag; expect(breakOrCollect(s, hit(2)).ok).toBe(true); expect(s.inventory.get(dag)!.wear).toBe(2);
    s.selected = pick; expect(breakOrCollect(s, hit(3)).ok).toBe(true); expect(s.inventory.get(pick)!.wear).toBe(1); // lanterna: instantâneo
    // desgasta até o limite
    let last = { ok: false, broken: false as boolean | undefined, msg: '' as string | undefined };
    for (let n = 0; n < 200 && s.inventory.get(pick); n++) { s.volume.place(4, Y, 10, T.DARK_ROCK); const r = breakOrCollect(s, hit(4)); last = { ok: r.ok, broken: r.broken, msg: r.msg }; }
    expect(s.inventory.get(pick)).toBeNull(); expect(last.broken).toBe(true); expect(last.msg).toBe('Picareta de Rocha quebrou');
    expect(wearHeldTool(s, { type: 'attack' }).broken).toBe(false); // mão vazia: nada
  });
  it('morrer solta a ferramenta com o desgaste e recolher a devolve igual; reabrir o save mantém o desgaste', async () => {
    const st = new MemoryTitanStorage();
    const s = await openSession(st, 42, () => 1);
    s.inventory.add(Item.COPPER_PICK); const slot = slotOf(s, Item.COPPER_PICK); s.inventory.damage(slot, 40);
    s.body.x += 3.5; s.body.z += 0;
    const px = Math.floor(s.body.x), py = Math.floor(s.body.y), pz = Math.floor(s.body.z);
    expect(dieAndRespawn(s)).toBe(1);
    const drop = [...s.drops.values()].find((d) => d.item === Item.COPPER_PICK)!; expect(drop.wear).toBe(40);
    await flush(st, s);
    const r = await openSession(st, null, () => 1);
    expect([...r.drops.values()].find((d) => d.item === Item.COPPER_PICK)!.wear).toBe(40);
    collectNearby(r, px + 0.5, drop.y, pz + 0.5); void py;
    expect(r.inventory.get(slotOf(r, Item.COPPER_PICK))!.wear).toBe(40);
  });
});
