import * as THREE from 'three';
import { mulberry32 } from '../../world/random';
import { CRACK_STAGES, crackStage } from '../breakFx';

/**
 * Rachaduras do bloco que se quebra (v0.93.98): decalques pintados por cima do topo e da frente do bloco, em estágios que crescem com o
 * progresso da quebra (`crackStage`). Cada estágio acrescenta fissuras às do anterior (mesma semente), então o desenho "cresce" em vez de
 * trocar. Só visual; tremem junto com o bloco (`setShake`). As texturas são desenhadas por código (nunca se lê canvas).
 */
const VARIANTS = 2;

/**
 * Desgaste em pixels (v0.93.100, no lugar das fissuras em linhas de v0.93.98, que liam como listras): covinhas e lascas de borda de 1 px
 * da grade de 16 × 16 do bloco, sem nenhuma linha. Cada estágio acrescenta marcas às do anterior (mesma semente): covinhas escuras com
 * um fio claro embaixo/à direita (parecem fundas) e cantos e bordas mordidos.
 */
function drawWear(ctx: CanvasRenderingContext2D, w: number, h: number, stage: number, seed: number): void {
  const r = mulberry32(seed);
  const px = (x: number, y: number, color: string): void => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, 1, 1);
  };
  const CORE = 'rgba(30,18,12,0.78)', SHADE = 'rgba(40,24,16,0.5)', RIM = 'rgba(255,255,255,0.26)';
  const small = h < w * 0.6; // faixa da frente (1 : 1/levels): marcas menores
  type Mark = { kind: 'pit'; x: number; y: number; rad: number } | { kind: 'corner'; c: number; size: number } | { kind: 'bite'; edge: number; at: number; depth: number };
  const marks: Mark[] = [];
  const per = [3, 3, 4, 4];
  for (let st = 0; st < CRACK_STAGES; st++) {
    for (let i = 0; i < per[st]; i++) {
      const roll = r();
      if (roll < 0.62) marks.push({ kind: 'pit', x: 1 + Math.floor(r() * (w - 2)), y: 1 + Math.floor(r() * (h - 2)), rad: (small ? 0.6 : 0.8) + r() * (0.5 + st * 0.22) });
      else if (roll < 0.82) marks.push({ kind: 'corner', c: Math.floor(r() * 4), size: (small ? 1 : 2) + Math.floor(r() * (1 + st * 0.7)) });
      else marks.push({ kind: 'bite', edge: Math.floor(r() * 4), at: Math.floor(r() * (w - 2)) + 1, depth: 1 + Math.floor(r() * (1 + st * 0.5)) });
    }
  }
  ctx.clearRect(0, 0, w, h);
  const count = per.slice(0, stage).reduce((a, n) => a + n, 0);
  for (const m of marks.slice(0, count)) {
    if (m.kind === 'pit') {
      const cells: [number, number][] = [];
      for (let y = Math.floor(m.y - m.rad - 1); y <= Math.ceil(m.y + m.rad + 1); y++) {
        for (let x = Math.floor(m.x - m.rad - 1); x <= Math.ceil(m.x + m.rad + 1); x++) {
          if (Math.hypot(x - m.x, (y - m.y) * 1.1) <= m.rad + (((x * 7 + y * 13) & 3) - 1.5) * 0.18) cells.push([x, y]);
        }
      }
      const set = new Set(cells.map(([x, y]) => x + ',' + y));
      for (const [x, y] of cells) { px(x - 1, y - 1, SHADE); px(x, y - 1, SHADE); px(x - 1, y, SHADE); }
      for (const [x, y] of cells) px(x, y, CORE);
      for (const [x, y] of cells) if (!set.has(x + ',' + (y + 1))) px(x, y + 1, RIM);
    } else if (m.kind === 'corner') {
      const cx = m.c & 1 ? w - 1 : 0, cy = m.c & 2 ? h - 1 : 0;
      for (let y = 0; y < m.size; y++) for (let x = 0; x < m.size - y; x++) px(m.c & 1 ? cx - x : cx + x, m.c & 2 ? cy - y : cy + y, CORE);
    } else {
      for (let d = 0; d < m.depth; d++) for (let k = 0; k < 2; k++) {
        const t = m.at + k;
        if (m.edge === 0) px(t, d, CORE); else if (m.edge === 1) px(t, h - 1 - d, CORE); else if (m.edge === 2) px(d, Math.min(h - 1, t), CORE); else px(w - 1 - d, Math.min(h - 1, t), CORE);
      }
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
    const w = 16, h = kind === 'top' ? 16 : 16 / this.levels; // grade de 16 px do bloco; a frente é uma faixa 1 : (1/levels)
    const c = document.createElement('canvas');
    c.width = w; c.height = Math.max(3, Math.round(h));
    drawWear(c.getContext('2d')!, c.width, c.height, stage, this.seed * 31 + variant * 977 + (kind === 'top' ? 1 : 2));
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
