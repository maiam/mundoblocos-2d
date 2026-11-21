import { isMarco, isPanel, isWorkbench, T } from './voxel';

/**
 * Itens do Titã (ADR 0040). O id é o índice do sprite no atlas da hotbar + 1 (`render/art/titan.ts`): a ordem do atlas não depende da ordem dos espaços da barra.
 * Os quatro primeiros coincidem com os ids de bloco `T.SAND … T.FROST`.
 */
export const Item = { SAND: 1, DAMP_SAND: 2, DARK_ROCK: 3, FROST: 4, ROCK_SHARD: 5, FROST_SHARD: 6, CAPSULE: 7, LANTERN: 8, WORKBENCH: 9, ICE_LENS: 10, EMBER: 11, GLASS_REED: 12, SLAB: 13, MARCO: 14, PAINEL: 15, NOZ: 16, COPPER_SHARD: 17, COPPER_INGOT: 18, DRY_REED: 19, STONE_PICK: 20, BRAZIER: 21, STONE_DAGGER: 22, COPPER_PICK: 23, COPPER_DAGGER: 24, PLATE: 25, CARAPACE: 26, RAW_MEAT: 27, COOKED_MEAT: 28, EMBER_BLOCK: 29, NOZ_TORRADA: 30, ESTEIRA: 31, ESCADA: 32 } as const;
export type ItemId = (typeof Item)[keyof typeof Item];

export const ITEM_NAMES: Record<number, string> = {
  1: 'Areia ocre', 2: 'Areia úmida', 3: 'Rocha escura', 4: 'Gelo fosco',
  5: 'Fragmento de rocha', 6: 'Fragmento de gelo', 7: 'Cápsula de luz', 8: 'Lanterna da margem', 9: 'Mesa de Trabalho', 10: 'Lente de Gelo', 11: 'Brasa de âmbar', 12: 'Junco de vidro', 13: 'Laje de rocha', 14: 'Marco de Margem', 15: 'Painel de Junco', 16: 'Noz de Duna', 17: 'Fragmento de Cobre de Duna', 18: 'Lingote de Cobre de Duna', 19: 'Haste Seca de Junco', 20: 'Picareta de Rocha', 21: 'Braseiro de Rocha', 22: 'Adaga de Rocha', 23: 'Picareta de Cobre', 24: 'Adaga de Cobre', 25: 'Placa de Carapaça', 26: 'Revestimento de Carapaça', 27: 'Carne Crua de Farejador', 28: 'Carne Assada de Farejador', 29: 'Bloco de Âmbar Compactado', 30: 'Noz Torrada', 31: 'Esteira de Junco', 32: 'Escada de Junco',
};
/** Pilhas: blocos, fragmentos, lente e brasa até 64; cápsula (legada, id reservado), lanterna e mesa até 1 (a mesa 1 por espaço: é uma peça grande). */
export const maxStack = (item: number): number => (item === Item.CAPSULE || item === Item.LANTERN || item === Item.WORKBENCH || isTool(item) ? 1 : 64);
export const isItem = (n: unknown): n is ItemId => Number.isInteger(n) && (n as number) >= 1 && (n as number) <= 32;

