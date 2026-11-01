import { Block, type BlockId } from './blocks';

export interface Biome {
  key: 'tundra' | 'meadow' | 'sakura' | 'enchanted' | 'desert';
  name: string;
  ground: BlockId;
  /** Chão de lagos/rios (gelo na tundra). */
  water: BlockId;
  tree: BlockId;
  /** Densidade base de árvores (0..1) dentro de manchas de floresta. */
  treeDensity: number;
  decorations: BlockId[];
  decoChance: number;
}

export const BIOMES: Record<Biome['key'], Biome> = {
  tundra: {
    key: 'tundra', name: 'Tundra Gélida', ground: Block.SNOW, water: Block.ICE,
    tree: Block.PINE_TREE, treeDensity: 0.32, decorations: [], decoChance: 0,
  },
  meadow: {
    key: 'meadow', name: 'Campos Verdejantes', ground: Block.GRASS, water: Block.WATER,
    tree: Block.OAK_TREE, treeDensity: 0.22,
    decorations: [Block.TALL_GRASS, Block.TALL_GRASS, Block.FLOWER], decoChance: 0.12,
  },
  sakura: {
    key: 'sakura', name: 'Bosque de Sakura', ground: Block.GRASS, water: Block.WATER,
    tree: Block.SAKURA_TREE, treeDensity: 0.3,
    decorations: [Block.FLOWER, Block.FLOWER, Block.TALL_GRASS], decoChance: 0.12,
  },
  enchanted: {
    key: 'enchanted', name: 'Floresta Encantada', ground: Block.ENCHANTED_GRASS, water: Block.WATER,
    tree: Block.MAGIC_TREE, treeDensity: 0.34,
    decorations: [Block.GLOW_MUSHROOM, Block.TALL_GRASS], decoChance: 0.1,
  },
  desert: {
    key: 'desert', name: 'Dunas Douradas', ground: Block.SAND, water: Block.WATER,
    tree: Block.CACTUS, treeDensity: 0.06, decorations: [], decoChance: 0,
  },
};

/** Escolhe o bioma a partir de temperatura e umidade (ambas ~[-1, 1]). */
export function pickBiome(temperature: number, moisture: number): Biome {
  if (temperature < -0.3) return BIOMES.tundra;
  if (temperature > 0.32) return BIOMES.desert;
  if (moisture > 0.22) return BIOMES.enchanted;
  if (moisture < -0.18) return BIOMES.sakura;
  return BIOMES.meadow;
}
