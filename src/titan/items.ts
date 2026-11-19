import { T } from './voxel';

/**
 * Itens do Titã (ADR 0040). O id é o índice do sprite no atlas da hotbar + 1 (`render/art/titan.ts`): a ordem do atlas não depende da ordem dos espaços da barra.
 * Os quatro primeiros coincidem com os ids de bloco `T.SAND … T.FROST`.
 */
export const Item = { SAND: 1, DAMP_SAND: 2, DARK_ROCK: 3, FROST: 4, ROCK_SHARD: 5, FROST_SHARD: 6, CAPSULE: 7, LANTERN: 8 } as const;
export type ItemId = (typeof Item)[keyof typeof Item];

export const ITEM_NAMES: Record<number, string> = {
  1: 'Areia ocre', 2: 'Areia úmida', 3: 'Rocha escura', 4: 'Gelo fosco',
  5: 'Fragmento de rocha', 6: 'Fragmento de gelo', 7: 'Cápsula de luz', 8: 'Lanterna da margem',
};
/** Pilhas: blocos e fragmentos até 64; cápsula e lanterna até 1. */
export const maxStack = (item: number): number => (item === Item.CAPSULE || item === Item.LANTERN ? 1 : 64);
export const isItem = (n: unknown): n is ItemId => Number.isInteger(n) && (n as number) >= 1 && (n as number) <= 8;

/** Bloco que o item coloca (blocos e lanterna); fragmentos e cápsula não se colocam. */
export function blockOfItem(item: number): number | null {
  if (item >= Item.SAND && item <= Item.FROST) return item; // mesmos ids
  if (item === Item.LANTERN) return T.LANTERN;
  return null;
}
/** Item que um bloco devolve ao ser quebrado (null = não se quebra: rocha-mãe, líquido). */
export function itemOfBlock(block: number): ItemId | null {
  if (block >= T.SAND && block <= T.FROST) return block as ItemId;
  if (block === T.LANTERN) return Item.LANTERN;
  return null;
}
/** Receita pessoal 2 × 2: cápsula + fragmento de rocha + fragmento de gelo, em qualquer disposição. */
export const LANTERN_RECIPE: readonly ItemId[] = [Item.CAPSULE, Item.ROCK_SHARD, Item.FROST_SHARD];
