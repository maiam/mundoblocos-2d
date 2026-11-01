import { CHUNK_SIZE } from '../config';

/** Coordenada de bloco → coordenada de chunk (funciona com negativos). */
export function toChunk(v: number): number {
  return Math.floor(v / CHUNK_SIZE);
}

/** Coordenada de bloco → índice local dentro do chunk (0..15, funciona com negativos). */
export function toLocal(v: number): number {
  return ((v % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
}

export function chunkKey(cx: number, cy: number): string {
  return `${cx},${cy}`;
}
