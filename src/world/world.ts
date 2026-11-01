import { CHUNK_SIZE, UNLOAD_MARGIN } from '../config';
import { Block, type BlockId, blockDef } from './blocks';
import type { Biome } from './biomes';
import { Chunk } from './chunk';
import { chunkKey, toChunk, toLocal } from './coords';
import { WorldGenerator } from './generator';

export interface ChunkRect {
  cx0: number;
  cy0: number;
  cx1: number;
  cy1: number;
}

/**
 * Fonte de verdade do estado do mundo: chunks carregados + edições do jogador.
 * Toda leitura/escrita de bloco passa por aqui; regras de quebrar/colocar também.
 */
export class World {
  readonly generator: WorldGenerator;
  private readonly chunks = new Map<string, Chunk>();

  constructor(seed: number) {
    this.generator = new WorldGenerator(seed);
  }

  get seed(): number {
    return this.generator.seed;
  }

  get loadedCount(): number {
    return this.chunks.size;
  }

  getChunk(cx: number, cy: number): Chunk | undefined {
    return this.chunks.get(chunkKey(cx, cy));
  }

  /** Retorna o chunk, gerando-o de forma síncrona se necessário. */
  loadChunk(cx: number, cy: number): Chunk {
    const key = chunkKey(cx, cy);
    let chunk = this.chunks.get(key);
    if (!chunk) {
      chunk = new Chunk(cx, cy);
      this.generator.generateChunk(cx, cy, chunk.blocks);
      this.chunks.set(key, chunk);
    }
    return chunk;
  }

  /**
   * Lê um bloco. Se o chunk não estiver carregado, consulta o gerador (puro)
   * — útil para vizinhos na borda sem forçar carregamento.
   */
  getBlock(x: number, y: number): BlockId {
    const chunk = this.chunks.get(chunkKey(toChunk(x), toChunk(y)));
    if (chunk) return chunk.get(toLocal(x), toLocal(y));
    return this.generator.blockAt(x, y);
  }

  setBlock(x: number, y: number, id: BlockId): void {
    const cx = toChunk(x);
    const cy = toChunk(y);
    const lx = toLocal(x);
    const ly = toLocal(y);
    this.loadChunk(cx, cy).set(lx, ly, id);
    // Bordas: vizinhos dependem deste bloco para contorno/sombra.
    if (lx === 0) this.touch(cx - 1, cy);
    if (lx === CHUNK_SIZE - 1) this.touch(cx + 1, cy);
    if (ly === 0) this.touch(cx, cy - 1);
    if (ly === CHUNK_SIZE - 1) this.touch(cx, cy + 1);
  }

  private touch(cx: number, cy: number): void {
    const c = this.getChunk(cx, cy);
    if (c) c.version++;
  }

  /** Bloco abaixo do terreno natural (para parede de fundo de cavernas). */
  isUnderground(x: number, y: number): boolean {
    return y > this.generator.surfaceY(x);
  }

  biomeAt(x: number): Biome {
    return this.generator.biomeAt(x);
  }

  // ---- Regras de interação (domínio) ----

  canBreak(x: number, y: number): boolean {
    return blockDef(this.getBlock(x, y)).breakable;
  }

  /** Quebra um bloco. Enfeites sem apoio acima também caem. Retorna o id quebrado ou null. */
  breakBlock(x: number, y: number): BlockId | null {
    const id = this.getBlock(x, y);
    if (!blockDef(id).breakable) return null;
    this.setBlock(x, y, this.fillAfterRemoval(x, y));
    const above = this.getBlock(x, y - 1);
    if (blockDef(above).decoration) this.setBlock(x, y - 1, Block.AIR);
    return id;
  }

  canPlace(x: number, y: number, id: BlockId): boolean {
    const def = blockDef(id);
    if (!def.placeable) return false;
    const target = blockDef(this.getBlock(x, y));
    if (target.solid) return false;
    if (def.decoration && !blockDef(this.getBlock(x, y + 1)).solid) return false;
    return true;
  }

  placeBlock(x: number, y: number, id: BlockId): boolean {
    if (!this.canPlace(x, y, id)) return false;
    this.setBlock(x, y, id);
    return true;
  }

  /** Ao remover um bloco abaixo do nível do mar em lago, a água ocupa o espaço. */
  private fillAfterRemoval(x: number, y: number): BlockId {
    const neighbors = [this.getBlock(x, y - 1), this.getBlock(x - 1, y), this.getBlock(x + 1, y)];
    return neighbors.some((n) => blockDef(n).liquid) ? Block.WATER : Block.AIR;
  }

  // ---- Ciclo de vida de chunks ----

  /**
   * Gera até `budget` chunks faltantes dentro do retângulo, priorizando os mais
   * próximos do centro. Retorna quantos foram gerados.
   */
  ensureChunks(rect: ChunkRect, budget: number): number {
    const ccx = (rect.cx0 + rect.cx1) / 2;
    const ccy = (rect.cy0 + rect.cy1) / 2;
    const missing: [number, number, number][] = [];
    for (let cy = rect.cy0; cy <= rect.cy1; cy++) {
      for (let cx = rect.cx0; cx <= rect.cx1; cx++) {
        if (!this.chunks.has(chunkKey(cx, cy))) {
          missing.push([cx, cy, (cx - ccx) ** 2 + (cy - ccy) ** 2]);
        }
      }
    }
    missing.sort((a, b) => a[2] - b[2]);
    const n = Math.min(budget, missing.length);
    for (let i = 0; i < n; i++) this.loadChunk(missing[i][0], missing[i][1]);
    return n;
  }

  /** Descarta chunks não modificados longe da área ativa. Retorna as chaves removidas. */
  unloadFar(rect: ChunkRect): string[] {
    const removed: string[] = [];
    for (const [key, c] of this.chunks) {
      if (c.modified) continue;
      if (
        c.cx < rect.cx0 - UNLOAD_MARGIN || c.cx > rect.cx1 + UNLOAD_MARGIN ||
        c.cy < rect.cy0 - UNLOAD_MARGIN || c.cy > rect.cy1 + UNLOAD_MARGIN
      ) {
        this.chunks.delete(key);
        removed.push(key);
      }
    }
    return removed;
  }

  forEachChunk(fn: (c: Chunk) => void): void {
    for (const c of this.chunks.values()) fn(c);
  }
}
