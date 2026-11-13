import * as THREE from 'three';
import { CHUNK_SIZE, MAX_STACK } from '../../config';
import type { BlockId } from '../../world/blocks';
import type { Chunk } from '../../world/chunk';
import type { ChunkRect } from '../../world/world';

export interface BlockCell { x: number; y: number; level: number; id: BlockId }
export type CubeShape = 'solid' | 'thin';
export interface BlockWorld {
  getChunk(cx: number, cy: number): Chunk | null | undefined;
  getLevel(x: number, y: number, level: number): BlockId;
}
export interface ChunkBlocksOptions {
  /** O bloco é um cubo desenhado aqui (objetos altos, árvores etc. têm render próprio). */
  isCube(id: BlockId): boolean;
  /** `solid` (cubo cheio) ou `thin` (placa de meia profundidade, parede horizontal de construção). */
  classify(world: BlockWorld, id: BlockId, x: number, y: number, level: number): CubeShape;
  /** Posição do centro da caixa em unidades de mundo. */
  transform(cell: { x: number; y: number; level: number; shape: CubeShape }): { x: number; y: number; z: number };
  /** Materiais do bloco por face do `BoxGeometry`. */
  material(id: BlockId): THREE.Material[];
  /** Reconstruções de chunk por quadro. */
  maxBuildsPerFrame?: number;
}

interface Group { mesh: THREE.InstancedMesh; cells: BlockCell[] }
interface Build { version: number; groups: Group[] }

/**
 * Cubos do Mundo no 3D (ADR 0031, M2.2): por chunk visível, uma malha instanciada por (bloco, forma), reconstruída só quando
 * `chunk.version` muda (o `World` já avisa os chunks vizinhos nas bordas), com orçamento de reconstruções por quadro (enquanto
 * isso, a versão antiga continua na tela) e liberação dos chunks fora da área. Cada malha guarda as células para o `pick`.
 */
export class ChunkBlocks {
  private readonly builds = new Map<string, Build>();
  private readonly solid = new THREE.BoxGeometry(1, 1, 1);
  private readonly thin = new THREE.BoxGeometry(1, 1, 0.5);
  private readonly dummy = new THREE.Object3D();

  constructor(
    private readonly scene: THREE.Object3D,
    private readonly world: BlockWorld,
    private readonly opts: ChunkBlocksOptions,
  ) {}

  get count(): number { return this.builds.size; }

  update(rect: ChunkRect): void {
    let budget = this.opts.maxBuildsPerFrame ?? 2;
    const keep = new Set<string>();
    for (let cy = rect.cy0; cy <= rect.cy1; cy++) {
      for (let cx = rect.cx0; cx <= rect.cx1; cx++) {
        const chunk = this.world.getChunk(cx, cy);
        if (!chunk) continue;
        const key = cx + ',' + cy;
        keep.add(key);
        const old = this.builds.get(key);
        if (old && old.version === chunk.version) continue;
        if (budget <= 0) continue;
        budget--;
        if (old) this.release(old);
        this.builds.set(key, this.build(chunk));
      }
    }
    for (const [key, build] of this.builds) {
      if (keep.has(key)) continue;
      this.release(build);
      this.builds.delete(key);
    }
  }

  private build(chunk: Chunk): Build {
    const x0 = chunk.cx * CHUNK_SIZE;
    const y0 = chunk.cy * CHUNK_SIZE;
    const buckets = new Map<string, { id: BlockId; shape: CubeShape; cells: BlockCell[] }>();
    for (let ly = 0; ly < CHUNK_SIZE; ly++) {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        const x = x0 + lx, y = y0 + ly;
        for (let level = 0; level < MAX_STACK; level++) {
          const id = this.world.getLevel(x, y, level);
          if (!this.opts.isCube(id)) continue;
          const shape = this.opts.classify(this.world, id, x, y, level);
          const key = id + ':' + shape;
          let bucket = buckets.get(key);
          if (!bucket) { bucket = { id, shape, cells: [] }; buckets.set(key, bucket); }
          bucket.cells.push({ x, y, level, id });
        }
      }
    }
    const groups: Group[] = [];
    for (const { id, shape, cells } of buckets.values()) {
      const mesh = new THREE.InstancedMesh(shape === 'thin' ? this.thin : this.solid, this.opts.material(id), cells.length);
      mesh.name = `Mundo: cubo ${id} ${shape} (chunk ${chunk.cx},${chunk.cy})`;
      cells.forEach((cell, i) => {
        const t = this.opts.transform({ x: cell.x, y: cell.y, level: cell.level, shape });
        this.dummy.position.set(t.x, t.y, t.z);
        this.dummy.rotation.set(0, 0, 0);
        this.dummy.scale.set(1, 1, 1);
        this.dummy.updateMatrix();
        mesh.setMatrixAt(i, this.dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.frustumCulled = false;
      mesh.userData.cells = cells;
      this.scene.add(mesh);
      groups.push({ mesh, cells });
    }
    return { version: chunk.version, groups };
  }

  private release(build: Build): void {
    for (const g of build.groups) {
      this.scene.remove(g.mesh);
      g.mesh.dispose();
    }
  }

  /** Malhas clicáveis (para o `pick`). */
  meshes(): THREE.InstancedMesh[] {
    const out: THREE.InstancedMesh[] = [];
    for (const b of this.builds.values()) for (const g of b.groups) out.push(g.mesh);
    return out;
  }

  /** Célula de uma instância atingida pelo raio, ou undefined se a malha não é nossa. */
  cellOf(object: THREE.Object3D, instanceId: number | undefined): BlockCell | undefined {
    return (object.userData.cells as BlockCell[] | undefined)?.[instanceId ?? -1];
  }

  dispose(): void {
    for (const b of this.builds.values()) this.release(b);
    this.builds.clear();
    this.solid.dispose();
    this.thin.dispose();
  }
}
