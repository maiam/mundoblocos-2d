/**
 * Registro de blocos — fonte de verdade das PROPRIEDADES DE DOMÍNIO de cada bloco.
 * A aparência vive em `src/render/textures.ts`, indexada pelo mesmo id.
 *
 * Vista superior: cada célula tem uma camada de CHÃO (ground) e até MAX_STACK (2) níveis de OBJETO.
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
  /** Pedra Bruta (pedra padrão do mundo). */
  STONE: 25,
  OAK_LOG: 26,
  OAK_PLANKS: 27,
  /** Madeira de cerejeira (v0.88.0): tora (da Cerejeira derrubada) e tábuas (da tora). */
  CHERRY_LOG: 230,
  CHERRY_PLANKS: 231,
  /** Madeira de bétula (v0.89.0): tora (da Bétula derrubada) e tábuas (da tora). */
  BIRCH_LOG: 232,
  BIRCH_PLANKS: 233,
  // --- paredes (ADR 0027, v0.93.15): bloco de nível único, sólido, altura de `WORLD_SCALE.wall`; forma por autotile (`world/walls.ts`) ---
  /** Parede de Tábuas (madeira; o machado quebra). Sem receita nem perfil ainda (arte e render vêm na W1/W3). */
  WALL_PLANKS: 240,
  /** Parede de Pedra (a picareta quebra). */
  WALL_STONE: 241,
  /** Porta de parede (v0.93.25): bloco dentro de uma fileira leste–oeste, entre duas paredes; o id guarda o estado (fechada sólida, aberta passável). */
  WALL_DOOR_PLANKS: 242,
  WALL_DOOR_PLANKS_OPEN: 243,
  // --- porta (objeto de 3 níveis de altura; o id guarda o estado) ---
  OAK_DOOR: 28,
  /** Porta aberta: mesma porta, passável. Só existe no mundo (a hotbar coloca a fechada). */
  OAK_DOOR_OPEN: 29,
  /** Tenda: ponto de renascer (criada por receita). */
  TENT: 30,
  /** Parte da tenda 2×2 (as 3 células além do canto inferior esquerdo, onde fica `TENT`): bloqueia, sem arte. */
  TENT_PART: 32,
  /** Baú de Carvalho: guarda 27 pilhas (conteúdo no World). */
  CHEST: 33,
  CACTUS: 31,
  // --- objetos de cozinha (por receita; cozinhar vem com a comida, Fase P entrega 4) ---
  /** Fogueira (3 Toras). */
  CAMPFIRE: 43,
  /** Caldeirão de Pedra (3 Pedras + 1 Fogueira). */
  CAULDRON: 44,
  /** Forno de Pedra (6 Pedras). */
  OVEN: 45,
  // --- móveis (por receita) ---
  /** Cadeira de Madeira (4 Tábuas). */
  CHAIR: 46,
  /** Pedregulho solto no mundo (arte da prancha de pedras, variante por célula); minerado solta Pedra Bruta. */
  ROCK_BOULDER: 47,
  // --- cerca de tábuas (por receita; o render emenda cada célula com as cercas/portões vizinhos) ---
  /** Cerca de Madeira: bloqueia a passagem (cercados para animais). */
  FENCE: 48,
  /** Portão da cerca, fechado (o id guarda o estado, como a porta). */
  FENCE_GATE: 49,
  /** Portão aberto: passável. Só existe no mundo (a bolsa coloca o fechado). */
  FENCE_GATE_OPEN: 76,
  // --- variações de pedra (prancha de pedras; por receita ou, no futuro, em construções prontas) ---
  STONE_COBBLE: 34,
  STONE_BRICK: 35,
  STONE_FLOOR: 36,
  STONE_SMOOTH: 37,
  STONE_POLISHED: 38,
  STONE_CRACKED: 39,
  STONE_BRICK_CRACKED: 42,

  // --- árvores (objeto alto) ---
  OAK_TREE: 40,
  SAKURA_TREE: 41,
  /** Bétula (v0.89.0): mistura-se aos carvalhos dos Campos. */
  BIRCH_TREE: 59,
  // --- estágios de crescimento APOSENTADOS (v0.88.0: as árvores só aparecem adultas): ids reservados, ver `GROWTH_STAGE_ADULT` ---
  OAK_SAPLING: 52,
  OAK_YOUNG: 53,
  OAK_GROWING: 54,
  APPLE_SAPLING: 55,
  APPLE_YOUNG: 56,
  /** Macieira adulta com maçãs (tocar colhe). */
  APPLE_TREE: 57,
  /** Macieira adulta já colhida: florida, as maçãs voltam com o tempo. */
  APPLE_TREE_BARE: 58,
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
  /** Entrada do Covil das Aranhas no mundo (arte da caverna; base 5 × 3, as outras células são `TOWN_PART`). */
  DUNGEON_CAVE: 111,
  // --- Cidade do Despertar (área protegida: construções fixas, nada quebra nem é colocado) ---
  /** Célula ocupada por uma construção além do canto inferior esquerdo (onde fica o id dela): bloqueia, sem arte. */
  TOWN_PART: 120,
  CASTLE: 121,
  GUILD: 122,
  INN: 123,
  SMITHY: 124,
  SHOP_POTION: 125,
  SHOP_GOODS: 126,
  SHOP_TOOLS: 127,
  /** Casa térrea 5×5 (a última fileira fica livre: quintal atrás do telhado). */
  HOUSE: 128,
  /** Casa de 2 andares 5×5. */
  HOUSE_TALL: 129,
  WATCHTOWER: 132,
  WELL: 133,
  FOUNTAIN: 134,
  LAMP: 135,
  /** Banco de madeira 2×1 e 3×1. */
  BENCH: 136,
  BENCH_LONG: 142,
  BARREL: 137,
  CRATES: 138,
  SIGNPOST: 139,
  HEDGE: 140,
  STALL: 141,
  // --- Vila Camponesa (v0.93.89, `docs/domains/village.md`; só no Mundo principal, área protegida). Todos `building`: o id fica na célula do
  //     canto inferior esquerdo da peça e o resto do lote é `TOWN_PART` (`world/village.ts`, `VILLAGE_SIZES`). ---
  V_HOUSE_STRAW: 112,
  V_HOUSE_TILE: 113,
  V_BARN: 114,
  V_COOP: 115,
  V_WELL: 116,
  V_BENCH: 117,
  V_BED_WHEAT: 118,
  V_BED_VEG: 119,
  V_OAK: 143,
  V_TREE: 144,
  /** Estaca alta do muro da vila: 1 célula de largura (4 estacas) × 1,5 de altura (16 × 24 px); só o gerador a põe. */
  V_STAKE: 145,
  /** Portão aberto (duas colunas com lampião; o vão entre elas fica livre). */
  V_GATE: 209,
  V_BARREL: 226,
  V_ROCKS: 227,
  V_BUSH: 228,
  V_LOGS: 229,
  V_HAY: 234,
  V_CART: 235,
  V_SACKS: 236,
  /** Capim e flores (enfeite que não bloqueia). */
  V_FLOWERS: 237,
  /** Portão da vila fechado (os dois postes e as folhas). Abre e fecha com um toque; os 8 blocos da peça mudam juntos (`World.toggleDoor`). */
  V_GATE_CLOSED: 238,
  /** Os 6 blocos do vão entre os postes: livres com o portão aberto, sólidos com ele fechado (sem arte própria: o desenho é do portão). */
  V_GATE_GAP: 239,
  V_GATE_GAP_CLOSED: 254,
  /** Cerca de Estacas (v0.93.90): 1 célula × 1 de altura (16 × 16 px), 4 estacas; o jogador fabrica (1 Tora → 4) e coloca. */
  FENCE_STAKE: 244,
  // --- plantação de trigo: 16 estágios consecutivos (60 = semente ... 75 = maduro) ---
  WHEAT_0: 60,
  WHEAT_15: 75,
  // --- hortaliças: 16 estágios consecutivos cada (plantadas pelo próprio legume; ver CROPS) ---
  POTATO_0: 150,
  TOMATO_0: 170,
  CARROT_0: 190,
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
  /** Água Pura: bloco 3D azul com textura aquática em todas as faces; exclusivo do Santuário. */
  WATER_PURE: 98,
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

