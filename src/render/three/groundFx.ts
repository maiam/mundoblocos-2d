import * as THREE from 'three';
import type { WaterFlow } from '../../world/world';
import { cloudBlobs, glintAlpha, glintPosition } from '../groundFxMath';

const MAX_GLINTS = 96;
const MAX_FLOWS = 16;
const MAX_CLOUDS = 16;
/** Linha de cada sentido de entrada da água na folha do fluxo (`Renderer.drawWaterFlows`). */
const FLOW_ROW = { west: 0, east: 1, south: 2, north: 3 } as const;

export interface GroundFxSource {
  /** Cria um canvas (o DOM; nos testes, um falso). Padrão: `document.createElement('canvas')`. */
  createCanvas?(): HTMLCanvasElement;
  seed: number;
  /** A célula é água aberta (chão líquido sem objeto por cima)? */
  isOpenWater(x: number, y: number): boolean;
  waterFlows(): Iterable<WaterFlow>;
  /** Folha do fluxo de água (4 × 4 quadros), quando a arte já carregou. */
  flowSheet(): HTMLImageElement | HTMLCanvasElement | null;
}
/** Área visível em células de mundo. */
export interface FxView { x0: number; y0: number; x1: number; y1: number }

/**
 * Efeitos animados sobre o chão do Mundo (ADR 0031, M2.4), os mesmos do 2D: brilhos que piscam na água, buraco enchendo de
 * água (quadros da folha de fluxo) e sombras de nuvens passando. Planos horizontais colados ao chão (sem escrever
 * profundidade), em pools de tamanho fixo: nada é criado por quadro.
 */
export class GroundFx {
  private readonly glints: THREE.InstancedMesh;
  private readonly flows: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>[] = [];
  private readonly clouds: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>[] = [];
  private readonly flat: THREE.PlaneGeometry;
  private readonly glintTexture: THREE.CanvasTexture;
  private readonly cloudTexture: THREE.CanvasTexture;
  private flowSheetImage: HTMLImageElement | HTMLCanvasElement | null = null;
  private flowTextures: THREE.Texture[] = [];
  private readonly dummy = new THREE.Object3D();

  constructor(private readonly scene: THREE.Object3D, private readonly src: GroundFxSource) {
    this.flat = new THREE.PlaneGeometry(1, 1);
    this.flat.rotateX(-Math.PI / 2);
    const make = src.createCanvas ?? (() => document.createElement('canvas'));
    this.glintTexture = new THREE.CanvasTexture(starCanvas(make()));
    this.cloudTexture = new THREE.CanvasTexture(blobCanvas(make()));
    for (const t of [this.glintTexture, this.cloudTexture]) {
      t.colorSpace = THREE.SRGBColorSpace;
      t.generateMipmaps = false;
      t.minFilter = THREE.LinearFilter;
    }
    const mat = (map: THREE.Texture) => new THREE.MeshBasicMaterial({
      map, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, side: THREE.DoubleSide,
    });
    this.glints = new THREE.InstancedMesh(this.flat, mat(this.glintTexture), MAX_GLINTS);
    this.glints.count = 0;
    this.glints.frustumCulled = false;
    this.glints.renderOrder = 1;
    this.glints.name = 'Mundo: brilhos da água';
    scene.add(this.glints);
    for (let i = 0; i < MAX_CLOUDS; i++) {
      const m = new THREE.Mesh(this.flat, mat(this.cloudTexture));
      m.visible = false;
      m.renderOrder = 1;
      m.name = 'Mundo: sombra de nuvem';
      scene.add(m);
      this.clouds.push(m);
    }
  }

  get glintCount(): number { return this.glints.count; }
  get visibleClouds(): number { return this.clouds.filter((c) => c.visible).length; }
  get visibleFlows(): number { return this.flows.filter((f) => f.visible).length; }

  update(view: FxView, elapsed: number): void {
    this.updateGlints(view, elapsed);
    this.updateFlows();
    this.updateClouds(view, elapsed);
  }

