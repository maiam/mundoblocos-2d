import { Block, type BlockId, blockDef, CROP_STAGES, cropKind, cropStage, gateClosed, isDoor, isWallDoor, isWheat, MATERIALS, WHEAT_STAGES, wheatStage } from './blocks';
import { isWolf, type MonsterKind } from './dungeon';

/**
 * Itens contáveis (diferentes dos blocos de construção, que são infinitos).
 * Fonte de verdade do que cada item é e do que o mundo devolve ao colher.
 */
export const Item = {
  WHEAT_SEED: 'wheat_seed',
  WHEAT: 'wheat',
  /** Espólios das aranhas (sem uso ainda — futuras receitas). */
  SILK: 'silk',
  FANG: 'fang',
  QUEEN_HEART: 'queen_heart',
  /** Espólios dos lobos (v0.91.0; sem uso ainda — futuras receitas). */
  WOLF_FANG: 'wolf_fang',
  WOLF_PELT: 'wolf_pelt',
  /** Moeda de cobre (v0.93.7): espólio do goblin; sem uso ainda (futuras lojas e trocas). */
  COPPER_COIN: 'copper_coin',
  /** Fruta da macieira (comer vem com a comida, Fase P). As mudas saíram do jogo na v0.88.0 (`RETIRED_ITEMS`). */
  APPLE: 'apple',
  /** Hortaliças: o próprio legume é o que se planta (e o que se colhe). */
  POTATO: 'potato',
  TOMATO: 'tomato',
  CARROT: 'carrot',
  /** Pano de Seda (10 sedas): ingrediente da tenda. */
  SILK_CLOTH: 'silk_cloth',
  /** Pratos do Cozinheiro (feitos no caldeirão; quanto enchem a fome: `FOOD` em progression). */
  BREAD: 'bread',
  PASTA_TOMATO: 'pasta_tomato',
  /** Produtos dos animais (soltos ao serem alimentados: `ANIMAL_PRODUCE`). */
  MILK: 'milk',
  EGG: 'egg',
  /** Pratos com os produtos dos animais. */
  CHEESE: 'cheese',
  APPLE_PIE: 'apple_pie',
} as const;

export type ItemId = (typeof Item)[keyof typeof Item];

/** Animais que se reproduzem comendo (ovelha, vaca, galinha, cavalo). */
export type AnimalKind = 'sheep' | 'horse' | 'cow' | 'chicken' | 'capybara';

export interface ItemDef {
  id: ItemId;
  name: string;
  /** Bloco que o item planta ao ser usado no chão (semente). */
  plants?: BlockId;
  /** Animais que comem este item (e ficam apaixonados: reprodução). */
  feeds?: readonly AnimalKind[];
  /** Espólio de monstro: não ocupa a hotbar; aparece no contador de espólios da HUD. */
  loot?: boolean;
}

export const ITEMS: Record<ItemId, ItemDef> = {
  // Alimento de cada animal (dono do produto, 2026-11-06): ovelha e vaca = trigo; galinha = semente; cavalo = cenoura.
  wheat_seed: { id: Item.WHEAT_SEED, name: 'Semente de Trigo', plants: Block.WHEAT_0, feeds: ['chicken'] },
  wheat: { id: Item.WHEAT, name: 'Trigo', feeds: ['sheep', 'cow'] },
  silk: { id: Item.SILK, name: 'Seda de Aranha', loot: true },
  fang: { id: Item.FANG, name: 'Presa de Aranha', loot: true },
  queen_heart: { id: Item.QUEEN_HEART, name: 'Coração da Rainha', loot: true },
  wolf_fang: { id: Item.WOLF_FANG, name: 'Presa de Lobo', loot: true },
  wolf_pelt: { id: Item.WOLF_PELT, name: 'Pelagem de Lobo', loot: true },
  copper_coin: { id: Item.COPPER_COIN, name: 'Moeda de Cobre', loot: true },
  apple: { id: Item.APPLE, name: 'Maçã' },
  potato: { id: Item.POTATO, name: 'Batata', plants: Block.POTATO_0 },
  tomato: { id: Item.TOMATO, name: 'Tomate', plants: Block.TOMATO_0 },
  carrot: { id: Item.CARROT, name: 'Cenoura', plants: Block.CARROT_0, feeds: ['horse'] },
  silk_cloth: { id: Item.SILK_CLOTH, name: 'Pano de Seda' },
  bread: { id: Item.BREAD, name: 'Pão' },
  pasta_tomato: { id: Item.PASTA_TOMATO, name: 'Macarrão ao Molho' },
  milk: { id: Item.MILK, name: 'Leite' },
  egg: { id: Item.EGG, name: 'Ovo' },
  cheese: { id: Item.CHEESE, name: 'Queijo' },
  apple_pie: { id: Item.APPLE_PIE, name: 'Torta de Maçã' },
};

