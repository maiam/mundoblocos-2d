import * as THREE from 'three';
import { hash2 } from '../../world/random';

/**
 * Fumaça das chaminés da Vila Camponesa (v0.93.109): puffs macios que nascem na boca da chaminé, sobem, crescem, derivam com o vento e somem —
 * no lugar da fumaça que vinha desenhada na arte das casas (`scripts/extract-village.py` a apaga). Só as chaminés dentro da tela soltam fumaça;
 * pool fixo de `MAX` pontos (`THREE.Points`, um desenho só); sem `Math.random` (hash do contador). Só visual.
 */
const MAX = 56;
/** Segundos entre puffs de uma chaminé (varia por chaminé). */
const EVERY = 0.45;
/** Subida (células/s) no começo e quanto ela perde ao longo da vida. */
const RISE = 0.72;

export interface Chimney {
  /** Boca da chaminé no mundo: x e z em células, y = altura em células. */
  x: number;
  y: number;
  z: number;
  /** 0..1: desfasa o ritmo entre chaminés. */
  phase: number;
}

/** Geometria do sprite de uma casa (a mesma que o `ChunkSprites` usa): origem, tamanho no mundo (px) e largura da imagem (px). */
export interface SpriteGeom { ox: number; oy: number; w: number; h: number; imgW: number }

/**
 * Onde a boca da chaminé (`mouth`, em px da imagem a partir do canto superior esquerdo) fica no 3D. Espelha o `ChunkSprites`: o plano tem a base na
 * face sul da célula âncora (`z = y + (oy + h) / tile`), cresce `scale`× em volta do meio da base e a altura de um ponto é a distância até a base / tile.
 * `front` põe a fumaça um pouco à frente do plano da casa (para o telhado não a esconder).
 */
export function chimneyWorldPos(cell: { x: number; y: number }, s: SpriteGeom, mouth: readonly [number, number], scale: number, tile: number, front = 0.03): { x: number; y: number; z: number } {
  const k = s.w / s.imgW;
  return {
    x: cell.x + s.ox / tile - (s.w / tile / 2) * (scale - 1) + ((mouth[0] * k) / tile) * scale,
    y: ((s.h - mouth[1] * k) / tile) * scale,
    z: cell.y + (s.oy + s.h) / tile + front,
  };
}

const VERTEX = `
attribute float aAge; attribute float aLife; attribute float aSize; attribute float aTone;
uniform float uPx; uniform float uNight;
varying float vA; varying float vTone; varying float vNight;
void main() {
  float u = aAge / aLife;
  // nasce rápido, some devagar; mais discreta à noite
  vA = smoothstep(0.0, 0.14, u) * pow(1.0 - u, 1.1) * (0.95 - 0.32 * uNight);
  vTone = aTone; vNight = uNight;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = max(2.0, uPx * aSize * (0.45 + 1.05 * u));
}
`;
const FRAGMENT = `
varying float vA; varying float vTone; varying float vNight;
void main() {
  vec2 p = gl_PointCoord - 0.5;
  float d = length(p) * 2.0;
  if (d > 1.0) discard;
  float soft = smoothstep(1.0, 0.1, d);
  // bola com um lado mais claro (cima-esquerda) e outro mais cinza: parece volume
  float lit = 0.5 + 0.5 * dot(normalize(p + 0.0001), normalize(vec2(-0.5, -0.8)));
  vec3 day = mix(vec3(0.80, 0.77, 0.74), vec3(0.97, 0.95, 0.91), lit * (0.7 + 0.3 * vTone));
  vec3 night = mix(vec3(0.42, 0.46, 0.58), vec3(0.66, 0.70, 0.80), lit);
  gl_FragColor = vec4(mix(day, night, vNight), vA * soft);
}
`;

export class ChimneySmoke {
  private readonly pos = new Float32Array(MAX * 3);
  private readonly vel = new Float32Array(MAX * 3);
  private readonly age = new Float32Array(MAX).fill(9);
  private readonly life = new Float32Array(MAX).fill(1);
  private readonly size = new Float32Array(MAX);
  private readonly tone = new Float32Array(MAX);
  private readonly points: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
  private readonly uniforms = { uPx: { value: 20 }, uNight: { value: 0 } };
  private chimneys: Chimney[] = [];
  private acc: number[] = [];
  private next = 0;
  private counter = 0;

