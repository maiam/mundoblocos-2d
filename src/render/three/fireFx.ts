import * as THREE from 'three';
import { flickerFactor } from '../lighting';
import { FIRE_COLOR, FIRE_FLICKER, MAX_FIRES, type FireSource } from '../fireLight';

/**
 * Efeitos da fogueira no 3D (v0.93.67), além da chama que balança no próprio desenho (`ChunkSprites`):
 * - **brilho no chão**: disco quente (mistura normal) sob a fogueira, que respira com o fogo (fraco de dia, forte à noite);
 * - **halo** vertical em volta da chama (aditivo);
 * - **brasas**: pontinhos que sobem, derivam e se apagam (animados no vertex shader, sem CPU por quadro).
 * Tudo em pools fixos (`MAX_FIRES`): nada é criado por quadro. Só lê a lista de fogueiras que o render já tem.
 */

const EMBERS_PER_FIRE = 10;

const EMBER_VERTEX = `
uniform float uTime; uniform float uSize; uniform float uK;
attribute float aSeed;
varying float vAlpha; varying float vHeat;
void main() {
  float t = fract(uTime * (0.35 + 0.25 * aSeed) + aSeed * 7.0);
  vec3 p = position;
  p.x += sin(aSeed * 40.0 + uTime * 1.7) * 0.28 * t + (aSeed - 0.5) * 0.3;
  p.z += cos(aSeed * 23.0 + uTime * 1.3) * 0.08 * t;
  p.y += (0.15 + t * 1.5) / uK;
  vAlpha = smoothstep(0.0, 0.08, t) * (1.0 - t) * (1.0 - t);
  vHeat = 1.0 - t;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = max(1.5, uSize * (0.35 + 0.65 * (1.0 - t)));
}
`;
const EMBER_FRAGMENT = `
varying float vAlpha; varying float vHeat;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  if (d > 0.5) discard;
  float a = smoothstep(0.5, 0.1, d) * vAlpha;
  vec3 col = mix(vec3(1.0, 0.35, 0.08), vec3(1.0, 0.85, 0.35), vHeat);
  gl_FragColor = vec4(col * a, a);
}
`;

/** Textura radial suave (centro claro → borda transparente), pintada uma vez num canvas pequeno (nunca lida de volta). */
function glowTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.45)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class FireFx {
  private readonly group = new THREE.Group();
  private readonly texture = glowTexture();
  private readonly ground: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>[] = [];
  private readonly halo: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>[] = [];
  private readonly embers: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
  private readonly emberPos: Float32Array;
  private readonly uniforms = { uTime: { value: 0 }, uSize: { value: 8 }, uK: { value: 1 } };
  private count = 0;

  constructor(scene: THREE.Object3D, private readonly k: number) {
    this.group.name = 'Mundo: fogueiras';
    const plane = new THREE.PlaneGeometry(1, 1);
    const mat = (additive: boolean): THREE.MeshBasicMaterial => new THREE.MeshBasicMaterial({
      map: this.texture, color: new THREE.Color(...FIRE_COLOR), transparent: true, opacity: 0, depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, side: THREE.DoubleSide,
    });
    for (let i = 0; i < MAX_FIRES; i++) {
      // No chão a luz tinge (mistura normal): somada ao verde da grama viraria um amarelo-limão; o halo da chama, sim, soma.
      const g = new THREE.Mesh(plane, mat(false));
      g.rotation.x = -Math.PI / 2; // deitado no chão
      g.renderOrder = 1.2;
      g.visible = false;
      const h = new THREE.Mesh(plane, mat(true));
      h.renderOrder = 4;
      h.visible = false;
      this.ground.push(g);
      this.halo.push(h);
      this.group.add(g, h);
    }
    const n = MAX_FIRES * EMBERS_PER_FIRE;
    this.emberPos = new Float32Array(n * 3);
    const seeds = new Float32Array(n);
    for (let i = 0; i < n; i++) seeds[i] = ((i * 0.6180339887) % 1);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.emberPos, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    geo.setDrawRange(0, 0);
    this.uniforms.uK.value = k;
    this.embers = new THREE.Points(geo, new THREE.ShaderMaterial({
      uniforms: this.uniforms, vertexShader: EMBER_VERTEX, fragmentShader: EMBER_FRAGMENT,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    this.embers.frustumCulled = false;
    this.embers.renderOrder = 5;
    this.group.add(this.embers);
    scene.add(this.group);
  }

  /** Fogueiras com efeito neste quadro (dev/testes). */
  get active(): number { return this.count; }

  /**
   * `night` 0 (dia) → 1 (noite): quanto o brilho no chão aparece; `cellPx` = pixels de tela por célula (tamanho das brasas).
   * `fires` = as fogueiras visíveis (`findFires`).
   */
  update(fires: readonly FireSource[], elapsed: number, night: number, cellPx: number): void {
    this.uniforms.uTime.value = elapsed;
    this.uniforms.uSize.value = Math.max(2.5, cellPx * 0.1);
    this.count = Math.min(fires.length, MAX_FIRES);
    for (let i = 0; i < MAX_FIRES; i++) {
      const g = this.ground[i], h = this.halo[i];
      if (i >= this.count) { g.visible = h.visible = false; continue; }
      const f = fires[i];
      const flick = flickerFactor(FIRE_FLICKER, elapsed, f.seed);
      g.visible = h.visible = true;
      g.position.set(f.x, 0.025, f.z - 0.5);
      g.scale.set(f.radius * 0.95, f.radius * 0.95, 1);
      g.material.opacity = (0.1 + 0.3 * night) * flick;
      h.position.set(f.x, (f.height * 0.55) / this.k, f.z + 0.02);
      h.scale.set(1.9, 1.9 / this.k, 1);
      h.material.opacity = (0.2 + 0.22 * night) * flick;
      for (let j = 0; j < EMBERS_PER_FIRE; j++) {
        const o = (i * EMBERS_PER_FIRE + j) * 3;
        this.emberPos[o] = f.x; this.emberPos[o + 1] = 0.2 / this.k; this.emberPos[o + 2] = f.z - 0.15;
      }
    }
    const attr = this.embers.geometry.getAttribute('position') as THREE.BufferAttribute;
    attr.needsUpdate = true;
    this.embers.geometry.setDrawRange(0, this.count * EMBERS_PER_FIRE);
  }

  dispose(): void {
    this.group.parent?.remove(this.group);
    for (const m of [...this.ground, ...this.halo]) m.material.dispose();
    this.ground[0]?.geometry.dispose();
    this.embers.geometry.dispose();
    this.embers.material.dispose();
    this.texture.dispose();
  }
}
