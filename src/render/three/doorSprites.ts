import * as THREE from 'three';
import { CHUNK_SIZE } from '../../config';
import type { BlockId } from '../../world/blocks';
import type { Chunk } from '../../world/chunk';
import type { ChunkRect } from '../../world/world';
import { DoorAnimator, doorKey } from '../doorAnim';
import { type SpriteArt, type SpriteCell, spriteHit } from './chunkSprites';

export interface DoorWorld {
  getChunk(cx: number, cy: number): Chunk | null | undefined;
  getLevel(x: number, y: number, level: number): BlockId;
}
export interface DoorSpritesOptions {
  tile: number;
  k: number;
  /** O id é uma porta (aberta ou fechada)? */
  isDoor(id: BlockId): boolean;
  /** A porta com este id está aberta? */
  isOpen(id: BlockId): boolean;
  /** Os 8 quadros da porta (0..3 abrindo, 4..7 fechando). */
  frames(): readonly SpriteArt[];
  /** Teto de portas desenhadas por quadro. */
  maxDoors?: number;
}

interface Door { x: number; y: number; id: BlockId }
interface Asset { texture: THREE.CanvasTexture; solid: THREE.MeshBasicMaterial; soft: THREE.MeshBasicMaterial }

/**
 * Portas do Mundo no 3D com a animação de abrir/fechar (ADR 0031, M3.4). Ficam FORA do `ChunkSprites` (que só reconstrói
 * quando o chunk muda): um plano por porta visível, o quadro escolhido a cada desenho pela máquina de estados compartilhada
 * com o 2D (`DoorAnimator`). A lista de portas de cada chunk é guardada por `chunk.version` (nada de varrer as células todo quadro).
 */
export class DoorSprites {
  private readonly lists = new Map<string, { version: number; doors: Door[] }>();
  private readonly pool: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>[] = [];
  private readonly assets = new Map<HTMLCanvasElement, Asset>();
  private readonly geometries = new Map<string, THREE.PlaneGeometry>();
  private readonly animator = new DoorAnimator();
  private drawn = 0;

  constructor(private readonly scene: THREE.Object3D, private readonly world: DoorWorld, private readonly opts: DoorSpritesOptions) {}

  get count(): number { return this.drawn; }

  update(rect: ChunkRect, elapsed: number): void {
    const frames = this.opts.frames();
    const max = this.opts.maxDoors ?? 48;
    let n = 0;
    const keep = new Set<string>();
    if (frames.length) {
      for (let cy = rect.cy0; cy <= rect.cy1; cy++) {
        for (let cx = rect.cx0; cx <= rect.cx1; cx++) {
          const chunk = this.world.getChunk(cx, cy);
          if (!chunk) continue;
          const key = cx + ',' + cy;
          keep.add(key);
          let entry = this.lists.get(key);
          if (!entry || entry.version !== chunk.version) {
            entry = { version: chunk.version, doors: this.scan(chunk) };
            this.lists.set(key, entry);
          }
          for (const d of entry.doors) {
            if (n >= max) break;
            this.place(n++, d, frames, elapsed);
          }
        }
      }
    }
    for (const key of this.lists.keys()) if (!keep.has(key)) this.lists.delete(key);
    this.drawn = n;
    for (let i = n; i < this.pool.length; i++) this.pool[i].visible = false;
  }

  private scan(chunk: Chunk): Door[] {
    const out: Door[] = [];
    for (let ly = 0; ly < CHUNK_SIZE; ly++) {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        const x = chunk.cx * CHUNK_SIZE + lx, y = chunk.cy * CHUNK_SIZE + ly;
        const id = this.world.getLevel(x, y, 0);
        if (this.opts.isDoor(id)) out.push({ x, y, id });
      }
    }
    return out;
  }

  private assetFor(sprite: SpriteArt): Asset {
    let a = this.assets.get(sprite.canvas);
    if (a) return a;
    const texture = new THREE.CanvasTexture(sprite.canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    const common = { map: texture, side: THREE.DoubleSide } as const;
    a = {
      texture,
      solid: new THREE.MeshBasicMaterial({ ...common, alphaTest: 0.5 }),
      soft: new THREE.MeshBasicMaterial({ ...common, transparent: true, depthWrite: false, alphaTest: 0.01 }),
    };
    this.assets.set(sprite.canvas, a);
    return a;
  }

  private geometryFor(sprite: SpriteArt): THREE.PlaneGeometry {
    const key = sprite.w + 'x' + sprite.h;
    let g = this.geometries.get(key);
    if (!g) {
      const wc = sprite.w / this.opts.tile, hc = sprite.h / this.opts.tile / this.opts.k;
      g = new THREE.PlaneGeometry(wc, hc);
      g.translate(wc / 2, hc / 2, 0); // origem no canto inferior esquerdo do sprite
      this.geometries.set(key, g);
    }
    return g;
  }

  private place(i: number, d: Door, frames: readonly SpriteArt[], elapsed: number): void {
    const open = this.opts.isOpen(d.id);
    const frame = Math.min(frames.length - 1, this.animator.frameFor(doorKey(d.x, d.y), open, elapsed));
    const sprite = frames[frame];
    const a = this.assetFor(sprite);
    let mesh = this.pool[i];
    if (!mesh) {
      mesh = new THREE.Mesh(this.geometryFor(sprite), open ? a.soft : a.solid);
      mesh.frustumCulled = false;
      mesh.name = 'Mundo: porta';
      this.scene.add(mesh);
      this.pool.push(mesh);
    }
    mesh.geometry = this.geometryFor(sprite);
    mesh.material = open ? a.soft : a.solid; // aberta se atravessa: nunca cobre o personagem
    mesh.position.set(d.x + sprite.ox / this.opts.tile, 0, d.y + (sprite.oy + sprite.h) / this.opts.tile);
    mesh.userData.cell = { x: d.x, y: d.y, id: d.id, sprite } satisfies SpriteCell;
    mesh.visible = true;
  }

  /** Planos clicáveis (para o `pick`). */
  meshes(): THREE.Mesh[] {
    return this.pool.filter((m) => m.visible);
  }

  /** Porta atingida pelo raio, só dentro do retângulo clicável do quadro atual. */
  cellOf(hit: THREE.Intersection): SpriteCell | undefined {
    const cell = hit.object.userData.cell as SpriteCell | undefined;
    return cell && spriteHit(hit.point, cell, this.opts.tile, this.opts.k) ? cell : undefined;
  }

  reupload(): void {
    for (const a of this.assets.values()) a.texture.needsUpdate = true;
  }

  dispose(): void {
    for (const m of this.pool) this.scene.remove(m);
    this.pool.length = 0;
    for (const a of this.assets.values()) { a.solid.dispose(); a.soft.dispose(); a.texture.dispose(); }
    this.assets.clear();
    for (const g of this.geometries.values()) g.dispose();
    this.geometries.clear();
    this.lists.clear();
  }
}