/**
 * O que cada animal solta ao ser alimentado (dono do produto, 2026-11-07): vaca = leite, galinha = ovo. Os outros não
 * soltam nada (por enquanto).
 */
export const ANIMAL_PRODUCE: Readonly<Partial<Record<AnimalKind, ItemId>>> = { cow: Item.MILK, chicken: Item.EGG };

/** Hortaliças que aparecem ao arrancar capim (fonte delas no mundo; o resto vem da colheita). */
export const VEGETABLES: ItemId[] = [Item.POTATO, Item.TOMATO, Item.CARROT];
/** Chance de o capim arrancado soltar uma hortaliça. */
export const GRASS_VEGETABLE_CHANCE = 0.12;

/** Espólios, na ordem exibida na HUD. */
export const LOOT_ITEMS: ItemId[] = [Item.SILK, Item.FANG, Item.QUEEN_HEART, Item.WOLF_FANG, Item.WOLF_PELT, Item.COPPER_COIN];

/**
 * O que cada monstro deixa ao morrer. Pequena: 1 seda (60%). Grande: 1–2 sedas + presa (35%).
 * Rainha: 5–7 sedas + 2–3 presas + o Coração da Rainha. Lobos: pelagem (55%) e presa (40%), sorteadas separadamente.
 * Goblin: 2 moedas de cobre, sempre.
 */
/** Chances de cada espólio do lobo (sorteios independentes). */
export const WOLF_PELT_CHANCE = 0.55;
export const WOLF_FANG_CHANCE = 0.4;
/** Moedas de cobre que cada goblin solta ao morrer (fixo, não sorteado). */
export const GOBLIN_COIN_DROP = 2;
/** Moedas de cobre do homem-lagarto (fixo; dono do produto, 14/11/2026). */
export const LIZARD_COIN_DROP = 2;

export function monsterDrops(kind: MonsterKind, rand: () => number = Math.random): Drop[] {
  // Goblin: sempre 2 moedas de cobre (dono do produto, 2026-11-12). Nunca cair no espólio da Rainha das aranhas.
  if (kind === 'goblin') return [{ item: Item.COPPER_COIN, count: GOBLIN_COIN_DROP }];
  if (kind === 'lizard') return [{ item: Item.COPPER_COIN, count: LIZARD_COIN_DROP }];
  if (isWolf(kind)) {
    // Lobo: pelagem e presa saem por sorteios separados (nenhum é garantido e podem vir juntos ou sozinhos).
    const out: Drop[] = [];
    if (rand() < WOLF_PELT_CHANCE) out.push({ item: Item.WOLF_PELT, count: 1 });
    if (rand() < WOLF_FANG_CHANCE) out.push({ item: Item.WOLF_FANG, count: 1 });
    return out;
  }
  if (kind === 'spider-small') return rand() < 0.6 ? [{ item: Item.SILK, count: 1 }] : [];
  if (kind === 'spider-big') {
    const out: Drop[] = [{ item: Item.SILK, count: 1 + (rand() < 0.5 ? 1 : 0) }];
    if (rand() < 0.35) out.push({ item: Item.FANG, count: 1 });
    return out;
  }
  return [
    { item: Item.SILK, count: 5 + Math.floor(rand() * 3) },
    { item: Item.FANG, count: 2 + (rand() < 0.5 ? 1 : 0) },
    { item: Item.QUEEN_HEART, count: 1 },
  ];
}

/**
 * Identificador de tudo que a heroína carrega (inventário, grade, itens caídos): item contável (`'wheat'`),
 * bloco de construção coletado (`'block:20'`) ou ferramenta (`'tool:sword'`).
 */
