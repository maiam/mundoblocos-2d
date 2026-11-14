import { SUBDIV } from '../config';
import type { Biome } from './biomes';
import { Block, type BlockId, blockDef } from './blocks';
import { inRect, type Rect } from './dungeon';
import { hash2 } from './random';
import type { Cell, TerrainSource } from './terrain';
import { TOWN_SOUTH_FIELD } from './town';

/**
 * Vila Camponesa (v0.93.89, `docs/domains/village.md`): uma vila fortificada de camponeses, FIXA e igual em toda seed, ao sul da Cidade do
 * Despertar, no Mundo principal. Desenhada no código a partir do mapa que o dono do produto enviou (48 × 48 células de 16 px: exatamente a
 * grade fina do jogo, `SUBDIV = 2`, e 3 × 3 chunks); a arte dos objetos vem dos itens dele (`assets-src/vila-camponesa`). Chão = blocos do
 * jogo (grama, caminho); objetos = sprites de `render/townArt.ts`. Área inteira protegida pelo `World` (como a cidade).
 * Só existe com `SUBDIV = 2` (a vila foi desenhada nessa grade; com a grade 1, dos testes e do Santuário, `villageLayout()` devolve null).
 */
export const VILLAGE_W = 48;
export const VILLAGE_H = 48;
/** Canto noroeste: sob o portão da cidade, depois do campo do rebanho e de uma folga de 16 células. O vão do portão (x 20–27) fica no eixo do portão da cidade. */
export const VILLAGE_X0 = -24;
export const VILLAGE_Y0 = TOWN_SOUTH_FIELD + 16;
/** Anel em volta da vila onde a água vira grama (terra firme) e, nas `VILLAGE_CLEAR` mais próximas, não há objetos naturais. */
export const VILLAGE_MARGIN = 8;
const VILLAGE_CLEAR = 6;

/**
 * Lotes (células da grade fina): [largura, profundidade bloqueada]. O id fica na célula do canto inferior esquerdo e o resto do lote é
 * `TOWN_PART` (cantos do muro: lote em L, ver `buildVillage`). O desenho é centrado na largura do lote e a base fica no pé da fileira da frente.
 */
export const VILLAGE_SIZES: Partial<Record<BlockId, [number, number]>> = {
  [Block.V_HOUSE_STRAW]: [8, 4], [Block.V_HOUSE_TILE]: [8, 4], [Block.V_BARN]: [13, 5], [Block.V_COOP]: [4, 3], [Block.V_WELL]: [4, 3],
  [Block.V_BENCH]: [2, 1], [Block.V_BED_WHEAT]: [6, 7], [Block.V_BED_VEG]: [6, 6], [Block.V_OAK]: [1, 1], [Block.V_TREE]: [1, 1],
  [Block.V_PAL_H6]: [6, 1], [Block.V_PAL_H7]: [7, 1], [Block.V_PAL_W]: [1, 1], [Block.V_PAL_E]: [1, 1],
  [Block.V_PAL_NW]: [7, 6], [Block.V_PAL_NE]: [7, 6], [Block.V_PAL_SW]: [6, 6], [Block.V_PAL_SE]: [6, 6], [Block.V_GATE]: [8, 1],
  [Block.V_BARREL]: [1, 1], [Block.V_ROCKS]: [3, 1], [Block.V_BUSH]: [3, 1], [Block.V_LOGS]: [2, 1], [Block.V_HAY]: [2, 1],
  [Block.V_CART]: [3, 2], [Block.V_SACKS]: [2, 1], [Block.V_FLOWERS]: [2, 1], [Block.V_GATE_CLOSED]: [8, 1], [Block.V_GATE_GAP]: [1, 1],
  [Block.V_GATE_GAP_CLOSED]: [1, 1],
};

/** O id é um objeto da vila? */
export function isVillageId(id: number): boolean {
  return id in VILLAGE_SIZES;
}

