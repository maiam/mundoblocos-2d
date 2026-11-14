import * as THREE from 'three';
import { SUBDIV } from '../../config';
import { hash2 } from '../../world/random';

/**
 * Lascas da quebra de blocos no 3D (v0.93.94): um pool fixo de pontinhos coloridos (a cor do material) que saltam do bloco, caem com gravidade
 * e quicam uma vez no chão antes de sumir. Atualizado na CPU (são poucos: `MAX`), desenhado como `Points`. Sem `Math.random`: hash do contador.
 */
const MAX = 96;
const GRAVITY = 9; // células/s²
const BOUNCE = 0.35;

const VERTEX = `
attribute float aAge; attribute float aLife; attribute float aSize; attribute vec3 aColor;
uniform float uPx;
varying float vA; varying vec3 vC;
void main() {
  float u = aAge / aLife;
  vA = 1.0 - smoothstep(0.65, 1.0, u);
  vC = aColor;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = max(2.0, uPx * aSize);
}
`;
const FRAGMENT = `
varying float vA; varying vec3 vC;
void main() {
  vec2 p = abs(gl_PointCoord - 0.5);
  if (max(p.x, p.y) > 0.5) discard;
  float edge = step(0.36, max(p.x, p.y));
  gl_FragColor = vec4(vC * (1.0 - 0.28 * edge), vA);
}
`;

export class BreakChips {
  private readonly pos = new Float32Array(MAX * 3);
  private readonly vel = new Float32Array(MAX * 3);
  private readonly age = new Float32Array(MAX).fill(9);
  private readonly life = new Float32Array(MAX).fill(1);
  private readonly size = new Float32Array(MAX);
  private readonly color = new Float32Array(MAX * 3);
  private readonly bounced = new Uint8Array(MAX);
  private readonly points: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
  private readonly uniforms = { uPx: { value: 6 } };
  private next = 0;
  private counter = 0;

  constructor(scene: THREE.Object3D, private readonly seed = 7) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('aAge', new THREE.BufferAttribute(this.age, 1));
    geo.setAttribute('aLife', new THREE.BufferAttribute(this.life, 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1));
    geo.setAttribute('aColor', new THREE.BufferAttribute(this.color, 3));
    this.points = new THREE.Points(geo, new THREE.ShaderMaterial({
      uniforms: this.uniforms, vertexShader: VERTEX, fragmentShader: FRAGMENT, transparent: true, depthWrite: false,
    }));
    this.points.frustumCulled = false;
    this.points.renderOrder = 2.7;
    this.points.name = 'Mundo: lascas da quebra';
    scene.add(this.points);
  }

  private r(k: number): number { return hash2(this.seed, ++this.counter, k); }

  /** Solta `n` lascas de (x, h, z) (células; `h` = altura do topo do bloco) com a cor dada; `power` 1 = golpe, ~2 = estouro final. */
  emit(x: number, h: number, z: number, color: readonly [number, number, number], n: number, power = 1): void {
    for (let k = 0; k < n; k++) {
      const i = this.next;
      this.next = (this.next + 1) % MAX;
      const a = this.r(1) * Math.PI * 2;
      const sp = (0.9 + this.r(2) * 1.6) * power * SUBDIV * 0.5;
      this.pos[i * 3] = x + (this.r(3) - 0.5) * 0.5;
      this.pos[i * 3 + 1] = h + 0.02;
      this.pos[i * 3 + 2] = z + (this.r(4) - 0.5) * 0.4;
      this.vel[i * 3] = Math.cos(a) * sp;
      this.vel[i * 3 + 1] = (2.4 + this.r(5) * 2.2) * Math.sqrt(power);
      this.vel[i * 3 + 2] = Math.sin(a) * sp * 0.8;
      this.age[i] = 0;
      this.life[i] = 0.55 + this.r(6) * 0.5;
      this.size[i] = 0.55 + this.r(7) * 0.7;
      this.bounced[i] = 0;
      const v = 0.82 + this.r(8) * 0.36; // variação de brilho entre lascas do mesmo material
      this.color[i * 3] = Math.min(1, color[0] * v);
      this.color[i * 3 + 1] = Math.min(1, color[1] * v);
      this.color[i * 3 + 2] = Math.min(1, color[2] * v);
    }
  }

  /** Avança o tempo; `cellPx` = pixels de tela por célula (tamanho das lascas). */
  update(dt: number, cellPx: number): void {
    this.uniforms.uPx.value = Math.max(4, cellPx * 0.3 * (typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1));
    for (let i = 0; i < MAX; i++) {
      if (this.age[i] >= this.life[i]) continue;
      this.age[i] += dt;
      this.vel[i * 3 + 1] -= GRAVITY * dt;
      this.pos[i * 3] += this.vel[i * 3] * dt;
      this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      if (this.pos[i * 3 + 1] < 0.02 && this.vel[i * 3 + 1] < 0) {
        this.pos[i * 3 + 1] = 0.02;
        this.vel[i * 3 + 1] *= this.bounced[i] ? 0 : -BOUNCE;
        this.vel[i * 3] *= 0.5; this.vel[i * 3 + 2] *= 0.5;
        this.bounced[i] = 1;
      }
    }
    const g = this.points.geometry;
    for (const n of ['position', 'aAge', 'aLife', 'aSize', 'aColor']) (g.getAttribute(n) as THREE.BufferAttribute).needsUpdate = true;
  }

  /** Lascas vivas (dev/testes). */
  get live(): number {
    let n = 0;
    for (let i = 0; i < MAX; i++) if (this.age[i] < this.life[i]) n++;
    return n;
  }

  clear(): void { this.age.fill(9); }

  dispose(): void {
    this.points.parent?.remove(this.points);
    this.points.geometry.dispose();
    this.points.material.dispose();
  }
}
