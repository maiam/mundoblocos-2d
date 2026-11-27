import { describe, expect, it } from 'vitest';
import { attackFauna } from '../combat';
import { faunaFromData, faunaSpecs, faunaToData, GROW_S, MAX_FAUNA, newFauna, tickBreeding } from '../fauna';
import { MemoryTitanStorage, TITAN_SAVE_VERSION } from '../save';
import { flush, headerOf, openSession } from '../session';
import { ORVALIS_GENERATOR_VERSION, OrvalisGenerator, orvalisGeneratorFor } from './generator';

/** Fauna no save (ADR 0126): o instantâneo do cabeçalho preserva abates, filhotes, vida e descanso; sem o campo vale a seed. */
const open = async (st: MemoryTitanStorage, seed = 42) => openSession(st, seed, () => 1, orvalisGeneratorFor, ORVALIS_GENERATOR_VERSION, (sd, v) => new OrvalisGenerator(sd, v));

describe('Fauna no save', () => {
  it('a versão do save subiu e o cabeçalho leva a fauna', async () => {
    expect(TITAN_SAVE_VERSION).toBe(6);
    const s = await open(new MemoryTitanStorage());
    const h = headerOf(s);
    expect(h.fauna).toHaveLength(s.fauna.length); expect(h.fauna!.length).toBeGreaterThan(0);
  });
  it('ida e volta: abate, filhote, vida e descanso voltam ao reabrir', async () => {
    const st = new MemoryTitanStorage(); const s = await open(st);
    const seedCount = s.fauna.length;
    const [a, b] = [0, 1].map((i) => s.fauna.filter((f) => f.kind === s.fauna[0].kind)[i]);
    const vitima = s.fauna.find((f) => f !== a && f !== b)!; vitima.hp = 1; attackFauna(s, s.fauna.indexOf(vitima)); // abate um que não é do casal
    a.body.x = 5; a.body.y = 70; a.body.z = 5; b.body.x = 5.4; b.body.y = 70; b.body.z = 5; a.love = 30; b.love = 30;
    const [baby] = tickBreeding(s.fauna, { n: 0 }); s.metaRev++;
    baby.grow = 600; a.hp = 3;
    await flush(st, s);
    const o = await open(st);
    expect(o.fauna.length).toBe(seedCount - 1 + 1);
    const ob = o.fauna.find((f) => f.id === baby.id)!, oa = o.fauna.find((f) => f.id === a.id)!;
    expect(ob.baby).toBe(true); expect(ob.grow).toBeCloseTo(600, 1); expect(ob.hp).toBe(baby.hp);
    expect(oa.hp).toBe(3); expect(oa.rest).toBeGreaterThan(290); expect(oa.love).toBe(0);
    expect(oa.body.x).toBeCloseTo(a.body.x, 1);
  });
  it('o abate persiste: o animal abatido não volta ao reabrir', async () => {
    const st = new MemoryTitanStorage(); const s = await open(st);
    const id = s.fauna[0].id; s.fauna[0].hp = 1; attackFauna(s, 0);
    await flush(st, s);
    const o = await open(st);
    expect(o.fauna.some((f) => f.id === id)).toBe(false);
  });
  it('população vazia gravada = ninguém (não volta a seed)', async () => {
    const st = new MemoryTitanStorage(); const s = await open(st);
    s.fauna.length = 0; s.metaRev++; await flush(st, s);
    const o = await open(st);
    expect(o.fauna).toHaveLength(0);
  });
  it('save sem o campo (antigo) abre com a população da seed', async () => {
    const st = new MemoryTitanStorage(); const s = await open(st);
    await flush(st, s);
    const save = (await st.load(42))!; delete save.header.fauna;
    await st.commit(save.header, [], []);
    const o = await open(st);
    expect(o.fauna.length).toBe(faunaSpecs(new OrvalisGenerator(42, ORVALIS_GENERATOR_VERSION)).length);
  });
  it('dados inválidos são descartados com cuidado e há teto', () => {
    const ok = { id: 'a', k: 'vaca', x: 1.5, y: 70, z: 2.5, hp: 99 };
    const lixo = [null, 7, { id: 5 }, { id: 'b', k: 'dragao', x: 0, y: 70, z: 0, hp: 5 }, { id: 'c', k: 'vaca', x: NaN, y: 70, z: 0, hp: 5 }, { id: 'd', k: 'vaca', x: 9999, y: 70, z: 0, hp: 5 }, ok, { ...ok }, { id: 'e', k: 'porco', x: 3, y: 70, z: 3, hp: -4, b: 1, g: 99999, r: 99999 }];
    const r = faunaFromData(lixo, 42, (x, z) => Math.abs(x) < 100 && Math.abs(z) < 100)!;
    expect(r.map((f) => f.id)).toEqual(['a', 'e']);
    expect(r[0].hp).toBe(10); expect(r[1].hp).toBeGreaterThanOrEqual(1); expect(r[1].baby).toBe(true); expect(r[1].grow).toBe(GROW_S); expect(r[1].rest).toBe(300);
    expect(faunaFromData('x', 42, () => true)).toBeNull(); expect(faunaFromData(undefined, 42, () => true)).toBeNull(); expect(faunaFromData([], 42, () => true)).toEqual([]);
    const muitos = Array.from({ length: MAX_FAUNA + 50 }, (_, i) => ({ id: `m${i}`, k: 'galinha', x: 1, y: 70, z: 1, hp: 4 }));
    expect(faunaFromData(muitos, 42, () => true)).toHaveLength(MAX_FAUNA);
  });
  it('faunaToData arredonda e só grava filhote e descanso quando existem', () => {
    const f = newFauna({ id: 'x', kind: 'ovelha', x: 0, y: 70, z: 0 }, 1); f.body.x = 1.23456;
    expect(faunaToData([f])[0]).toEqual({ id: 'x', k: 'ovelha', x: 1.23, y: 70, z: 0.5, hp: 8 });
    f.baby = true; f.grow = 100.126; f.rest = 20;
    expect(faunaToData([f])[0]).toMatchObject({ b: 1, g: 100.13, r: 20 });
  });
});