  private updateGlints(v: FxView, elapsed: number): void {
    const seed = this.src.seed;
    let n = 0;
    for (let y = Math.floor(v.y0); y <= Math.ceil(v.y1) && n < MAX_GLINTS; y++) {
      for (let x = Math.floor(v.x0); x <= Math.ceil(v.x1) && n < MAX_GLINTS; x++) {
        const a = glintAlpha(seed, x, y, elapsed);
        if (a <= 0 || !this.src.isOpenWater(x, y)) continue;
        const p = glintPosition(seed, x, y);
        this.dummy.position.set(p.x, 0.02, p.y);
        this.dummy.scale.setScalar(0.4 * a); // o brilho cresce e some (no 2D: raio 3 px ≈ 0,19 célula, com alfa)
        this.dummy.rotation.set(0, 0, 0);
        this.dummy.updateMatrix();
        this.glints.setMatrixAt(n++, this.dummy.matrix);
      }
    }
    this.glints.count = n;
    this.glints.instanceMatrix.needsUpdate = true;
  }

  private updateFlows(): void {
    const sheet = this.src.flowSheet();
    if (sheet !== this.flowSheetImage) { // a arte chegou (ou mudou): refaz as texturas dos quadros
      this.flowSheetImage = sheet;
      for (const t of this.flowTextures) t.dispose();
      this.flowTextures = [];
      for (const f of this.flows) { this.scene.remove(f); f.material.dispose(); }
      this.flows.length = 0;
    }
    let n = 0;
    if (sheet) {
      for (const f of this.src.waterFlows()) {
        if (n >= MAX_FLOWS) break;
        let mesh = this.flows[n];
        if (!mesh) {
          const tex = new THREE.Texture(sheet);
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.generateMipmaps = false;
          tex.minFilter = THREE.LinearFilter;
          tex.repeat.set(0.25, 0.25);
          tex.needsUpdate = true;
          this.flowTextures.push(tex);
          mesh = new THREE.Mesh(this.flat, new THREE.MeshBasicMaterial({
            map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2,
          }));
          mesh.renderOrder = 1;
          mesh.name = 'Mundo: água enchendo';
          this.scene.add(mesh);
          this.flows.push(mesh);
        }
        const frame = Math.min(3, Math.floor(f.t * 4));
        const tex = mesh.material.map!;
        tex.offset.set(frame * 0.25, 1 - (FLOW_ROW[f.from] + 1) * 0.25); // a imagem tem a linha 0 no alto; o UV, embaixo
        mesh.position.set(f.x + 0.5, 0.025, f.y + 0.5);
        mesh.visible = true;
        n++;
      }
    }
    for (let i = n; i < this.flows.length; i++) this.flows[i].visible = false;
  }

  private updateClouds(v: FxView, elapsed: number): void {
    const blobs = cloudBlobs(this.src.seed, v.x0, v.y0, v.x1, v.y1, elapsed);
    for (let i = 0; i < this.clouds.length; i++) {
      const m = this.clouds[i];
      const b = blobs[i];
      m.visible = !!b;
      if (!b) continue;
      m.position.set(b.x, 0.015, b.y);
      m.scale.set(b.rx * 2, 1, b.ry * 2);
    }
  }

  reupload(): void {
    this.glintTexture.needsUpdate = true;
    this.cloudTexture.needsUpdate = true;
    for (const t of this.flowTextures) t.needsUpdate = true;
  }

  dispose(): void {
    this.scene.remove(this.glints);
    this.glints.dispose();
    (this.glints.material as THREE.Material).dispose();
    for (const m of [...this.clouds, ...this.flows]) { this.scene.remove(m); m.material.dispose(); }
    for (const t of this.flowTextures) t.dispose();
    this.flowTextures = [];
    this.glintTexture.dispose();
    this.cloudTexture.dispose();
    this.flat.dispose();
  }
}

/** Brilho de 4 pontas (mesma forma do 2D, em branco). */
function starCanvas(c: HTMLCanvasElement): HTMLCanvasElement {
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  if (!ctx) return c;
  const m = 32, r = 30;
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.moveTo(m, m - r);
  ctx.quadraticCurveTo(m, m, m + r, m);
  ctx.quadraticCurveTo(m, m, m, m + r);
  ctx.quadraticCurveTo(m, m, m - r, m);
  ctx.quadraticCurveTo(m, m, m, m - r);
  ctx.fill();
  return c;
}

/** Mancha macia da sombra de nuvem (centro 13% de alfa, borda 0), na cor do 2D. */
function blobCanvas(c: HTMLCanvasElement): HTMLCanvasElement {
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  if (!ctx) return c;
  const g = ctx.createRadialGradient(64, 64, 64 * 0.2, 64, 64, 64);
  g.addColorStop(0, 'rgba(30, 24, 80, 0.13)');
  g.addColorStop(1, 'rgba(30, 24, 80, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return c;
}
