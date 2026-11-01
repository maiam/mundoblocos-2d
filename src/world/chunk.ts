import { CHUNK_SIZE } from '../config';
import type { BlockId } from './blocks';

/** Seção 16×16 do mundo. Armazena ids de bloco em linhas (índice = ly * 16 + lx). */
export class Chunk {
  readonly blocks = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE);
  /** True se o jogador alterou algum bloco (chunk não pode ser descartado). */
  modified = false;
  /**
   * Incrementado a cada mudança que afete a aparência (inclusive mudanças em
   * blocos vizinhos na borda). O renderer usa para invalidar o cache.
   */
  version = 0;

  constructor(readonly cx: number, readonly cy: number) {}

  get(lx: number, ly: number): BlockId {
    return this.blocks[ly * CHUNK_SIZE + lx] as BlockId;
  }

  set(lx: number, ly: number, id: BlockId): void {
    this.blocks[ly * CHUNK_SIZE + lx] = id;
    this.modified = true;
    this.version++;
  }
}
