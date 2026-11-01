/**
 * Registro de blocos — fonte de verdade das PROPRIEDADES DE DOMÍNIO de cada bloco.
 * A aparência vive em `src/render/textures.ts`, indexada pelo mesmo id.
 *
 * Vista superior: cada célula tem uma camada de CHÃO (ground) e uma de OBJETO (object).
 */

export const Block = {
  AIR: 0,
  // --- chão ---
  GRASS: 1,
  ENCHANTED_GRASS: 2,
  SAND: 3,
  SNOW: 4,
  DIRT: 5,
  WATER: 6,
  ICE: 7,
  /** Chão quebrado: ninguém pisa; só aceita um bloco novo (que vira piso). */
  HOLE: 8,
  // --- objetos (cubos) ---
  STONE: 20,
  COAL_ORE: 21,
  GOLD_ORE: 22,
  MANA_CRYSTAL: 23,
  SANDSTONE: 24,
  LOG: 25,
  PLANKS: 26,
  BRICK: 27,
  LEAVES: 28,
  SAKURA_LEAVES: 29,
  MAGIC_LEAVES: 30,
  CACTUS: 31,
  // --- árvores (objeto alto) ---
  OAK_TREE: 40,
  SAKURA_TREE: 41,
  MAGIC_TREE: 42,
  PINE_TREE: 43,
  // --- enfeites (não bloqueiam passagem) ---
  TALL_GRASS: 50,
  FLOWER: 51,
  GLOW_MUSHROOM: 52,
} as const;

export type BlockId = (typeof Block)[keyof typeof Block];

export type BlockLayer = 'ground' | 'object';
/** Como o objeto é desenhado: cubo, árvore alta ou enfeite plano. */
export type BlockShape = 'flat' | 'cube' | 'tree' | 'decoration';

export interface BlockDef {
  id: BlockId;
  /** Nome exibido na UI (pt-BR). */
  name: string;
  layer: BlockLayer;
  shape: BlockShape;
  /** Objeto: bloqueia passagem quando `solid`. */
  solid: boolean;
  /** Chão: personagens/animais podem ficar sobre ele. */
  standable: boolean;
  liquid: boolean;
  breakable: boolean;
  /** Aparece na hotbar para ser colocado. */
  placeable: boolean;
  /** Emite brilho próprio. */
  glow: boolean;
}

const ground = (id: BlockId, name: string, extra: Partial<BlockDef> = {}): BlockDef => ({
  id, name, layer: 'ground', shape: 'flat', solid: false, standable: true, liquid: false,
  breakable: true, placeable: false, glow: false, ...extra,
});
const object = (id: BlockId, name: string, extra: Partial<BlockDef> = {}): BlockDef => ({
  id, name, layer: 'object', shape: 'cube', solid: true, standable: false, liquid: false,
  breakable: true, placeable: true, glow: false, ...extra,
});

const defs: BlockDef[] = [
  { ...object(Block.AIR, 'Vazio'), shape: 'flat', solid: false, breakable: false, placeable: false },
  ground(Block.GRASS, 'Grama'),
  ground(Block.ENCHANTED_GRASS, 'Musgo Encantado'),
  ground(Block.SAND, 'Areia'),
  ground(Block.SNOW, 'Neve'),
  ground(Block.DIRT, 'Terra'),
  ground(Block.WATER, 'Água', { liquid: true, standable: false, breakable: false }),
  ground(Block.ICE, 'Gelo'),
  ground(Block.HOLE, 'Buraco', { standable: false, breakable: false }),
  object(Block.STONE, 'Pedra'),
  object(Block.COAL_ORE, 'Minério de Carvão', { placeable: false }),
  object(Block.GOLD_ORE, 'Minério de Ouro', { placeable: false }),
  object(Block.MANA_CRYSTAL, 'Cristal de Mana', { glow: true }),
  object(Block.SANDSTONE, 'Arenito'),
  object(Block.LOG, 'Tronco'),
  object(Block.PLANKS, 'Tábuas'),
  object(Block.BRICK, 'Tijolos'),
  object(Block.LEAVES, 'Arbusto'),
  object(Block.SAKURA_LEAVES, 'Arbusto de Sakura'),
  object(Block.MAGIC_LEAVES, 'Arbusto Encantado', { glow: true }),
  object(Block.CACTUS, 'Cacto', { placeable: false }),
  object(Block.OAK_TREE, 'Carvalho', { shape: 'tree', placeable: false }),
  object(Block.SAKURA_TREE, 'Cerejeira', { shape: 'tree', placeable: false }),
  object(Block.MAGIC_TREE, 'Árvore Encantada', { shape: 'tree', placeable: false, glow: true }),
  object(Block.PINE_TREE, 'Pinheiro', { shape: 'tree', placeable: false }),
  object(Block.TALL_GRASS, 'Capim', { shape: 'decoration', solid: false, placeable: false }),
  object(Block.FLOWER, 'Flor', { shape: 'decoration', solid: false }),
  object(Block.GLOW_MUSHROOM, 'Cogumelo Lumen', { shape: 'decoration', solid: false, placeable: false, glow: true }),
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

export const ALL_BLOCK_IDS: readonly BlockId[] = defs.map((d) => d.id);

/** Ids que aparecem na hotbar, na ordem exibida. */
export const HOTBAR_BLOCKS: BlockId[] = [
  Block.STONE,
  Block.PLANKS,
  Block.BRICK,
  Block.LOG,
  Block.LEAVES,
  Block.SAKURA_LEAVES,
  Block.MAGIC_LEAVES,
  Block.MANA_CRYSTAL,
  Block.FLOWER,
];
