/**
 * Registro de blocos — fonte de verdade das PROPRIEDADES DE DOMÍNIO de cada bloco.
 * A aparência vive em `src/render/textures.ts`, indexada pelo mesmo id.
 *
 * Vista superior: cada célula tem uma camada de CHÃO (ground) e até dois níveis de OBJETO.
 * Os materiais (terra, grama, pedra…) usam o mesmo id nas duas camadas: no chão são o piso
 * natural; como objeto, são cubos.
 */

export const Block = {
  AIR: 0,
  // --- só chão ---
  WATER: 6,
  /** Chão quebrado: ninguém pisa; só aceita um bloco novo (que vira piso). */
  HOLE: 8,
  /** Fora dos limites de um mundo limitado: céu aberto, intransponível. */
  VOID: 9,
  // --- materiais (prancha de blocos): cubos colocáveis que também formam o chão ---
  DIRT: 20,
  GRASS: 21,
  TILLED: 22,
  PATH: 23,
  SAND: 24,
  STONE: 25,
  OAK_LOG: 26,
  OAK_PLANKS: 27,
  CACTUS: 31,
  // --- árvores (objeto alto) ---
  OAK_TREE: 40,
  SAKURA_TREE: 41,
  // --- enfeites (não bloqueiam passagem) ---
  TALL_GRASS: 50,
  FLOWER: 51,
  // --- plantação de trigo: 16 estágios consecutivos (60 = semente ... 75 = maduro) ---
  WHEAT_0: 60,
  WHEAT_15: 75,
  // --- Santuário Celestial (prancha "Blocos do Mundo Celestial") ---
  CLOUD_SOLID: 80,
  CLOUD_ETHEREAL: 81,
  MARBLE_CELESTIAL: 82,
  MARBLE_ORNATE: 83,
  STONE_CELESTIAL: 84,
  STONE_GOLDEN: 85,
  GRASS_CELESTIAL: 86,
  GRASS_FLOWERY: 87,
  MOSS_LUMINOUS: 88,
  EARTH_SACRED: 89,
  EARTH_FLORAL: 90,
  EARTH_CULTIVATED: 91,
  WATER_SACRED: 92,
  WATER_CRYSTAL: 93,
  CRYSTAL_LIFE: 94,
  LIGHT_BLOCK: 95,
  WOOD_CELESTIAL: 96,
  FOLIAGE_GOLDEN: 97,
} as const;

/** Número de estágios de crescimento do trigo e primeiro id da sequência. */
export const WHEAT_STAGES = 16;
export const WHEAT_FIRST = 60;

export function isWheat(id: number): boolean {
  return id >= WHEAT_FIRST && id < WHEAT_FIRST + WHEAT_STAGES;
}

/** Estágio 0..15 de um id de trigo. */
export function wheatStage(id: number): number {
  return id - WHEAT_FIRST;
}

export function wheatId(stage: number): BlockId {
  return (WHEAT_FIRST + Math.max(0, Math.min(WHEAT_STAGES - 1, stage))) as BlockId;
}

/** Ids nomeados + estágios intermediários do trigo (61..74). */
export type BlockId = (typeof Block)[keyof typeof Block] | (number & { readonly __wheatStage?: true });

export type BlockLayer = 'ground' | 'object';
/** Como o objeto é desenhado: cubo, árvore alta, enfeite plano ou plantação. */
export type BlockShape = 'flat' | 'cube' | 'tree' | 'decoration' | 'crop';

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
  /** Derivado de madeira, árvore ou planta (o machado só quebra estes). */
  choppable: boolean;
}

const ground = (id: BlockId, name: string, extra: Partial<BlockDef> = {}): BlockDef => ({
  id, name, layer: 'ground', shape: 'flat', solid: false, standable: true, liquid: false,
  breakable: true, placeable: false, glow: false, choppable: false, ...extra,
});
const object = (id: BlockId, name: string, extra: Partial<BlockDef> = {}): BlockDef => ({
  id, name, layer: 'object', shape: 'cube', solid: true, standable: false, liquid: false,
  breakable: true, placeable: true, glow: false, choppable: false, ...extra,
});

