import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { RIPPLE_LIFE, WaterRipples } from './waterRipples';

describe('WaterRipples (ondas na água)', () => {
  it('uma onda abre onde algo toca a água, cresce e some; o pool tem limite e não atropela onda viva', () => {
    const scene = new THREE.Scene();
    const r = new WaterRipples(scene);
    expect(r.live).toBe(0);
    expect(r.emit(4.5, 7.5, 1)).toBe(true);
    expect(r.live).toBe(1);
    const mesh = scene.children.find((o) => o.visible)!;
    expect(mesh.position.x).toBe(4.5);
    expect(mesh.position.z).toBe(7.5);
    r.update(RIPPLE_LIFE * 0.5, 0);
    expect(r.live).toBe(1);
    r.update(RIPPLE_LIFE * 1.2, 0);
    expect(r.live).toBe(0);
    expect(scene.children.some((o) => o.visible)).toBe(false);
    for (let i = 0; i < 200; i++) r.emit(i, i, 0.5);
    expect(r.live).toBeLessThanOrEqual(20);
    r.clear();
    expect(r.live).toBe(0);
    r.dispose();
    expect(scene.children).toHaveLength(0);
  });

  it('onda forte é maior que a fraca', () => {
    const scene = new THREE.Scene();
    const r = new WaterRipples(scene);
    r.emit(1, 1, 1); r.emit(3, 3, 0);
    const [a, b] = scene.children.filter((o) => o.visible);
    expect(a.scale.x).toBeGreaterThan(b.scale.x);
  });
});