/** Culturas da plantação: todas com 16 estágios consecutivos a partir de `first` (o último = maduro). */
export type CropKind = 'wheat' | 'potato' | 'tomato' | 'carrot';
export const CROP_STAGES = 16;
export const CROPS: Readonly<Record<CropKind, { first: number; name: string; ripe: string }>> = {
  wheat: { first: WHEAT_FIRST, name: 'Trigo', ripe: 'Trigo Maduro' },
  potato: { first: Block.POTATO_0, name: 'Batata', ripe: 'Batata Madura' },
  tomato: { first: Block.TOMATO_0, name: 'Tomate', ripe: 'Tomate Maduro' },
  carrot: { first: Block.CARROT_0, name: 'Cenoura', ripe: 'Cenoura Madura' },
};
export const CROP_KINDS = Object.keys(CROPS) as CropKind[];

/** Cultura de um id (null = não é plantação). */
export function cropKind(id: number): CropKind | null {
  for (const k of CROP_KINDS) if (id >= CROPS[k].first && id < CROPS[k].first + CROP_STAGES) return k;
  return null;
}

export function isCrop(id: number): boolean {
  return cropKind(id) !== null;
}

/** Estágio 0..15 de um id de plantação (o chamador garante que é plantação). */
export function cropStage(id: number): number {
  return id - CROPS[cropKind(id)!].first;
}

