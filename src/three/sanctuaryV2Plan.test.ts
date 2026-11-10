import { describe, expect, it } from 'vitest';
import { sanctuaryV2Plan, SANCTUARY_V2_SECTORS } from './sanctuaryV2Plan';
import { SANCTUARY_V2_IDS, sanctuaryTextureId } from './sanctuaryV2Materials';

describe('Laboratório Santuário V2 — layout multi-material', () => {
  const cells = sanctuaryV2Plan();
  it('is deterministic, unique, fully inside 80×32, with only official IDs', () => {
    expect(sanctuaryV2Plan()).toEqual(cells);
    const key = cells.map(({ x, y }) => x + ':' + y);
    expect(new Set(key).size).toBe(cells.length);
    for (const c of cells) {
      expect(c.x).toBeGreaterThanOrEqual(0);
      expect(c.x).toBeLessThan(80);
      expect(c.y).toBeGreaterThanOrEqual(0);
      expect(c.y).toBeLessThan(32);
      expect(c.height).toBeGreaterThanOrEqual(1);
      expect(c.height).toBeLessThanOrEqual(5);
      expect(SANCTUARY_V2_IDS).toContain(c.top);
      expect(SANCTUARY_V2_IDS).toContain(c.side);
    }
  });
  it('includes all four sections and every ID 80–85', () => {
    expect(new Set(cells.map(c => c.section))).toEqual(new Set(['A','B','C','D']));
    for (const id of SANCTUARY_V2_IDS) expect(cells.some(c => c.top === id || c.side === id)).toBe(true);
  });
  it('material sector has six 1, 3 and 5 block towers plus samples', () => {
    const samples = cells.filter(c => c.section === 'A');
    expect(samples).toHaveLength(6 * (3 + 4));
    for (const id of SANCTUARY_V2_IDS) {
      const towers = samples.filter(c => c.side === id && [4,7,10].includes(c.y));
      expect(towers.map(c => c.height)).toEqual([1,3,5]);
    }
  });
  it('contains tall mountains, plateau, sacred plaza, and suspended island', () => {
    expect(cells.some(c => c.section === 'C' && c.height === 5)).toBe(true);
    expect(cells.some(c => c.section === 'B' && c.height === 3 && c.top === 83)).toBe(true);
    const island = cells.filter(c => c.floating);
    expect(island.length).toBeGreaterThan(10);
    expect(island.every(c => c.section === 'D' && c.side === 80)).toBe(true);
    expect(Object.keys(SANCTUARY_V2_SECTORS)).toEqual(['A','B','C','D']);
  });
  it('detects filenames by ID; refuses unrecognized files', () => {
    expect(sanctuaryTextureId('80-nuvem-solida.png')).toBe(80);
    expect(sanctuaryTextureId('85_pedra-dourada.png')).toBe(85);
    expect(sanctuaryTextureId('marmore-celestial.png')).toBe(null);
    expect(sanctuaryTextureId('86-grass.png')).toBe(null);
  });
});
