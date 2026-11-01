import { CHUNK_SIZE } from '../config';
import type { BlockId } from './blocks';

/** Seção 16×16 do mundo com duas camadas: chão e objeto (índice = ly * 16 + lx). */
export class Chunk {
  readonly ground = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE);
  readonly objects = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE);
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

  setObject(lx: number, ly: number, id: BlockId): void {
    this.objects[ly * CHUNK_SIZE + lx] = id;
    this.modified = true;
    this.version++;
  }
}
