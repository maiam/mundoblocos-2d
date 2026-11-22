import { describe, expect, it } from 'vitest';
import empty from '../assets/titan-balde.json';
import full from '../assets/titan-balde-cheio.json';
import { STYLES, handPose } from '../render/heldPose';
import { heldCategory } from './heldKinds';
import { Item } from './items';

/** Balde de Cobre 3D na mão (ADR 0095): malhas leves do Blender, pivô no topo e estilo de mão próprio. */
type M = { size: number[]; pos: number[]; nrm: number[]; uv: number[]; idx: number[] };
const check = (m: M): void => {
  const n = m.pos.length / 3;
  expect(m.nrm.length).toBe(m.pos.length); expect(m.uv.length / 2).toBe(n);
  expect(Math.max(...m.idx)).toBeLessThan(n); expect(m.idx.length % 3).toBe(0);
  expect(Math.min(...m.uv)).toBeGreaterThanOrEqual(0); expect(Math.max(...m.uv)).toBeLessThanOrEqual(1);
  const ys = m.pos.filter((_, i) => i % 3 === 1);
  expect(Math.max(...ys)).toBeCloseTo(0, 3); expect(Math.min(...ys)).toBeLessThan(-0.3); // pende para baixo a partir do topo
};

describe('balde 3D', () => {
  it('malhas vazia e cheia são leves, coerentes e o cheio só soma o disco de líquido', () => {
    check(empty as M); check(full as M);
    const te = (empty as M).idx.length / 3, tf = (full as M).idx.length / 3;
    expect(te).toBeLessThanOrEqual(1500); expect(tf - te).toBe(24);
  });
  it('o item com malha vira categoria "modelo" e a mão tem estilo de balde', () => {
    expect(heldCategory(Item.BALDE, true)).toBe('model'); expect(heldCategory(Item.BALDE_CHEIO, true)).toBe('model');
    expect(STYLES.bucket).toBeDefined();
    const p = handPose(0.5, { x: 0, y: 0 }, 0, 'bucket');
    expect(Object.values(p).every(Number.isFinite)).toBe(true);
  });
});