  constructor(parent: THREE.Object3D, private readonly seed = 11) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('aAge', new THREE.BufferAttribute(this.age, 1));
    geo.setAttribute('aLife', new THREE.BufferAttribute(this.life, 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1));
    geo.setAttribute('aTone', new THREE.BufferAttribute(this.tone, 1));
    this.points = new THREE.Points(geo, new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader: VERTEX, fragmentShader: FRAGMENT, transparent: true, depthWrite: false }));
    this.points.frustumCulled = false;
    this.points.renderOrder = 2.8;
    this.points.name = 'Mundo: fumaça das chaminés';
    parent.add(this.points);
  }

  /** Define as chaminés do mundo (fixas; chame de novo se a lista mudar). */
  setChimneys(list: readonly Chimney[]): void {
    this.chimneys = [...list];
    this.acc = list.map((c) => c.phase * EVERY);
  }

  private r(k: number): number { return hash2(this.seed, ++this.counter, k); }

  private spawn(c: Chimney): void {
    const i = this.next;
    this.next = (this.next + 1) % MAX;
    this.pos[i * 3] = c.x + (this.r(1) - 0.5) * 0.08;
    this.pos[i * 3 + 1] = c.y;
    this.pos[i * 3 + 2] = c.z;
    this.vel[i * 3] = (this.r(2) - 0.5) * 0.06;
    this.vel[i * 3 + 1] = RISE * (0.85 + this.r(3) * 0.3);
    this.vel[i * 3 + 2] = 0;
    this.age[i] = 0;
    this.life[i] = 2.6 + this.r(4) * 1.4;
    this.size[i] = 1.1 + this.r(5) * 0.5;
    this.tone[i] = this.r(6);
  }

  /**
   * Avança `dt`. `view` = retângulo visível (células): só as chaminés dentro dele soltam puffs; os que já saíram terminam a vida. `elapsed` (s) dá o
   * vento (que muda devagar), `night` 0..1 escurece e acalma a cor e `cellPx` = pixels de tela por célula (tamanho dos puffs).
   */
  update(dt: number, cellPx: number, view: { x0: number; y0: number; x1: number; y1: number }, elapsed: number, night: number): void {
    this.uniforms.uPx.value = Math.max(8, cellPx * (typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1));
    this.uniforms.uNight.value = Math.min(1, Math.max(0, night));
    const wind = 0.16 + 0.1 * Math.sin(elapsed * 0.31) + 0.05 * Math.sin(elapsed * 0.83 + 1.7);
    for (let n = 0; n < this.chimneys.length; n++) {
      const c = this.chimneys[n];
      if (c.x < view.x0 - 2 || c.x > view.x1 + 2 || c.z < view.y0 - 2 || c.z - c.y > view.y1 + 4) continue;
      this.acc[n] += dt;
      const every = EVERY * (0.85 + 0.3 * hash2(this.seed, n, 7));
      while (this.acc[n] >= every) { this.acc[n] -= every; this.spawn(c); }
    }
    for (let i = 0; i < MAX; i++) {
      if (this.age[i] >= this.life[i]) continue;
      const u = this.age[i] / this.life[i];
      this.age[i] += dt;
      this.vel[i * 3 + 1] *= Math.exp(-0.32 * dt);                       // sobe cada vez mais devagar
      this.vel[i * 3] += (wind * (0.35 + 0.9 * u) - this.vel[i * 3]) * Math.min(1, 1.6 * dt); // o vento pega mais quanto mais alto
      this.pos[i * 3] += this.vel[i * 3] * dt;
      this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
    }
    const g = this.points.geometry;
    for (const a of ['position', 'aAge', 'aLife', 'aSize', 'aTone']) (g.getAttribute(a) as THREE.BufferAttribute).needsUpdate = true;
  }

  /** Puffs vivos (testes). */
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
