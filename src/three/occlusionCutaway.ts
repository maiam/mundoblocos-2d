import * as THREE from 'three';

/**
 * Non-destructive, screen-space obstacle cutaway for the Sanctuary prototype.
 *
 * OPAQUE pass: world surfaces draw normally, except where a closer obstacle
 * covers the goddess. TRANSLUCENT pass: only the covering area draws at low
 * opacity, before the character's normally depth-tested sprite.
 *
 * The goddess never becomes a ghost: only terrain between camera and her
 * image fades. Both passes share the original, unchanged PNG.
 */
export interface CutawayState {
  center: any;
  radius: any;
  depth: { value: number };
  enabled: { value: number };
}

export function createCutawayState(): CutawayState {
  return {
    center: new THREE.Vector2(-1e6, -1e6),
    radius: new THREE.Vector2(1, 1),
    depth: { value: 0 },
    enabled: { value: 0 },
  };
}

const shaderFooter = [
  'float cutawayDistance = length((gl_FragCoord.xy - cutawayCenter) / max(cutawayRadius, vec2(1.0)));',
  'float cutawayStrength = 1.0 - smoothstep(0.78, 1.05, cutawayDistance);',
  'bool closerThanCharacter = gl_FragCoord.z < cutawayDepth - 0.00001;',
  'bool cutaway = cutawayEnabled > 0.5 && closerThanCharacter && cutawayStrength > 0.001;',
  'if (cutawayTransparent > 0.5) {',
  '  if (!cutaway) discard;',
  '  gl_FragColor.a *= 0.24 * cutawayStrength;',
  '} else if (cutaway) {',
  '  float threshold = fract(sin(dot(floor(gl_FragCoord.xy), vec2(12.9898, 78.233))) * 43758.5453);',
  '  if (threshold < cutawayStrength) discard;',
  '}',
].join('\n');

export function patchCutawayFragment(fragment: string): string {
  const token = '#include <dithering_fragment>';
  if (!fragment.includes(token)) throw new Error('Three.js shader sem fragmento de dithering.');
  const uniforms = [
    'uniform vec2 cutawayCenter;',
    'uniform vec2 cutawayRadius;',
    'uniform float cutawayDepth;',
    'uniform float cutawayEnabled;',
    'uniform float cutawayTransparent;',
  ].join('\n');
  return uniforms + '\n' + fragment.replace(token, token + '\n' + shaderFooter);
}

export function makeCutawayMaterial(
  map: any,
  hexColor: number,
  state: CutawayState,
  transparentPass = false,
): any {
  const material = new THREE.MeshBasicMaterial({
    map,
    color: hexColor,
    transparent: transparentPass,
    depthWrite: !transparentPass,
    depthTest: true,
  });
  material.onBeforeCompile = (shader: any) => {
    shader.uniforms.cutawayCenter = { value: state.center };
    shader.uniforms.cutawayRadius = { value: state.radius };
    shader.uniforms.cutawayDepth = state.depth;
    shader.uniforms.cutawayEnabled = state.enabled;
    shader.uniforms.cutawayTransparent = { value: transparentPass ? 1 : 0 };
    shader.fragmentShader = patchCutawayFragment(shader.fragmentShader);
  };
  material.customProgramCacheKey = () => 'orvalis-cutaway-v1-' + (transparentPass ? 'fade' : 'solid');
  return material;
}

/** Screen-space focal area follows the goddess during movement and zoom. */
export function updateCutawayProjection(
  state: CutawayState,
  camera: any,
  worldPosition: any,
  canvasWidth: number,
  canvasHeight: number,
  pixelRatio: number,
  zoom: number,
  active = true,
): void {
  if (!active || canvasWidth < 1 || canvasHeight < 1 || zoom <= 0) {
    state.enabled.value = 0;
    return;
  }
  camera.updateMatrixWorld();
  const p = worldPosition.clone().project(camera);
  const scale = canvasHeight * pixelRatio / (2 * zoom);
  state.center.set((p.x * 0.5 + 0.5) * canvasWidth * pixelRatio, (p.y * 0.5 + 0.5) * canvasHeight * pixelRatio);
  state.radius.set(1.2 * scale, 1.3 * scale);
  state.depth.value = p.z * 0.5 + 0.5;
  state.enabled.value = 1;
}