const defs: BlockDef[] = [
  { ...object(Block.AIR, 'Vazio'), shape: 'flat', solid: false, breakable: false, placeable: false },
  ground(Block.WATER, 'Água', { liquid: true, standable: false, breakable: false }),
  ground(Block.HOLE, 'Buraco', { standable: false, breakable: false }),
  ground(Block.VOID, 'Céu Aberto', { standable: false, breakable: false }),
  // Materiais: um único id serve de cubo (camada de objeto) e de chão (camada de chão).
  object(Block.DIRT, 'Terra'),
  object(Block.GRASS, 'Terra com Grama'),
  object(Block.TILLED, 'Terra Arada'),
  object(Block.PATH, 'Caminho de Terra'),
  object(Block.SAND, 'Areia'),
  object(Block.STONE, 'Pedra'),
  object(Block.OAK_LOG, 'Tora de Carvalho', { choppable: true }),
  object(Block.OAK_PLANKS, 'Piso de Carvalho', { choppable: true }),
  object(Block.CACTUS, 'Cacto', { placeable: false, choppable: true }),
  object(Block.OAK_TREE, 'Carvalho', { shape: 'tree', placeable: false, choppable: true }),
  object(Block.SAKURA_TREE, 'Cerejeira', { shape: 'tree', placeable: false, choppable: true }),
  object(Block.TALL_GRASS, 'Capim', { shape: 'decoration', solid: false, placeable: false, choppable: true }),
  object(Block.FLOWER, 'Flor', { shape: 'decoration', solid: false, placeable: false, choppable: true }),
  // Santuário Celestial: todos são cubos de construção (as águas são blocos sólidos decorativos).
  object(Block.CLOUD_SOLID, 'Nuvem Sólida'),
  object(Block.CLOUD_ETHEREAL, 'Nuvem Etérea'),
  object(Block.MARBLE_CELESTIAL, 'Mármore Celestial'),
  object(Block.MARBLE_ORNATE, 'Mármore Ornamentado'),
  object(Block.STONE_CELESTIAL, 'Pedra Celestial'),
  object(Block.STONE_GOLDEN, 'Pedra Dourada'),
  object(Block.GRASS_CELESTIAL, 'Grama Celestial'),
  object(Block.GRASS_FLOWERY, 'Grama Florida'),
  object(Block.MOSS_LUMINOUS, 'Musgo Luminoso', { glow: true }),
  object(Block.EARTH_SACRED, 'Terra Sagrada'),
  object(Block.EARTH_FLORAL, 'Terra Floral'),
  object(Block.EARTH_CULTIVATED, 'Terra Cultivada'),
  object(Block.WATER_SACRED, 'Água Sagrada'),
  object(Block.WATER_CRYSTAL, 'Água Cristalina'),
  object(Block.CRYSTAL_LIFE, 'Cristal da Vida', { glow: true }),
  object(Block.LIGHT_BLOCK, 'Bloco de Luz', { glow: true }),
  object(Block.WOOD_CELESTIAL, 'Madeira Celestial'),
  object(Block.FOLIAGE_GOLDEN, 'Folhagem Dourada'),
  // Trigo: não bloqueia passagem, não aceita nada por cima, só entra plantando a semente.
  ...Array.from({ length: WHEAT_STAGES }, (_, s) =>
    object(WHEAT_FIRST + s, s === WHEAT_STAGES - 1 ? 'Trigo Maduro' : 'Trigo em crescimento', {
      shape: 'crop', solid: false, placeable: false, choppable: true,
    })),
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

/** Materiais da prancha de blocos: os únicos blocos de construção (ordem da hotbar). */
export const MATERIALS: BlockId[] = [
  Block.DIRT,
  Block.GRASS,
  Block.TILLED,
  Block.PATH,
  Block.SAND,
  Block.STONE,
  Block.OAK_LOG,
  Block.OAK_PLANKS,
];

/** Blocos do Santuário Celestial, na ordem da prancha (e da hotbar do Santuário). */
export const CELESTIAL_BLOCKS: BlockId[] = [
  Block.CLOUD_SOLID, Block.CLOUD_ETHEREAL, Block.MARBLE_CELESTIAL, Block.MARBLE_ORNATE,
  Block.STONE_CELESTIAL, Block.STONE_GOLDEN, Block.GRASS_CELESTIAL, Block.GRASS_FLOWERY,
  Block.MOSS_LUMINOUS, Block.EARTH_SACRED, Block.EARTH_FLORAL, Block.EARTH_CULTIVATED,
  Block.WATER_SACRED, Block.WATER_CRYSTAL, Block.CRYSTAL_LIFE, Block.LIGHT_BLOCK,
  Block.WOOD_CELESTIAL, Block.FOLIAGE_GOLDEN,
];

/** Ids que aparecem na hotbar, na ordem exibida. */
export const HOTBAR_BLOCKS: BlockId[] = MATERIALS;