export interface VillageLayout {
  w: number;
  h: number;
  /** Área inteira (muro incluído), inclusiva, em células do mundo. Protegida. */
  area: Rect;
  /** Vão do portão (células livres entre os dois postes), em células do mundo. */
  gate: Rect;
  /** Trilha de terra do fim da estrada da cidade até o portão da vila, em retângulos do mundo. */
  trail: Rect[];
  /** Tudo o que a vila altera: área + anel + trilha. */
  touched: Rect;
  /** Índice = (y − y0) × w + (x − x0). */
  ground: Uint8Array;
  objects: Uint8Array;
  /** Peças (id e célula âncora, mundo) na ordem em que foram postas. */
  props: Array<{ id: BlockId; x: number; y: number }>;
}

let cached: VillageLayout | null | undefined;

/** A vila (sempre a mesma; calculada uma vez) ou null fora da grade fina (`SUBDIV ≠ 2`). */
export function villageLayout(): VillageLayout | null {
  if (cached === undefined) cached = SUBDIV === 2 ? buildVillage() : null;
  return cached;
}

function buildVillage(): VillageLayout {
  const W = VILLAGE_W, H = VILLAGE_H;
  const ground = new Uint8Array(W * H).fill(Block.GRASS);
  const objects = new Uint8Array(W * H);
  const props: VillageLayout['props'] = [];
  const idx = (x: number, y: number) => y * W + x;
  const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H;
  const at = (lx: number, ly: number) => ({ x: lx + VILLAGE_X0, y: ly + VILLAGE_Y0 });
  const free = (x: number, y: number) => inside(x, y) && objects[idx(x, y)] === Block.AIR && ground[idx(x, y)] !== Block.PATH;

  const path = (x0: number, y0: number, x1: number, y1: number) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (inside(x, y)) ground[idx(x, y)] = Block.PATH;
  };
  // Estrada principal do portão ao celeiro, praça redonda do poço e ramais até a porta de cada casa.
  path(22, 11, 25, 47);
  for (let y = 19; y <= 31; y++) for (let x = 17; x <= 31; x++) if ((x - 24) ** 2 + ((y - 25) * 1.1) ** 2 <= 36) path(x, y, x, y);
  path(13, 18, 22, 19); path(25, 19, 34, 20); path(11, 28, 21, 29); path(26, 28, 36, 29); path(15, 38, 21, 39); path(26, 38, 33, 39);

  /** Põe uma peça: id na âncora (canto inferior esquerdo do lote w × d) e `TOWN_PART` no resto; `cells` = lote em L (só essas células). */
  const put = (id: BlockId, x: number, y: number, cells?: Array<[number, number]>, force = false): boolean => {
    const [w, d] = VILLAGE_SIZES[id]!;
    const lot: Array<[number, number]> = cells ?? [];
    if (!cells) for (let dy = 0; dy < d; dy++) for (let dx = 0; dx < w; dx++) lot.push([x + dx, y - dy]);
    const solid = id !== Block.V_FLOWERS;
    const body = solid ? lot : [[x, y] as [number, number]];
    if (!force && body.some(([cx, cy]) => !free(cx, cy))) return false;
    for (const [cx, cy] of body) if (inside(cx, cy)) objects[idx(cx, cy)] = Block.TOWN_PART;
    objects[idx(x, y)] = id;
    props.push({ id, ...at(x, y) });
    return true;
  };
  /** Peça sem teste de ocupação (a estrutura: muro, casas, celeiro). */
  const must = (id: BlockId, x: number, y: number, cells?: Array<[number, number]>) => put(id, x, y, cells, true);

  // --- Muro de estacas (norte: linha 4; sul: linha 43; oeste: coluna 1; leste: coluna 46) ---
  const row = (x0: number, x1: number, y: number): Array<[number, number]> => Array.from({ length: x1 - x0 + 1 }, (_, i) => [x0 + i, y]);
  const col = (x: number, y0: number, y1: number): Array<[number, number]> => Array.from({ length: y1 - y0 + 1 }, (_, i) => [x, y0 + i]);
  must(Block.V_PAL_NW, 1, 9, [...row(1, 7, 4), ...col(1, 5, 9)]);
  must(Block.V_PAL_NE, 40, 9, [...row(40, 46, 4), ...col(46, 5, 9), [40, 9]]); // âncora no canto de dentro do lote: bloqueada também
  must(Block.V_PAL_SW, 1, 43, [...row(1, 6, 43), ...col(1, 38, 42)]);
  must(Block.V_PAL_SE, 41, 43, [...row(41, 46, 43), ...col(46, 38, 42)]);
  for (const [x, id] of [[8, Block.V_PAL_H6], [14, Block.V_PAL_H7], [21, Block.V_PAL_H6], [27, Block.V_PAL_H7], [34, Block.V_PAL_H6]] as const) must(id, x, 4);
  for (const [x, id] of [[7, Block.V_PAL_H6], [13, Block.V_PAL_H7], [28, Block.V_PAL_H7], [35, Block.V_PAL_H6]] as const) must(id, x, 43);
  for (let y = 10; y <= 37; y++) { must(Block.V_PAL_W, 1, y); must(Block.V_PAL_E, 46, y); }
  must(Block.V_GATE, 20, 43, [[20, 43], [27, 43]]); // dois postes; o vão (x 21–26) tem os blocos do portão, livres com ele aberto
  for (let x = 21; x <= 26; x++) objects[idx(x, 43)] = Block.V_GATE_GAP;

  // --- Construções ---
  must(Block.V_BARN, 18, 10);
  must(Block.V_COOP, 40, 8);
  must(Block.V_BED_WHEAT, 3, 17);
  must(Block.V_BED_VEG, 39, 22);
  must(Block.V_WELL, 22, 27);
  for (const [id, x, y] of [
    [Block.V_HOUSE_STRAW, 9, 17], [Block.V_HOUSE_TILE, 30, 18], [Block.V_HOUSE_TILE, 7, 27],
    [Block.V_HOUSE_STRAW, 32, 27], [Block.V_HOUSE_STRAW, 11, 37], [Block.V_HOUSE_TILE, 29, 37],
  ] as const) must(id, x, y);

  // --- Árvores (tronco 1 × 1 com o desenho alto) ---
  for (const [x, y] of [[7, 9], [27, 20], [6, 36], [42, 38]] as const) must(Block.V_OAK, x, y);
  for (const [x, y] of [[5, 22], [43, 28]] as const) must(Block.V_TREE, x, y);

  // --- Enfeites (só entram onde há lugar livre) ---
  for (const [x, y] of [[22, 20], [18, 24], [28, 23], [19, 30], [27, 30]] as const) put(Block.V_BENCH, x, y);
  for (const [x, y] of [[15, 9], [16, 7]] as const) put(Block.V_HAY, x, y);
  for (const [x, y] of [[17, 10], [28, 11], [19, 22], [10, 36], [26, 36]] as const) put(Block.V_BARREL, x, y);
  put(Block.V_CART, 29, 12);
  for (const [x, y] of [[5, 27], [27, 36]] as const) put(Block.V_LOGS, x, y);
  for (const [x, y] of [[39, 28], [17, 18], [34, 31]] as const) put(Block.V_SACKS, x, y);
  for (const [x, y] of [[33, 7], [40, 15], [4, 38], [38, 39], [15, 46], [37, 46]] as const) put(Block.V_ROCKS, x, y);
  for (const [x, y] of [[18, 22], [43, 14], [13, 5], [19, 16], [37, 32], [4, 46], [30, 46], [34, 22], [13, 33]] as const) put(Block.V_BUSH, x, y);
  // capim e flores espalhados (sorteio fixo, sem `Math.random`); não bloqueiam
  for (let ly = 5; ly <= 47; ly++) {
    for (let lx = 0; lx < W; lx++) {
      if (hash2(0x71a9e, lx * 7 + 1, ly * 13 + 5) < 0.026 && free(lx, ly)) put(Block.V_FLOWERS, lx, ly);
    }
  }

  const area: Rect = { x0: VILLAGE_X0, y0: VILLAGE_Y0, x1: VILLAGE_X0 + W - 1, y1: VILLAGE_Y0 + H - 1 };
  // Trilha: do fim da estrada da cidade (mundo y = TOWN_SOUTH_FIELD / 2) para o sul até a vila, contorna o muro pelo oeste e entra pelo portão.
  const gx = VILLAGE_X0 + 22;
  const trailTop = VILLAGE_Y0 - 44;
  const trail: Rect[] = [
    { x0: gx, y0: trailTop, x1: gx + 3, y1: VILLAGE_Y0 - 3 },
    { x0: VILLAGE_X0 - 3, y0: VILLAGE_Y0 - 4, x1: gx + 3, y1: VILLAGE_Y0 - 3 },
    { x0: VILLAGE_X0 - 3, y0: VILLAGE_Y0 - 4, x1: VILLAGE_X0 - 2, y1: VILLAGE_Y0 + 49 },
    { x0: VILLAGE_X0 - 3, y0: VILLAGE_Y0 + 48, x1: gx + 3, y1: VILLAGE_Y0 + 49 },
    { x0: gx, y0: VILLAGE_Y0 + 44, x1: gx + 3, y1: VILLAGE_Y0 + 49 },
  ];
  const touched: Rect = { x0: area.x0 - VILLAGE_MARGIN, y0: trailTop, x1: area.x1 + VILLAGE_MARGIN, y1: area.y1 + VILLAGE_MARGIN };
  return { w: W, h: H, area, gate: { x0: VILLAGE_X0 + 21, y0: VILLAGE_Y0 + 43, x1: VILLAGE_X0 + 26, y1: VILLAGE_Y0 + 43 }, trail, touched, ground, objects, props };
}

