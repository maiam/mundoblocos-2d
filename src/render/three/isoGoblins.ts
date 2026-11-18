import * as THREE from 'three';
import { CHUNK_SIZE } from '../../config';
import { Block, type BlockId } from '../../world/blocks';
import type { Chunk } from '../../world/chunk';
import { hash2 } from '../../world/random';
import type { ChunkRect } from '../../world/world';

/** A malha do goblin (`scripts/extract-iso-goblin.py`): altura 1 (pés em y = 0, centrada em x/z), UV do atlas, normais em centésimos e índices dos triângulos. */
export interface IsoGoblinModel { positions: number[]; normals: number[]; uvs: number[]; indices: number[] }
/** Arte do goblin: a malha e a imagem da cor base do atlas. */
export interface IsoGoblinArt { model: IsoGoblinModel; image: HTMLImageElement }

export interface IsoGoblinWorld {
  getChunk(cx: number, cy: number): Chunk | null | undefined;
  getLevel(x: number, y: number, level: number): BlockId;
}

/** Altura do goblin em células: medida na tela, com 1,15 ele ficava com 0,53 da altura da Deusa (halo aos pés); 1,5 dá ~0,7 (goblin menor que ela). */
export const GOBLIN_HEIGHT = 1.5;
/** Raio (células) em que o goblin procura a fogueira para olhar para ela. */
const FIRE_RADIUS = 10;
const STEPS = 8;

interface Entry { x: number; y: number; level: number; mesh: THREE.Mesh }

/**
 * Goblins do Vale como **malhas 3D** no Santuário isométrico (v0.93.160): o modelo do dono do produto (Blender, pose A, 3000 triângulos) com a cor base do atlas dele, em cada
 * célula com `Block.ISO_GOBLIN`. Cada um olha para a fogueira mais próxima (8 direções; sem fogueira, uma direção sorteada pela posição). Estático: sem animação nem combate
 * (o Santuário é solo). A cena não tem luzes: o relevo vem do sombreado fixo por normal, calculado por direção (as normais giram junto com a malha).
 */
export class IsoGoblins {
  private readonly lists = new Map<string, { version: number; entries: Entry[] }>();
  private readonly base: THREE.BufferGeometry;
  private readonly normals: Float32Array;
  private readonly variants: THREE.BufferGeometry[] = [];
  private readonly material: THREE.MeshBasicMaterial;
  private readonly texture: THREE.Texture;
  private pickables: THREE.Mesh[] = [];
  private dirty = true;

  constructor(private readonly scene: THREE.Object3D, private readonly world: IsoGoblinWorld, art: IsoGoblinArt) {
    const m = art.model;
    this.base = new THREE.BufferGeometry();
    this.base.setAttribute('position', new THREE.Float32BufferAttribute(m.positions, 3));
    this.base.setAttribute('uv', new THREE.Float32BufferAttribute(m.uvs, 2));
    this.base.setIndex(m.indices);
    this.normals = Float32Array.from(m.normals, (v) => v / 100);
    this.texture = new THREE.Texture(art.image);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.flipY = false; // UV do glTF: origem no canto superior esquerdo
    this.texture.anisotropy = 4;
    this.texture.needsUpdate = true;
    this.material = new THREE.MeshBasicMaterial({ map: this.texture, vertexColors: true, side: THREE.DoubleSide });
  }

