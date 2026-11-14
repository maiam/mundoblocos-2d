import * as THREE from 'three';
import { SUBDIV } from '../../config';
import type { DustStyle } from '../footDust';

/**
 * Poeira de passos no 3D (v0.93.69): um pool fixo de pontinhos que sobem um pouco, crescem e somem, com a cor do chão pisado.
 * Atualizado na CPU (são poucos: `MAX`), desenhado como `Points` num material próprio. Nada é criado por quadro.
 */
const MAX = 40;
const LIFE = 0.55;

const VERTEX = `
attribute float aAge; attribute float aSize; attribute vec3 aColor;
uniform float uPx;
varying float vA; varying vec3 vC;
void main() {
  vA = (1.0 - aAge) * (1.0 - aAge);
  vC = aColor;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = max(2.0, uPx * aSize * (0.5 + 0.9 * aAge));
}
`;
const FRAGMENT = `
varying float vA; varying vec3 vC;
void main() {
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  float a = smoothstep(0.5, 0.15, d) * vA * 0.42;
  gl_FragColor = vec4(vC, a);
}
`;

export class FootDust {
  private readonly pos = new Float32Array(MAX * 3);
  private readonly age = new Float32Array(MAX).fill(1);
  private readonly size = new Float32Array(MAX);
  private readonly color = new Float32Array(MAX * 3);
  private readonly vel = new Float32Array(MAX * 3);
  private readonly points: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
  private next = 0;
  private counter = 0;
  private readonly uniforms = { uPx: { value: 8 } };

  constructor(scene: THREE.Object3D, private readonly k: number) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('aAge', new THREE.BufferAttribute(this.age, 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1));
    geo.setAttribute('aColor', new THREE.BufferAttribute(this.color, 3));
    this.points = new THREE.Points(geo, new THREE.ShaderMaterial({
      uniforms: this.uniforms, vertexShader: VERTEX, fragmentShader: FRAGMENT, transparent: true, depthWrite: false,
    }));
    this.points.frustumCulled = false;
    this.points.renderOrder = 2.5;
    this.points.name = 'Mundo: poeira de passos';
    scene.add(this.points);
  }

  /** Solta uma nuvenzinha em (x, z) (células) com o estilo do chão; o sorteio é determinístico (sem `Math.random`). */
  emit(x: number, z: number, style: DustStyle): void {
    const i = this.next;
    this.next = (this.next + 1) % MAX;
    const h = Math.sin(++this.counter * 12.9898) * 43758.5453;
    const r = h - Math.floor(h);
    // Em células × `SUBDIV`: o corpo mantém os pixels na grade fina (ADR 0032).
    this.pos[i * 3] = x + (r - 0.5) * 0.25 * SUBDIV;
    this.pos[i * 3 + 1] = 0.05 / this.k;
    this.pos[i * 3 + 2] = z - 0.05 * SUBDIV;
    this.vel[i * 3] = (r - 0.5) * 0.5 * SUBDIV;
    this.vel[i * 3 + 1] = (0.25 + 0.2 * r) * SUBDIV / this.k;
    this.vel[i * 3 + 2] = 0;
    this.age[i] = 0;
    this.size[i] = (0.7 + 0.5 * r) * style.amount;
    this.color.set(style.color, i * 3);
  }

  /** Avança o tempo; `cellPx` = pixels de tela por célula (tamanho). */
  update(dt: number, cellPx: number): void {
    this.uniforms.uPx.value = Math.max(3, cellPx * 0.5);
    for (let i = 0; i < MAX; i++) {
      if (this.age[i] >= 1) continue;
      this.age[i] = Math.min(1, this.age[i] + dt / LIFE);
      this.pos[i * 3] += this.vel[i * 3] * dt;
      this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
    }
    const g = this.points.geometry;
    for (const n of ['position', 'aAge', 'aSize', 'aColor']) (g.getAttribute(n) as THREE.BufferAttribute).needsUpdate = true;
  }

  /** Nuvenzinhas vivas (dev/testes). */
  get live(): number {
    let n = 0;
    for (let i = 0; i < MAX; i++) if (this.age[i] < 1) n++;
    return n;
  }

  dispose(): void {
    this.points.parent?.remove(this.points);
    this.points.geometry.dispose();
    this.points.material.dispose();
  }
}
