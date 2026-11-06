import { Block, type BlockId, blockDef, isDoor, isWheat, MATERIALS, WHEAT_STAGES, wheatStage } from './blocks';
import type { MonsterKind } from './dungeon';

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
} as const;

export type ItemId = (typeof Item)[keyof typeof Item];

export interface ItemDef {
  id: ItemId;
  name: string;
  /** Bloco que o item planta ao ser usado no chão (semente). */
  plants?: BlockId;
  /** Animal que come este item. */
  feeds?: 'sheep';
  /** Espólio de monstro: não ocupa a hotbar; aparece no contador de espólios da HUD. */
  loot?: boolean;
}

export const ITEMS: Record<ItemId, ItemDef> = {
  wheat_seed: { id: Item.WHEAT_SEED, name: 'Semente de Trigo', plants: Block.WHEAT_0 },
  wheat: { id: Item.WHEAT, name: 'Trigo', feeds: 'sheep' },
  silk: { id: Item.SILK, name: 'Seda de Aranha', loot: true },
  fang: { id: Item.FANG, name: 'Presa de Aranha', loot: true },
  queen_heart: { id: Item.QUEEN_HEART, name: 'Coração da Rainha', loot: true },
};

/** Espólios, na ordem exibida na HUD. */
export const LOOT_ITEMS: ItemId[] = [Item.SILK, Item.FANG, Item.QUEEN_HEART];

/**
 * O que cada monstro deixa ao morrer. Pequena: 1 seda (60%). Grande: 1–2 sedas + presa (35%).
 * Rainha: 5–7 sedas + 2–3 presas + o Coração da Rainha.
 */
export function monsterDrops(kind: MonsterKind, rand: () => number = Math.random): Drop[] {
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
 * O que um bloco quebrado devolve. Trigo maduro: 1 trigo + 1–2 sementes.
 * Trigo verde: devolve a semente. Demais blocos: nada (construção é infinita).
 */
export function dropsFor(id: BlockId, rand: () => number = Math.random): Drop[] {
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
const COLLECTABLE = new Set<number>([...MATERIALS, Block.OAK_DOOR, Block.TENT, Block.CHEST, Block.CAMPFIRE, Block.CAULDRON, Block.OVEN]);

/**
 * O que um bloco quebrado devolve como material (mundos com coleta): o próprio material (cubo ou chão;
 * Terra com Grama volta como Terra com Grama), árvores dão 2–3 Toras de Carvalho, porta volta porta.
 * Plantas, enfeites e blocos de outros mundos não devolvem material (plantas: ver `toolDrops`).
 */
export function blockDrops(id: BlockId, rand: () => number = Math.random): Drop[] {
  if (id === Block.OAK_TREE || id === Block.SAKURA_TREE) return [{ item: blockStack(Block.OAK_LOG), count: 2 + (rand() < 0.5 ? 1 : 0) }];
  if (isDoor(id)) return [{ item: blockStack(Block.OAK_DOOR), count: 1 }];
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

export type ProfessionId = 'builder';

export interface Profession {
  id: ProfessionId;
  name: string;
}

export const PROFESSIONS: Profession[] = [{ id: 'builder', name: 'Construtor' }];

export interface Recipe {
  id: string;
  name: string;
  profession: ProfessionId;
  inputs: Drop[];
  output: Drop;
}

export const RECIPES: Recipe[] = [
  {
    id: 'oak-planks', name: 'Tábua de Carvalho', profession: 'builder',
    inputs: [{ item: blockStack(Block.OAK_LOG), count: 1 }], output: { item: blockStack(Block.OAK_PLANKS), count: 2 },
  },
  {
    id: 'oak-door', name: 'Porta de Carvalho', profession: 'builder',
    inputs: [{ item: blockStack(Block.OAK_PLANKS), count: 4 }], output: { item: blockStack(Block.OAK_DOOR), count: 1 },
  },
  ...([
    ['stone-cobble', 'Pedra Irregular', Block.STONE_COBBLE],
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
  {
    id: 'tent', name: 'Tenda', profession: 'builder',
    inputs: [{ item: Item.SILK, count: 10 }, { item: blockStack(Block.OAK_PLANKS), count: 10 }, { item: Item.FANG, count: 4 }],
    output: { item: blockStack(Block.TENT), count: 1 },
  },
];

/** Há todos os ingredientes? `count(id)` = quantidade carregada. */
export function canCraft(r: Recipe, count: (id: StackId) => number): boolean {
  return r.inputs.every((i) => count(i.item) >= i.count);
}
