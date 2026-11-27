import { describe, expect, it } from 'vitest';
import { breakOrCollect } from '../actions';
import { breakTotalMs, blockToolOf, HOLD_MS } from '../breaking';
import { FUEL_TIME_S, furnaceFromData, FURNACE_RULES, newFurnace, tickFurnace } from '../furnace';
import { blockOfItem, isItem, Item, itemOfBlock, ITEM_NAMES, maxStack } from '../items';
import { craft, recipeById } from '../recipes';
import { MemoryTitanStorage } from '../save';
import { openSession } from '../session';
import { surfaceOf } from '../sounds';
import { isFull, T, tileFor, tileIndex, blocksLight } from '../voxel';
import { ORVALIS_GENERATOR_VERSION, ORVALIS_ORE_RULES, OrvalisGenerator, orvalisGeneratorFor } from './generator';

/** Carvão mineral do Orvalis (ADR 0122, auditoria #34): minério, Carvão e Bloco de Carvão pela Minecraft Wiki. */
const open = async () => ({ s: await openSession(new MemoryTitanStorage(), 42, () => 1, orvalisGeneratorFor, ORVALIS_GENERATOR_VERSION, (sd, v) => new OrvalisGenerator(sd, v)) });
const Y = 150;
const spot = (s: Awaited<ReturnType<typeof open>>['s']) => { const a = s.volume.gen.arrival, x = Math.floor(a.x) + 6, z = Math.floor(a.z) + 6; s.volume.set(x, Y, z, T.COAL_ORE); s.volume.set(x, Y + 1, z, T.AIR); return { x, z }; };

describe('carvão: blocos, itens e regras', () => {
  it('blocos 150 (minério) e 151 (bloco): cubos opacos com tile próprio, picareta, som de rocha; o item 87 é o Carvão e o 88, o Bloco', () => {
    expect(T.COAL_ORE).toBe(150); expect(T.COAL_BLOCK).toBe(151);
    for (const id of [T.COAL_ORE, T.COAL_BLOCK]) { expect(isFull(id) && blocksLight(id)).toBe(true); expect(blockToolOf(id)).toBe('pick'); expect(surfaceOf(id)).toBe('rock'); }
    expect(tileFor(T.COAL_ORE, 'top')).toBe(tileIndex('orvalis/minerio-carvao')); expect(tileFor(T.COAL_BLOCK, 'side')).toBe(tileIndex('orvalis/bloco-carvao'));
    expect(Item.CARVAO).toBe(87); expect(Item.BLOCO_CARVAO).toBe(88); expect(isItem(87) && isItem(88)).toBe(true); expect(isItem(86) || isItem(106)).toBe(false);
    expect(ITEM_NAMES[87]).toBe('Carvão'); expect(ITEM_NAMES[88]).toBe('Bloco de Carvão'); expect(maxStack(87)).toBe(64);
    expect(blockOfItem(Item.BLOCO_CARVAO)).toBe(T.COAL_BLOCK); expect(blockOfItem(Item.CARVAO)).toBeNull();
    expect(itemOfBlock(T.COAL_ORE)).toBe(Item.CARVAO); expect(itemOfBlock(T.COAL_BLOCK)).toBe(Item.BLOCO_CARVAO); // o minério solta Carvão, nunca o bloco
  });
  it('dureza da Wiki: minério 3 (mão 15 s, picareta de madeira 2,25 s, de pedra 1,15 s) e bloco 5', () => {
    expect(breakTotalMs('block', T.COAL_ORE)).toBe(HOLD_MS + 15000); expect(breakTotalMs('block', T.COAL_ORE, 'wood')).toBe(HOLD_MS + 2250); expect(breakTotalMs('block', T.COAL_ORE, 'rock')).toBe(HOLD_MS + 1150);
    expect(breakTotalMs('block', T.COAL_BLOCK, 'rock')).toBe(HOLD_MS + 1900); // 5 × 1,5 ÷ 4 = 1,875 s → 1,9 s (ticks de 50 ms)
  });
  it('receitas: 9 Carvão ↔ Bloco; Tocha também com Carvão (+ haste → 4); combustível 80 s e 800 s', async () => {
    const r = (id: string) => recipeById(id)!;
    expect(r('bloco-carvao').ingredients).toEqual([{ item: Item.CARVAO, count: 9 }]); expect(r('bloco-carvao').station).toBe('workbench');
    expect(r('carvao-do-bloco').result).toEqual({ item: Item.CARVAO, count: 9 }); expect(r('carvao-do-bloco').station).toBe('personal');
    expect(r('tocha-carvao').ingredients).toEqual([{ item: Item.CARVAO, count: 1 }, { item: Item.HASTE, count: 1 }]); expect(r('tocha-carvao').result).toEqual({ item: Item.TOCHA, count: 4 });
    for (const id of ['bloco-carvao', 'carvao-do-bloco', 'tocha-carvao']) expect(r(id).world).toBe('orvalis');
    const { s } = await open(); s.inventory.add(Item.CARVAO, 10); s.inventory.add(Item.HASTE, 1);
    expect(craft(s.inventory, r('tocha-carvao'), null).ok).toBe(true); expect(s.inventory.total(Item.TOCHA)).toBe(4); expect(s.inventory.total(Item.CARVAO)).toBe(9);
    expect(FUEL_TIME_S[Item.CARVAO]).toBe(80); expect(FUEL_TIME_S[Item.BLOCO_CARVAO]).toBe(800);
  });
  it('o bloco de carvão queima 800 s (80 preparações) e o saldo grava e volta inteiro', () => {
    const f = newFurnace(); f.input = { item: Item.LOG_OAK, count: 64 }; f.fuel = { item: Item.BLOCO_CARVAO, count: 1 };
    tickFurnace(f, 10, FURNACE_RULES); expect(f.output).toEqual({ item: Item.CARVAO_VEGETAL, count: 1 }); expect(f.burnTotal).toBe(800); expect(f.burnLeft).toBeCloseTo(790, 5);
    expect(furnaceFromData(JSON.parse(JSON.stringify({ b: f.burnLeft, t: f.burnTotal, c: 0 })), FURNACE_RULES).burnLeft).toBeCloseTo(790, 5); // o limite do save subiu de 600 para 800
  });
});

