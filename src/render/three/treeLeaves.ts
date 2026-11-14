import * as THREE from 'three';
import { SUBDIV } from '../../config';
import { leafStyleFor, LEAF_TRY_SECONDS } from '../wind';
import type { SpriteCell } from './chunkSprites';

/**
 * Folhas e pétalas caindo das copas (v0.93.82): um pool fixo de pontos que se soltam da folhagem de árvores perto da câmera, derivam com
 * o vento girando e somem ao chegar no chão. Atualizado na CPU (são poucos: `MAX`) e desenhado como `Points`. Sem `Math.random`: o
 * sorteio é um hash do contador (determinístico). Nada é criado por quadro.
 */
const MAX = 48;

const VERTEX = `
attribute float aAge; attribute float aSize; attribute float aRot; attribute vec3 aColor;
uniform float uPx;
varying float vA; varying float vRot; varying vec3 vC;
void main() {
  vA = smoothstep(0.0, 0.08, aAge) * (1.0 - smoothstep(0.82, 1.0, aAge));
  vRot = aRot;
  vC = aColor;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = max(3.0, uPx * aSize);
}
`;
const FRAGMENT = `
varying float vA; varying float vRot; varying vec3 vC;
void main() {
  vec2 p = gl_PointCoord - 0.5;
  float c = cos(vRot), s = sin(vRot);
  vec2 q = vec2(c * p.x + s * p.y, -s * p.x + c * p.y);
  float d = length(vec2(q.x / 0.5, q.y / 0.24));
  if (d > 1.0) discard;
  float shade = 0.8 + 0.3 * (0.5 - q.y);
  gl_FragColor = vec4(vC * shade, smoothstep(1.0, 0.7, d) * vA);
}
`;

export class TreeLeaves {
  private readonly pos = new Float32Array(MAX * 3);
  private readonly age = new Float32Array(MAX).fill(1);
  private readonly size = new Float32Array(MAX);
  private readonly rot = new Float32Array(MAX);
  private readonly color = new Float32Array(MAX * 3);
  private readonly vel = new Float32Array(MAX * 3);
  private readonly life = new Float32Array(MAX).fill(1);
  private readonly phase = new Float32Array(MAX);
  private readonly spin = new Float32Array(MAX);
  private readonly points: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
  private readonly uniforms = { uPx: { value: 6 } };
  private next = 0;
  private counter = 0;
  private clock = 0;
  /** Uma folha chegou ao chão em (x, z) (células): o chamador decide o que acontece (onda na água). */
  onLand?: (x: number, z: number) => void;

  constructor(scene: THREE.Object3D, private readonly tile: number, private readonly k: number) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('aAge', new THREE.BufferAttribute(this.age, 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1));
    geo.setAttribute('aRot', new THREE.BufferAttribute(this.rot, 1));
    geo.setAttribute('aColor', new THREE.BufferAttribute(this.color, 3));
    this.points = new THREE.Points(geo, new THREE.ShaderMaterial({
      uniforms: this.uniforms, vertexShader: VERTEX, fragmentShader: FRAGMENT, transparent: true, depthWrite: false,
    }));
    this.points.frustumCulled = false;
    this.points.renderOrder = 2.6;
    this.points.name = 'Mundo: folhas caindo';
    scene.add(this.points);
  }

  private rand(): number {
    const h = Math.sin(++this.counter * 78.233 + 1.7) * 43758.5453;
    return h - Math.floor(h);
  }

  /** Solta uma folha da copa da árvore `cell` (o sorteio de posição, cor e tempo vem do contador). */
  emit(cell: SpriteCell): boolean {
    const style = leafStyleFor(cell.id);
    if (!style) return false;
    const i = this.next;
    if (this.age[i] < 1) return false; // pool cheio: não atropela uma folha viva
    this.next = (this.next + 1) % MAX;
    const s = cell.sprite, sc = cell.scale ?? 1;
    const wc = (s.w / this.tile) * sc, hc = (s.h / this.tile / this.k) * sc;
    const left = cell.x + s.ox / this.tile - (s.w / this.tile / 2) * (sc - 1);
    const r1 = this.rand(), r2 = this.rand(), r3 = this.rand(), r4 = this.rand();
    const lifeS = 2.6 + 1.8 * r3;
    const y0 = hc * (0.42 + 0.4 * r2);
    this.pos[i * 3] = left + wc * (0.18 + 0.64 * r1);
    this.pos[i * 3 + 1] = y0;
    this.pos[i * 3 + 2] = cell.y + (s.oy + s.h) / this.tile + 0.05;
    this.vel[i * 3] = (0.2 + 0.4 * r4) * SUBDIV; // deriva com o vento (+x)
    this.vel[i * 3 + 1] = -y0 / lifeS; // chega ao chão no fim da vida
    this.vel[i * 3 + 2] = (r1 - 0.5) * 0.2 * SUBDIV;
    this.life[i] = lifeS;
    this.age[i] = 0;
    this.phase[i] = r4 * 6.28;
    this.spin[i] = (r2 - 0.5) * 6;
    this.size[i] = style.size * (0.8 + 0.5 * r3);
    this.rot[i] = r1 * 6.28;
    this.color.set(style.colors[Math.floor(r2 * style.colors.length) % style.colors.length], i * 3);
    return true;
  }

  /**
   * Avança o tempo. `cellPx` = pixels de tela por célula; `trees` = de onde sai (a cada `LEAF_TRY_SECONDS` uma árvore da
   * lista tenta soltar uma folha).
   */
  update(dt: number, cellPx: number, trees: readonly SpriteCell[] | null): void {
    this.uniforms.uPx.value = Math.max(8, cellPx * 0.6);
    this.clock += dt;
    if (trees && trees.length && this.clock >= LEAF_TRY_SECONDS) {
      this.clock = 0;
      const cell = trees[Math.floor(this.rand() * trees.length) % trees.length];
      if (this.rand() < (leafStyleFor(cell.id)?.chance ?? 0)) this.emit(cell);
    }
    for (let i = 0; i < MAX; i++) {
      if (this.age[i] >= 1) continue;
      this.age[i] = Math.min(1, this.age[i] + dt / this.life[i]);
      if (this.age[i] >= 1) this.onLand?.(this.pos[i * 3], this.pos[i * 3 + 2]);
      this.phase[i] += dt * 2.2;
      this.pos[i * 3] += (this.vel[i * 3] + Math.sin(this.phase[i]) * 0.4 * SUBDIV) * dt;
      this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt * (0.75 + 0.25 * Math.cos(this.phase[i] * 0.7));
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      this.rot[i] += this.spin[i] * dt;
    }
    const g = this.points.geometry;
    for (const n of ['position', 'aAge', 'aSize', 'aRot', 'aColor']) (g.getAttribute(n) as THREE.BufferAttribute).needsUpdate = true;
  }

  /** Folhas vivas (dev/testes). */
  get live(): number {
    let n = 0;
    for (let i = 0; i < MAX; i++) if (this.age[i] < 1) n++;
    return n;
  }

  /** Posições vivas (dev/testes). */
  livePositions(): number[][] {
    const out: number[][] = [];
    for (let i = 0; i < MAX; i++) if (this.age[i] < 1) out.push([this.pos[i * 3], this.pos[i * 3 + 1], this.pos[i * 3 + 2], this.age[i], this.size[i]]);
    return out;
  }

  /** Esvazia o pool (entrar num cômodo). */
  clear(): void {
    this.age.fill(1);
  }

  dispose(): void {
    this.points.parent?.remove(this.points);
    this.points.geometry.dispose();
    this.points.material.dispose();
  }
}
