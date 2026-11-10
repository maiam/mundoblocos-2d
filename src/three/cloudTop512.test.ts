import { describe, expect, it } from 'vitest';
import { cloudSeamErrors } from './cloudTop512';
import { Block } from '../world/blocks';
import type { World } from '../world/world';
import { buildCloudSurface } from './cloudSurface';

describe('Nuvem Sólida seamless 512', () => {
  it('detects opposite-edge mismatches', () => {
    const pixels = new Uint8ClampedArray(4 * 4 * 4).fill(80);
    expect(cloudSeamErrors(pixels, 4)).toEqual({ horizontal: 0, vertical: 0 });
    pixels[0] = 14;
    expect(cloudSeamErrors(pixels, 4)).toEqual({ horizontal: 66, vertical: 66 });
  });
  it('keeps painted UVs continuous and repeats once per 4 world cells', () => {
    const fake = {
      getGround(x: number, y: number) {
        return x >= 0 && x < 5 && y >= 0 && y < 5 ? Block.CLOUD_SOLID : Block.VOID;
      },
      getLevel() { return Block.AIR; },
    } as unknown as World;
    const meshes = buildCloudSurface(fake, { x0: 0, x1: 4, y0: 0, y1: 4 }, {}, {}, 4);
    const uv = meshes[0].geometry.getAttribute('uv');
    expect(uv.getX(0)).toBe(0);
    expect(uv.getX(6)).toBeCloseTo(0.25);
    expect(uv.getX(24 * 6)).toBeCloseTo(1);
    // At the 5th cell the same painting continues at 1.25, never reset to 0.
    expect(uv.getX(24 * 6)).not.toBe(0);
    meshes.forEach((mesh: any) => mesh.geometry.dispose());
  });
});
