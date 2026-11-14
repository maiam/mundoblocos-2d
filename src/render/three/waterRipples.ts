import * as THREE from 'three';
import { SUBDIV } from '../../config';

/**
 * Ondas na água (v0.93.88): anéis que se abrem e somem onde algo toca a água (folha que cai, passo na margem). Pool fixo de planos
 * deitados sobre a água, com o anel desenhado no shader (sem textura); nada é criado por quadro e nada escreve profundidade.
 * Sorteios por hash do contador (sem `Math.random`).
 */
const MAX = 20;
/** Duração (s) e raio final (células da grade atual) de uma onda. */
export const RIPPLE_LIFE = 1.3;
export const RIPPLE_RADIUS = 0.55;

const VERTEX = `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const FRAGMENT = `
uniform float uAge; uniform float uStrength; uniform float uNight;
varying vec2 vUv;
void main() {
  float d = length(vUv - 0.5) * 2.0;
  float r = 0.18 + 0.82 * uAge;
  float ring = smoothstep(0.1, 0.0, abs(d - r)) + 0.55 * smoothstep(0.08, 0.0, abs(d - r * 0.62));
  float fade = (1.0 - uAge) * (1.0 - uAge) * uStrength;
  if (d > 1.0 || ring <= 0.0) discard;
  vec3 col = mix(vec3(0.93, 1.0, 1.0), vec3(0.6, 0.75, 1.0), uNight);
  gl_FragColor = vec4(col, clamp(ring * fade * 0.85, 0.0, 1.0));
}
`;

interface Ripple { mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>; age: number; life: number }

export class WaterRipples {
  private readonly pool: Ripple[] = [];
  private readonly geometry = new THREE.PlaneGeometry(1, 1);
  private next = 0;
  private counter = 0;
  private night = 0;

  constructor(scene: THREE.Object3D) {
    this.geometry.rotateX(-Math.PI / 2);
    for (let i = 0; i < MAX; i++) {
      const material = new THREE.ShaderMaterial({
        uniforms: { uAge: { value: 1 }, uStrength: { value: 1 }, uNight: { value: 0 } },
        vertexShader: VERTEX, fragmentShader: FRAGMENT, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3,
      });
      const mesh = new THREE.Mesh(this.geometry, material);
      mesh.visible = false;
      mesh.frustumCulled = false;
      mesh.renderOrder = 1.2;
      mesh.name = 'Mundo: onda na água';
      scene.add(mesh);
      this.pool.push({ mesh, age: 1, life: RIPPLE_LIFE });
    }
  }

  /** Abre uma onda em (x, z) (células); `strength` 0..1 (folha pequena = fraca). Pool cheio: ignora. */
  emit(x: number, z: number, strength = 1): boolean {
    const r = this.pool[this.next];
    if (r.age < 1) return false;
    this.next = (this.next + 1) % MAX;
    const h = Math.sin(++this.counter * 91.345 + 2.1) * 43758.5453;
    const rand = h - Math.floor(h);
    r.age = 0;
    r.life = RIPPLE_LIFE * (0.85 + 0.3 * rand);
    const size = RIPPLE_RADIUS * 2 * SUBDIV * (0.7 + 0.5 * strength);
    r.mesh.scale.set(size, 1, size);
    r.mesh.position.set(x, 0.03, z);
    r.mesh.material.uniforms.uStrength.value = 0.45 + 0.55 * strength;
    r.mesh.visible = true;
    return true;
  }

  update(dt: number, night: number): void {
    this.night = night;
    for (const r of this.pool) {
      if (r.age >= 1) continue;
      r.age = Math.min(1, r.age + dt / r.life);
      r.mesh.material.uniforms.uAge.value = r.age;
      r.mesh.material.uniforms.uNight.value = this.night;
      if (r.age >= 1) r.mesh.visible = false;
    }
  }

  get live(): number { let n = 0; for (const r of this.pool) if (r.age < 1) n++; return n; }

  clear(): void { for (const r of this.pool) { r.age = 1; r.mesh.visible = false; } }

  dispose(): void {
    for (const r of this.pool) { r.mesh.parent?.remove(r.mesh); r.mesh.material.dispose(); }
    this.pool.length = 0;
    this.geometry.dispose();
  }
}
