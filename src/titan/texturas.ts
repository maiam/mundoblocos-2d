import type { Arrival, Column } from './generator';
import { fresh, type TitanSession } from './session';
import type { TerrainGen, VoxelWorld } from './terrain';
import { BLOCK_NAMES, inRegion, REGION_V6, type Region, T, tileFor } from './voxel';

/**
 * Cena de desenvolvimento das texturas (`?cena=texturas`, só no `npm run dev`; ADR 0105): uma vitrine plana com cada bloco de terreno em três formas — **cubo** isolado, **massa** 3 × 3 × 3 (emendas e
 * repetição do padrão) e **parede** 3 × 3 vista de frente — para conferir a arte do atlas no motor de verdade (mesmo `mesher`, luz e céu do jogo). Mais uma piscina para a água. **Nada é gravado**
 * (armazenamento em memória). Sem DOM.
 */

/** Fileiras da vitrine, da esquerda para a direita: o Orvalis em voxel e o terreno do Titã (cubos inteiros e a laje de rocha). */
export const ORVALIS_ROW: readonly number[] = [T.GRASS, T.DIRT, T.STONE, T.BEACH, T.LOG_OAK, T.LEAVES_OAK, T.LOG_CHERRY, T.LEAVES_CHERRY, T.LOG_BIRCH, T.LEAVES_BIRCH];
export const ORVALIS_ROW2: readonly number[] = [T.PLANKS_OAK, T.PLANKS_CHERRY, T.PLANKS_BIRCH, T.CARPENTRY, T.STONE_SMOOTH, T.STONE_BRICK, T.STONE_SLAB, T.STONE_STAIR, T.FARMLAND_DRY, T.FARMLAND_WET, T.PATH, T.DIRT_INFERTILE, T.CLAY_BLOCK, T.BRICK_BLOCK]; // madeira e pedra de obra (ADR 0107, 0108, 0109, 0111)
export const TITAN_ROW: readonly number[] = [T.SAND, T.DAMP_SAND, T.DARK_ROCK, T.FROST, T.VEIN_ROCK, T.VEIN_FROST, T.VEIN_COPPER, T.EMBER, T.CARAPACE, T.EMBER_VEIN, T.EMBER_BLOCK, T.REED_BLOCK, T.SLAB];
export const ROWS: ReadonlyArray<{ z0: number; blocks: readonly number[]; label: string }> = [
  { z0: 0, blocks: ORVALIS_ROW, label: 'Fila 1 (Orvalis: terreno e árvores)' },
  { z0: 10, blocks: ORVALIS_ROW2, label: 'Fila 2 (Orvalis: madeira, pedra, solo e cerâmica)' },
  { z0: 20, blocks: TITAN_ROW, label: 'Fila 3 (Titã)' },
];
/** Distância entre blocos no eixo X, início da fileira e piscina de água (x, z, lado). */
export const STEP = 4;
export const X0 = 0;
export const POOL = { x: 0, z: 30, size: 6 } as const;
const FLOOR_Y = 63;
const POOL_FLOOR_Y = 60;

const inPool = (x: number, z: number): boolean => x >= POOL.x && x < POOL.x + POOL.size && z >= POOL.z && z < POOL.z + POOL.size;

/** Piso de rocha-mãe em Y ≤ 63 (neutro, para não confundir com as amostras) e uma piscina de 3 blocos de água. Tudo em cima é ar; os blocos entram por `buildTexturesScene`. */
export class TexturesGen implements TerrainGen {
  readonly version = 1;
  readonly region: Region = REGION_V6;
  readonly arrival: Arrival = { x: 0.5, y: FLOOR_Y + 1, z: -4, yaw: Math.PI, clearing: { x0: -1, z0: -5, size: 3 } };
  readonly surfaceItems: TerrainGen['surfaceItems'] = [];
  readonly plates: TerrainGen['plates'] = [];
  readonly dryReeds: TerrainGen['dryReeds'] = [];
  readonly reeds: TerrainGen['reeds'] = [];
  readonly nutPlants: TerrainGen['nutPlants'] = [];
  readonly den = null;
  constructor(readonly seed: number, readonly world: VoxelWorld = 'orvalis') {}
  reedsFor(): Array<{ x: number; y: number; z: number }> { return []; }
  planEmber(): Array<{ x: number; z: number }> { return []; }
  inRegion(x: number, z: number): boolean { return inRegion(x, z, this.region); }
  column(x: number, z: number): Column { return { top: inPool(x, z) ? POOL_FLOOR_Y : FLOOR_Y, surface: T.BEDROCK, sub: T.BEDROCK }; }
  blockAt(x: number, y: number, z: number): number {
    const top = inPool(x, z) ? POOL_FLOOR_Y : FLOOR_Y;
    return y <= top ? T.BEDROCK : inPool(x, z) && y <= FLOOR_Y ? T.LAKE : T.AIR;
  }
}

/** Células do bloco `id` da coluna `i` da fileira em `z0`: o cubo, a massa 3 × 3 × 3 e a parede 3 × 1 × 3. */
export function showcaseCells(id: number, i: number, z0: number): Array<[number, number, number, number]> {
  const x0 = X0 + i * STEP, out: Array<[number, number, number, number]> = [[x0 + 1, FLOOR_Y + 1, z0, id]];
  for (let y = 0; y < 3; y++) for (let dx = 0; dx < 3; dx++) {
    for (let dz = 0; dz < 3; dz++) out.push([x0 + dx, FLOOR_Y + 1 + y, z0 + 2 + dz, id]);
    out.push([x0 + dx, FLOOR_Y + 1 + y, z0 + 6, id]);
  }
  return out;
}

/** Sessão da vitrine (memória) já montada. */
export function texturesSession(seed: number, world: VoxelWorld): TitanSession {
  const s = fresh(new TexturesGen(seed, world));
  for (const row of ROWS) row.blocks.forEach((id, i) => { for (const [x, y, z, b] of showcaseCells(id, i, row.z0)) s.volume.set(x, y, z, b); });
  return s;
}

/** Legenda da vitrine: a ordem dos blocos de cada fileira (esquerda → direita) e o tile do topo, para achar a textura no atlas. */
export function texturesCaption(): string[] {
  return [...ROWS.map((r) => `${r.label}: ${r.blocks.map((id, i) => `${i + 1} ${BLOCK_NAMES[id]} (tile ${tileFor(id, 'top')})`).join(' · ')}`), `Piscina de água em z ${POOL.z}–${POOL.z + POOL.size - 1}`];
}
