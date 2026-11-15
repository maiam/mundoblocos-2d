import * as THREE from 'three';

/**
 * Efeitos de golpe em quadros (v0.93.102): tiras de quadros 128 × 128 (`scripts/extract-fx.py`) tocadas como planos que olham para a câmera, por cima
 * do mundo (sem teste de profundidade): cavar (`dig`), machadada (`tree`), espada (`slash` para os lados, espelhada à esquerda; `slashUp`/`slashDown`),
 * picareta (`rock`), pá (`soil`) e enxada (`till`). Pool fixo; só visual.
 */
export type FxKind = 'dig' | 'tree' | 'slash' | 'slashUp' | 'slashDown' | 'rock' | 'soil' | 'till';
export type FxArt = Record<FxKind, HTMLImageElement>;

interface Def { fps: number; size: number }
const DEFS: Record<FxKind, Def> = {
  dig: { fps: 16, size: 2.2 },     // o buraco ocupa ~0,45 do quadro: 2,2 células → ~1 célula
  tree: { fps: 22, size: 2 },      // menor que a prancha (a estrela era grande demais para uma machadada)
  slash: { fps: 26, size: 2.6 },
  slashUp: { fps: 26, size: 2.4 },
  slashDown: { fps: 26, size: 2.4 },
  rock: { fps: 24, size: 1.8 },    // picareta: clarão e pedrinhas
  soil: { fps: 20, size: 1.8 },    // pá: terra jogada
  till: { fps: 20, size: 1.8 },    // enxada: terra revirada
};
const POOL = 12;

interface Item {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  tex: Partial<Record<FxKind, THREE.Texture>>;
  kind: FxKind;
  frames: number;
  t: number;
  active: boolean;
}

export class SpriteFx {
  private readonly geometry = new THREE.PlaneGeometry(1, 1);
  private readonly items: Item[] = [];
  private readonly base = new Map<FxKind, { tex: THREE.Texture; frames: number }>();

  constructor(private readonly parent: THREE.Object3D, private readonly art: () => FxArt | null) {}

  /** Tem imagem para este efeito (a arte carrega antes do jogo; fora do mundo principal não há)? */
  private baseFor(kind: FxKind): { tex: THREE.Texture; frames: number } | null {
    let b = this.base.get(kind);
    if (b) return b;
    const img = this.art()?.[kind];
    if (!img) return null;
    const tex = new THREE.Texture(img);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.generateMipmaps = false;
    tex.minFilter = tex.magFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    b = { tex, frames: Math.max(1, Math.round(img.width / img.height)) };
    this.base.set(kind, b);
    return b;
  }

  /**
   * Toca `kind` com o centro do quadro em (x, y altura, z) (células do mundo). `mirror` espelha na horizontal; `lift` desloca o quadro para cima
   * em frações do tamanho (o buraco fica abaixo do centro do quadro).
   */
  play(kind: FxKind, x: number, y: number, z: number, opts: { mirror?: boolean; scale?: number } = {}): void {
    const b = this.baseFor(kind);
    if (!b) return;
    let it = this.items.find((i) => !i.active);
    if (!it) {
      if (this.items.length >= POOL) it = this.items.reduce((a, c) => (c.t > a.t ? c : a)); // reaproveita o mais antigo
      else {
        const mat = new THREE.MeshBasicMaterial({ transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide });
        const mesh = new THREE.Mesh(this.geometry, mat);
        mesh.renderOrder = 12;
        mesh.frustumCulled = false;
        mesh.visible = false;
        this.parent.add(mesh);
        it = { mesh, tex: {}, kind, frames: b.frames, t: 0, active: false };
        this.items.push(it);
      }
    }
    let tex = it.tex[kind];
    if (!tex) { tex = b.tex.clone(); tex.repeat.set(1 / b.frames, 1); tex.needsUpdate = true; it.tex[kind] = tex; }
    it.kind = kind; it.frames = b.frames; it.t = 0; it.active = true;
    const s = DEFS[kind].size * (opts.scale ?? 1);
    it.mesh.material.map = tex;
    it.mesh.material.needsUpdate = true;
    it.mesh.scale.set(opts.mirror ? -s : s, s, 1);
    it.mesh.position.set(x, y, z);
    it.mesh.visible = true;
    tex.offset.x = 0;
  }

  update(dt: number): void {
    for (const it of this.items) {
      if (!it.active) continue;
      it.t += dt;
      const f = Math.floor(it.t * DEFS[it.kind].fps);
      if (f >= it.frames) { it.active = false; it.mesh.visible = false; continue; }
      const tex = it.tex[it.kind]!;
      tex.offset.x = f / it.frames;
    }
  }

  /** Quantos estão tocando (testes). */
  get live(): number { return this.items.filter((i) => i.active).length; }

  clear(): void {
    for (const it of this.items) { it.active = false; it.mesh.visible = false; }
  }

  dispose(): void {
    for (const it of this.items) { this.parent.remove(it.mesh); it.mesh.material.dispose(); for (const t of Object.values(it.tex)) t?.dispose(); }
    this.items.length = 0;
    for (const b of this.base.values()) b.tex.dispose();
    this.base.clear();
    this.geometry.dispose();
  }
}
