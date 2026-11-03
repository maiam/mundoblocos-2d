import { Block, type BlockId } from './blocks';

export interface Biome {
  key: 'meadow' | 'sakura' | 'desert' | 'celestial';
  name: string;
  ground: BlockId;
  tree: BlockId;
  /** Densidade base de árvores (0..1) dentro de manchas de floresta. */
  treeDensity: number;
  decorations: BlockId[];
  decoChance: number;
}

/** Biomas construídos só com os materiais da prancha (grama, terra, areia, pedra). */
export const BIOMES: Record<Biome['key'], Biome> = {
  meadow: {
    key: 'meadow', name: 'Campos Verdejantes', ground: Block.GRASS,
    tree: Block.OAK_TREE, treeDensity: 0.22,
    decorations: [Block.TALL_GRASS, Block.TALL_GRASS, Block.FLOWER], decoChance: 0.12,
  },
  sakura: {
    key: 'sakura', name: 'Bosque de Sakura', ground: Block.GRASS,
    tree: Block.SAKURA_TREE, treeDensity: 0.3,
    decorations: [Block.FLOWER, Block.FLOWER, Block.TALL_GRASS], decoChance: 0.12,
  },
  desert: {
    key: 'desert', name: 'Dunas Douradas', ground: Block.SAND,
    tree: Block.CACTUS, treeDensity: 0.06, decorations: [], decoChance: 0,
  },
  celestial: {
    key: 'celestial', name: 'Santuário Celestial', ground: Block.CLOUD_SOLID,
    tree: Block.AIR, treeDensity: 0, decorations: [], decoChance: 0,
  },
};

/** Escolhe o bioma a partir de temperatura e umidade (ambas ~[-1, 1]). */
export function pickBiome(temperature: number, moisture: number): Biome {
  if (temperature > 0.32) return BIOMES.desert;
  if (moisture < -0.18) return BIOMES.sakura;
  return BIOMES.meadow;
}
