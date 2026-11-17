import { CHUNK_SIZE } from '../config';
import { type Biome, BIOMES } from './biomes';
import { Block, type BlockId, FLOWER_BLOCKS } from './blocks';
import { Noise } from './noise';
import { hash2 } from './random';
import { RIO_CANAL, RIO_LAGO } from './rio';
import type { Cell, TerrainSource } from './terrain';

/**
 * Paisagem fixa de uma seed do Santuário (v0.93.148). Função PURA da seed (sem DOM, sem `Math.random()`): só as seeds de `LANDSCAPE_SEEDS` têm paisagem; as demais
 * continuam planas e vazias (`landscapeFor` devolve null).
 *
 * Só blocos do Mundo: terra, grama, areia, pedra, madeira (toras, tábuas, porta, cerca), flores, mais o que o Santuário já tem para água (Rio: Lago e Canal),
 * árvore (Carvalho) e arbustos. Relevo em 3 alturas de cubos (1 só na beira, 2 = planície e água rente ao chão, 3 = colinas e passarelas erguidas); toda diferença entre vizinhos é de 1 (o degrau da Deusa).
 * Objetos ficam EM CIMA da pilha (`surfaceObjects`), no nível = altura da coluna.
 */
export const LANDSCAPE_SEEDS: ReadonlySet<number> = new Set([1835638650]);

/** Casa de madeira da paisagem (células): piso, 2 níveis de parede e telhado; a porta fica na parede sul (a 3ª célula). */
export const LANDSCAPE_HUT = { x: -10, y: -14, w: 6, h: 5 } as const;

/** Limites do Santuário (4 × 4 chunks, centrados na origem). */
const MIN = -2 * CHUNK_SIZE;
const SIZE = 4 * CHUNK_SIZE;
const MAX_LEVELS = 5;

export function landscapeFor(seed: number, ground: BlockId): SanctuaryLandscape | null {
  return LANDSCAPE_SEEDS.has(seed >>> 0) ? new SanctuaryLandscape(seed, ground) : null;
}

type Column = number[];

export class SanctuaryLandscape implements TerrainSource {
  readonly seed: number;
  /** Coluna de cada célula (índice (y − MIN) · SIZE + (x − MIN)): ids por nível da pilha, do chão para cima. */
  private readonly cols: Column[];
  private readonly biome: Biome = BIOMES.celestial;

  constructor(seed: number, private readonly ground: BlockId) {
    this.seed = seed >>> 0;
    this.cols = buildLandscape(this.seed);
  }

  private column(x: number, y: number): Column | undefined {
    if (x < MIN || y < MIN || x >= MIN + SIZE || y >= MIN + SIZE) return undefined;
    return this.cols[(y - MIN) * SIZE + (x - MIN)];
  }

  cellAt(x: number, y: number): Cell {
    const c = this.column(x, y);
    return { ground: this.ground, object: (c?.[0] ?? Block.AIR) as BlockId, upper: (c?.[1] ?? Block.AIR) as BlockId };
  }
  groundAt(): BlockId { return this.ground; }
  objectAt(x: number, y: number): BlockId { return this.cellAt(x, y).object; }
  upperAt(x: number, y: number): BlockId { return this.cellAt(x, y).upper; }
  biomeAt(): Biome { return this.biome; }

  generateChunk(cx: number, cy: number, ground: Uint8Array, objects: Uint8Array, upper: Uint8Array): void {
    ground.fill(this.ground, 0, CHUNK_SIZE * CHUNK_SIZE);
    for (let ly = 0; ly < CHUNK_SIZE; ly++) {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        const c = this.cellAt(cx * CHUNK_SIZE + lx, cy * CHUNK_SIZE + ly);
        objects[ly * CHUNK_SIZE + lx] = c.object;
        upper[ly * CHUNK_SIZE + lx] = c.upper;
      }
    }
  }

  /** Níveis 2..4 da pilha (o gerador comum só conhece os dois primeiros). */
  generateLevels(cx: number, cy: number, levels: Uint8Array[]): void {
    for (let ly = 0; ly < CHUNK_SIZE; ly++) {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        const c = this.column(cx * CHUNK_SIZE + lx, cy * CHUNK_SIZE + ly);
        if (!c) continue;
        for (let l = 2; l < Math.min(levels.length, c.length); l++) levels[l][ly * CHUNK_SIZE + lx] = c[l];
      }
    }
  }
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------

interface Plan {
  /** Altura (nº de cubos) por célula e o bloco do topo (o que se pisa). */
  h: Uint8Array;
  top: Uint16Array;
  /** Objeto de superfície (árvore, arbusto, flor, porta, cerca…) por célula. */
  obj: Uint16Array;
  /** Células reservadas (água, praia, ponte, cais, casa, jardim): nada nasce nelas. */
  keep: Uint8Array;
  /** Colunas completas que sobrescrevem a regra h/top (a casa e o cais). */
  custom: Map<number, Column>;
}

