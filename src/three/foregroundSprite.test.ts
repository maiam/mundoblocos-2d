import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { makeDepthTestedCharacter } from './foregroundSprite';

describe('oclusão da Deusa no Santuário 3D', () => {
  it('preserva o sprite normal opaco e o teste de profundidade', () => {
    const map = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
    map.needsUpdate = true;
    const sprite = makeDepthTestedCharacter(map);
    expect(sprite.isSprite).toBe(true);
    expect(sprite.material.map).toBe(map);
    expect(sprite.material.depthTest).toBe(true);
    expect(sprite.material.depthFunc).toBe(THREE.LessEqualDepth);
    expect(sprite.material.depthWrite).toBe(false);
    expect(sprite.material.opacity).toBe(1);
    expect(sprite.renderOrder).toBe(2);
    sprite.material.dispose();
    map.dispose();
  });
});
