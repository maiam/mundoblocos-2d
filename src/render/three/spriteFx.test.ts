import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { SpriteFx, type FxArt } from './spriteFx';

const img = (frames: number) => ({ width: 128 * frames, height: 128 }) as unknown as HTMLImageElement;
const art: FxArt = { dig: img(12), tree: img(10), slash: img(12) };

describe('SpriteFx (efeitos de golpe em quadros)', () => {
  it('toca os quadros na ordem, termina sozinho e libera', () => {
    const scene = new THREE.Scene();
    const fx = new SpriteFx(scene, () => art);
    fx.play('slash', 3, 1, 4);
    expect(fx.live).toBe(1);
    const mesh = scene.children[0] as THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
    expect(mesh.visible).toBe(true);
    fx.update(0.1); // 2 quadros a 26 fps
    expect(mesh.material.map!.offset.x).toBeCloseTo(2 / 12, 5);
    fx.update(1);
    expect(fx.live).toBe(0);
    expect(mesh.visible).toBe(false);
    fx.dispose();
    expect(scene.children.length).toBe(0);
  });

  it('espelha na horizontal, reaproveita o mais antigo com o pool cheio e não faz nada sem arte', () => {
    const scene = new THREE.Scene();
    const fx = new SpriteFx(scene, () => art);
    fx.play('slash', 0, 0, 0, { mirror: true });
    const mesh = scene.children[0] as THREE.Mesh;
    expect(mesh.scale.x).toBeLessThan(0);
    for (let i = 0; i < 30; i++) fx.play('dig', i, 0, 0);
    expect(scene.children.length).toBeLessThanOrEqual(12);
    const none = new SpriteFx(new THREE.Scene(), () => null);
    none.play('tree', 0, 0, 0);
    expect(none.live).toBe(0);
  });
});
