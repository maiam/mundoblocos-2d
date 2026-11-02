/**
 * Registro de blocos — fonte de verdade das PROPRIEDADES DE DOMÍNIO de cada bloco.
 * A aparência vive em `src/render/textures.ts`, indexada pelo mesmo id.
 *
 * Vista superior: cada célula tem uma camada de CHÃO (ground) e até MAX_STACK (3) níveis de OBJETO.
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
  // --- porta (objeto de 3 níveis de altura; o id guarda o estado) ---
  OAK_DOOR: 28,
  /** Porta aberta: mesma porta, passável. Só existe no mundo (a hotbar coloca a fechada). */
  OAK_DOOR_OPEN: 29,
  CACTUS: 31,
  // --- árvores (objeto alto) ---
  OAK_TREE: 40,
  SAKURA_TREE: 41,
  // --- enfeites (não bloqueiam passagem) ---
  TALL_GRASS: 50,
  FLOWER: 51,
  // --- dungeon (área protegida: nada quebra nem é colocado) ---
  DUNGEON_DIRT: 100,
  DUNGEON_WEB: 101,
  DUNGEON_BONES: 102,
  DUNGEON_MOSS: 103,
  /** Montanha da muralha (sprite grande; bloqueia). */
  DUNGEON_MOUNTAIN: 104,
  DUNGEON_ROCK: 105,
  DUNGEON_EGGS: 106,
  DUNGEON_MUSHROOM: 107,
  DUNGEON_SPIKES: 108,
  DUNGEON_ROOTS: 109,
  /** Parede do labirinto: cubo de pedra escura (variantes por célula). */
  DUNGEON_WALL: 110,
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
/**
 * Como o objeto é desenhado: cubo, árvore alta, enfeite plano, plantação, porta (3 níveis, abre/fecha) ou
 * rocha (sprite de cenário com variantes por célula: montanhas, pedras e blocos decorados da dungeon).
 */
export type BlockShape = 'flat' | 'cube' | 'tree' | 'decoration' | 'crop' | 'door' | 'rock';

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
  /**
   * Material orgânico: 'wood' = madeira e árvores; 'plant' = plantas e derivados (capim, flor, trigo, cacto).
   * Define o que machado (wood + plant) e enxada (só plant) podem quebrar.
   */
  organic: 'wood' | 'plant' | null;
  /** Bloco macio (terra, areia…): o que a pá consegue cavar além das plantas. */
  soft: boolean;
}

const ground = (id: BlockId, name: string, extra: Partial<BlockDef> = {}): BlockDef => ({
  id, name, layer: 'ground', shape: 'flat', solid: false, standable: true, liquid: false,
  breakable: true, placeable: false, glow: false, organic: null, soft: false, ...extra,
});
const object = (id: BlockId, name: string, extra: Partial<BlockDef> = {}): BlockDef => ({
  id, name, layer: 'object', shape: 'cube', solid: true, standable: false, liquid: false,
  breakable: true, placeable: true, glow: false, organic: null, soft: false, ...extra,
});

const defs: BlockDef[] = [
  { ...object(Block.AIR, 'Vazio'), shape: 'flat', solid: false, breakable: false, placeable: false },
  ground(Block.WATER, 'Água', { liquid: true, standable: false, breakable: false }),
  ground(Block.HOLE, 'Buraco', { standable: false, breakable: false }),
  ground(Block.VOID, 'Céu Aberto', { standable: false, breakable: false }),
  // Materiais: um único id serve de cubo (camada de objeto) e de chão (camada de chão).
  object(Block.DIRT, 'Terra', { soft: true }),
  object(Block.GRASS, 'Terra com Grama', { soft: true }),
  object(Block.TILLED, 'Terra Arada', { soft: true }),
  object(Block.PATH, 'Caminho de Terra', { soft: true }),
  object(Block.SAND, 'Areia', { soft: true }),
  object(Block.STONE, 'Pedra'),
  object(Block.OAK_LOG, 'Tora de Carvalho', { organic: 'wood' }),
  object(Block.OAK_PLANKS, 'Piso de Carvalho', { organic: 'wood' }),
  // Porta: ocupa a célula inteira (nada empilha em cima); fechada bloqueia, aberta deixa passar.
  object(Block.OAK_DOOR, 'Porta de Carvalho', { shape: 'door', organic: 'wood' }),
  object(Block.OAK_DOOR_OPEN, 'Porta de Carvalho (aberta)', { shape: 'door', solid: false, placeable: false, organic: 'wood' }),
  object(Block.CACTUS, 'Cacto', { placeable: false, organic: 'plant' }),
  object(Block.OAK_TREE, 'Carvalho', { shape: 'tree', placeable: false, organic: 'wood' }),
  object(Block.SAKURA_TREE, 'Cerejeira', { shape: 'tree', placeable: false, organic: 'wood' }),
  object(Block.TALL_GRASS, 'Capim', { shape: 'decoration', solid: false, placeable: false, organic: 'plant' }),
  object(Block.FLOWER, 'Flor', { shape: 'decoration', solid: false, placeable: false, organic: 'plant' }),
  // Dungeon: chão e cenário fixos (inquebráveis; o World também protege a área inteira).
  ground(Block.DUNGEON_DIRT, 'Chão da Caverna', { breakable: false }),
  ground(Block.DUNGEON_WEB, 'Chão com Teia', { breakable: false }),
  ground(Block.DUNGEON_BONES, 'Chão com Ossos', { breakable: false }),
  ground(Block.DUNGEON_MOSS, 'Chão com Musgo', { breakable: false }),
  ...([
    [Block.DUNGEON_MOUNTAIN, 'Montanha'], [Block.DUNGEON_ROCK, 'Rocha'], [Block.DUNGEON_EGGS, 'Ninho de Ovos'],
    [Block.DUNGEON_MUSHROOM, 'Cogumelos'], [Block.DUNGEON_SPIKES, 'Espinhos de Pedra'], [Block.DUNGEON_ROOTS, 'Raízes'],
    [Block.DUNGEON_WALL, 'Parede da Caverna'],
  ] as const).map(([id, name]) => object(id, name, { shape: 'rock', breakable: false, placeable: false })),
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
      shape: 'crop', solid: false, placeable: false, organic: 'plant',
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

/** Ids que aparecem na hotbar, na ordem exibida: materiais + porta. */
export const HOTBAR_BLOCKS: BlockId[] = [...MATERIALS, Block.OAK_DOOR];

/** Porta (aberta ou fechada)? */
export function isDoor(id: BlockId): boolean {
  return id === Block.OAK_DOOR || id === Block.OAK_DOOR_OPEN;
}