  /** Geometria para a direção `k` (0..7): a mesma malha com o sombreado das normais já giradas. */
  private geometryFor(k: number): THREE.BufferGeometry {
    let g = this.variants[k];
    if (g) return g;
    g = new THREE.BufferGeometry();
    g.setAttribute('position', this.base.getAttribute('position'));
    g.setAttribute('uv', this.base.getAttribute('uv'));
    g.setIndex(this.base.getIndex());
    const a = (k * Math.PI * 2) / STEPS, cos = Math.cos(a), sin = Math.sin(a);
    const light = new THREE.Vector3(-0.35, 0.85, 0.4).normalize();
    const n = this.normals;
    const col = new Float32Array(n.length);
    for (let i = 0; i < n.length; i += 3) {
      const nx = n[i] * cos + n[i + 2] * sin, ny = n[i + 1], nz = -n[i] * sin + n[i + 2] * cos; // rotação em y
      const s = 0.55 + 0.45 * Math.max(0, nx * light.x + ny * light.y + nz * light.z);
      col[i] = col[i + 1] = col[i + 2] = s;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.variants[k] = g;
    return g;
  }

  /** Direção (0..7) para olhar a fogueira mais próxima; sem fogueira por perto, sorteada pela posição. */
  private facing(x: number, y: number, chunk: Chunk): number {
    let best = -1, bx = 0, by = 0;
    for (let dy = -FIRE_RADIUS; dy <= FIRE_RADIUS; dy++) {
      for (let dx = -FIRE_RADIUS; dx <= FIRE_RADIUS; dx++) {
        const d = dx * dx + dy * dy;
        if (best >= 0 && d >= best) continue;
        for (let l = 0; l < chunk.levels.length; l++) if (this.world.getLevel(x + dx, y + dy, l) === Block.CAMPFIRE) { best = d; bx = dx; by = dy; break; }
      }
    }
    const angle = best >= 0 ? Math.atan2(bx, by) : hash2(0x60b1, x, y) * Math.PI * 2;
    return ((Math.round((angle / (Math.PI * 2)) * STEPS) % STEPS) + STEPS) % STEPS;
  }

  private make(x: number, y: number, level: number, chunk: Chunk): Entry {
    const k = this.facing(x, y, chunk);
    const mesh = new THREE.Mesh(this.geometryFor(k), this.material);
    mesh.position.set(x + 0.5, level, y + 0.5);
    mesh.rotation.y = (k * Math.PI * 2) / STEPS;
    mesh.scale.setScalar(GOBLIN_HEIGHT);
    mesh.name = 'Santuário: goblin 3D';
    mesh.userData.cell = { x, y };
    this.scene.add(mesh);
    return { x, y, level, mesh };
  }

  update(rect: ChunkRect): void {
    const keep = new Set<string>();
    for (let cy = rect.cy0; cy <= rect.cy1; cy++) {
      for (let cx = rect.cx0; cx <= rect.cx1; cx++) {
        const chunk = this.world.getChunk(cx, cy);
        if (!chunk) continue;
        const key = cx + ',' + cy;
        keep.add(key);
        const old = this.lists.get(key);
        if (old && old.version === chunk.version) continue;
        if (old) for (const e of old.entries) this.scene.remove(e.mesh);
        const entries: Entry[] = [];
        for (let ly = 0; ly < CHUNK_SIZE; ly++) {
          for (let lx = 0; lx < CHUNK_SIZE; lx++) {
            const x = cx * CHUNK_SIZE + lx, y = cy * CHUNK_SIZE + ly;
            for (let level = 0; level < chunk.levels.length; level++) {
              if (this.world.getLevel(x, y, level) !== Block.ISO_GOBLIN) continue;
              entries.push(this.make(x, y, level, chunk));
              break;
            }
          }
        }
        this.lists.set(key, { version: chunk.version, entries });
        this.dirty = true;
      }
    }
    for (const [key, list] of this.lists) {
      if (keep.has(key)) continue;
      for (const e of list.entries) this.scene.remove(e.mesh);
      this.lists.delete(key);
      this.dirty = true;
    }
    if (this.dirty) {
      this.pickables = [...this.lists.values()].flatMap((l) => l.entries.map((e) => e.mesh));
      this.dirty = false;
    }
  }

  /** Malhas para o raio de seleção (cada uma leva `userData.cell`). */
  meshes(): THREE.Mesh[] { return this.pickables; }

  cellOf(object: THREE.Object3D): { x: number; y: number } | undefined {
    return object.userData.cell as { x: number; y: number } | undefined;
  }

  get count(): number { return this.pickables.length; }

  dispose(): void {
    for (const l of this.lists.values()) for (const e of l.entries) this.scene.remove(e.mesh);
    this.lists.clear();
    for (const g of this.variants) g?.dispose();
    this.base.dispose();
    this.material.dispose();
    this.texture.dispose();
  }
}
