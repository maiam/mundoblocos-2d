import * as THREE from 'three';
import { CHUNK_SIZE } from '../../config';
import type { BlockId } from '../../world/blocks';
import type { Chunk } from '../../world/chunk';
import type { ChunkRect } from '../../world/world';
import type { WallThickness } from '../../world/walls';
import { buildWallArt, WallPieceCache, type WallArtGroup } from '../sanctuaryWallArt';

/** O que as paredes pedem ao mundo: chunks (versão), a pergunta "há parede aqui?" e o bloco da célula. */
export interface WallWorld {
  getChunk(cx: number, cy: number): Chunk | null | undefined;
  isWallAt(x: number, y: number): boolean;
  getObject(x: number, y: number): BlockId;
}

interface Build { version: number; art: WallArtGroup }

/**
 * Paredes do Mundo no 3D (W5, ADR 0027/0031): a mesma arte autotile do Santuário (`buildWallArt`: tampa à altura da parede e frente onde
 * não há parede ao sul), montada por chunk visível e refeita só quando `chunk.version` muda (o `World` avisa os chunks vizinhos nas
 * bordas, então a emenda entre chunks acompanha). As texturas das peças são compartilhadas por todos os chunks (`WallPieceCache`).
 * Porta de parede: troca de quadro na hora (o quadro intermediário da animação é do Santuário; no Mundo fica para depois).
 */
export class ChunkWalls {
  private readonly builds = new Map<string, Build>();
  private readonly cache = new WallPieceCache();
  private generation = 0;

  constructor(
    private readonly scene: THREE.Object3D,
    private readonly world: WallWorld,
    private readonly atlases: ReadonlyMap<BlockId, HTMLImageElement>,
    private readonly thickness: WallThickness,
    private readonly maxBuildsPerFrame = 2,
  ) {}

  get count(): number { return this.builds.size; }

  /** Chegou um atlas (a imagem terminou de carregar): refaz os chunks com paredes. */
  invalidateAll(): void { this.generation++; }

  update(rect: ChunkRect): void {
    let budget = this.maxBuildsPerFrame;
    const keep = new Set<string>();
    for (let cy = rect.cy0; cy <= rect.cy1; cy++) {
      for (let cx = rect.cx0; cx <= rect.cx1; cx++) {
        const chunk = this.world.getChunk(cx, cy);
        if (!chunk) continue;
        const key = cx + ',' + cy;
        keep.add(key);
        const old = this.builds.get(key);
        const stamp = chunk.version * 1000 + this.generation;
        if (old && old.version === stamp) continue;
        if (budget <= 0) continue;
        budget--;
        if (old) this.release(old);
        this.builds.set(key, this.build(cx, cy, stamp));
      }
    }
    for (const [key, b] of this.builds) {
      if (keep.has(key)) continue;
      this.release(b);
      this.builds.delete(key);
    }
  }

  private build(cx: number, cy: number, version: number): Build {
    const bounds = { x0: cx * CHUNK_SIZE, y0: cy * CHUNK_SIZE, x1: (cx + 1) * CHUNK_SIZE - 1, y1: (cy + 1) * CHUNK_SIZE - 1 };
    const art = buildWallArt(this.world, bounds, this.atlases, this.thickness, new Set(), this.cache);
    art.group.name = `Mundo: paredes (chunk ${cx},${cy})`;
    this.scene.add(art.group);
    return { version, art };
  }

  private release(b: Build): void {
    this.scene.remove(b.art.group);
    for (const m of b.art.meshes) m.dispose();
    b.art.dispose();
  }

  /** Malhas clicáveis (para o `pick`). */
  meshes(): THREE.InstancedMesh[] {
    const out: THREE.InstancedMesh[] = [];
    for (const b of this.builds.values()) out.push(...b.art.meshes);
    return out;
  }

  /** Célula da parede atingida pelo raio, ou undefined. */
  cellOf(object: THREE.Object3D, instanceId: number | undefined): { x: number; y: number } | undefined {
    return (object.userData.cells as Array<{ x: number; y: number }> | undefined)?.[instanceId ?? -1];
  }

  dispose(): void {
    for (const b of this.builds.values()) this.release(b);
    this.builds.clear();
    this.cache.dispose();
  }
}
