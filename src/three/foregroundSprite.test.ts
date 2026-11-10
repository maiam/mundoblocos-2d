import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { makeForegroundCharacterSprite } from './foregroundSprite';

describe('Deusa da Vida no Santuário 3D', () => {
  it('mantém sprite na frente dos blocos altos sem alterar colisão ou geometria', () => {
    const map = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
    map.needsUpdate = true;
    const goddess = makeForegroundCharacterSprite(map);
    expect(goddess.isSprite).toBe(true);
    expect(goddess.material.map).toBe(map);
    expect(goddess.material.transparent).toBe(true);
    expect(goddess.material.depthWrite).toBe(false);
    expect(goddess.material.depthTest).toBe(false);
    expect(goddess.renderOrder).toBeGreaterThan(2);
    goddess.material.dispose();
    map.dispose();
  });
});
