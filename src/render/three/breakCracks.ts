import * as THREE from 'three';
import { crackStage } from '../breakFx';

/**
 * Rachaduras do bloco que se quebra (v0.93.98): decalques pintados por cima do topo e da frente do bloco, em estágios que crescem com o
 * progresso da quebra (`crackStage`). Cada estágio acrescenta fissuras às do anterior (mesma semente), então o desenho "cresce" em vez de
 * trocar. Só visual; tremem junto com o bloco (`setShake`). As texturas são desenhadas por código (nunca se lê canvas).
 */
/**
 * Rachaduras em pixel-art (v0.93.100): bitmaps de 16 × 16 (topo) e 16 × 4 (frente) desenhados à mão, na grade de pixels do bloco, sem suavização.
 * Cada pixel traz o estágio (1..4) em que aparece, então o desenho CRESCE a partir do centro, ramificando, em vez de trocar. Traço escuro de 1 px
 * com um fio claro na diagonal de baixo (parece fundo). Variante 1 = espelho horizontal (decalque, não textura de bloco).
 */
const TOP_CRACK: readonly (readonly [number, number, number])[] = [
  // linha principal, do centro para fora (noroeste ↔ sudeste)
  [8, 8, 1], [7, 8, 1], [7, 7, 1], [9, 8, 1], [9, 9, 1], [10, 9, 1],
  [6, 7, 2], [6, 6, 2], [5, 6, 2], [5, 5, 2], [10, 10, 2], [11, 10, 2], [11, 11, 2],
  [4, 5, 3], [4, 4, 3], [3, 4, 3], [3, 3, 3], [12, 11, 3], [12, 12, 3], [13, 12, 3],
  [2, 3, 4], [2, 2, 4], [13, 13, 4], [14, 13, 4],
  // ramo para nordeste
  [9, 7, 3], [9, 6, 3], [10, 6, 3], [10, 5, 3], [11, 5, 3], [11, 4, 3], [12, 4, 3], [12, 3, 3],
  [9, 5, 4], [8, 5, 4], [8, 4, 4], [13, 3, 4],
  // ramo para sudoeste
  [5, 7, 3], [5, 8, 3], [4, 8, 3], [4, 9, 3], [3, 9, 3], [3, 10, 3], [2, 10, 3],
  [4, 10, 4], [4, 11, 4], [3, 12, 4], [2, 11, 4],
  // ramos curtos para leste e sul
  [11, 9, 4], [12, 8, 4], [13, 8, 4], [14, 8, 4], [10, 12, 4], [10, 13, 4],
];
const FRONT_CRACK: readonly (readonly [number, number, number])[] = [
  [9, 0, 1], [9, 1, 1], [10, 2, 1],
  [10, 3, 2], [5, 0, 2], [5, 1, 2],
  [4, 2, 3], [4, 3, 3], [12, 0, 3], [12, 1, 3],
  [13, 2, 4], [13, 3, 4], [8, 2, 4], [8, 3, 4], [6, 2, 4],
];

function drawCrackPixels(ctx: CanvasRenderingContext2D, w: number, h: number, stage: number, mirror: boolean, front: boolean): void {
  ctx.clearRect(0, 0, w, h);
  const pts = (front ? FRONT_CRACK : TOP_CRACK).filter(([, , st]) => st <= stage).map(([x, y]) => [mirror ? w - 1 - x : x, y] as const);
  const dark = new Set(pts.map(([x, y]) => x + ',' + y));
  ctx.fillStyle = 'rgba(255,255,255,0.24)';
  for (const [x, y] of pts) {
    const lx = x + (mirror ? -1 : 1), ly = y + 1;
    if (!dark.has(lx + ',' + ly) && lx >= 0 && lx < w && ly < h) ctx.fillRect(lx, ly, 1, 1);
  }
  ctx.fillStyle = 'rgba(28,17,12,0.88)';
  for (const [x, y] of pts) ctx.fillRect(x, y, 1, 1);
}

const VARIANTS = 2;

export class BreakCracks {
  private readonly group = new THREE.Group();
  private readonly top: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private readonly front: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private readonly cache = new Map<string, THREE.CanvasTexture>();
  private stage = 0;
  private cell = '';

  /** `levels` = níveis por célula de altura (4 no Mundo): a frente do bloco tem `1 / levels` de altura. */
  constructor(parent: THREE.Object3D, private readonly levels: number) {
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
    const w = 16, h = kind === 'top' ? 16 : 16 / this.levels; // grade de 16 px do bloco; a frente é uma faixa 1 : (1/levels)
    const c = document.createElement('canvas');
    c.width = w; c.height = Math.max(3, Math.round(h));
    drawCrackPixels(c.getContext('2d')!, c.width, c.height, stage, variant === 1, kind === 'front');
    t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.generateMipmaps = false;
    t.minFilter = t.magFilter = THREE.NearestFilter; // pixels nítidos
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