export type StackId = ItemId | `block:${number}` | `tool:${string}`;

export const blockStack = (id: BlockId): StackId => `block:${id}`;
export const toolStack = (tool: ToolId): StackId => `tool:${tool}`;

/** Bloco de um StackId de bloco (null se não for bloco). */
export function stackBlock(s: StackId): BlockId | null {
  return s.startsWith('block:') ? (Number(s.slice(6)) as BlockId) : null;
}

/** Ferramenta de um StackId de ferramenta (null se não for ferramenta). */
export function stackTool(s: StackId): ToolId | null {
  return s.startsWith('tool:') ? (s.slice(5) as ToolId) : null;
}

/** É material de construção (o que se perde ao morrer)? */
export const isMaterialStack = (s: StackId): boolean => s.startsWith('block:');

export interface Drop {
  item: StackId;
  count: number;
}

/**
 * O que um bloco quebrado devolve. Trigo maduro: 1 trigo + 1–2 sementes; verde: devolve a semente. Hortaliça madura:
 * 2–3 legumes; verde: 1. Capim: às vezes uma hortaliça. Árvores: `treeDrops`. Demais blocos: nada.
 */
export function dropsFor(id: BlockId, rand: () => number = Math.random): Drop[] {
  const tree = treeDrops(id, rand);
  if (tree) return tree;
  if (id === Block.TALL_GRASS) {
    // Capim arrancado às vezes revela uma hortaliça (batata, tomate ou cenoura) para começar a horta.
    if (rand() >= GRASS_VEGETABLE_CHANCE) return [];
    return [{ item: VEGETABLES[Math.min(VEGETABLES.length - 1, Math.floor(rand() * VEGETABLES.length))], count: 1 }];
  }
  const kind = cropKind(id);
  if (kind && kind !== 'wheat') {
    // Hortaliça madura: 2–3 legumes (um deles serve para replantar); verde: devolve o legume plantado.
    const item = kind as ItemId;
    return [{ item, count: cropStage(id) === CROP_STAGES - 1 ? 2 + (rand() < 0.5 ? 1 : 0) : 1 }];
  }
  if (!isWheat(id)) return [];
  if (wheatStage(id) === WHEAT_STAGES - 1) {
    return [
      { item: Item.WHEAT, count: 1 },
      { item: Item.WHEAT_SEED, count: 1 + (rand() < 0.5 ? 1 : 0) },
    ];
  }
  return [{ item: Item.WHEAT_SEED, count: 1 }];
}

/**
 * Árvores: a macieira carregada solta as maçãs (as toras saem em `blockDrops`); sem mudas (v0.88.0). null = não é árvore
 * desse tipo.
 */
function treeDrops(id: BlockId, rand: () => number): Drop[] | null {
  switch (id) {
    case Block.APPLE_TREE: return pickDrops(rand);
    case Block.OAK_TREE: case Block.SAKURA_TREE: case Block.BIRCH_TREE: case Block.APPLE_TREE_BARE: return [];
    default: return null;
  }
}

/** Colher a macieira carregada (tocar nela): 2–3 maçãs. */
export function pickDrops(rand: () => number = Math.random): Drop[] {
  return [{ item: Item.APPLE, count: 2 + (rand() < 0.5 ? 1 : 0) }];
}

/**
 * Ferramentas: itens únicos (sem quantidade) que a personagem equipa.
 * Por enquanto só mudam a aparência; as ações de cada uma virão depois.
 */
export const Tool = {
  SWORD: 'sword',
  HOE: 'hoe',
  PICKAXE: 'pickaxe',
  SHOVEL: 'shovel',
  AXE: 'axe',
} as const;

export type ToolId = (typeof Tool)[keyof typeof Tool];

