/**
 * Registro de blocos — fonte de verdade das PROPRIEDADES DE DOMÍNIO de cada bloco.
 * A aparência (cores/texturas) vive em `src/render/textures.ts`, indexada pelo mesmo id.
 */

export const Block = {
  AIR: 0,
  GRASS: 1,
  DIRT: 2,
  STONE: 3,
  SAND: 4,
  SANDSTONE: 5,
  SNOW: 6,
  ICE: 7,
  WATER: 8,
  LOG: 9,
  LEAVES: 10,
  SAKURA_LEAVES: 11,
  MAGIC_LEAVES: 12,
  COAL_ORE: 13,
  GOLD_ORE: 14,
  MANA_CRYSTAL: 15,
  BEDROCK: 16,
  PLANKS: 17,
  BRICK: 18,
  TALL_GRASS: 19,
  FLOWER: 20,
  GLOW_MUSHROOM: 21,
  CACTUS: 22,
  ENCHANTED_GRASS: 23,
  PINE_LEAVES: 24,
} as const;

export type BlockId = (typeof Block)[keyof typeof Block];

export interface BlockDef {
  id: BlockId;
  /** Nome exibido na UI (pt-BR). */
  name: string;
  /** Ocupa a célula inteira e bloqueia passagem. */
  solid: boolean;
  /** Esconde o fundo atrás dele (usado na iluminação/parede de caverna). */
  opaque: boolean;
  /** Planta/enfeite: não-sólido, precisa de bloco sólido embaixo. */
  decoration: boolean;
  liquid: boolean;
  breakable: boolean;
  /** Aparece na hotbar para ser colocado. */
  placeable: boolean;
  /** Emite brilho próprio (efeito visual + luz em cavernas). */
  glow: boolean;
}

const defaults = {
  solid: true,
  opaque: true,
  decoration: false,
  liquid: false,
  breakable: true,
  placeable: true,
  glow: false,
};

const defs: BlockDef[] = [
  { ...defaults, id: Block.AIR, name: 'Ar', solid: false, opaque: false, breakable: false, placeable: false },
  { ...defaults, id: Block.GRASS, name: 'Grama' },
  { ...defaults, id: Block.DIRT, name: 'Terra' },
  { ...defaults, id: Block.STONE, name: 'Pedra' },
  { ...defaults, id: Block.SAND, name: 'Areia' },
  { ...defaults, id: Block.SANDSTONE, name: 'Arenito' },
  { ...defaults, id: Block.SNOW, name: 'Neve' },
  { ...defaults, id: Block.ICE, name: 'Gelo', opaque: false },
  { ...defaults, id: Block.WATER, name: 'Água', solid: false, opaque: false, liquid: true, breakable: false, placeable: false },
  { ...defaults, id: Block.LOG, name: 'Tronco' },
  { ...defaults, id: Block.LEAVES, name: 'Folhas', opaque: false },
  { ...defaults, id: Block.SAKURA_LEAVES, name: 'Folhas de Sakura', opaque: false },
  { ...defaults, id: Block.MAGIC_LEAVES, name: 'Folhas Encantadas', opaque: false, glow: true },
  { ...defaults, id: Block.COAL_ORE, name: 'Minério de Carvão' },
  { ...defaults, id: Block.GOLD_ORE, name: 'Minério de Ouro' },
  { ...defaults, id: Block.MANA_CRYSTAL, name: 'Cristal de Mana', glow: true },
  { ...defaults, id: Block.BEDROCK, name: 'Rocha-mãe', breakable: false, placeable: false },
  { ...defaults, id: Block.PLANKS, name: 'Tábuas' },
  { ...defaults, id: Block.BRICK, name: 'Tijolos' },
  { ...defaults, id: Block.TALL_GRASS, name: 'Capim', solid: false, opaque: false, decoration: true },
  { ...defaults, id: Block.FLOWER, name: 'Flor', solid: false, opaque: false, decoration: true },
  { ...defaults, id: Block.GLOW_MUSHROOM, name: 'Cogumelo Lumen', solid: false, opaque: false, decoration: true, glow: true },
  { ...defaults, id: Block.CACTUS, name: 'Cacto', opaque: false },
  { ...defaults, id: Block.ENCHANTED_GRASS, name: 'Musgo Encantado' },
  { ...defaults, id: Block.PINE_LEAVES, name: 'Folhas de Pinheiro', opaque: false },
];

/** Tabela indexada por id para acesso O(1). */
export const BLOCKS: readonly BlockDef[] = (() => {
  const table: BlockDef[] = [];
  for (const d of defs) table[d.id] = d;
  return table;
})();

export function blockDef(id: number): BlockDef {
  return BLOCKS[id] ?? BLOCKS[Block.AIR];
}

/** Ids que aparecem na hotbar, na ordem exibida. */
export const HOTBAR_BLOCKS: BlockId[] = [
  Block.GRASS,
  Block.DIRT,
  Block.STONE,
  Block.PLANKS,
  Block.BRICK,
  Block.LOG,
  Block.SAKURA_LEAVES,
  Block.MANA_CRYSTAL,
  Block.SAND,
];
