import * as THREE from 'three';

/**
 * Goddess remains fully opaque in the 3D sanctuary.
 * Nearby occluding terrain is faded by occlusionCutaway.ts instead of fading
 * the character or forcing the character to render in front of all geometry.
 */
export function makeDepthTestedCharacter(map: any): any {
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map,
    transparent: true,
    alphaTest: 0.04,
    depthTest: true,
    depthFunc: THREE.LessEqualDepth,
    depthWrite: false,
    opacity: 1,
  }));
  sprite.renderOrder = 2;
  return sprite;
}