export interface ToolDef {
  id: ToolId;
  name: string;
  /** Uso (documentação). */
  plannedUse: string;
  /**
   * O que a ferramenta pode quebrar segurando: tudo, nada, orgânico (madeira, árvore e planta), só planta,
   * macio (blocos macios — terra, areia — e plantas) ou tudo menos madeira/árvore (`nonWood`).
   * Fonte de verdade da restrição por ferramenta.
   */
  breaks: 'any' | 'none' | 'organic' | 'plant' | 'soft' | 'nonWood';
  /** Exceções: blocos que esta ferramenta quebra além da regra `breaks` (ex.: picareta quebra a tenda de madeira). */
  alsoBreaks?: BlockId[];
  /** Plantas quebradas por esta ferramenta são destruídas sem soltar nada (pá, picareta). */
  destroysPlants: boolean;
  /** Toque curto num chão: 'till' = ara (enxada), 'flatten' = vira Caminho de Terra (pá), null = nada. */
  groundUse: 'till' | 'flatten' | null;
  /** Toque curto toca a animação de ação da ferramenta (golpe, arar…). */
  swings: boolean;
  /** O golpe acerta entidades à frente (animais/monstros). */
  strikes: boolean;
}

export const TOOLS: Record<ToolId, ToolDef> = {
  sword: {
    id: Tool.SWORD, name: 'Espada', plannedUse: 'golpe em animais/monstros; não quebra nada',
    breaks: 'none', destroysPlants: false, groundUse: null, swings: true, strikes: true,
  },
  hoe: {
    id: Tool.HOE, name: 'Enxada', plannedUse: 'ara Terra/Terra com Grama → Terra Arada; quebra só plantas; não ataca',
    breaks: 'plant', destroysPlants: false, groundUse: 'till', swings: true, strikes: false,
  },
  pickaxe: {
    id: Tool.PICKAXE, name: 'Picareta', plannedUse: 'minera qualquer bloco menos madeira/árvore; plantas sem drop; não ataca',
    breaks: 'nonWood', alsoBreaks: [Block.TENT, Block.TENT_PART], destroysPlants: true, groundUse: null, swings: true, strikes: false,
  },
  shovel: {
    id: Tool.SHOVEL, name: 'Pá', plannedUse: 'Terra/Grama/Arada → Caminho de Terra; cava só macios e plantas (sem drop); não ataca',
    breaks: 'soft', destroysPlants: true, groundUse: 'flatten', swings: true, strikes: false,
  },
  axe: {
    id: Tool.AXE, name: 'Machado', plannedUse: 'golpe em animais/monstros; corta só madeira/árvore/planta',
    breaks: 'organic', destroysPlants: false, groundUse: null, swings: true, strikes: true,
  },
};

/** A ferramenta (ou mão/item, `null`) pode quebrar este bloco? */
export function toolCanBreak(tool: ToolId | null, id: BlockId): boolean {
  if (!tool) return true;
  const rule = TOOLS[tool].breaks;
  if (TOOLS[tool].alsoBreaks?.includes(id)) return true;
  const { organic, soft } = blockDef(id);
  if (rule === 'any') return true;
  if (rule === 'organic') return organic !== null;
  if (rule === 'plant') return organic === 'plant';
  if (rule === 'soft') return soft || organic === 'plant';
  if (rule === 'nonWood') return organic !== 'wood';
  return false;
}

/** O que cai ao quebrar este bloco com esta ferramenta: pá e picareta destroem plantas sem soltar nada. */
export function toolDrops(tool: ToolId | null, id: BlockId, rand: () => number = Math.random): Drop[] {
  if (tool && TOOLS[tool].destroysPlants && blockDef(id).organic === 'plant') return [];
  return dropsFor(id, rand);
}

export const TOOL_ORDER: ToolId[] = [Tool.SWORD, Tool.HOE, Tool.PICKAXE, Tool.SHOVEL, Tool.AXE];

/** Blocos que voltam como item ao serem quebrados (mundo com coleta): os materiais e a porta. */
const COLLECTABLE = new Set<number>([...MATERIALS, Block.OAK_DOOR, Block.TENT, Block.CHEST, Block.CAMPFIRE, Block.CAULDRON, Block.OVEN, Block.CHAIR, Block.FENCE, Block.FENCE_BIRCH, Block.FENCE_CHERRY, Block.FENCE_STAKE, Block.WALL_PLANKS, Block.WALL_STONE, Block.WALL_DOOR_PLANKS]);

/** Árvores adultas (dão 2–3 toras). */
const ADULT_TREES = new Set<number>([Block.OAK_TREE, Block.APPLE_TREE, Block.APPLE_TREE_BARE]);