export function cropId(kind: CropKind, stage: number): BlockId {
  return (CROPS[kind].first + Math.max(0, Math.min(CROP_STAGES - 1, stage))) as BlockId;
}

/** Primeiro estágio de alguma cultura (o que se planta)? */
export function isCropSeedling(id: number): boolean {
  return CROP_KINDS.some((k) => CROPS[k].first === id);
}

/** Ids nomeados + estágios intermediários das plantações. */
export type BlockId = (typeof Block)[keyof typeof Block] | (number & { readonly __wheatStage?: true });

export type BlockLayer = 'ground' | 'object';
/**
 * Como o objeto é desenhado: cubo, árvore alta, enfeite plano, plantação, porta (3 níveis, abre/fecha) ou
 * rocha (sprite de cenário com variantes por célula: montanhas, pedras e blocos decorados da dungeon) ou
 * construção (sprite de várias células da cidade, com sombra própria; as outras células são `TOWN_PART`).
 */
export type BlockShape = 'flat' | 'cube' | 'tree' | 'decoration' | 'crop' | 'door' | 'fence' | 'rock' | 'building' | 'wall' | 'wall-door';

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
  /** Bloco de pedra (Pedra Bruta e variações): serve de batente de porta, como a madeira. */
  stone: boolean;
  /** Assento: dá para sentar (cadeira, banco da cidade — `World.seatAt`). */
  seat?: boolean;
}

const ground = (id: BlockId, name: string, extra: Partial<BlockDef> = {}): BlockDef => ({
  id, name, layer: 'ground', shape: 'flat', solid: false, standable: true, liquid: false,
  breakable: true, placeable: false, glow: false, organic: null, soft: false, stone: false, ...extra,
});
const object = (id: BlockId, name: string, extra: Partial<BlockDef> = {}): BlockDef => ({
  id, name, layer: 'object', shape: 'cube', solid: true, standable: false, liquid: false,
  breakable: true, placeable: true, glow: false, organic: null, soft: false, stone: false, ...extra,
});

/**
 * Ids que já foram **paredes** (210–225) e saíram do jogo (dono do produto, 2026-11-08: "não precisamos mais delas").
 * Não existem mais definições, receitas nem arte; em dados salvos (mapa, bolsa, baú, hotbar) esses ids viram vazio.
 * Nenhum bloco novo deve reusar essa faixa enquanto houver mundos e salas antigos por aí.
 */
export const REMOVED_BLOCK_FIRST = 210;
export const REMOVED_BLOCK_LAST = 225;

/** Bloco que saiu do jogo (as antigas paredes)? */
export function isRemovedBlock(id: number): boolean {
  return (id >= REMOVED_BLOCK_FIRST && id <= REMOVED_BLOCK_LAST) || (id >= PILOT_SLAB_FIRST && id <= PILOT_SLAB_LAST);
}

/**
 * Ids 250–252: as três lajes de Carvalho do piloto `?tabua=laje` (v0.93.72–75), aposentadas quando a regra de blocos de 1/4 virou
 * oficial (ADR 0033: qualquer bloco tem 1/4 de altura e empilha até 4). Em dados salvos viram vazio, como as antigas paredes.
 */
export const PILOT_SLAB_FIRST = 250;
export const PILOT_SLAB_LAST = 252;

/**
 * Bloco de construção que segue a regra de 1/4 de célula (ADR 0033): cubo colocável (pedras, madeiras, tijolos…). O cacto também é um
 * "cubo" no mapa, mas é planta gerada e não empilha: continua um obstáculo de célula cheia.
 */
