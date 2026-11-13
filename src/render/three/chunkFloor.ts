import * as THREE from 'three';
import { CHUNK_SIZE } from '../../config';
import type { Chunk } from '../../world/chunk';
import type { ChunkRect } from '../../world/world';

/** O que o chão 3D precisa do `ChunkRenderer` 2D (que continua pintando o chão: Material V2, transições, barrancas, sombras). */
export interface FloorSource {
  beginFrame(): void;
  isFresh(chunk: Chunk): boolean;
  get(chunk: Chunk, allowRender: boolean): HTMLCanvasElement | null;
}
export interface FloorWorld {
  getChunk(cx: number, cy: number): Chunk | null | undefined;
}

interface Tile {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  texture: THREE.CanvasTexture;
  version: number;
}

/**
 * Chão do Mundo no 3D (ADR 0031, M2): um plano de CHUNK_SIZE × CHUNK_SIZE por chunk visível, com a textura do canvas que o
 * `ChunkRenderer` já pinta (ADR 0026: "chão = textura por chunk"; não lê pixels). A textura só sobe à GPU quando a `version`
 * do chunk muda; o número de chunks pintados por quadro é limitado (`maxRendersPerFrame`); chunks fora da área somem e liberam GPU.
 */
export class ChunkFloor {
  private readonly tiles = new Map<string, Tile>();
  private readonly geometry: THREE.PlaneGeometry;

  constructor(
    private readonly scene: THREE.Object3D,
    private readonly world: FloorWorld,
    private readonly source: FloorSource,
    private readonly maxRendersPerFrame = 2,
  ) {
    this.geometry = new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE);
    this.geometry.rotateX(-Math.PI / 2); // topo da textura = norte (−Z)
  }

  get count(): number {
    return this.tiles.size;
  }

  update(rect: ChunkRect): void {
    this.source.beginFrame();
    let budget = this.maxRendersPerFrame;
    const keep = new Set<string>();
    for (let cy = rect.cy0; cy <= rect.cy1; cy++) {
      for (let cx = rect.cx0; cx <= rect.cx1; cx++) {
        const chunk = this.world.getChunk(cx, cy);
        if (!chunk) continue;
        const key = cx + ',' + cy;
        const stale = !this.source.isFresh(chunk);
        const canvas = this.source.get(chunk, stale && budget > 0);
        if (stale && budget > 0) budget--;
        if (!canvas) continue;
        keep.add(key);
        let tile = this.tiles.get(key);
        if (!tile) tile = this.addTile(key, cx, cy, canvas);
        if (tile.texture.image !== canvas) { tile.texture.image = canvas; tile.version = -1; }
        // Só reenvia quando o canvas está atualizado em relação ao chunk (um canvas velho serve até o orçamento dar a vez).
        if (this.source.isFresh(chunk) && tile.version !== chunk.version) {
          tile.texture.needsUpdate = true;
          tile.version = chunk.version;
        }
      }
    }
    for (const [key, tile] of this.tiles) {
      if (keep.has(key)) continue;
      this.removeTile(tile);
      this.tiles.delete(key);
    }
  }

  private addTile(key: string, cx: number, cy: number, canvas: HTMLCanvasElement): Tile {
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = false; // o canvas é potência de 2, mas mipmaps borrariam as bordas entre chunks
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    const mesh = new THREE.Mesh(this.geometry, new THREE.MeshBasicMaterial({ map: texture }));
    mesh.position.set(cx * CHUNK_SIZE + CHUNK_SIZE / 2, 0, cy * CHUNK_SIZE + CHUNK_SIZE / 2);
    mesh.name = 'Mundo: chão ' + key;
    mesh.frustumCulled = false;
    this.scene.add(mesh);
    const tile: Tile = { mesh, texture, version: -1 };
    this.tiles.set(key, tile);
    return tile;
  }

  private removeTile(tile: Tile): void {
    this.scene.remove(tile.mesh);
    tile.mesh.material.dispose();
    tile.texture.dispose();
  }

  /** Contexto restaurado: reenvia as texturas de chão à GPU. */
  reupload(): void {
    for (const tile of this.tiles.values()) tile.texture.needsUpdate = true;
  }

  dispose(): void {
    for (const tile of this.tiles.values()) this.removeTile(tile);
    this.tiles.clear();
    this.geometry.dispose();
  }
}
