import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { createCutawayState, makeCutawayMaterial, patchCutawayFragment, updateCutawayProjection } from './occlusionCutaway';
import { buildCloudSurface } from './cloudSurface';
import { Block } from '../world/blocks';
import type { World } from '../world/world';

describe('Oclusão contextual V1.1', () => {
  it('injeta máscara na renderização do obstáculo, sem alterar a textura base', () => {
    const src = 'void main() {\n#include <dithering_fragment>\n}';
    const result = patchCutawayFragment(src);
    expect(result).toContain('uniform vec2 cutawayCenter');
    expect(result).toContain('gl_FragCoord.z < cutawayDepth');
    expect(result).toContain('cutawayTransparent');
    expect(result).toContain('discard');
    expect(() => patchCutawayFragment('void main() {}')).toThrow();
  });

  it('mantém a mesma textura original nos passes opaco e translúcido', () => {
    const state = createCutawayState();
    const map = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
    const solid = makeCutawayMaterial(map, 0xffffff, state);
    const fade = makeCutawayMaterial(map, 0xbfcfe4, state, true);
    expect(solid.map).toBe(map);
    expect(fade.map).toBe(map);
    expect(solid.depthWrite).toBe(true);
    expect(fade.depthWrite).toBe(false);
    expect(solid.transparent).toBe(false);
    expect(fade.transparent).toBe(true);
    expect(solid.customProgramCacheKey()).not.toBe(fade.customProgramCacheKey());
    solid.dispose(); fade.dispose(); map.dispose();
  });

  it('projeta máscara em pixels físicos e desliga quando não está em uso', () => {
    const state = createCutawayState();
    const camera = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 100);
    camera.position.set(0, 10, 10);
    camera.lookAt(0, 0, 0);
    updateCutawayProjection(state, camera, new THREE.Vector3(0, 0, 0), 800, 600, 2, 5);
    expect(state.enabled.value).toBe(1);
    expect(state.center.x).toBeCloseTo(800);
    expect(state.center.y).toBeCloseTo(600);
    expect(state.radius.x).toBeCloseTo(144);
    updateCutawayProjection(state, camera, new THREE.Vector3(0, 0, 0), 800, 600, 2, 5, false);
    expect(state.enabled.value).toBe(0);
  });

  it('permite materiais diferentes por orientação das laterais da nuvem', () => {
    const world = {
      getGround(x: number, z: number) {
        return x >= 0 && x < 3 && z >= 0 && z < 3 ? Block.CLOUD_SOLID : Block.VOID;
      },
      getLevel() { return Block.AIR; },
    } as unknown as World;
    const top = { label: 'top' }, north = { label: 'side-ns' }, east = { label: 'side-ew' };
    const meshes = buildCloudSurface(world, { x0: 0, x1: 2, y0: 0, y1: 2 }, top, north, 4, east);
    expect(meshes.map((m: any) => m.material)).toEqual([top, north, east]);
    expect(meshes[0].geometry.getAttribute('position').count).toBe(9 * 6);
    expect(meshes[1].geometry.getAttribute('position').count).toBe(6 * 6);
    expect(meshes[2].geometry.getAttribute('position').count).toBe(6 * 6);
    meshes.forEach((m: any) => m.geometry.dispose());
  });
});