export function isStackBlock(id: number): boolean {
  const d = blockDef(id);
  return d.layer === 'object' && d.shape === 'cube' && d.placeable;
}

/** Pilha de inventário (`block:<id>`) de um bloco que saiu do jogo? */
export function isRemovedStack(stack: string): boolean {
  if (RETIRED_ITEMS.has(stack)) return true;
  const m = /^block:(\d+)$/.exec(stack);
  return m !== null && isRemovedBlock(Number(m[1]));
}

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
  object(Block.STONE, 'Pedra Bruta', { stone: true }),
  object(Block.STONE_COBBLE, 'Pedra Irregular', { stone: true }),
  object(Block.STONE_BRICK, 'Tijolo de Pedra', { stone: true }),
  object(Block.STONE_FLOOR, 'Chão de Pedra', { stone: true }),
  object(Block.STONE_SMOOTH, 'Pedra Lisa', { stone: true }),
  object(Block.STONE_POLISHED, 'Pedra Polida', { stone: true }),
  object(Block.STONE_CRACKED, 'Pedra Rachada', { stone: true }),
  object(Block.STONE_BRICK_CRACKED, 'Tijolo de Pedra Rachado', { stone: true }),

  object(Block.OAK_LOG, 'Tora de Carvalho', { organic: 'wood' }),
  object(Block.OAK_PLANKS, 'Tábua de Carvalho', { organic: 'wood' }),
  object(Block.CHERRY_LOG, 'Tora de Cerejeira', { organic: 'wood' }),
  object(Block.CHERRY_PLANKS, 'Tábua de Cerejeira', { organic: 'wood' }),
  object(Block.BIRCH_LOG, 'Tora de Bétula', { organic: 'wood' }),
  object(Block.BIRCH_PLANKS, 'Tábua de Bétula', { organic: 'wood' }),
  // Porta: ocupa a célula inteira (nada empilha em cima); fechada bloqueia, aberta deixa passar.
  object(Block.WALL_PLANKS, 'Parede de Tábuas', { shape: 'wall', organic: 'wood' }),
  object(Block.WALL_STONE, 'Parede de Pedra', { shape: 'wall', stone: true }),
  object(Block.WALL_DOOR_PLANKS, 'Porta de Parede (Tábuas)', { shape: 'wall-door', organic: 'wood' }),
  object(Block.WALL_DOOR_PLANKS_OPEN, 'Porta de Parede (Tábuas, aberta)', { shape: 'wall-door', solid: false, placeable: false, organic: 'wood' }),
  object(Block.OAK_DOOR, 'Porta de Carvalho', { shape: 'door', organic: 'wood' }),
  object(Block.TENT, 'Tenda', { shape: 'rock', organic: 'wood' }), // madeira: o machado quebra
  object(Block.TENT_PART, 'Tenda', { shape: 'rock', placeable: false, organic: 'wood' }),
  object(Block.CHEST, 'Baú de Carvalho', { shape: 'rock', organic: 'wood' }),
  object(Block.ROCK_BOULDER, 'Pedregulho', { shape: 'rock', placeable: false }),
  object(Block.CHAIR, 'Cadeira de Madeira', { shape: 'rock', organic: 'wood', seat: true }), // madeira: o machado desmonta
  object(Block.CAMPFIRE, 'Fogueira', { shape: 'rock', organic: 'wood', glow: true }), // madeira: o machado desmonta
  object(Block.CAULDRON, 'Caldeirão de Pedra', { shape: 'rock', stone: true, glow: true }),
  object(Block.OVEN, 'Forno de Pedra', { shape: 'rock', stone: true, glow: true }),
  object(Block.OAK_DOOR_OPEN, 'Porta de Carvalho (aberta)', { shape: 'door', solid: false, placeable: false, organic: 'wood' }),
  // Cerca e portão: ocupam a célula (nada empilha em cima); madeira: o machado desmonta.
  object(Block.FENCE, 'Cerca de Madeira', { shape: 'fence', organic: 'wood' }),
  object(Block.FENCE_STAKE, 'Cerca de Estacas', { shape: 'building', organic: 'wood' }),
  object(Block.FENCE_GATE, 'Portão de Madeira', { shape: 'fence', organic: 'wood' }),
  object(Block.FENCE_GATE_OPEN, 'Portão de Madeira (aberto)', { shape: 'fence', solid: false, placeable: false, organic: 'wood' }),
  object(Block.CACTUS, 'Cacto', { placeable: false, organic: 'plant' }),
  object(Block.OAK_TREE, 'Carvalho', { shape: 'tree', placeable: false, organic: 'wood' }),
  object(Block.SAKURA_TREE, 'Cerejeira', { shape: 'tree', placeable: false, organic: 'wood' }),
  object(Block.BIRCH_TREE, 'Bétula', { shape: 'tree', placeable: false, organic: 'wood' }),
  // Mudas são plantas (a enxada arranca); dali em diante, madeira.
  object(Block.OAK_SAPLING, 'Muda de Carvalho', { shape: 'tree', placeable: false, organic: 'plant' }),
  object(Block.OAK_YOUNG, 'Carvalho Jovem', { shape: 'tree', placeable: false, organic: 'wood' }),
  object(Block.OAK_GROWING, 'Carvalho Jovem', { shape: 'tree', placeable: false, organic: 'wood' }),
  object(Block.APPLE_SAPLING, 'Muda de Macieira', { shape: 'tree', placeable: false, organic: 'plant' }),
  object(Block.APPLE_YOUNG, 'Macieira Jovem', { shape: 'tree', placeable: false, organic: 'wood' }),
  object(Block.APPLE_TREE, 'Macieira', { shape: 'tree', placeable: false, organic: 'wood' }),
  object(Block.APPLE_TREE_BARE, 'Macieira', { shape: 'tree', placeable: false, organic: 'wood' }),
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
  object(Block.DUNGEON_CAVE, 'Covil das Aranhas', { shape: 'building', breakable: false, placeable: false }),
  // Cidade do Despertar: construções (várias células) e enfeites fixos; o World protege a área inteira.
  object(Block.TOWN_PART, 'Construção', { shape: 'building', breakable: false, placeable: false }),
  ...([
    [Block.CASTLE, 'Castelo'], [Block.GUILD, 'Guilda dos Aventureiros'], [Block.INN, 'Hospedaria'],
    [Block.SMITHY, 'Ferreiro'], [Block.SHOP_POTION, 'Loja de Poções'], [Block.SHOP_GOODS, 'Armazém'],
    [Block.SHOP_TOOLS, 'Loja de Ferramentas'], [Block.HOUSE, 'Casa'], [Block.HOUSE_TALL, 'Casa'],
    [Block.WATCHTOWER, 'Guarita'], [Block.WELL, 'Poço'], [Block.FOUNTAIN, 'Fonte'],
    [Block.STALL, 'Barraca'], [Block.BENCH, 'Banco'], [Block.BENCH_LONG, 'Banco'],
  ] as const).map(([id, name]) => object(id, name, {
    shape: 'building', breakable: false, placeable: false, seat: id === Block.BENCH || id === Block.BENCH_LONG,
  })),
  ...([
    [Block.LAMP, 'Poste de Luz'], [Block.BARREL, 'Barril'], [Block.CRATES, 'Caixotes'],
    [Block.SIGNPOST, 'Placa'], [Block.HEDGE, 'Cerca Viva'],
  ] as const).map(([id, name]) => object(id, name, { shape: 'building', breakable: false, placeable: false })),
  // Vila Camponesa: peças de várias células (como a cidade) e enfeites fixos; o World protege a área inteira.
  ...([
    [Block.V_HOUSE_STRAW, 'Casa de Palha'], [Block.V_HOUSE_TILE, 'Casa de Telhas'], [Block.V_BARN, 'Celeiro'],
    [Block.V_COOP, 'Galinheiro'], [Block.V_WELL, 'Poço'], [Block.V_BENCH, 'Banco'], [Block.V_BED_WHEAT, 'Canteiro de Trigo'],
    [Block.V_BED_VEG, 'Horta'], [Block.V_OAK, 'Carvalho'], [Block.V_TREE, 'Árvore'], [Block.V_STAKE, 'Paliçada'], [Block.V_GATE, 'Portão da Vila'],
    [Block.V_BARREL, 'Barril'], [Block.V_ROCKS, 'Rochas'], [Block.V_BUSH, 'Arbusto Florido'], [Block.V_LOGS, 'Toras'],
    [Block.V_HAY, 'Feno'], [Block.V_CART, 'Carroça'], [Block.V_SACKS, 'Sacos'],
  ] as const).map(([id, name]) => object(id, name, { shape: 'building', breakable: false, placeable: false, seat: id === Block.V_BENCH })),
  object(Block.V_GATE_CLOSED, 'Portão da Vila (fechado)', { shape: 'building', breakable: false, placeable: false }),
  object(Block.V_GATE_GAP, 'Portão da Vila', { shape: 'building', solid: false, breakable: false, placeable: false }),
  object(Block.V_GATE_GAP_CLOSED, 'Portão da Vila (fechado)', { shape: 'building', breakable: false, placeable: false }),
  object(Block.V_FLOWERS, 'Capim e Flores', { shape: 'building', solid: false, breakable: false, placeable: false }),
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
  object(Block.WATER_PURE, 'Água Pura'),
  object(Block.CRYSTAL_LIFE, 'Cristal da Vida', { glow: true }),
  object(Block.LIGHT_BLOCK, 'Bloco de Luz', { glow: true }),
  object(Block.WOOD_CELESTIAL, 'Madeira Celestial'),
  object(Block.FOLIAGE_GOLDEN, 'Folhagem Dourada'),
  // Plantações (trigo, batata, tomate, cenoura): não bloqueiam passagem, não aceitam nada por cima, só entram plantando.
  ...CROP_KINDS.flatMap((k) => Array.from({ length: CROP_STAGES }, (_, s) =>
    object(CROPS[k].first + s, s === CROP_STAGES - 1 ? CROPS[k].ripe : `${CROPS[k].name} em crescimento`, {
      shape: 'crop', solid: false, placeable: false, organic: 'plant',
    }))),
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

