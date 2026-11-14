import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import type { Chunk } from '../../world/chunk';
import { WaterSurface } from './waterSurface';

function setup(withTile = true) {
  const chunks = new Map<string, Chunk>();
  for (let cx = 0; cx < 3; cx++) chunks.set(cx + ',0', { cx, cy: 0, version: 1 } as Chunk);
  const scene = new THREE.Scene();
  const tile = {} as HTMLCanvasElement;
  const water = new WaterSurface(scene, {
    isOpenWater: (x) => x >= 16 && x < 32, // só o chunk 1 tem água
    getChunk: (cx, cy) => chunks.get(cx + ',' + cy),
    tile: () => (withTile ? tile : null),
  });
  return { chunks, scene, water };
}

describe('WaterSurface (água animada)', () => {
  it('um plano por chunk visível; só os com água aparecem; sem a arte da água, nada é criado', () => {
    const a = setup(false);
    a.water.update({ cx0: 0, cy0: 0, cx1: 2, cy1: 0 }, 0, 0);
    expect(a.water.count).toBe(0);
    const { water, scene } = setup();
    water.update({ cx0: 0, cy0: 0, cx1: 2, cy1: 0 }, 1, 0);
    expect(water.count).toBe(3);
    expect(water.visibleCount).toBe(1);
    expect(scene.children.filter((o) => o.name.startsWith('Mundo: superfície da água'))).toHaveLength(3);
  });

  it('chunks que saem da área liberam o plano; a máscara refaz só quando a versão muda', () => {
    const { chunks, water, scene } = setup();
    water.update({ cx0: 0, cy0: 0, cx1: 2, cy1: 0 }, 0, 0);
    water.update({ cx0: 1, cy0: 0, cx1: 1, cy1: 0 }, 0, 0);
    expect(water.count).toBe(1);
    expect(scene.children).toHaveLength(1);
    chunks.get('1,0')!.version++;
    water.update({ cx0: 1, cy0: 0, cx1: 1, cy1: 0 }, 0, 0);
    expect(water.visibleCount).toBe(1);
    water.dispose();
    expect(scene.children).toHaveLength(0);
  });
});
