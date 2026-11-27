import { describe, expect, it } from 'vitest';
import { attackFauna } from '../combat';
import { BABY_SCALE, BREED_COOLDOWN_S, BREED_FOOD, faunaAim, faunaBox, faunaLoot, FAUNA_KINDS, feedFauna, GROW_S, isBreedFood, LOVE_S, MATE_RANGE, MAX_FAUNA, maxHp, newFauna, stepFauna, tickBreeding, type Fauna } from '../fauna';
import { feedFaunaFromSlot } from '../faunaFeed';
import { Item } from '../items';
import { MemoryTitanStorage } from '../save';
import { openSession } from '../session';
import { T } from '../voxel';
import { ORVALIS_GENERATOR_VERSION, OrvalisGenerator, orvalisGeneratorFor } from './generator';

/** Reprodução da fauna de fazenda (ADR 0125, Minecraft Wiki "Breeding"): comida, amor, cruzamento, filhote e crescimento. */
const open = async () => openSession(new MemoryTitanStorage(), 42, () => 1, orvalisGeneratorFor, ORVALIS_GENERATOR_VERSION, (sd, v) => new OrvalisGenerator(sd, v));
const at = (id: string, kind: 'porco' | 'vaca' | 'ovelha' | 'galinha', x: number, z: number): Fauna => { const f = newFauna({ id, kind, x: 0, y: 70, z: 0 }, 42); f.body.x = x; f.body.y = 70; f.body.z = z; return f; };
const flat = (s: Awaited<ReturnType<typeof open>>) => { for (let y = 68; y <= 73; y++) for (let x = -4; x <= 30; x++) for (let z = -10; z <= 10; z++) s.volume.set(x, y, z, y < 70 ? T.STONE : T.AIR); };

describe('Comida e modo de amor (Wiki)', () => {
  it('vaca e ovelha: trigo; porco: cenoura e batata; galinha: semente de trigo', () => {
    expect(BREED_FOOD.vaca).toEqual([Item.TRIGO]); expect(BREED_FOOD.ovelha).toEqual([Item.TRIGO]);
    expect(BREED_FOOD.porco).toEqual([Item.CENOURA, Item.BATATA]); expect(BREED_FOOD.galinha).toEqual([Item.SEMENTE_TRIGO]);
    expect(isBreedFood('vaca', Item.CENOURA)).toBe(false); expect(isBreedFood('porco', Item.TRIGO)).toBe(false); expect(isBreedFood('galinha', Item.TRIGO)).toBe(false); expect(isBreedFood('porco', null)).toBe(false);
  });
  it('a comida certa põe o adulto em amor por 30 s; a errada não faz nada', () => {
    const f = at('a', 'vaca', 5, 0);
    expect(feedFauna(f, Item.CENOURA)).toEqual({ ok: false, reason: 'food' }); expect(f.love).toBe(0);
    expect(feedFauna(f, Item.TRIGO)).toEqual({ ok: true, effect: 'love' }); expect(f.love).toBe(LOVE_S); expect(LOVE_S).toBe(30);
  });
  it('em amor ou descansando não aceita (e não gasta a comida)', () => {
    const f = at('a', 'ovelha', 5, 0);
    feedFauna(f, Item.TRIGO);
    expect(feedFauna(f, Item.TRIGO)).toEqual({ ok: false, reason: 'love' });
    f.love = 0; f.rest = 10;
    expect(feedFauna(f, Item.TRIGO)).toEqual({ ok: false, reason: 'rest' });
  });
  it('o amor acaba sozinho sem cruzar, e o descanso também', async () => {
    const s = await open(); flat(s);
    const f = at('a', 'vaca', 5, 0); f.love = 2; f.rest = 2; f.pause = 99;
    for (let i = 0; i < 50; i++) stepFauna(f, s.volume, 0.05);
    expect(f.love).toBe(0); expect(f.rest).toBe(0);
  });
});

