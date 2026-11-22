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
      expect([16, 32]).toContain(m!.w); expect(m!.h).toBe(m!.w); expect(m!.mask.length).toBe(m!.w * m!.h); expect(m!.mask.some((b) => b === 1)).toBe(true);
      expect(extrudeMask(m!.mask, m!.w, m!.h, 1 / 16).quads).toBeLessThan(3500);
    }
    expect(itemMask(999)).toBeNull();
  });
});

/** Regra visual (ADR 0097): arma, ferramenta e item são sprite 2D extrudado de 16 × 16, nunca modelo 3D esculpido. */
describe('regra visual: sprite 2D extrudado de 16 × 16 (ADR 0097)', () => {
  const SPRITES = [Item.STONE_PICK, Item.STONE_DAGGER, Item.COPPER_PICK, Item.COPPER_DAGGER, Item.BALDE, Item.BALDE_CHEIO];
  it('armas, ferramentas e o balde têm arte de 16 × 16 e são "ferramenta" ou item plano, nunca modelo', () => {
    for (const it of SPRITES) { const m = itemMask(it)!; expect([m.w, m.h], `item ${it}`).toEqual([16, 16]); expect(heldCategory(it, false), `item ${it}`).not.toBe('model'); }
    for (const it of [Item.STONE_PICK, Item.STONE_DAGGER, Item.COPPER_PICK, Item.COPPER_DAGGER]) expect(heldCategory(it, false)).toBe('tool');
    for (const it of [Item.BALDE, Item.BALDE_CHEIO]) expect(heldCategory(it, false)).toBe('flat');
  });
  it('a malha é um adesivo grosso: frente e verso (1 quadrado por pixel opaco) e só as bordas onde o vizinho é transparente, com 1/16 de espessura', () => {
    for (const it of SPRITES) {
      const { mask, w, h } = itemMask(it)!, e = extrudeMask(mask, w, h, 1 / 16);
      const on = (x: number, y: number): boolean => x >= 0 && x < w && y >= 0 && y < h && mask[y * w + x] > 0;
      let opaque = 0, edges = 0;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (on(x, y)) { opaque++; for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) if (!on(x + dx, y + dy)) edges++; }
      expect(e.quads, `item ${it}`).toBe(2 * opaque + edges); // sem faces internas: nada de cubinhos empilhados
      const zs = e.pos.filter((_, i) => i % 3 === 2);
      expect(Math.max(...zs) - Math.min(...zs)).toBeCloseTo(1 / 16, 10);
      expect(e.quads * 2).toBeLessThan(1200); // 16 × 16: leve por definição
    }
  });
  it('a espessura é 1/16 do item em qualquer resolução (16 ou 32): o mesmo adesivo', () => {
    const z = (n: number): number => { const e = extrudeMask(new Array(n * n).fill(1), n, n, 1 / 16), zs = e.pos.filter((_, i) => i % 3 === 2); return Math.max(...zs) - Math.min(...zs); };
    expect(z(16)).toBeCloseTo(1 / 16, 10); expect(z(32)).toBeCloseTo(1 / 16, 10);
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
