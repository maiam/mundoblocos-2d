import type { Biome } from './biomes';
import { Block, type BlockId } from './blocks';
import { hash2 } from './random';
import type { Cell, TerrainSource } from './terrain';

/**
 * Dungeon — área fechada por montanhas com UMA entrada, monstros presos dentro e nada quebrável.
 * Tudo aqui é função pura de (seed, âncora): o mapa da área e onde nasce cada monstro.
 */

/** Largura × altura da área em células (inclui a muralha). */
export const DUNGEON_W = 34;
export const DUNGEON_H = 24;
/** Espessura da muralha de montanhas e largura da entrada. */
const WALL = 2;
const GATE = 3;

export type MonsterKind = 'spider-small' | 'spider-big' | 'spider-boss';
export type Side = 'north' | 'south' | 'west' | 'east';

export interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface MonsterSpawn {
  kind: MonsterKind;
  x: number;
  y: number;
}

export interface DungeonLayout {
  /** Área inteira (muralha incluída), inclusiva. Protegida: nada quebra, nada é colocado. */
  area: Rect;
  /** Interior andável (sem a muralha). Monstros nunca saem daqui. */
  interior: Rect;
  /** Lado da entrada e as células do vão na muralha. */
  side: Side;
  gate: Array<[number, number]>;
  /** Célula do lado de fora, logo diante da entrada. */
  doorstep: [number, number];
  /** Centro da arena do chefe (sem obstáculos ao redor). */
  bossHome: [number, number];
  spawns: MonsterSpawn[];
  /** Mapa da área: chão e objeto por célula (índice = (y - y0) * W + (x - x0)). */
  ground: Uint8Array;
  objects: Uint8Array;
}

export const MONSTER_COUNTS: Record<MonsterKind, number> = { 'spider-small': 10, 'spider-big': 5, 'spider-boss': 1 };

const PROPS: BlockId[] = [Block.DUNGEON_ROCK, Block.DUNGEON_ROCK, Block.DUNGEON_ROCK, Block.DUNGEON_EGGS,
  Block.DUNGEON_MUSHROOM, Block.DUNGEON_SPIKES, Block.DUNGEON_ROOTS];

export function inRect(r: Rect, x: number, y: number): boolean {
  return x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1;
}

/**
 * Monta a dungeon com o canto superior-esquerdo em (x0, y0) e a entrada no lado `side`.
 * Obstáculos internos são isolados (nenhum vizinho, nem na diagonal, é obstáculo) e ficam a 1 célula da
 * muralha: assim nunca dividem o interior — toda célula livre é alcançável a partir da entrada.
 */