/**
 * O que um bloco quebrado devolve como material (mundos com coleta): o próprio material (cubo ou chão;
 * Terra com Grama volta como Terra com Grama), árvores dão 2–3 Toras (de Carvalho; a Cerejeira, de Cerejeira; a Bétula, de Bétula), porta volta porta.
 * Plantas, enfeites e blocos de outros mundos não devolvem material (plantas: ver `toolDrops`).
 */
export function blockDrops(id: BlockId, rand: () => number = Math.random): Drop[] {
  if (ADULT_TREES.has(id)) return [{ item: blockStack(Block.OAK_LOG), count: 2 + (rand() < 0.5 ? 1 : 0) }];
  if (id === Block.SAKURA_TREE) return [{ item: blockStack(Block.CHERRY_LOG), count: 2 + (rand() < 0.5 ? 1 : 0) }]; // Cerejeira → Tora de Cerejeira
  if (id === Block.BIRCH_TREE) return [{ item: blockStack(Block.BIRCH_LOG), count: 2 + (rand() < 0.5 ? 1 : 0) }]; // Bétula → Tora de Bétula
  if (isDoor(id)) return [{ item: blockStack(Block.OAK_DOOR), count: 1 }];
  const gate = gateClosed(id);
  if (gate !== null) return [{ item: blockStack(gate), count: 1 }]; // aberto ou fechado, volta o portão fechado da mesma madeira
  if (isWallDoor(id)) return [{ item: blockStack(Block.WALL_DOOR_PLANKS), count: 1 }]; // aberta ou fechada, volta a porta (fechada)
  // Pedregulho: vira 1–3 Pedras Brutas (o bloco de pedra; colocado no mundo, é cubo).
  if (id === Block.ROCK_BOULDER) return [{ item: blockStack(Block.STONE), count: 1 + Math.floor(rand() * 3) }];
  return COLLECTABLE.has(id) ? [{ item: blockStack(id), count: 1 }] : [];
}

/** Tudo que cai ao quebrar: colheita/plantas (`toolDrops`) + material, se o mundo coleta blocos. */
export function breakDrops(tool: ToolId | null, id: BlockId, collect: boolean, rand: () => number = Math.random): Drop[] {
  return [...toolDrops(tool, id, rand), ...(collect ? blockDrops(id, rand) : [])];
}

/** Tempo segurando para quebrar com a mão/item (s). */
export const BREAK_HOLD_HAND_S = 2;
/** Tempo segurando para quebrar com uma ferramenta que pode quebrar o alvo (s). */
export const BREAK_HOLD_TOOL_S = 1;

/** Quanto tempo segurar para quebrar: ferramenta 1 s, mão ou item 2 s. */
export function breakSeconds(tool: ToolId | null): number {
  return tool ? BREAK_HOLD_TOOL_S : BREAK_HOLD_HAND_S;
}

// ---------------------------------------------------------------------------------------------
// Profissões e receitas (fonte de verdade). A interface fica em game/; aqui só o que cada receita pede e dá.
// ---------------------------------------------------------------------------------------------

export type ProfessionId = 'builder' | 'cook';

export interface Profession {
  id: ProfessionId;
  name: string;
}

export const PROFESSIONS: Profession[] = [{ id: 'builder', name: 'Construtor' }, { id: 'cook', name: 'Cozinheiro' }];

export interface Recipe {
  id: string;
  name: string;
  profession: ProfessionId;
  inputs: Drop[];
  output: Drop;
  /** Bloco que precisa estar perto da personagem para fazer a receita (ex.: Caldeirão para cozinhar). */
  station?: BlockId;
}

/** Distância máxima (células, do centro da personagem ao centro do bloco) para usar uma estação de receita. */
export const STATION_REACH = 3;