/** Bloco que o item coloca (blocos e lanterna); fragmentos e cápsula não se colocam. */
export function blockOfItem(item: number): number | null {
  if (item >= Item.SAND && item <= Item.FROST) return item; // mesmos ids
  if (item === Item.LANTERN) return T.LANTERN;
  if (item === Item.WORKBENCH) return T.WORKBENCH;
  if (item === Item.SLAB) return T.SLAB;
  if (item === Item.MARCO) return T.MARCO; // o giro vem do olhar de quem coloca (`placeFromSlot`)
  if (item === Item.PAINEL) return T.PAINEL; // o eixo vem do olhar de quem coloca
  if (item === Item.CARAPACE) return T.CARAPACE;
  if (item === Item.EMBER_BLOCK) return T.EMBER_BLOCK;
  if (item === Item.ESCADA) return T.LADDER; // o giro vem da face onde se prende (`placeFromSlot`)
  if (item === Item.ESTEIRA) return T.MAT; // peça fina de piso (ADR 0085): precisa de apoio sólido em baixo
  if (item === Item.BRAZIER) return T.BRAZIER; // sempre apagado: a Brasa de Âmbar o acende (ADR 0065)
  return null;
}
/** Item que um bloco devolve ao ser quebrado (null = não se quebra: rocha-mãe, líquido). */
export function itemOfBlock(block: number): ItemId | null {
  if (block >= T.SAND && block <= T.FROST) return block as ItemId;
  if (block === T.VEIN_ROCK) return Item.DARK_ROCK; // o veio devolve o bloco inteiro (a lasca vem à parte, em `actions.ts`)
  if (block === T.VEIN_FROST) return Item.FROST;
  if (block === T.LANTERN) return Item.LANTERN;
  if (isWorkbench(block)) return Item.WORKBENCH;
  if (isMarco(block)) return Item.MARCO;
  if (isPanel(block)) return Item.PAINEL;
  if (block === T.CARAPACE) return Item.CARAPACE;
  if (block === T.EMBER_BLOCK) return Item.EMBER_BLOCK;
  if (block === T.MAT) return Item.ESTEIRA;
  if (block >= T.LADDER && block <= T.LADDER_270) return Item.ESCADA;
  if (block === T.BRAZIER || block === T.BRAZIER_LIT) return Item.BRAZIER; // o aceso volta apagado (a carga se perde)
  if (block === T.SLAB || block === T.SLAB_TOP || block === T.SLAB_DOUBLE) return Item.SLAB; // a laje dupla devolve 2 (`dropCountOf`)
  return null;
}
/** Quantas unidades do item o bloco devolve ao ser quebrado: a laje dupla devolve 2 lajes (não vira bloco maciço). */
export const dropCountOf = (block: number): number => (block === T.SLAB_DOUBLE ? 2 : 1);

/** Comida (ADR 0060): fome recuperada (pontos de 0 a 20) e saturação somada (como no Minecraft: `fome + saturação` limitada à fome). Provisório, pede teste em jogo. */
export const FOOD: Readonly<Record<number, { hunger: number; saturation: number }>> = { [Item.NOZ]: { hunger: 4, saturation: 2.4 }, [Item.NOZ_TORRADA]: { hunger: 7, saturation: 5.6 }, [Item.RAW_MEAT]: { hunger: 2, saturation: 1.2 }, [Item.COOKED_MEAT]: { hunger: 8, saturation: 12.8 } };
export const foodOf = (item: number): { hunger: number; saturation: number } | null => FOOD[item] ?? null;

/**
 * Ferramentas (ADR 0063): o item na mão muda o que se quebra e a velocidade. `pick` = picareta (quebra veio de cobre e rocha mais depressa). Provisório: sem durabilidade.
 * Ferramenta nova entra aqui (nunca `item === …` solto no jogo).
 */
export type Tier = 'rock' | 'copper';
export const TOOLS: Readonly<Record<number, { kind: 'pick' | 'dagger'; tier: Tier }>> = {
  [Item.STONE_PICK]: { kind: 'pick', tier: 'rock' }, [Item.COPPER_PICK]: { kind: 'pick', tier: 'copper' },
  [Item.STONE_DAGGER]: { kind: 'dagger', tier: 'rock' }, [Item.COPPER_DAGGER]: { kind: 'dagger', tier: 'copper' },
};
export const toolOf = (item: number | undefined | null): (typeof TOOLS)[number] | null => (item ? TOOLS[item] ?? null : null);
export const isTool = (item: number): boolean => item in TOOLS;
export const isPick = (item: number | undefined | null): boolean => toolOf(item)?.kind === 'pick';
/** Nível da picareta na mão (`null` = não é picareta). */
export const pickTier = (item: number | undefined | null): Tier | null => { const t = toolOf(item); return t?.kind === 'pick' ? t.tier : null; };
export const isDagger = (item: number | undefined | null): boolean => toolOf(item)?.kind === 'dagger';