export function buildDungeon(seed: number, x0: number, y0: number, side: Side): DungeonLayout {
  const W = DUNGEON_W;
  const H = DUNGEON_H;
  const area = { x0, y0, x1: x0 + W - 1, y1: y0 + H - 1 };
  const interior = { x0: x0 + WALL, y0: y0 + WALL, x1: area.x1 - WALL, y1: area.y1 - WALL };
  const ground = new Uint8Array(W * H);
  const objects = new Uint8Array(W * H);
  const idx = (x: number, y: number) => (y - y0) * W + (x - x0);

  // Entrada: vão de GATE células no meio do lado escolhido, atravessando a muralha.
  const gate: Array<[number, number]> = [];
  const midX = x0 + Math.floor(W / 2) - 1;
  const midY = y0 + Math.floor(H / 2) - 1;
  for (let k = 0; k < GATE; k++) {
    for (let d = 0; d < WALL; d++) {
      if (side === 'north') gate.push([midX + k, y0 + d]);
      if (side === 'south') gate.push([midX + k, area.y1 - d]);
      if (side === 'west') gate.push([x0 + d, midY + k]);
      if (side === 'east') gate.push([area.x1 - d, midY + k]);
    }
  }
  const isGate = new Set(gate.map(([x, y]) => idx(x, y)));
  const center = side === 'north' || side === 'south' ? midX + 1 : midY + 1;
  const doorstep: [number, number] = side === 'north' ? [center, y0 - 1] : side === 'south' ? [center, area.y1 + 1]
    : side === 'west' ? [x0 - 1, center] : [area.x1 + 1, center];
  // Ponto de chegada logo dentro da entrada (zona livre).
  const inside: [number, number] = side === 'north' ? [center, interior.y0] : side === 'south' ? [center, interior.y1]
    : side === 'west' ? [interior.x0, center] : [interior.x1, center];
  // Chefe no fundo, do lado oposto à entrada.
  const bossHome: [number, number] = side === 'north' ? [center, interior.y1 - 4] : side === 'south' ? [center, interior.y0 + 4]
    : side === 'west' ? [interior.x1 - 6, center] : [interior.x0 + 6, center];

  for (let y = y0; y <= area.y1; y++) {
    for (let x = x0; x <= area.x1; x++) {
      const i = idx(x, y);
      const h = hash2(seed, x * 3 + 101, y * 5 - 77);
      // Terra predominante; musgo, teias e ossos salpicados.
      ground[i] = h < 0.84 ? Block.DUNGEON_DIRT : h < 0.92 ? Block.DUNGEON_MOSS : h < 0.97 ? Block.DUNGEON_WEB : Block.DUNGEON_BONES;
      objects[i] = !inRect(interior, x, y) && !isGate.has(i) ? Block.DUNGEON_MOUNTAIN : Block.AIR;
    }
  }

  // Obstáculos isolados no interior (fora da zona da entrada e da arena do chefe).
  const free = (x: number, y: number) => Math.hypot(x - inside[0], y - inside[1]) > 4 && Math.hypot(x - bossHome[0], y - bossHome[1]) > 5;
  for (let y = interior.y0 + 1; y <= interior.y1 - 1; y++) {
    for (let x = interior.x0 + 1; x <= interior.x1 - 1; x++) {
      if (!free(x, y) || hash2(seed, x + 913, y - 211) > 0.16) continue;
      let lonely = true;
      for (let dy = -1; dy <= 1 && lonely; dy++) for (let dx = -1; dx <= 1; dx++) if (objects[idx(x + dx, y + dy)] !== Block.AIR) lonely = false;
      if (!lonely) continue;
      objects[idx(x, y)] = PROPS[Math.floor(hash2(seed, x - 57, y + 389) * PROPS.length)];
    }
  }

  // Monstros: chefe na arena; os demais em células livres longe da entrada, sem repetir célula.
  const spawns: MonsterSpawn[] = [{ kind: 'spider-boss', x: bossHome[0] + 0.5, y: bossHome[1] + 0.5 }];
  const used = new Set<number>([idx(bossHome[0], bossHome[1])]);
  const want: MonsterKind[] = [
    ...Array<MonsterKind>(MONSTER_COUNTS['spider-big']).fill('spider-big'),
    ...Array<MonsterKind>(MONSTER_COUNTS['spider-small']).fill('spider-small'),
  ];
  for (let n = 0; n < 4000 && want.length; n++) {
    const x = interior.x0 + 1 + Math.floor(hash2(seed, n, 4441) * (interior.x1 - interior.x0 - 1));
    const y = interior.y0 + 1 + Math.floor(hash2(seed, n, 4447) * (interior.y1 - interior.y0 - 1));
    const i = idx(x, y);
    if (objects[i] !== Block.AIR || used.has(i) || Math.hypot(x - inside[0], y - inside[1]) < 7) continue;
    if (Math.hypot(x - bossHome[0], y - bossHome[1]) < 3) continue;
    used.add(i);
    spawns.push({ kind: want.shift()!, x: x + 0.5, y: y + 0.5 });
  }

  return { area, interior, side, gate, doorstep, bossHome, spawns, ground, objects };
}

