import { Block, type BlockId } from './blocks';

export type TreeShape = 'round' | 'pine' | 'cactus' | 'none';

export interface Biome {
  key: 'tundra' | 'meadow' | 'sakura' | 'enchanted' | 'desert';
  name: string;
  surface: BlockId;
  subsurface: BlockId;
  treeShape: TreeShape;
  treeLeaves: BlockId;
  /** Chance (0..1) de uma célula de 5 colunas conter árvore. */
  treeChance: number;
  /** Enfeites possíveis sobre a superfície e chance por coluna. */
  decorations: BlockId[];
  decoChance: number;
}

export const BIOMES: Record<Biome['key'], Biome> = {
  tundra: {
    key: 'tundra', name: 'Tundra Gélida',
    surface: Block.SNOW, subsurface: Block.DIRT,
    treeShape: 'pine', treeLeaves: Block.PINE_LEAVES, treeChance: 0.45,
    decorations: [], decoChance: 0,
  },
  meadow: {
    key: 'meadow', name: 'Campos Verdejantes',
    surface: Block.GRASS, subsurface: Block.DIRT,
    treeShape: 'round', treeLeaves: Block.LEAVES, treeChance: 0.35,
    decorations: [Block.TALL_GRASS, Block.TALL_GRASS, Block.FLOWER], decoChance: 0.45,
  },
  sakura: {
    key: 'sakura', name: 'Bosque de Sakura',
    surface: Block.GRASS, subsurface: Block.DIRT,
    treeShape: 'round', treeLeaves: Block.SAKURA_LEAVES, treeChance: 0.6,
    decorations: [Block.FLOWER, Block.TALL_GRASS], decoChance: 0.4,
  },
  enchanted: {
    key: 'enchanted', name: 'Floresta Encantada',
    surface: Block.ENCHANTED_GRASS, subsurface: Block.DIRT,
    treeShape: 'round', treeLeaves: Block.MAGIC_LEAVES, treeChance: 0.55,
    decorations: [Block.GLOW_MUSHROOM, Block.TALL_GRASS], decoChance: 0.35,
  },
  desert: {
    key: 'desert', name: 'Dunas Douradas',
    surface: Block.SAND, subsurface: Block.SANDSTONE,
    treeShape: 'cactus', treeLeaves: Block.AIR, treeChance: 0.3,
    decorations: [], decoChance: 0,
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