describe('Cruzamento e filhote', () => {
  it('dois adultos da mesma espécie em amor andam um até o outro e geram um filhote', async () => {
    const s = await open(); flat(s);
    const a = at('a', 'vaca', 5, 0), b = at('b', 'vaca', 11, 0);
    a.love = LOVE_S; b.love = LOVE_S; a.pause = 0; b.pause = 0;
    const list = [a, b], counter = { n: 0 };
    let born: Fauna[] = [];
    for (let i = 0; i < 600 && !born.length; i++) { born = tickBreeding(list, counter); for (const f of list) stepFauna(f, s.volume, 0.05); }
    expect(born).toHaveLength(1); expect(list).toHaveLength(3);
    const baby = born[0];
    expect(baby.baby).toBe(true); expect(baby.kind).toBe('vaca'); expect(baby.grow).toBeGreaterThan(GROW_S - 1);
    expect(a.love).toBe(0); expect(b.love).toBe(0); expect(a.rest).toBeGreaterThan(BREED_COOLDOWN_S - 1); expect(b.rest).toBeGreaterThan(BREED_COOLDOWN_S - 1); expect(BREED_COOLDOWN_S).toBe(300);
  });
  it('espécies diferentes, longe demais (> 8 m) ou sem amor não cruzam', async () => {
    const a = at('a', 'vaca', 0, 0), b = at('b', 'ovelha', 1, 0); a.love = 30; b.love = 30;
    expect(tickBreeding([a, b], { n: 0 })).toHaveLength(0);
    const c = at('c', 'vaca', 0, 0), d = at('d', 'vaca', MATE_RANGE + 2, 0); c.love = 30; d.love = 30;
    expect(tickBreeding([c, d], { n: 0 })).toHaveLength(0);
    const e = at('e', 'vaca', 0, 0), g = at('g', 'vaca', 0.5, 0); e.love = 30;
    expect(tickBreeding([e, g], { n: 0 })).toHaveLength(0);
  });
  it('nasce de novo só depois do descanso de 5 min, e o teto de 200 animais vale', () => {
    const a = at('a', 'galinha', 0, 0), b = at('b', 'galinha', 0.5, 0); a.love = 30; b.love = 30;
    const list = [a, b]; tickBreeding(list, { n: 0 }); expect(list).toHaveLength(3);
    expect(feedFauna(a, Item.SEMENTE_TRIGO)).toEqual({ ok: false, reason: 'rest' });
    const cheia: Fauna[] = Array.from({ length: MAX_FAUNA }, (_, i) => at(`x${i}`, 'porco', 50 + i, 50));
    cheia[0].body.x = 0; cheia[0].body.z = 0; cheia[1].body.x = 0.5; cheia[1].body.z = 0; cheia[0].love = 30; cheia[1].love = 30;
    expect(tickBreeding(cheia, { n: 0 })).toHaveLength(0); expect(cheia).toHaveLength(MAX_FAUNA);
  });
  it('o filhote tem a metade da caixa e da vida e some o espólio', () => {
    const a = at('a', 'vaca', 0, 0), b = at('b', 'vaca', 0.5, 0); a.love = 30; b.love = 30;
    const list = [a, b]; const [baby] = tickBreeding(list, { n: 0 });
    const adult = faunaBox(a), box = faunaBox(baby);
    expect(box.x1 - box.x0).toBeCloseTo((adult.x1 - adult.x0) * BABY_SCALE); expect(box.y1 - box.y0).toBeCloseTo(1.4 * BABY_SCALE);
    expect(baby.hp).toBe(5); expect(maxHp(baby)).toBe(5); expect(maxHp(a)).toBe(FAUNA_KINDS.vaca.hp);
    expect(faunaLoot('vaca', 42, 1, true)).toEqual([]); expect(faunaLoot('vaca', 42, 1).length).toBeGreaterThan(0);
    expect(faunaAim([baby], baby.body.x - 5, baby.body.y + 0.9, baby.body.z, 1, 0, 0, 20)).toBeNull(); // acima da caixa pequena (0,7 m)
    expect(faunaAim([baby], baby.body.x - 5, baby.body.y + 0.3, baby.body.z, 1, 0, 0, 20)).not.toBeNull();
  });
  it('o filhote segue o adulto da espécie e cresce em 20 min (vida de adulto)', async () => {
    const s = await open(); flat(s);
    const a = at('a', 'ovelha', 5, 0), b = at('b', 'ovelha', 5.6, 0); a.love = 30; b.love = 30;
    const list = [a, b], [baby] = tickBreeding(list, { n: 0 });
    baby.body.x = 12; baby.pause = 0; a.pause = 99; b.pause = 99;
    const d0 = Math.abs(baby.body.x - a.body.x);
    for (let i = 0; i < 200; i++) { tickBreeding(list, { n: 1 }); stepFauna(baby, s.volume, 0.05); }
    expect(Math.abs(baby.body.x - a.body.x)).toBeLessThan(d0);
    baby.grow = 0.1; stepFauna(baby, s.volume, 0.2);
    expect(baby.baby).toBe(false); expect(baby.hp).toBe(FAUNA_KINDS.ovelha.hp);
  });
  it('alimentar o filhote corta 10 % do que falta', () => {
    const baby = at('b', 'porco', 0, 0); baby.baby = true; baby.grow = 1000;
    expect(feedFauna(baby, Item.CENOURA)).toEqual({ ok: true, effect: 'grow' }); expect(baby.grow).toBeCloseTo(900);
    feedFauna(baby, Item.BATATA); expect(baby.grow).toBeCloseTo(810);
    expect(feedFauna(baby, Item.TRIGO)).toEqual({ ok: false, reason: 'food' });
  });
});

describe('Alimentar pelo inventário e abate', () => {
  it('a comida certa gasta 1 unidade e põe em amor; a errada, em animal em amor ou descansando, não gasta', async () => {
    const s = await open(); const f = at('a', 'vaca', 5, 0); s.fauna.length = 0; s.fauna.push(f);
    s.inventory.add(Item.TRIGO, 3); s.selected = 0;
    const slot = [...Array(9).keys()].find((i) => s.inventory.get(i)?.item === Item.TRIGO)!; s.selected = slot;
    const r = feedFaunaFromSlot(s, 0);
    expect(r.ok).toBe(true); expect(r.consumed).toBe(true); expect(f.love).toBe(LOVE_S); expect(s.inventory.total(Item.TRIGO)).toBe(2);
    const again = feedFaunaFromSlot(s, 0);
    expect(again.ok).toBe(false); expect(again.consumed).toBe(false); expect(again.msg).toContain('já está em amor'); expect(s.inventory.total(Item.TRIGO)).toBe(2);
    expect(feedFaunaFromSlot(s, 7).ok).toBe(false);
  });
  it('abater o filhote não solta nada', async () => {
    const s = await open(); const f = at('a', 'porco', 5, 0); f.baby = true; f.hp = 1; s.fauna.length = 0; s.fauna.push(f);
    const r = attackFauna(s, 0);
    expect(r.dead).toBe(true); expect(r.msg).toContain('(filhote)'); expect(s.drops.size).toBe(0);
  });
});
