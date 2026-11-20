import { describe, expect, it } from 'vitest';
import { collectItem, eatFromSlot, placeFromSlot } from './actions';
import { TitanGenerator } from './generator';
import { foodOf, Item } from './items';
import { NUT_REGROW_S, NUT_YIELD, nutId, parseNutId } from './nuts';
import { MemoryTitanStorage } from './save';
import { flush, generatorFor, openSession, standingNuts, tickRegrow } from './session';
import { T } from './voxel';
import { addExhaustion, EXHAUSTION, eat, newVitals, STARVATION_FLOOR, updatePlayerVitals } from './vitals';

const SEEDS = [1, 2, 3, 5, 7, 9, 42, 99, 1234];

describe('gerador v5: plantas de Noz de Duna (ADR 0060)', () => {
  it('toda seed tem 6 plantas: 2 seguras perto da chegada e uma enseada afastada, sobre areia seca, em célula de ar livre de junco e brasa', () => {
    for (const seed of SEEDS) {
      const g = new TitanGenerator(seed, 11), a = g.arrival;
      expect(g.nutPlants.length).toBe(6);
      const d = g.nutPlants.map((p) => Math.hypot(p.x - a.x, p.z - a.z));
      expect(d.filter((x) => x >= 7 && x <= 16).length).toBeGreaterThanOrEqual(2);
      expect(d.filter((x) => x >= 18).length).toBeGreaterThanOrEqual(3);
      for (const p of g.nutPlants) {
        const below = g.blockAt(p.x, p.y - 1, p.z), cell = g.blockAt(p.x, p.y, p.z);
        expect([T.SAND, T.DAMP_SAND]).toContain(below);
        expect(cell).toBe(T.AIR);
        expect(g.reeds.some((r) => r.x === p.x && r.z === p.z)).toBe(false);
        expect(g.emberSite && Math.hypot(g.emberSite.x - p.x, g.emberSite.z - p.z) < 3).toBeFalsy();
      }
    }
  });
  it('é puro por seed e não muda o terreno da v4', () => {
    const a = new TitanGenerator(42, 5), b = new TitanGenerator(42, 5), old = new TitanGenerator(42, 4);
    expect(b.nutPlants).toEqual(a.nutPlants);
    for (let x = -20; x <= 20; x += 5) for (let z = -20; z <= 20; z += 5) for (const y of [60, 64, 65]) expect(a.blockAt(x, y, z)).toBe(old.blockAt(x, y, z));
    expect(a.reeds).toEqual(old.reeds);
  });
});