/**
 * Pedras aposentadas (dono do produto, 2026-11-08): o jogo fica só com Pedra Bruta, Tijolo de Pedra, Chão de Pedra,
 * Pedra Lisa e Pedra Polida. Estas três não têm mais receita nem uso na cidade, mas **os ids continuam reservados**:
 * mundos e salas já salvos podem tê-las (continuam aparecendo, quebrando e valendo de batente) e a coluna delas no
 * atlas antigo é o índice em `MATERIALS`. Não ganham arte V2.
 */
export const RETIRED_STONES: readonly BlockId[] = [Block.STONE_COBBLE, Block.STONE_CRACKED, Block.STONE_BRICK_CRACKED];

/** Materiais da prancha de blocos: os únicos blocos de construção (ordem da hotbar; coluna do atlas antigo = índice). */
export const MATERIALS: BlockId[] = [
  Block.DIRT,
  Block.GRASS,
  Block.TILLED,
  Block.PATH,
  Block.SAND,
  Block.STONE,
  Block.OAK_LOG,
  Block.OAK_PLANKS,
  // Variações de pedra (colunas 8+ do atlas, scripts/extract-stones.py).
  Block.STONE_COBBLE,
  Block.STONE_BRICK,
  Block.STONE_FLOOR,
  Block.STONE_SMOOTH,
  Block.STONE_POLISHED,
  Block.STONE_CRACKED,
  Block.STONE_BRICK_CRACKED,
  // Madeira de cerejeira (v0.88.0) e de bétula (v0.89.0): só no V2 (não há coluna no atlas antigo, que termina nas pedras).
  Block.CHERRY_LOG,
  Block.CHERRY_PLANKS,
  Block.BIRCH_LOG,
  Block.BIRCH_PLANKS,
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
export const HOTBAR_BLOCKS: BlockId[] = [
  ...MATERIALS, Block.OAK_DOOR, Block.TENT, Block.CHEST, Block.CAMPFIRE, Block.CAULDRON, Block.OVEN, Block.CHAIR, Block.FENCE, Block.FENCE_GATE, Block.FENCE_STAKE,
];

/**
 * Estágios de crescimento aposentados (dono do produto, 2026-11-08: "tirar o crescimento, elas só aparecem adultas de formas
 * variadas"): mudas e árvores jovens não existem mais. Os ids seguem reservados e, em mundos e salas já salvos, viram a
 * árvore adulta da mesma espécie ao carregar (`adultOfStage`).
 */
export const GROWTH_STAGE_ADULT: Readonly<Record<number, BlockId>> = {
  [Block.OAK_SAPLING]: Block.OAK_TREE,
  [Block.OAK_YOUNG]: Block.OAK_TREE,
  [Block.OAK_GROWING]: Block.OAK_TREE,
  [Block.APPLE_SAPLING]: Block.APPLE_TREE,
  [Block.APPLE_YOUNG]: Block.APPLE_TREE,
};

/** Árvore adulta que substitui um estágio aposentado, ou o próprio id se não for um. */
export function adultOfStage(id: number): number {
  return GROWTH_STAGE_ADULT[id] ?? id;
}

/** Itens aposentados junto com o crescimento (as mudas): somem de bolsas, grades e baús salvos. */
export const RETIRED_ITEMS: ReadonlySet<string> = new Set(['oak_sapling', 'apple_sapling']);

/**
 * Macieira colhida volta a ter maçãs com o tempo (a única "espera" que sobrou das árvores; o `World` avança). A arte é a
 * mesma forma da carregada, só sem as maçãs (arte própria desde a v0.90.0).
 */
export const TREE_NEXT: Readonly<Partial<Record<number, BlockId>>> = {
  [Block.APPLE_TREE_BARE]: Block.APPLE_TREE,
};

/** Árvore que ainda cresce (ou macieira esperando as maçãs voltarem)? */
export function isGrowingTree(id: BlockId): boolean {
  return TREE_NEXT[id] !== undefined;
}

/** Porta (aberta ou fechada)? */
/** Paredes (ADR 0027): blocos de forma `wall`. */
export const WALL_BLOCKS: readonly BlockId[] = [Block.WALL_PLANKS, Block.WALL_STONE];

/** O bloco é uma parede? */
export function isWall(id: BlockId): boolean {
  return blockDef(id).shape === 'wall';
}

/** Portas de parede (fechadas; a aberta só existe no mundo, como a porta comum). */
export const WALL_DOOR_BLOCKS: readonly BlockId[] = [Block.WALL_DOOR_PLANKS];

/** Porta de parede (aberta ou fechada)? */
export function isWallDoor(id: BlockId): boolean {
  return blockDef(id).shape === 'wall-door';
}

/** Parede ou porta de parede: o que o autotile trata como parede (a tampa continua por cima da porta). */
export function isWallLike(id: BlockId): boolean {
  const s = blockDef(id).shape;
  return s === 'wall' || s === 'wall-door';
}

export function isDoor(id: BlockId): boolean {
  return id === Block.OAK_DOOR || id === Block.OAK_DOOR_OPEN;
}

/** Portão da cerca (aberto ou fechado)? */
export function isGate(id: BlockId): boolean {
  return id === Block.FENCE_GATE || id === Block.FENCE_GATE_OPEN;
}

/** Cerca ou portão: as cercas vizinhas se emendam com eles. */
export function joinsFence(id: BlockId): boolean {
  return id === Block.FENCE || isGate(id);
}

/** Abre/fecha com um toque (porta ou portão): estado → estado oposto. */
const TOGGLES: Readonly<Partial<Record<number, BlockId>>> = {
  [Block.OAK_DOOR]: Block.OAK_DOOR_OPEN,
  [Block.OAK_DOOR_OPEN]: Block.OAK_DOOR,
  [Block.WALL_DOOR_PLANKS]: Block.WALL_DOOR_PLANKS_OPEN,
  [Block.WALL_DOOR_PLANKS_OPEN]: Block.WALL_DOOR_PLANKS,
  [Block.FENCE_GATE]: Block.FENCE_GATE_OPEN,
  [Block.FENCE_GATE_OPEN]: Block.FENCE_GATE,
  [Block.V_GATE]: Block.V_GATE_CLOSED,
  [Block.V_GATE_CLOSED]: Block.V_GATE,
  [Block.V_GATE_GAP]: Block.V_GATE_GAP_CLOSED,
  [Block.V_GATE_GAP_CLOSED]: Block.V_GATE_GAP,
};

/** Porta ou portão (abre e fecha com um toque)? */
export function isOpenable(id: BlockId): boolean {
  return TOGGLES[id] !== undefined;
}

/** Estado oposto da porta/portão (null se o bloco não abre). */
export function toggled(id: BlockId): BlockId | null {
  return TOGGLES[id] ?? null;
}

/** Aberto (porta ou portão)? */
export function isOpen(id: BlockId): boolean {
  return id === Block.OAK_DOOR_OPEN || id === Block.FENCE_GATE_OPEN || id === Block.WALL_DOOR_PLANKS_OPEN || id === Block.V_GATE || id === Block.V_GATE_GAP;
}
