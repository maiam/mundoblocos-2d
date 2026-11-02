import { CHUNK_SIZE } from '../config';
import { type Biome, BIOMES } from './biomes';
import { Block, type BlockId } from './blocks';
import type { Cell, TerrainSource } from './terrain';

/**
 * Terreno plano: todo o chão é um único bloco e não há objetos. Usado pelo
 * Santuário Celestial (chão de Nuvem Sólida). Os limites do mundo ficam no `World`.
 */
export class FlatGenerator implements TerrainSource {
  readonly seed: number;
  private readonly cell: Cell;

  constructor(seed: number, ground: BlockId, private readonly biome: Biome = BIOMES.celestial) {
    this.seed = seed >>> 0;
    this.cell = { ground, object: Block.AIR, upper: Block.AIR };
  }

  cellAt(): Cell {
    return this.cell;
  }

  groundAt(): BlockId {
    return this.cell.ground;
  }

  objectAt(): BlockId {
    return Block.AIR;
  }

  upperAt(): BlockId {
    return Block.AIR;
  }

  biomeAt(): Biome {
    return this.biome;
  }

  generateChunk(_cx: number, _cy: number, ground: Uint8Array, objects: Uint8Array, upper: Uint8Array): void {
    ground.fill(this.cell.ground, 0, CHUNK_SIZE * CHUNK_SIZE);
    objects.fill(Block.AIR);
    upper.fill(Block.AIR);
  }
}
