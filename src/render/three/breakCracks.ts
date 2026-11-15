import * as THREE from 'three';
import { mulberry32 } from '../../world/random';
import { CRACK_STAGES, crackStage } from '../breakFx';

/**
 * Rachaduras do bloco que se quebra (v0.93.98): decalques pintados por cima do topo e da frente do bloco, em estágios que crescem com o
 * progresso da quebra (`crackStage`). Cada estágio acrescenta fissuras às do anterior (mesma semente), então o desenho "cresce" em vez de
 * trocar. Só visual; tremem junto com o bloco (`setShake`). As texturas são desenhadas por código (nunca se lê canvas).
 */
const VARIANTS = 2;

/** Desenha as fissuras dos estágios 1..stage num canvas `w × h` (o mesmo `seed` dá sempre as mesmas fissuras). */
function drawCracks(ctx: CanvasRenderingContext2D, w: number, h: number, stage: number, seed: number): void {
  const r = mulberry32(seed);
  const branches: { x: number; y: number; pts: [number, number][] }[] = [];
  for (let i = 0; i < CRACK_STAGES; i++) {
    const sx = (0.25 + r() * 0.5) * w, sy = (0.25 + r() * 0.5) * h;
    let a = r() * Math.PI * 2, x = sx, y = sy;
    const pts: [number, number][] = [[x, y]];
    const steps = 4 + Math.floor(r() * 3);
    for (let s = 0; s < steps; s++) {
      a += (r() - 0.5) * 1.3;
      const len = (0.12 + r() * 0.14) * Math.max(w, h * 2);
      x += Math.cos(a) * len; y += Math.sin(a) * len * (h / w < 0.5 ? 0.5 : 1);
      pts.push([x, y]);
    }
    branches.push({ x: sx, y: sy, pts });
  }
  ctx.clearRect(0, 0, w, h);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let b = 0; b < stage; b++) {
    const pts = branches[b].pts;
    for (const [color, off, width] of [['rgba(255,255,255,0.2)', 0.7, 0.9], ['rgba(24,14,10,0.8)', 0, 1.25]] as const) {
      ctx.strokeStyle = color;
      ctx.lineWidth = width * (w / 32);
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x + off, y + off) : ctx.moveTo(x + off, y + off)));
      ctx.stroke();
    }
  }
}

export class BreakCracks {
  private readonly group = new THREE.Group();
  private readonly top: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private readonly front: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private readonly cache = new Map<string, THREE.CanvasTexture>();
  private stage = 0;
  private cell = '';

  /** `levels` = níveis por célula de altura (4 no Mundo): a frente do bloco tem `1 / levels` de altura. */
  constructor(parent: THREE.Object3D, private readonly seed: number, private readonly levels: number) {
    const mat = () => new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const topGeo = new THREE.PlaneGeometry(1, 1);
    topGeo.rotateX(-Math.PI / 2);
    this.top = new THREE.Mesh(topGeo, mat());
    this.front = new THREE.Mesh(new THREE.PlaneGeometry(1, 1 / levels), mat());
    for (const m of [this.top, this.front]) { m.frustumCulled = false; m.renderOrder = 5; this.group.add(m); }
    this.group.visible = false;
    this.group.name = 'Mundo: rachaduras';
    parent.add(this.group);
  }

  private texture(kind: 'top' | 'front', stage: number, variant: number): THREE.CanvasTexture {
    const key = kind + stage + ':' + variant;
    let t = this.cache.get(key);
    if (t) return t;
    const w = 64, h = kind === 'top' ? 64 : 64 / this.levels * 1; // a frente é uma faixa 1 : (1/levels)
    const c = document.createElement('canvas');
    c.width = w; c.height = Math.max(8, Math.round(h));
    drawCracks(c.getContext('2d')!, c.width, c.height, stage, this.seed * 31 + variant * 977 + (kind === 'top' ? 1 : 2));
    t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.generateMipmaps = false;
    t.minFilter = t.magFilter = THREE.LinearFilter;
    this.cache.set(key, t);
    return t;
  }

  /**
   * Mostra as rachaduras do bloco da célula (x, y) cujo topo está a `h` células de altura, no estágio de `progress` (0..1); `off` = tremor do bloco.
   * `front` = o bloco tem face frontal (cubo; no chão só o topo racha).
   */
  show(x: number, y: number, h: number, progress: number, front: boolean, off: { dx: number; dy: number; dz: number }): void {
    const stage = crackStage(progress);
    if (stage <= 0) { this.hide(); return; }
    const variant = (x + y) & (VARIANTS - 1);
    const key = x + ',' + y + ',' + h;
    if (stage !== this.stage || key !== this.cell) {
      this.stage = stage; this.cell = key;
      this.top.material.map = this.texture('top', stage, variant);
      this.top.material.needsUpdate = true;
      this.front.material.map = this.texture('front', stage, variant);
      this.front.material.needsUpdate = true;
    }
    this.top.position.set(x + 0.5, h + 0.004, y + 0.5);
    this.front.position.set(x + 0.5, h - 1 / (2 * this.levels), y + 1.004);
    this.front.visible = front;
    this.group.position.set(off.dx, off.dy, off.dz);
    this.group.visible = true;
  }

  hide(): void {
    this.group.visible = false;
    this.stage = 0;
    this.cell = '';
  }

  dispose(): void {
    this.group.parent?.remove(this.group);
    for (const m of [this.top, this.front]) { m.geometry.dispose(); m.material.dispose(); }
    for (const t of this.cache.values()) t.dispose();
    this.cache.clear();
  }
}
