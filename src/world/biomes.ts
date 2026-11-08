import { Block, type BlockId } from './blocks';

export interface Biome {
  key: 'meadow' | 'sakura' | 'desert' | 'celestial';
  name: string;
  ground: BlockId;
  tree: BlockId;
  /**
   * Outras árvores misturadas à principal (macieiras e bétulas nos Campos) e a fração de cada uma, sorteadas na ordem
   * (a 1ª mantém o sorteio de sempre, então acrescentar uma no fim não muda onde as anteriores caem).
   */
  altTrees?: ReadonlyArray<{ id: BlockId; share: number }>;
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
    altTrees: [{ id: Block.APPLE_TREE, share: 1 / 6 }, { id: Block.BIRCH_TREE, share: 1 / 5 }, { id: Block.SAKURA_TREE, share: 1 / 4 }],
    decorations: [Block.TALL_GRASS, Block.TALL_GRASS, Block.FLOWER], decoChance: 0.12,
  },
  sakura: {
    key: 'sakura', name: 'Bosque de Sakura', ground: Block.GRASS,
    tree: Block.SAKURA_TREE, treeDensity: 0.3,
    altTrees: [{ id: Block.APPLE_TREE, share: 1 / 6 }, { id: Block.BIRCH_TREE, share: 1 / 5 }, { id: Block.OAK_TREE, share: 1 / 4 }],
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

/**
 * Escolhe o bioma a partir de temperatura e umidade (ambas ~[-1, 1]). O mundo da Cidade do Despertar é só de
 * florestas (dono do produto, 2026-11-06): campos e bosques de sakura, com rios, mares e areia nas praias; desde a
 * v0.90.0 as árvores se misturam nos dois (carvalho, bétula, cerejeira e macieira; a principal de cada bioma domina). As Dunas (e o cacto) ficam no projeto para o mundo árido de outra cidade, ligado por portal (ADR 0019).
 * `temperature` fica na assinatura para esses mundos futuros.
 */
export function pickBiome(_temperature: number, moisture: number): Biome {
  if (moisture < -0.18) return BIOMES.sakura;
  return BIOMES.meadow;
}