/** Lado da área voltado para o ponto (px, py): a entrada fica de frente para o jogador. */
export function sideFacing(area: Rect, px: number, py: number): Side {
  const cx = (area.x0 + area.x1) / 2;
  const cy = (area.y0 + area.y1) / 2;
  const dx = (px - cx) / (area.x1 - area.x0);
  const dy = (py - cy) / (area.y1 - area.y0);
  if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? 'west' : 'east';
  return dy < 0 ? 'north' : 'south';
}

/**
 * Escolhe onde a dungeon fica no mundo principal: perto do spawn (26–60 células), num terreno com pouca
 * água e com a frente da entrada em terra firme. Determinístico (ordem fixa de tentativas).
 */
export function planDungeon(base: TerrainSource, spawnX: number, spawnY: number): DungeonLayout {
  const dirs: Array<[number, number]> = [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]];
  const land = (x: number, y: number) => base.groundAt(x, y) !== Block.WATER;
  let fallback: DungeonLayout | null = null;
  for (let dist = 26; dist <= 60; dist += 4) {
    for (const [dx, dy] of dirs) {
      const cx = spawnX + Math.round(dx * dist);
      const cy = spawnY + Math.round(dy * dist);
      const x0 = cx - Math.floor(DUNGEON_W / 2);
      const y0 = cy - Math.floor(DUNGEON_H / 2);
      const area = { x0, y0, x1: x0 + DUNGEON_W - 1, y1: y0 + DUNGEON_H - 1 };
      if (inRect({ x0: area.x0 - 3, y0: area.y0 - 3, x1: area.x1 + 3, y1: area.y1 + 3 }, spawnX, spawnY)) continue;
      const layout = buildDungeon(base.seed, x0, y0, sideFacing(area, spawnX, spawnY));
      fallback ??= layout;
      let water = 0;
      for (let y = area.y0; y <= area.y1; y += 2) for (let x = area.x0; x <= area.x1; x += 2) if (!land(x, y)) water++;
      const [sx, sy] = layout.doorstep;
      const front = [-1, 0, 1].every((k) => (layout.side === 'north' || layout.side === 'south' ? land(sx + k, sy) : land(sx, sy + k)));
      if (water <= 6 && front) return layout;
    }
  }
  return fallback!;
}

/** Terreno com a dungeon sobreposta: dentro da área usa o mapa da dungeon; fora, o terreno base. */
export class DungeonTerrain implements TerrainSource {
  constructor(private readonly base: TerrainSource, readonly layout: DungeonLayout) {}

  get seed(): number {
    return this.base.seed;
  }

  cellAt(x: number, y: number): Cell {
    const l = this.layout;
    if (!inRect(l.area, x, y)) return this.base.cellAt(x, y);
    const i = (y - l.area.y0) * DUNGEON_W + (x - l.area.x0);
    return { ground: l.ground[i] as BlockId, object: l.objects[i] as BlockId, upper: Block.AIR };
  }

  groundAt(x: number, y: number): BlockId {
    return this.cellAt(x, y).ground;
  }

  objectAt(x: number, y: number): BlockId {
    return this.cellAt(x, y).object;
  }

  upperAt(x: number, y: number): BlockId {
    return this.cellAt(x, y).upper;
  }

  biomeAt(x: number, y: number): Biome {
    return this.base.biomeAt(x, y);
  }

  generateChunk(cx: number, cy: number, ground: Uint8Array, objects: Uint8Array, upper: Uint8Array): void {
    this.base.generateChunk(cx, cy, ground, objects, upper);
    const l = this.layout.area;
    const S = Math.sqrt(ground.length);
    const x0 = cx * S;
    const y0 = cy * S;
    if (x0 > l.x1 || x0 + S - 1 < l.x0 || y0 > l.y1 || y0 + S - 1 < l.y0) return;
    for (let ly = 0; ly < S; ly++) {
      for (let lx = 0; lx < S; lx++) {
        const x = x0 + lx;
        const y = y0 + ly;
        if (!inRect(l, x, y)) continue;
        const c = this.cellAt(x, y);
        const i = ly * S + lx;
        ground[i] = c.ground;
        objects[i] = c.object;
        upper[i] = c.upper;
      }
    }
  }
}
