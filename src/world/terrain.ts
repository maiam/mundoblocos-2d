import type { Biome } from './biomes';
import type { BlockId } from './blocks';

export interface Cell {
  ground: BlockId;
  object: BlockId;
  upper: BlockId;
}

/**
 * Fonte do terreno não editado de um mundo: função PURA de (seed, x, y).
 * Implementada por `WorldGenerator` (mundo principal) e `FlatGenerator` (Santuário).
 */
export interface TerrainSource {
  readonly seed: number;
  cellAt(x: number, y: number): Cell;
  groundAt(x: number, y: number): BlockId;
  objectAt(x: number, y: number): BlockId;
  upperAt(x: number, y: number): BlockId;
  biomeAt(x: number, y: number): Biome;
  generateChunk(cx: number, cy: number, ground: Uint8Array, objects: Uint8Array, upper: Uint8Array): void;
  /** Opcional: preenche os níveis 2 em diante da pilha (paisagens do Santuário com colinas e casas). `levels[0]` e `levels[1]` já vêm de `generateChunk`. */
  generateLevels?(cx: number, cy: number, levels: Uint8Array[]): void;
}