/**
 * Terreno com a vila sobreposta (padrão de `TownTerrain`): dentro da área, o mapa da vila; no anel em volta, terra firme (água vira
 * grama) e, perto do muro, sem objetos naturais; a trilha de terra por cima. Fora disso, o terreno base.
 */
export class VillageTerrain implements TerrainSource {
  constructor(private readonly base: TerrainSource, readonly layout: VillageLayout) {}

  get seed(): number {
    return this.base.seed;
  }

  private onTrail(x: number, y: number): boolean {
    return this.layout.trail.some((r) => inRect(r, x, y));
  }

  private surround(x: number, y: number, c: Cell): Cell {
    const a = this.layout.area;
    if (this.onTrail(x, y)) return { ground: Block.PATH, object: Block.AIR, upper: Block.AIR };
    const d = Math.max(a.x0 - x, x - a.x1, a.y0 - y, y - a.y1);
    if (d > VILLAGE_MARGIN) return c;
    const g = blockDef(c.ground);
    const ground = g.liquid || c.ground === Block.HOLE ? Block.GRASS : c.ground;
    if (d <= VILLAGE_CLEAR) return { ground, object: Block.AIR, upper: Block.AIR };
    return { ground, object: c.object, upper: c.upper };
  }

  cellAt(x: number, y: number): Cell {
    const l = this.layout;
    if (inRect(l.area, x, y)) {
      const i = (y - l.area.y0) * l.w + (x - l.area.x0);
      return { ground: l.ground[i] as BlockId, object: l.objects[i] as BlockId, upper: Block.AIR };
    }
    const c = this.base.cellAt(x, y);
    return inRect(l.touched, x, y) ? this.surround(x, y, c) : c;
  }