describe('carvão: quebrar o minério', () => {
  it('com picareta (qualquer) solta 1 Carvão; sem picareta quebra e não solta nada (Wiki)', async () => {
    const a = await open(), p = spot(a.s);
    expect(breakOrCollect(a.s, { x: p.x, y: Y, z: p.z, nx: 0, ny: 1, nz: 0 }).ok).toBe(true);
    expect([...a.s.drops.values()].length).toBe(0); expect(a.s.volume.get(p.x, Y, p.z)).toBe(T.AIR);
    const b = await open(), q = spot(b.s); b.s.inventory.add(Item.PICARETA_MADEIRA, 1); b.s.inventory.move([...Array(36).keys()].find((i) => b.s.inventory.get(i)?.item === Item.PICARETA_MADEIRA)!, 0); b.s.selected = 0;
    expect(breakOrCollect(b.s, { x: q.x, y: Y, z: q.z, nx: 0, ny: 1, nz: 0 }).ok).toBe(true);
    expect([...b.s.drops.values()].filter((d) => d.item === Item.CARVAO).length).toBe(1);
  });
});

describe('carvão: geração (gerador v2)', () => {
  const sample = (g: OrvalisGenerator): { ore: number; stone: number; minY: number; maxY: number; shallow: number; air: number } => {
    let ore = 0, stone = 0, minY = 999, maxY = -999, shallow = 0, air = 0;
    for (let x = -60; x < 60; x += 2) for (let z = -60; z < 60; z += 2) {
      const top = g.column(x, z).top;
      for (let y = -60; y <= 100; y++) {
        const b = g.blockAt(x, y, z);
        if (b === T.COAL_ORE) { ore++; minY = Math.min(minY, y); maxY = Math.max(maxY, y); if (y >= top - 3) shallow++; if (y > top) air++; } else if (b === T.STONE) stone++;
      }
    }
    return { ore, stone, minY, maxY, shallow, air };
  };
  it('a v2 gera veios só dentro da pedra (abaixo do subsolo), na faixa da regra e com densidade parecida com a do Minecraft (~1 %); a v1 não tem minério', () => {
    expect(ORVALIS_GENERATOR_VERSION).toBeGreaterThanOrEqual(2); expect(ORVALIS_ORE_RULES[0]).toMatchObject({ blockId: T.COAL_ORE, veinsPerChunk: 20, minY: -60, maxY: 90, peakY: 40 });
    const g = new OrvalisGenerator(42, 2), r = sample(g), share = r.ore / (r.ore + r.stone);
    expect(r.ore).toBeGreaterThan(500); expect(share).toBeGreaterThan(0.003); expect(share).toBeLessThan(0.05);
    expect(r.shallow).toBe(0); expect(r.air).toBe(0); expect(r.minY).toBeGreaterThanOrEqual(-60); expect(r.maxY).toBeLessThanOrEqual(90 + 30); // um veio pode passar um pouco do limite de partida
    expect(sample(new OrvalisGenerator(42, 1)).ore).toBe(0);
  });
  it('determinístico e independente da ordem de leitura; outra seed desenha outros veios', () => {
    const a = new OrvalisGenerator(7, 2), b = new OrvalisGenerator(7, 2);
    const cells: Array<[number, number, number]> = []; for (let i = 0; i < 400; i++) cells.push([(i * 37) % 120 - 60, (i * 53) % 150 - 60, (i * 71) % 120 - 60]);
    const fwd = cells.map(([x, y, z]) => a.blockAt(x, y, z)), back = [...cells].reverse().map(([x, y, z]) => b.blockAt(x, y, z)).reverse();
    expect(fwd).toEqual(back);
    const c = new OrvalisGenerator(8, 2); expect(sample(c).ore).not.toBe(sample(a).ore);
  });
});
