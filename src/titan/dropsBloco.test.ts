import { describe, expect, it } from 'vitest';
import { breakOrCollect, collectNearby, DROP_LIFE_S, PICKUP_DELAY_S, dieAndRespawn } from './actions';
import { settleDrops } from './drops';
import { Item } from './items';
import { MemoryTitanStorage } from './save';
import { flush, openSession } from './session';
import { T } from './voxel';

/** Drop de bloco (ADR 0082): o bloco quebrado cai no chão, com atraso de coleta, recolhido por proximidade e some em 5 min. */
const open = async (st = new MemoryTitanStorage()) => ({ st, s: await openSession(st, 42, () => 1, undefined, 2) });
const cell = (s: Awaited<ReturnType<typeof openSession>>) => { const a = s.volume.gen.arrival; return { bx: Math.floor(a.x), bz: Math.floor(a.z) }; };
const hit = (x: number, y: number, z: number) => ({ x, y, z, nx: 0, ny: 1, nz: 0 });

describe('drop de bloco', () => {
  it('quebrar não enche a mochila: o bloco cai na célula quebrada', async () => {
    const { s } = await open();
    const { bx, bz } = cell(s);
    const antes = s.inventory.total(Item.SAND);
    expect(breakOrCollect(s, hit(bx, 64, bz)).ok).toBe(true);
    expect(s.inventory.total(Item.SAND)).toBe(antes);
    const d = s.drops.get(`b:${bx},64,${bz}:0`)!;
    expect(d).toMatchObject({ item: Item.SAND, x: bx, z: bz });
    expect(s.dropFx.get(d.id)).toEqual({ delay: PICKUP_DELAY_S, age: 0 });
  });

  it('atraso de coleta: nada entra antes de 0,45 s; depois entra', async () => {
    const { s } = await open();
    const { bx, bz } = cell(s);
    breakOrCollect(s, hit(bx, 64, bz));
    const d = [...s.drops.values()][0];
    expect(collectNearby(s, d.x + 0.5, d.y, d.z + 0.5, 0.2).collected).toBe(0);
    expect(collectNearby(s, d.x + 0.5, d.y, d.z + 0.5, 0.2).collected).toBe(0); // 0,4 s
    expect(collectNearby(s, d.x + 0.5, d.y, d.z + 0.5, 0.1).collected).toBe(1); // 0,5 s
    expect(s.drops.size).toBe(0); expect(s.dropFx.size).toBe(0);
  });

  it('raio de coleta de 1,45 m: de 2 m não pega', async () => {
    const { s } = await open();
    const { bx, bz } = cell(s);
    breakOrCollect(s, hit(bx, 64, bz));
    const d = [...s.drops.values()][0];
    expect(collectNearby(s, d.x + 2.5, d.y, d.z + 0.5, 1).collected).toBe(0);
    expect(collectNearby(s, d.x + 1.5, d.y, d.z + 0.5, 1).collected).toBe(1);
  });

  it('mochila cheia: o item fica no chão e entra quando abre espaço', async () => {
    const { s } = await open();
    const { bx, bz } = cell(s);
    breakOrCollect(s, hit(bx, 64, bz));
    const d = [...s.drops.values()][0];
    let n = 0; while (s.inventory.canAdd(Item.SAND) && n++ < 5000) s.inventory.add(Item.SAND, 1);
    expect(s.inventory.canAdd(Item.SAND)).toBe(false);
    expect(collectNearby(s, d.x + 0.5, d.y, d.z + 0.5, 1)).toMatchObject({ collected: 0, full: true });
    expect(s.drops.size).toBe(1);
  });

  it('quebrar a mesma célula duas vezes não repete o id', async () => {
    const { s } = await open();
    const { bx, bz } = cell(s);
    s.volume.set(bx, 150, bz, T.DARK_ROCK);
    breakOrCollect(s, hit(bx, 150, bz));
    s.volume.set(bx, 150, bz, T.DARK_ROCK);
    breakOrCollect(s, hit(bx, 150, bz));
    expect(s.drops.has(`b:${bx},150,${bz}:0`) && s.drops.has(`b:${bx},150,${bz}:1`)).toBe(true);
    expect(s.drops.size).toBe(2);
  });

  it('a lanterna vai direto para a mochila; sem espaço, fica no lugar', async () => {
    const { s } = await open();
    const { bx, bz } = cell(s);
    s.volume.set(bx + 3, 150, bz, T.LANTERN);
    expect(breakOrCollect(s, hit(bx + 3, 150, bz)).ok).toBe(true);
    expect(s.inventory.total(Item.LANTERN)).toBe(1);
    expect(s.drops.size).toBe(0);
    s.volume.set(bx + 3, 150, bz, T.LANTERN);
    for (let i = 0; i < 40; i++) s.inventory.add(Item.CAPSULE, 1); // enche as vagas de itens que não empilham
    let n = 0; while (s.inventory.canAdd(Item.LANTERN) && n++ < 200) s.inventory.add(Item.CAPSULE, 1);
    expect(breakOrCollect(s, hit(bx + 3, 150, bz))).toEqual({ ok: false, msg: 'Mochila cheia' });
    expect(s.volume.get(bx + 3, 150, bz)).toBe(T.LANTERN);
  });

  it('some depois de 5 minutos; a pilha da morte nunca some', async () => {
    const { s } = await open();
    const { bx, bz } = cell(s);
    breakOrCollect(s, hit(bx, 64, bz));
    s.inventory.add(Item.EMBER, 3);
    dieAndRespawn(s); settleDrops(s); // a pilha da morte cai por gravidade (ADR 0098): aqui já pousou
    const mortos = [...s.drops.keys()].filter((k) => k.startsWith('d:')).length;
    expect(mortos).toBeGreaterThan(0);
    const far = { x: bx + 40, y: 64, z: bz + 40 };
    expect(collectNearby(s, far.x, far.y, far.z, DROP_LIFE_S - 1).moved).toBe(false);
    expect(collectNearby(s, far.x, far.y, far.z, 2).moved).toBe(true);
    expect([...s.drops.keys()].filter((k) => k.startsWith('b:'))).toHaveLength(0);
    expect([...s.drops.keys()].filter((k) => k.startsWith('d:'))).toHaveLength(mortos);
  });

  it('o drop de bloco persiste no save e, ao reabrir, entra sem atraso', async () => {
    const { st, s } = await open();
    const { bx, bz } = cell(s);
    breakOrCollect(s, hit(bx, 64, bz));
    await flush(st, s);
    const r = await openSession(st, null, () => 1);
    expect(r.drops.size).toBe(1);
    const d = [...r.drops.values()][0];
    expect(collectNearby(r, d.x + 0.5, d.y, d.z + 0.5, 0.016).collected).toBe(1);
  });
});
