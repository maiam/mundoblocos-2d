import { describe, expect, it } from 'vitest';
import { Player } from '../game/player';
import { sanctuaryV2Plan } from './sanctuaryV2Plan';
import { makeV2Heightfield, V2_VISIT_POINTS } from './sanctuaryV2Collision';

describe('Santuário V2 — colisão vertical temporária', () => {
  const collision = makeV2Heightfield(sanctuaryV2Plan(), -48, -16);
  const at = (x: number, y: number) => collision.standHeight(-48 + x, -16 + y);

  it('maps all cells to levels 0–5 with bounds and floating island accessible from underneath', () => {
    expect(at(1, 1)).toBe(0);
    expect(at(4, 4)).toBe(1);
    expect(at(4, 7)).toBe(3);
    expect(at(4, 10)).toBe(5);
    expect(at(73, 20)).toBe(0); // suspended preview does not become a ground block
    expect(at(-1, 1)).toBe(null);
    expect(at(80, 31)).toBe(null);
  });

  it('provides a guaranteed accessible 0→1→2→3→4 plateau ascent', () => {
    expect([28, 29, 30, 31, 32].map(x => at(x, 24))).toEqual([0, 1, 2, 3, 4]);
  });

  it('reuses Walker movement to block 3+ walls and smoothly transition one-level stairs', () => {
    const p = new Player(-48 + 28.5, -16 + 24.5);
    const w = collision.walkerWorld;
    expect(p.z).toBe(0);
    // Cross each staircase cell in small steps; no leaps, no teleport through walls.
    for (let i = 0; i < 4; i++) {
      for (let t = 0; t < 13; t++) p.move(1 / 40, 1, 0, w);
      expect(p.z).toBe(i + 1);
    }
    expect(p.visualZ).toBeGreaterThan(0);
    expect(p.visualZ).toBeLessThanOrEqual(p.z);
    const cliff = new Player(-48 + 4.5, -16 + 9.5);
    for (let t = 0; t < 30; t++) cliff.move(1 / 40, 0, 1, w);
    expect(cliff.y).toBeLessThan(-16 + 10);
    expect(cliff.z).toBe(0);
  });

  it('respects the player foot rectangle while selecting the supporting height', () => {
    expect(collision.supportHeight(-48 + 28.5, -16 + 24.5)).toBe(0);
    expect(collision.supportHeight(-48 + 28.8, -16 + 24.5)).toBe(1);
    expect(Object.keys(V2_VISIT_POINTS)).toEqual(['A', 'B', 'C', 'D']);
  });

  it('does not change any World, MAX_STACK or saved chunk data', () => {
    expect(Object.keys(collision)).toEqual(['standHeight', 'supportHeight', 'walkerWorld']);
    expect(collision.walkerWorld.standHeight(-48 + 4, -16 + 10)).toBe(5);
  });
});