const idx = (x: number, y: number): number => (y - MIN) * SIZE + (x - MIN);
const inside = (x: number, y: number): boolean => x >= MIN && y >= MIN && x < MIN + SIZE && y < MIN + SIZE;

function buildLandscape(seed: number): Column[] {
  const noise = new Noise(seed ^ 0x5a17);
  const n = (x: number, y: number, s: number): number => noise.fbm2(x / s + 17.3, y / s - 9.1, 3);
  const p: Plan = {
    h: new Uint8Array(SIZE * SIZE).fill(2), top: new Uint16Array(SIZE * SIZE).fill(Block.GRASS),
    obj: new Uint16Array(SIZE * SIZE), keep: new Uint8Array(SIZE * SIZE), custom: new Map(),
  };
  const each = (f: (x: number, y: number, i: number) => void): void => {
    for (let y = MIN; y < MIN + SIZE; y++) for (let x = MIN; x < MIN + SIZE; x++) f(x, y, idx(x, y));
  };

  // 1. Colinas (altura 3): a grande ao nordeste (com afloramento de pedra) e a pequena ao noroeste.
  const hill = (cx: number, cy: number, rx: number, ry: number, stone: number): void => each((x, y, i) => {
    const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 + 0.3 * n(x, y, 6);
    if (d < 1) {
      p.h[i] = 3;
      if (d < stone) p.top[i] = Block.STONE_COBBLE;
    }
  });
  hill(15, -14, 14, 10, 0.1);
  hill(-22, -18, 8, 6, 0.06);

  // 2. Lago (Rio: Lago) com praia de areia.
  const LX = -11, LY = 10, RX = 12, RY = 8;
  const lake = (x: number, y: number): number => ((x - LX) / RX) ** 2 + ((y - LY) / RY) ** 2 + 0.3 * n(x, y, 5);
  each((x, y, i) => {
    const d = lake(x, y);
    if (d < 1) { p.top[i] = RIO_LAGO; p.keep[i] = 1; } // a água fica rente à planície: a arte das peças já traz a margem
    else if (d < 1.32) { p.top[i] = Block.SAND; p.keep[i] = 1; }
  });

  // 3. Rio (Rio: Canal): uma coluna reta de uma célula, de uma nascente ao norte até a margem norte do lago (a peça "Foz para lago" é a do canal que desce para o
  //    lago). Reto de propósito: as peças de canal disponíveis só têm retas, curvas norte–leste/oeste, Ts e pontas (as curvas sul–leste/oeste faltam; NEXT_STEPS).
  const river: number[] = [];
  const RIVER_X = -15;
  for (let y = -12; y < MIN + SIZE; y++) {
    const i = idx(RIVER_X, y);
    if (p.top[i] === RIO_LAGO) break;
    if (p.h[i] === 3) continue;
    p.top[i] = RIO_CANAL; p.keep[i] = 1; river.push(i);
  }

  /** Põe tábuas ao nível da planície (altura 2) por cima do que houver (água, praia ou grama). */
  const plank = (x: number, y: number): void => {
    if (!inside(x, y)) return;
    const i = idx(x, y);
    if (p.h[i] === 3) return;
    if (p.top[i] === RIO_CANAL || p.top[i] === RIO_LAGO) p.custom.set(i, [Block.STONE, p.top[i], Block.OAK_PLANKS]); // passarela erguida 1 cubo sobre a água
    else p.top[i] = Block.OAK_PLANKS; // nas margens as tábuas ficam rentes ao chão
    p.keep[i] = 1;
  };
  const post = (x: number, y: number): void => {
    const i = idx(x, y);
    const base = p.custom.get(i) ?? [Block.STONE, Block.OAK_PLANKS];
    p.custom.set(i, [...base.slice(0, base.length), Block.OAK_LOG]);
  };

  // 4. Ponte de tábuas sobre o rio (no meio do curso) e cais no lago.
  if (river.length) {
    const mid = river[Math.floor(river.length / 2)];
    const by = Math.floor(mid / SIZE) + MIN;
    for (let x = MIN; x < MIN + SIZE; x++) {
      const i = idx(x, by);
      if (p.top[i] === RIO_CANAL) for (let k = -2; k <= 2; k++) plank(x + k, by);
    }
  }
  const DY = 12;
  for (let x = -4; x <= 3; x++) for (let y = DY; y <= DY + 1; y++) plank(x, y);
  post(-4, DY); post(-4, DY + 1); post(3, DY); post(3, DY + 1);

  // 5. Casa de madeira (4 × 5): piso de tábuas, paredes de toras nos cantos e tábuas nos lados, porta ao sul e telhado de tábuas (a 5ª camada da pilha).
  const { x: HX, y: HY, w: HW, h: HH } = LANDSCAPE_HUT;
  for (let y = HY; y < HY + HH; y++) {
    for (let x = HX; x < HX + HW; x++) {
      const i = idx(x, y);
      p.h[i] = 2; p.top[i] = Block.OAK_PLANKS; p.keep[i] = 1;
      const edge = x === HX || x === HX + HW - 1 || y === HY || y === HY + HH - 1;
      const corner = (x === HX || x === HX + HW - 1) && (y === HY || y === HY + HH - 1);
      const wall = corner ? Block.OAK_LOG : Block.OAK_PLANKS;
      const door = y === HY + HH - 1 && x === HX + 2;
      if (edge) p.custom.set(i, [Block.STONE, Block.OAK_PLANKS, door ? Block.OAK_DOOR : wall, door ? Block.OAK_PLANKS : wall, Block.OAK_PLANKS]);
      else p.custom.set(i, [Block.STONE, Block.OAK_PLANKS, Block.AIR, Block.AIR, Block.OAK_PLANKS]);
    }
  }
  // (a pilha tem 5 níveis: chão de pedra, tábuas, 2 de parede, telhado; dentro da casa o vazio fica sob o telhado)

  // 6. Jardim cercado de flores ao lado da casa (cerca de madeira com portão ao sul).
  const GX = -10, GY = -7, GW = 7, GH = 5;
  for (let y = GY; y < GY + GH; y++) {
    for (let x = GX; x < GX + GW; x++) {
      const i = idx(x, y);
      p.keep[i] = 1;
      if (x === GX || x === GX + GW - 1 || y === GY || y === GY + GH - 1) p.obj[i] = y === GY + GH - 1 && x === GX + 3 ? Block.FENCE_GATE : Block.FENCE;
      else if (hash2(seed, x, y) < 0.7) p.obj[i] = FLOWER_BLOCKS[Math.floor(hash2(seed ^ 0x77, x >> 1, y >> 1) * 4) + 3];
    }
  }

  // 7. Árvores (Carvalho), arbustos e flores nas cells livres de grama (planície e colinas).
  const grass = (x: number, y: number): boolean => {
    if (!inside(x, y)) return false;
    const i = idx(x, y);
    return p.top[i] === Block.GRASS && !p.keep[i] && !p.obj[i] && !p.custom.has(i);
  };
  const nearKeep = (x: number, y: number, r: number): boolean => {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (inside(x + dx, y + dy) && p.keep[idx(x + dx, y + dy)]) return true;
    return false;
  };
  const clear = (x: number, y: number): boolean => Math.hypot(x, y) < 6; // clareira onde a Deusa nasce
  each((x, y, i) => {
    if (!grass(x, y) || clear(x, y) || nearKeep(x, y, 3)) return;
    const forest = n(x + 40, y - 25, 9); // manchas de floresta
    const r = hash2(seed, x, y);
    const nearTree = (): boolean => {
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (inside(x + dx, y + dy) && p.obj[idx(x + dx, y + dy)] === Block.ISO_TREE) return true;
      return false;
    };
    if (r < 0.006 + Math.max(0, forest) * 0.16 && !nearTree()) p.obj[i] = Block.ISO_TREE;
  });
  each((x, y, i) => {
    if (p.obj[i] || !grass(x, y) || clear(x, y)) return;
    const r = hash2(seed ^ 0x2b, x, y);
    let treeNear = false;
    for (let dy = -2; dy <= 2 && !treeNear; dy++) for (let dx = -2; dx <= 2; dx++) if (inside(x + dx, y + dy) && p.obj[idx(x + dx, y + dy)] === Block.ISO_TREE) { treeNear = true; break; }
    const bank = nearKeep(x, y, 2);
    if (treeNear && r < 0.1) p.obj[i] = r < 0.025 ? Block.ISO_BUSH_L : r < 0.05 ? Block.ISO_BUSH_M : Block.ISO_BUSH_S;
    else if (bank && !nearKeep(x, y, 1) && r < 0.05) p.obj[i] = r < 0.02 ? Block.ISO_BUSH_M : Block.ISO_BUSH_S;
  });
  each((x, y, i) => {
    if (p.obj[i] || !grass(x, y) || clear(x, y)) return;
    const patch = n(x - 30, y + 20, 5);
    if (patch > 0.2 && hash2(seed ^ 0x3c, x, y) < 0.2) {
      const kind = Math.floor((n(x + 5, y + 5, 3) + 1) * 7.5);
      p.obj[i] = FLOWER_BLOCKS[Math.max(0, Math.min(FLOWER_BLOCKS.length - 1, kind))];
    }
  });

  // Colunas finais: terra e pedra por baixo, o bloco do topo em cima, o objeto de superfície acima da pilha.
  const out: Column[] = [];
  each((_x, _y, i) => {
    const custom = p.custom.get(i);
    if (custom) { out.push(custom.slice(0, MAX_LEVELS)); return; }
    const h = p.h[i];
    const col: Column = h === 1 ? [p.top[i]] : h === 2 ? [Block.STONE, p.top[i]] : [Block.STONE, Block.DIRT, p.top[i]];
    if (p.obj[i]) col[h] = p.obj[i];
    out.push(col);
  });
  return out;
}
