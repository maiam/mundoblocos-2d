import * as THREE from 'three';

/**
 * Occlusion-contextual 2D character in the 3D sanctuary.
 *
 * The normal sprite respects the actual 3D depth buffer. A second, translucent
 * silhouette is drawn ONLY for pixels where 3D world geometry is closer than
 * the character (GreaterDepth). This preserves spatial depth and helps the
 * player locate the character behind a 1–3 block high wall.
 *
 * No global always-on-top rendering or changes to collision/raycast/saves.
 */
export function makeOcclusionAwareCharacter(map: any): { sprite: any; silhouette: any } {
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map,
    transparent: true,
    alphaTest: 0.04,
    depthTest: true,
    depthFunc: THREE.LessEqualDepth,
    depthWrite: false,
  }));
  sprite.renderOrder = 1;

  const silhouette = new THREE.Sprite(new THREE.SpriteMaterial({
    map,
    transparent: true,
    opacity: 0.42,
    color: 0xfff1df,
    alphaTest: 0.04,
    depthTest: true,
    depthFunc: THREE.GreaterDepth,
    depthWrite: false,
  }));
  // The overlay only passes the depth test where the sprite is BEHIND a wall.
  silhouette.renderOrder = 10;
  return { sprite, silhouette };
}
