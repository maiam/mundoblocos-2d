import { CHUNK_SIZE } from '../config';
import { type Biome, BIOMES } from './biomes';
import { Block, type BlockId } from './blocks';
import type { Cell, TerrainSource } from './terrain';

/**
 * Terreno plano: todo o chão é um único bloco; sem `layers` não há objetos. Com `layers` (Santuário, v0.93.143) toda célula tem essas camadas de cubo
 * empilhadas sobre o chão (a 1ª é o nível 0 da pilha, a 2ª o nível 1). Os limites do mundo ficam no `World`.
 */
export class FlatGenerator implements TerrainSource {
  readonly seed: number;
  private readonly cell: Cell;

  constructor(seed: number, ground: BlockId, layers: readonly BlockId[] = [], private readonly biome: Biome = BIOMES.celestial) {
    this.seed = seed >>> 0;
    this.cell = { ground, object: layers[0] ?? Block.AIR, upper: layers[1] ?? Block.AIR };
  }

  cellAt(): Cell {
    return this.cell;
  }

  groundAt(): BlockId {
    return this.cell.ground;
  }

  objectAt(): BlockId {
    return this.cell.object;
  }

  upperAt(): BlockId {
    return this.cell.upper;
  }

  biomeAt(): Biome {
    return this.biome;
  }

  generateChunk(_cx: number, _cy: number, ground: Uint8Array, objects: Uint8Array, upper: Uint8Array): void {
    ground.fill(this.cell.ground, 0, CHUNK_SIZE * CHUNK_SIZE);
    objects.fill(this.cell.object);
    upper.fill(this.cell.upper);
  }
}
