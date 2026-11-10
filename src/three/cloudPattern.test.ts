import { describe, expect, it } from 'vitest';
import { Block } from '../world/blocks';
import type { World } from '../world/world';
import { CLOUD_PATTERN_CELLS, synthesizeCloudPattern } from './cloudPattern';
import { buildCloudSurface, exposedCloudEdge } from './cloudSurface';

describe('macrotextura de nuvem (V1.2)', () => {
  const source = new Uint8ClampedArray(128 * 128 * 4);
  for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
    const i = (y * 128 + x) * 4;
    source[i] = x;
    source[i + 1] = y;
    source[i + 2] = (x * 5 + y * 7) & 255;
    source[i + 3] = 255;
  }

  it('is deterministic and produces different patterns with another salt', () => {
    const a = synthesizeCloudPattern(source, 64, 91);
    const b = synthesizeCloudPattern(source, 64, 91);
    const c = synthesizeCloudPattern(source, 64, 429);
    expect([...a]).toEqual([...b]);
    expect([...a]).not.toEqual([...c]);
  });

  it('matches the left/right and upper/lower boundary pixels', () => {
    const size = 64;
    const data = synthesizeCloudPattern(source, size);
    const pixel = (x: number, y: number) => [...data.slice((y * size + x) * 4, (y * size + x + 1) * 4)];
    for (let n = 0; n < size; n++) {
      expect(pixel(0, n)).toEqual(pixel(size - 1, n));
      expect(pixel(n, 0)).toEqual(pixel(n, size - 1));
    }
  });

  it('renders only exposed cloud surfaces and keeps UV coordinates in world space', () => {
    const fake = {
      getGround(x: number, y: number) {
        return x >= 0 && x < 3 && y >= 0 && y < 3 ? Block.CLOUD_SOLID : Block.VOID;
      },
      getLevel() { return Block.AIR; },
      getObject() { return Block.AIR; },
    } as unknown as World;
    const mats = { dummy: true };
    const meshes = buildCloudSurface(fake, { x0: 0, x1: 2, y0: 0, y1: 2 }, mats, mats);
    expect(meshes).toHaveLength(2);
    const top = meshes[0].geometry;
    const sides = meshes[1].geometry;
    expect(top.getAttribute('position').count).toBe(9 * 6);
    expect(sides.getAttribute('position').count).toBe(12 * 6);
    const uv = top.getAttribute('uv');
    expect(uv.getX(0)).toBe(0);
    expect(uv.getX(6)).toBeCloseTo(1 / CLOUD_PATTERN_CELLS);
    meshes.forEach((m: any) => m.geometry.dispose());
  });

  it('places ornaments only where a cloud column has an exposed neighbor', () => {
    const fake = {
      getObject(x: number, y: number) {
        return x >= 0 && x <= 4 && y >= 0 && y <= 4 ? Block.CLOUD_SOLID : Block.AIR;
      },
    } as unknown as World;
    expect(exposedCloudEdge(fake, 2, 2, 1, 0)).toBe(false);
    expect(exposedCloudEdge(fake, 4, 2, 1, 0)).toBe(true);
    expect(exposedCloudEdge(fake, 4, 2, -1, 0)).toBe(false);
  });
});
