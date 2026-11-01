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
 * Toda leitura/escrita de bloco passa por aqui; regras de quebrar/colocar/andar também.
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
      this.generator.generateChunk(cx, cy, chunk.ground, chunk.objects);
      this.chunks.set(key, chunk);
    }
    return chunk;
  }

  /** Chão da célula. Fora de chunk carregado consulta o gerador (puro). */
  getGround(x: number, y: number): BlockId {
    const chunk = this.chunks.get(chunkKey(toChunk(x), toChunk(y)));
    return chunk ? chunk.getGround(toLocal(x), toLocal(y)) : this.generator.groundAt(x, y);
  }

  /** Objeto da célula (AIR se vazio). */
  getObject(x: number, y: number): BlockId {
    const chunk = this.chunks.get(chunkKey(toChunk(x), toChunk(y)));
    return chunk ? chunk.getObject(toLocal(x), toLocal(y)) : this.generator.objectAt(x, y);
  }

  setObject(x: number, y: number, id: BlockId): void {
    const cx = toChunk(x);
    const cy = toChunk(y);
    const lx = toLocal(x);
    const ly = toLocal(y);
    this.loadChunk(cx, cy).setObject(lx, ly, id);
    // Vizinhos usam esta célula para sombras/bordas.
    if (lx === 0) this.touch(cx - 1, cy);
    if (lx === CHUNK_SIZE - 1) this.touch(cx + 1, cy);
    if (ly === 0) this.touch(cx, cy - 1);
    if (ly === CHUNK_SIZE - 1) this.touch(cx, cy + 1);
  }

  private touch(cx: number, cy: number): void {
    const c = this.getChunk(cx, cy);
    if (c) c.version++;
  }

  biomeAt(x: number, y: number): Biome {
    return this.generator.biomeAt(x, y);
  }

  /** Pode-se ficar de pé na célula? */
  isWalkable(x: number, y: number): boolean {
    if (blockDef(this.getGround(x, y)).liquid) return false;
    return !blockDef(this.getObject(x, y)).solid;
  }

  // ---- Regras de interação (domínio) ----

  canBreak(x: number, y: number): boolean {
    return blockDef(this.getObject(x, y)).breakable;
  }

  /** Remove o objeto da célula. Retorna o id removido ou null. */
  breakBlock(x: number, y: number): BlockId | null {
    const id = this.getObject(x, y);
    if (!blockDef(id).breakable) return null;
    this.setObject(x, y, Block.AIR);
    return id;
  }

  /** Objetos só vão em chão firme e célula sem objeto sólido (enfeites são substituídos). */
  canPlace(x: number, y: number, id: BlockId): boolean {
    const def = blockDef(id);
    if (!def.placeable || def.layer !== 'object') return false;
    if (blockDef(this.getGround(x, y)).liquid) return false;
    const current = blockDef(this.getObject(x, y));
    return current.id === Block.AIR || current.shape === 'decoration';
  }

  placeBlock(x: number, y: number, id: BlockId): boolean {
    if (!this.canPlace(x, y, id)) return false;
    this.setObject(x, y, id);
    return true;
  }

  /**
   * Ponto inicial: procura (em anéis de 24 células) um bioma acolhedor perto da
   * origem e devolve a célula andável mais próxima dele.
   */
  findSpawn(): [number, number] {
    const welcoming = new Set(['meadow', 'sakura', 'enchanted']);
    for (let r = 0; r <= 60; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const x = dx * 24;
          const y = dy * 24;
          if (welcoming.has(this.biomeAt(x, y).key)) return this.nearestWalkable(x, y);
        }
      }
    }
    return this.nearestWalkable(0, 0);
  }

  /** Célula andável (com vizinhos andáveis) mais próxima de (x0, y0), em espiral. */
  nearestWalkable(x0: number, y0: number, maxRadius = 200): [number, number] {
    const ok = (x: number, y: number) =>
      this.isWalkable(x, y) && this.isWalkable(x + 1, y) && this.isWalkable(x - 1, y) &&
      this.isWalkable(x, y + 1) && this.isWalkable(x, y - 1);
    for (let r = 0; r <= maxRadius; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          if (ok(x0 + dx, y0 + dy)) return [x0 + dx, y0 + dy];
        }
      }
    }
    return [x0, y0];
  }

  // ---- Ciclo de vida de chunks ----

  /** Gera até `budget` chunks faltantes no retângulo, do centro para fora. Retorna quantos. */
  ensureChunks(rect: ChunkRect, budget: number): number {
    const ccx = (rect.cx0 + rect.cx1) / 2;
    const ccy = (rect.cy0 + rect.cy1) / 2;
    const missing: [number, number, number][] = [];
    for (let cy = rect.cy0; cy <= rect.cy1; cy++) {
      for (let cx = rect.cx0; cx <= rect.cx1; cx++) {
        if (!this.chunks.has(chunkKey(cx, cy))) missing.push([cx, cy, (cx - ccx) ** 2 + (cy - ccy) ** 2]);
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
