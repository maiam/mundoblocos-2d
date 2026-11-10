import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { makeOcclusionAwareCharacter } from './foregroundSprite';

describe('oclusão contextual da Deusa no Santuário 3D', () => {
  it('mostra a personagem normalmente e a silhueta apenas atrás de profundidade real', () => {
    const map = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
    map.needsUpdate = true;
    const { sprite, silhouette } = makeOcclusionAwareCharacter(map);
    expect(sprite.isSprite).toBe(true);
    expect(silhouette.isSprite).toBe(true);
    expect(sprite.material.map).toBe(map);
    expect(silhouette.material.map).toBe(map);
    expect(sprite.material.depthTest).toBe(true);
    expect(sprite.material.depthFunc).toBe(THREE.LessEqualDepth);
    expect(sprite.material.depthWrite).toBe(false);
    expect(silhouette.material.depthTest).toBe(true);
    expect(silhouette.material.depthFunc).toBe(THREE.GreaterDepth);
    expect(silhouette.material.depthWrite).toBe(false);
    expect(silhouette.material.opacity).toBeLessThan(0.5);
    expect(silhouette.renderOrder).toBeGreaterThan(sprite.renderOrder);
    sprite.material.dispose();
    silhouette.material.dispose();
    map.dispose();
  });
});
