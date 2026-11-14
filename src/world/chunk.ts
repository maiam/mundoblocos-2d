import { CHUNK_SIZE, MAX_STACK } from '../config';
import type { BlockId } from './blocks';

/** Nível de pilha de uma célula: 0 = objeto apoiado no chão, até MAX_STACK - 1. */
export type Level = number;

/**
 * Seção 16×16 do mundo (índice = ly * 16 + lx): chão + MAX_STACK níveis de objeto
 * (nível 0 = objeto no chão; níveis acima = cubos empilhados).
 */
export class Chunk {
  readonly ground = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE);
  /** Um array por nível de pilha. */
  readonly levels: Uint8Array[];
  /** True se o jogador alterou algo (chunk não pode ser descartado). */
  modified = false;
  /** Incrementado a cada mudança visível (inclusive vizinhos na borda); invalida caches. */
  version = 0;

  constructor(readonly cx: number, readonly cy: number, readonly maxStack: number = MAX_STACK) {
    this.levels = Array.from({ length: maxStack }, () => new Uint8Array(CHUNK_SIZE * CHUNK_SIZE));
  }

  /** Nível 0 (preenchido pelo gerador). */
  get objects(): Uint8Array {
    return this.levels[0];
  }

  /** Nível 1 (preenchido pelo gerador: montanhas altas). */
  get upper(): Uint8Array {
    return this.levels[1];
  }

  getGround(lx: number, ly: number): BlockId {
    return this.ground[ly * CHUNK_SIZE + lx] as BlockId;
  }

  getObject(lx: number, ly: number): BlockId {
    return this.levels[0][ly * CHUNK_SIZE + lx] as BlockId;
  }

  getLevel(lx: number, ly: number, level: Level): BlockId {
    return this.levels[level][ly * CHUNK_SIZE + lx] as BlockId;
  }

  /** Quantos níveis ocupados há na célula (contínuos a partir do 0). */
  filledLevels(lx: number, ly: number): number {
    let n = 0;
    while (n < this.levels.length && this.levels[n][ly * CHUNK_SIZE + lx] !== 0) n++;
    return n;
  }

  /** Define o chão (buraco ao quebrar, ou cubo usado como piso). */
  setGround(lx: number, ly: number, id: BlockId): void {
    this.ground[ly * CHUNK_SIZE + lx] = id;
    this.modified = true;
    this.version++;
  }

  /** Define o bloco de um nível da célula. */
  setLevel(lx: number, ly: number, level: Level, id: BlockId): void {
    this.levels[level][ly * CHUNK_SIZE + lx] = id;
    this.modified = true;
    this.version++;
  }
}
