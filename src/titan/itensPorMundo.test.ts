import { describe, expect, it } from 'vitest';
import { blockOfItem, Item } from './items';
import { RECIPES } from './recipes';
import { gardenSpeciesOf, seedOf } from './crops';

/**
 * Regra do dono do produto (ADR 0114): os itens do Titã e os do Orvalis em voxel são **diferentes e só servem no próprio mundo**; nada é compartilhado.
 * O catálogo é um só (`Item`), partido por faixa: **1 a 41 = Titã**, **42 em diante = Orvalis em voxel**. Estes testes impedem que uma receita, um bloco ou uma semente misture as faixas.
 */
const FIRST_ORVALIS_ITEM = Item.GRASS; // 42
const worldOfItem = (item: number): 'titan' | 'orvalis' => (item >= FIRST_ORVALIS_ITEM ? 'orvalis' : 'titan');
const FIRST_ORVALIS_BLOCK = 90;

describe('itens por mundo (ADR 0114)', () => {
  it('a faixa de ids parte o catálogo: 1 a 41 é do Titã e 42 em diante é do Orvalis', () => {
    expect(FIRST_ORVALIS_ITEM).toBe(42);
    for (const [name, id] of Object.entries(Item)) expect(worldOfItem(id), name).toBe(id >= 42 ? 'orvalis' : 'titan');
    expect(Item.DEGRAU_JUNCO).toBeLessThan(42); expect(Item.PORTA_JUNCO).toBeLessThan(42); expect(Item.PEDRA_LISA).toBeGreaterThanOrEqual(42); expect(Item.ENXADA_PEDRA).toBeGreaterThanOrEqual(42);
  });

  it('toda receita usa só itens do mundo dela: sem `world` = Titã, `world: "orvalis"` = Orvalis (ingredientes e resultado)', () => {
    for (const r of RECIPES) {
      const mundo = r.world ?? 'titan';
      for (const s of [r.result, ...r.ingredients]) expect(worldOfItem(s.item), `${r.id}: ${s.item}`).toBe(mundo);
    }
    expect(RECIPES.some((r) => r.world === 'orvalis') && RECIPES.some((r) => !r.world)).toBe(true);
  });

  it('o bloco que um item coloca é do mundo do item: blocos do Orvalis começam no id 90 e os do Titã ficam abaixo', () => {
    for (const [name, id] of Object.entries(Item)) {
      const b = blockOfItem(id);
      if (b === null) continue;
      expect(b >= FIRST_ORVALIS_BLOCK, `${name} → bloco ${b}`).toBe(worldOfItem(id) === 'orvalis');
    }
  });

  it('as sementes da horta são itens do Orvalis; as plantas do Titã (junco, Noz) usam itens do Titã', () => {
    for (const sp of ['trigo', 'cenoura', 'batata', 'tomate'] as const) { expect(worldOfItem(seedOf(sp))).toBe('orvalis'); expect(gardenSpeciesOf(seedOf(sp))).toBe(sp); }
    expect(worldOfItem(seedOf('junco'))).toBe('titan'); expect(worldOfItem(seedOf('noz'))).toBe('titan');
  });
});