export const RECIPES: Recipe[] = [
  {
    id: 'oak-planks', name: 'Tábua de Carvalho', profession: 'builder',
    inputs: [{ item: blockStack(Block.OAK_LOG), count: 1 }], output: { item: blockStack(Block.OAK_PLANKS), count: 2 },
  },
  {
    id: 'birch-planks', name: 'Tábua de Bétula', profession: 'builder',
    inputs: [{ item: blockStack(Block.BIRCH_LOG), count: 1 }], output: { item: blockStack(Block.BIRCH_PLANKS), count: 2 },
  },
  {
    id: 'cherry-planks', name: 'Tábua de Cerejeira', profession: 'builder',
    inputs: [{ item: blockStack(Block.CHERRY_LOG), count: 1 }], output: { item: blockStack(Block.CHERRY_PLANKS), count: 2 },
  },
  {
    id: 'oak-door', name: 'Porta de Carvalho', profession: 'builder',
    inputs: [{ item: blockStack(Block.OAK_PLANKS), count: 4 }], output: { item: blockStack(Block.OAK_DOOR), count: 1 },
  },
  // Paredes autotile (W5, dono do produto 13/11): custos provisórios, ajustáveis olhando o ritmo do jogo.
  {
    id: 'plank-wall', name: 'Parede de Tábuas', profession: 'builder',
    inputs: [{ item: blockStack(Block.OAK_PLANKS), count: 2 }], output: { item: blockStack(Block.WALL_PLANKS), count: 2 },
  },
  {
    id: 'stone-wall', name: 'Parede de Pedra', profession: 'builder',
    inputs: [{ item: blockStack(Block.STONE), count: 2 }], output: { item: blockStack(Block.WALL_STONE), count: 2 },
  },
  {
    id: 'plank-wall-door', name: 'Porta de Parede (Tábuas)', profession: 'builder',
    inputs: [{ item: blockStack(Block.OAK_PLANKS), count: 4 }], output: { item: blockStack(Block.WALL_DOOR_PLANKS), count: 1 },
  },
  ...([
    ['stone-brick', 'Tijolo de Pedra', Block.STONE_BRICK],
    ['stone-floor', 'Chão de Pedra', Block.STONE_FLOOR],
  ] as const).map(([id, name, out]): Recipe => ({
    id, name, profession: 'builder',
    inputs: [{ item: blockStack(Block.STONE), count: 1 }], output: { item: blockStack(out), count: 1 },
  })),
  {
    id: 'oak-chest', name: 'Baú de Carvalho', profession: 'builder',
    inputs: [{ item: blockStack(Block.OAK_PLANKS), count: 8 }], output: { item: blockStack(Block.CHEST), count: 1 },
  },
  // Móveis (dono do produto, 2026-11-06).
  {
    id: 'wooden-chair', name: 'Cadeira de Madeira', profession: 'builder',
    inputs: [{ item: blockStack(Block.OAK_PLANKS), count: 4 }], output: { item: blockStack(Block.CHAIR), count: 1 },
  },
  // Cerca de tábuas (dono do produto, 2026-11-06): as células se emendam sozinhas; o portão abre e fecha.
  {
    id: 'wooden-fence', name: 'Cerca de Madeira', profession: 'builder',
    inputs: [{ item: blockStack(Block.OAK_PLANKS), count: 2 }], output: { item: blockStack(Block.FENCE), count: 4 },
  },
  // Cercas de Bétula e de Cerejeira (v0.93.96): a mesma receita da de Carvalho, com a tábua da madeira.
  {
    id: 'birch-fence', name: 'Cerca de Bétula', profession: 'builder',
    inputs: [{ item: blockStack(Block.BIRCH_PLANKS), count: 2 }], output: { item: blockStack(Block.FENCE_BIRCH), count: 4 },
  },
  {
    id: 'cherry-fence', name: 'Cerca de Cerejeira', profession: 'builder',
    inputs: [{ item: blockStack(Block.CHERRY_PLANKS), count: 2 }], output: { item: blockStack(Block.FENCE_CHERRY), count: 4 },
  },
  // Cerca de Estacas (v0.93.90, teste do dono do produto): 4 estacas por bloco; 1 Tora de Carvalho rende 4 blocos (custo provisório).
  {
    id: 'stake-fence', name: 'Cerca de Estacas', profession: 'builder',
    inputs: [{ item: blockStack(Block.OAK_LOG), count: 1 }], output: { item: blockStack(Block.FENCE_STAKE), count: 4 },
  },
  {
    id: 'fence-gate', name: 'Portão de Madeira', profession: 'builder',
    inputs: [{ item: blockStack(Block.OAK_PLANKS), count: 4 }], output: { item: blockStack(Block.FENCE_GATE), count: 1 },
  },
  // Portões de Bétula e de Cerejeira (v0.93.99): a mesma receita do de Carvalho, com a tábua da madeira.
  {
    id: 'birch-gate', name: 'Portão de Bétula', profession: 'builder',
    inputs: [{ item: blockStack(Block.BIRCH_PLANKS), count: 4 }], output: { item: blockStack(Block.FENCE_GATE_BIRCH), count: 1 },
  },
  {
    id: 'cherry-gate', name: 'Portão de Cerejeira', profession: 'builder',
    inputs: [{ item: blockStack(Block.CHERRY_PLANKS), count: 4 }], output: { item: blockStack(Block.FENCE_GATE_CHERRY), count: 1 },
  },
  // Cozinha (dono do produto, 2026-11-05): por enquanto só se fabricam e se colocam; cozinhar vem com a comida.
  {
    id: 'campfire', name: 'Fogueira', profession: 'builder',
    inputs: [{ item: blockStack(Block.OAK_LOG), count: 3 }], output: { item: blockStack(Block.CAMPFIRE), count: 1 },
  },
  {
    id: 'stone-cauldron', name: 'Caldeirão de Pedra', profession: 'builder',
    inputs: [{ item: blockStack(Block.STONE), count: 3 }, { item: blockStack(Block.CAMPFIRE), count: 1 }],
    output: { item: blockStack(Block.CAULDRON), count: 1 },
  },
  {
    id: 'stone-oven', name: 'Forno de Pedra', profession: 'builder',
    inputs: [{ item: blockStack(Block.STONE), count: 6 }], output: { item: blockStack(Block.OVEN), count: 1 },
  },
  // Pano de Seda (dono do produto, 2026-11-06): 10 sedas viram 1 pano; a tenda passou a pedir o pano.
  {
    id: 'silk-cloth', name: 'Pano de Seda', profession: 'builder',
    inputs: [{ item: Item.SILK, count: 10 }], output: { item: Item.SILK_CLOTH, count: 1 },
  },
  {
    id: 'tent', name: 'Tenda', profession: 'builder',
    inputs: [{ item: Item.SILK_CLOTH, count: 1 }, { item: blockStack(Block.OAK_PLANKS), count: 10 }, { item: Item.FANG, count: 4 }],
    output: { item: blockStack(Block.TENT), count: 1 },
  },
  // Cozinheiro (dono do produto, 2026-11-06): cozinhar só perto de um Caldeirão de Pedra colocado no mundo.
  {
    id: 'bread', name: 'Pão', profession: 'cook', station: Block.CAULDRON,
    inputs: [{ item: Item.WHEAT, count: 2 }], output: { item: Item.BREAD, count: 1 },
  },
  {
    id: 'pasta-tomato', name: 'Macarrão ao Molho', profession: 'cook', station: Block.CAULDRON,
    inputs: [{ item: Item.WHEAT, count: 4 }, { item: Item.TOMATO, count: 2 }], output: { item: Item.PASTA_TOMATO, count: 1 },
  },
  // Com os produtos dos animais (dono do produto, 2026-11-07): queijo no Caldeirão; a torta assa no Forno de Pedra.
  {
    id: 'cheese', name: 'Queijo', profession: 'cook', station: Block.CAULDRON,
    inputs: [{ item: Item.MILK, count: 1 }], output: { item: Item.CHEESE, count: 1 },
  },
  {
    id: 'apple-pie', name: 'Torta de Maçã', profession: 'cook', station: Block.OVEN,
    inputs: [{ item: Item.WHEAT, count: 2 }, { item: Item.MILK, count: 1 }, { item: Item.APPLE, count: 2 }, { item: Item.EGG, count: 1 }],
    output: { item: Item.APPLE_PIE, count: 1 },
  },
];

/** Há todos os ingredientes? `count(id)` = quantidade carregada. */
/** Dá para fazer? Ingredientes suficientes e, se a receita pede estação, `nearStation` diz se ela está perto. */
export function canCraft(r: Recipe, count: (id: StackId) => number, nearStation: (id: BlockId) => boolean = () => true): boolean {
  return r.inputs.every((i) => count(i.item) >= i.count) && (r.station === undefined || nearStation(r.station));
}
