import { Block, blockDef, isWheat, type BlockId } from '../world/blocks';
import type { World } from '../world/world';

/**
 * Cores do minimapa (aparência, por isso aqui no render): uma cor por célula, lida do `World` — o mapa é sempre o
 * do mundo, nunca uma cópia. Tons de mapa desenhado, mais calmos que a arte do jogo.
 */

const GROUND: Partial<Record<number, string>> = {
  [Block.WATER]: '#4f8fc9',
  [Block.HOLE]: '#3a2c24',
  [Block.VOID]: '#1b1838',
  [Block.DIRT]: '#9a7350',
  [Block.GRASS]: '#79b05a',
  [Block.TILLED]: '#7d5a3c',
  [Block.PATH]: '#c9a874',
  [Block.SAND]: '#e3cf95',
  [Block.STONE]: '#9b9a96',
  [Block.OAK_LOG]: '#8a6440',
  [Block.OAK_PLANKS]: '#b98a56',
  [Block.STONE_COBBLE]: '#a8a49c',
  [Block.STONE_BRICK]: '#b0aaa0',
  [Block.STONE_FLOOR]: '#bdb6aa',
  [Block.STONE_SMOOTH]: '#c4beb2',
  [Block.STONE_POLISHED]: '#cdc8bd',
  [Block.STONE_CRACKED]: '#9c968d',
  [Block.STONE_BRICK_CRACKED]: '#a19b91',
  [Block.DUNGEON_DIRT]: '#5a4636',
  [Block.DUNGEON_MOSS]: '#4f5a3a',
};

/** Objetos com cor própria (o resto sai da forma: árvore, construção, rocha…). */
const OBJECT: Partial<Record<number, string>> = {
  [Block.OAK_TREE]: '#3f7a3a',
  [Block.SAKURA_TREE]: '#d98fb0',
  [Block.CACTUS]: '#5f8f45',
  [Block.APPLE_TREE]: '#5d9a3c',
  [Block.APPLE_TREE_BARE]: '#7fae55',
  [Block.OAK_SAPLING]: '#6aa84a',
  [Block.APPLE_SAPLING]: '#6aa84a',
  [Block.HEDGE]: '#4d8a3e',
  [Block.FOUNTAIN]: '#7fb6dd',
  [Block.WELL]: '#8d8a84',
  [Block.TENT]: '#d8b36a',
  [Block.CHAIR]: '#b98a56',
  [Block.TENT_PART]: '#d8b36a',
  [Block.DUNGEON_WALL]: '#3b3330',
  [Block.DUNGEON_MOUNTAIN]: '#5d544c',
};

const BUILDING = '#b0573f'; // telhados da cidade
const ROCK = '#7f7b74';
const CROP = '#d9be5c';
const FALLBACK = '#8a8578';

/** Cor da célula (x, y) no minimapa. */
export function mapColor(world: World, x: number, y: number): string {
  const obj = world.getObject(x, y);
  if (obj !== Block.AIR) {
    const c = objectColor(world, x, y, obj);
    if (c) return c;
  }
  return GROUND[world.getGround(x, y)] ?? FALLBACK;
}

function objectColor(world: World, x: number, y: number, id: BlockId): string | null {
  const own = OBJECT[id];
  if (own) return own;
  if (isWheat(id)) return CROP;
  const def = blockDef(id);
  switch (def.shape) {
    case 'cube': {
      const top = world.topBlock(x, y)?.id ?? id;
      return GROUND[top] ?? FALLBACK;
    }
    case 'building': return BUILDING;
    case 'rock': return ROCK;
    case 'tree': return OBJECT[Block.OAK_TREE]!;
    case 'door': return GROUND[Block.OAK_PLANKS]!;
    // Capim, flores e enfeites pequenos: o chão aparece por baixo.
    default: return def.solid ? FALLBACK : null;
  }
}