  groundAt(x: number, y: number): BlockId { return this.cellAt(x, y).ground; }
  objectAt(x: number, y: number): BlockId { return this.cellAt(x, y).object; }
  upperAt(x: number, y: number): BlockId { return this.cellAt(x, y).upper; }
  biomeAt(x: number, y: number): Biome { return this.base.biomeAt(x, y); }

  generateChunk(cx: number, cy: number, ground: Uint8Array, objects: Uint8Array, upper: Uint8Array): void {
    this.base.generateChunk(cx, cy, ground, objects, upper);
    const t = this.layout.touched;
    const S = Math.round(Math.sqrt(ground.length));
    const x0 = cx * S, y0 = cy * S;
    if (x0 > t.x1 || x0 + S - 1 < t.x0 || y0 > t.y1 || y0 + S - 1 < t.y0) return;
    for (let ly = 0; ly < S; ly++) {
      for (let lx = 0; lx < S; lx++) {
        const x = x0 + lx, y = y0 + ly;
        if (!inRect(t, x, y)) continue;
        const i = ly * S + lx;
        const c = inRect(this.layout.area, x, y)
          ? this.cellAt(x, y)
          : this.surround(x, y, { ground: ground[i] as BlockId, object: objects[i] as BlockId, upper: upper[i] as BlockId });
        ground[i] = c.ground; objects[i] = c.object; upper[i] = c.upper;
      }
    }
  }
}
