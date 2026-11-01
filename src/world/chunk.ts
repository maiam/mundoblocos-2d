import { CHUNK_SIZE } from '../config';
import type { BlockId } from './blocks';

/**
 * Seção 16×16 do mundo com três camadas (índice = ly * 16 + lx):
 * chão, objeto (nível 0) e cubo empilhado (nível 1).
 */
export class Chunk {
  readonly ground = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE);
  readonly objects = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE);
  readonly upper = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE);
  /** True se o jogador alterou algo (chunk não pode ser descartado). */
  modified = false;
  /** Incrementado a cada mudança visível (inclusive vizinhos na borda); invalida caches. */
  version = 0;

  constructor(readonly cx: number, readonly cy: number) {}

  getGround(lx: number, ly: number): BlockId {
    return this.ground[ly * CHUNK_SIZE + lx] as BlockId;
  }

  getObject(lx: number, ly: number): BlockId {
    return this.objects[ly * CHUNK_SIZE + lx] as BlockId;
  }

  getUpper(lx: number, ly: number): BlockId {
    return this.upper[ly * CHUNK_SIZE + lx] as BlockId;
  }

  /** Define o chão (buraco ao quebrar, ou cubo usado como piso). */
  setGround(lx: number, ly: number, id: BlockId): void {
    this.ground[ly * CHUNK_SIZE + lx] = id;
    this.modified = true;
    this.version++;
  }

  /** Define o bloco do nível 0 ou 1 da célula. */
  setLevel(lx: number, ly: number, level: 0 | 1, id: BlockId): void {
    (level === 0 ? this.objects : this.upper)[ly * CHUNK_SIZE + lx] = id;
    this.modified = true;
    this.version++;
  }
}