describe('colher, rebrotar e comer', () => {
  it('colher rende 4 nozes de uma vez, a planta fica sem frutos e rebrota depois de NUT_REGROW_S segundos de jogo; vai no save', async () => {
    const st = new MemoryTitanStorage();
    const s = await openSession(st, 42, () => 1, generatorFor, 11);
    const p = s.volume.gen.nutPlants[0], id = nutId(p.x, p.y, p.z);
    expect(parseNutId(id)).toEqual(p);
    expect(s.items.at(p.x, p.y, p.z)).toBe(id);
    expect(standingNuts(s)).toHaveLength(6); expect(standingNuts(s).every((n) => n.ripe)).toBe(true);
    const r = collectItem(s, id);
    expect(r.ok).toBe(true); expect(s.inventory.total(Item.NOZ)).toBe(NUT_YIELD);
    expect(s.items.at(p.x, p.y, p.z)).toBeNull(); // colhida: não é mais alvo
    expect(standingNuts(s).find((n) => n.x === p.x && n.z === p.z)!.ripe).toBe(false); // continua desenhada, sem frutos
    expect(collectItem(s, id).ok).toBe(false); expect(s.inventory.total(Item.NOZ)).toBe(NUT_YIELD); // não colhe duas vezes
    await flush(st, s);
    const r2 = await openSession(st, null, () => 1);
    expect(r2.regrow.has(id)).toBe(true); expect(r2.items.at(p.x, p.y, p.z)).toBeNull();
    expect(tickRegrow(r2, NUT_REGROW_S - 1)).toBe(false); expect(r2.items.at(p.x, p.y, p.z)).toBeNull();
    expect(tickRegrow(r2, 2)).toBe(true); expect(r2.items.at(p.x, p.y, p.z)).toBe(id); expect(r2.regrow.size).toBe(0); // rebrotou
  });
  it('mochila sem espaço para as 4 nozes: não colhe nada (tudo ou nada)', async () => {
    const s = await openSession(new MemoryTitanStorage(), 42, () => 1, generatorFor, 11);
    for (let i = 0; i < 36; i++) s.inventory.add(Item.SAND, 64); // enche todos os espaços
    const p = s.volume.gen.nutPlants[0], id = nutId(p.x, p.y, p.z);
    const r = collectItem(s, id);
    expect(r.ok).toBe(false); expect(r.msg).toBe('Mochila cheia'); expect(s.regrow.size).toBe(0); expect(s.items.at(p.x, p.y, p.z)).toBe(id);
  });
  it('construir sobre a planta a remove do desenho; rebrote gravado estragado é descartado', async () => {
    const st = new MemoryTitanStorage();
    const s = await openSession(st, 42, () => 1, generatorFor, 11);
    const p = s.volume.gen.nutPlants[1];
    expect(s.volume.place(p.x, p.y, p.z, T.SAND)).toBe(true);
    expect(standingNuts(s)).toHaveLength(5);
    await flush(st, s);
    st.games.get(42)!.regrow = { 'nut:1,2,3': 10, lixo: 5, [nutId(p.x, p.y, p.z)]: -3, 'nut:4,5,6': 'x' as unknown as number };
    const r = await openSession(st, null, () => 1);
    expect([...r.regrow.keys()]).toEqual(['nut:1,2,3']);
  });
  it('comer: a noz recupera 4 de fome e 2,4 de saturação; fome cheia não gasta a noz; com a noz na mão o toque no mundo também come', async () => {
    const s = await openSession(new MemoryTitanStorage(), 42, () => 1, generatorFor, 11);
    s.inventory.add(Item.NOZ, 3);
    const slot = Array.from({ length: 36 }, (_, i) => i).find((i) => s.inventory.get(i)?.item === Item.NOZ)!;
    s.selected = slot;
    expect(foodOf(Item.NOZ)).toEqual({ hunger: 4, saturation: 2.4 });
    const full = eatFromSlot(s, slot);
    expect(full.ok).toBe(false); expect(full.msg).toBe('Sem fome agora'); expect(s.inventory.total(Item.NOZ)).toBe(3);
    s.vitals.hunger = 10; s.vitals.saturation = 0;
    expect(eatFromSlot(s, slot).ok).toBe(true);
    expect(s.vitals.hunger).toBe(14); expect(s.vitals.saturation).toBeCloseTo(2.4, 5); expect(s.inventory.total(Item.NOZ)).toBe(2);
    const a = s.volume.gen.arrival;
    const before = s.volume.get(a.x, a.y - 1, a.z);
    expect(placeFromSlot(s, { x: a.x, y: a.y - 1, z: a.z, nx: 0, ny: 1, nz: 0 }, slot).ok).toBe(true); // come em vez de colocar
    expect(s.vitals.hunger).toBe(18); expect(s.volume.get(a.x, a.y, a.z)).toBe(T.AIR); expect(s.volume.get(a.x, a.y - 1, a.z)).toBe(before);
    s.vitals.hunger = 19; expect(eat(s.vitals, { hunger: 4, saturation: 2.4 })).toBe(true); expect(s.vitals.hunger).toBe(20); expect(s.vitals.saturation).toBeLessThanOrEqual(20);
  });
});

describe('fome ligada (ADR 0060)', () => {
  it('andar, pular e quebrar gastam exaustão; a fome zerada tira vida só até o mínimo (não mata)', () => {
    const v = newVitals(); v.saturation = 0;
    addExhaustion(v, 100 * EXHAUSTION.walkPerBlock, true); // 100 blocos andados = 10 de exaustão = 2,5 pontos de fome
    updatePlayerVitals(v, 0.01, false, true);
    expect(v.hunger).toBe(18); expect(v.exhaustion).toBeCloseTo(2, 5);
    const s = newVitals(); s.hunger = 0; s.saturation = 0;
    for (let t = 0; t < 120; t += 0.05) updatePlayerVitals(s, 0.05, false, true);
    expect(s.health).toBe(STARVATION_FLOOR);
    addExhaustion(s, 5, false); expect(s.exhaustion).toBe(0); // desligada: a exaustão não corre
  });
});
