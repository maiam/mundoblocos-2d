import { describe, expect, it } from 'vitest';
import { extrudeMask, itemMask, maskFromHex } from './extrude';
import { heldBlockOf, heldBlockTiles, heldCategory } from './heldKinds';
import { Item } from './items';
import { T, tileFor } from './voxel';

describe('extrusão de sprite (ADR 0087)', () => {
  it('máscara: decodifica 1 bit por pixel, linha por linha, bit mais alto primeiro', () => {
    expect(Array.from(maskFromHex('9', 4, 1))).toEqual([1, 0, 0, 1]);
    expect(Array.from(maskFromHex('a5', 4, 2))).toEqual([1, 0, 1, 0, 0, 1, 0, 1]);
  });
  it('um pixel: frente, verso e as 4 bordas (6 quadrados)', () => {
    const e = extrudeMask([1], 1, 1, 1 / 16);
    expect(e.quads).toBe(6); expect(e.idx).toHaveLength(36); expect(e.pos).toHaveLength(6 * 4 * 3);
    const zs = e.pos.filter((_, i) => i % 3 === 2); expect(Math.max(...zs)).toBeCloseTo(1 / 32, 10); expect(Math.min(...zs)).toBeCloseTo(-1 / 32, 10);
  });
  it('dois pixels vizinhos: a borda entre eles some (10 quadrados); pixel isolado em quina não ganha borda interna', () => {
    expect(extrudeMask([1, 1], 2, 1, 1 / 16).quads).toBe(2 * 2 + 6);
    expect(extrudeMask([1, 0, 0, 1], 2, 2, 1 / 16).quads).toBe(12); // dois pixels na diagonal: cada um com 6
    expect(extrudeMask([0, 0, 0, 0], 2, 2, 1 / 16).quads).toBe(0);
  });
  it('as posições ficam centradas em [−0,5, 0,5] e as UVs em 0–1 (v para cima)', () => {
    const e = extrudeMask(new Array(16).fill(1), 4, 4, 1 / 16);
    const xs = e.pos.filter((_, i) => i % 3 === 0), ys = e.pos.filter((_, i) => i % 3 === 1);
    expect(Math.min(...xs)).toBeCloseTo(-0.5, 10); expect(Math.max(...xs)).toBeCloseTo(0.5, 10); expect(Math.min(...ys)).toBeCloseTo(-0.5, 10); expect(Math.max(...ys)).toBeCloseTo(0.5, 10);
    expect(Math.min(...e.uv)).toBeGreaterThanOrEqual(0); expect(Math.max(...e.uv)).toBeLessThanOrEqual(1);
    expect(e.nrm).toHaveLength(e.pos.length); expect(e.uv).toHaveLength((e.pos.length / 3) * 2);
  });
  it('todo item com ícone tem máscara não vazia; o triângulo extrudado fica num orçamento pequeno', () => {
    for (let item = 1; item <= Item.ESTEIRA; item++) {
      const m = itemMask(item);
      expect(m, `item ${item}`).not.toBeNull();
      expect(m!.w).toBe(32); expect(m!.mask.length).toBe(1024); expect(m!.mask.some((b) => b === 1)).toBe(true);
      expect(extrudeMask(m!.mask, m!.w, m!.h, 1 / 16).quads).toBeLessThan(3500);
    }
    expect(itemMask(999)).toBeNull();
  });
});

describe('categorias do item na mão (ADR 0087)', () => {
  it('mão vazia, modelo, ferramenta, bloco cúbico e item plano', () => {
    expect(heldCategory(null, false)).toBe('hand');
    expect(heldCategory(Item.STONE_DAGGER, true)).toBe('model'); expect(heldCategory(Item.STONE_PICK, true)).toBe('model');
    expect(heldCategory(Item.COPPER_PICK, false)).toBe('tool'); expect(heldCategory(Item.COPPER_DAGGER, false)).toBe('tool');
    for (const it of [Item.SAND, Item.DAMP_SAND, Item.DARK_ROCK, Item.FROST, Item.EMBER_BLOCK, Item.CARAPACE]) expect(heldCategory(it, false), `item ${it}`).toBe('block');
    for (const it of [Item.NOZ, Item.NOZ_TORRADA, Item.RAW_MEAT, Item.ROCK_SHARD, Item.EMBER, Item.GLASS_REED, Item.DRY_REED, Item.COPPER_INGOT, Item.ESTEIRA, Item.SLAB, Item.LANTERN, Item.WORKBENCH, Item.MARCO, Item.PAINEL, Item.BRAZIER]) expect(heldCategory(it, false), `item ${it}`).toBe('flat');
  });
  it('só o cubo inteiro mostra as texturas do terreno (topo, lateral e base do bloco)', () => {
    expect(heldBlockOf(Item.SAND)).toBe(T.SAND); expect(heldBlockOf(Item.SLAB)).toBeNull(); expect(heldBlockOf(Item.WORKBENCH)).toBeNull();
    expect(heldBlockTiles(Item.DARK_ROCK)).toEqual([tileFor(T.DARK_ROCK, 'top'), tileFor(T.DARK_ROCK, 'side'), tileFor(T.DARK_ROCK, 'bottom')]);
    expect(heldBlockTiles(Item.NOZ)).toBeNull();
  });
});
