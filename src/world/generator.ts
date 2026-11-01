import { BEDROCK_Y, CHUNK_SIZE, SEA_LEVEL, SKY_LIMIT_Y } from '../config';
import { Block, type BlockId } from './blocks';
import { type Biome, pickBiome } from './biomes';
import { Noise } from './noise';
import { hash2 } from './random';

/** Largura (em colunas) de cada célula que pode conter no máximo uma árvore. */
const TREE_CELL = 5;

interface Tree {
  x: number;
  /** y da superfície onde a árvore nasce (o tronco começa em baseY - 1). */
  baseY: number;
  height: number;
  shape: Biome['treeShape'];
  leaves: BlockId;
  /** Semente local para variações de copa. */
  salt: number;
}

/**
 * Gerador procedural determinístico. `blockAt(x, y)` é uma função PURA da seed:
 * qualquer bloco pode ser calculado isoladamente, o que torna as bordas entre
 * chunks contínuas (árvores e cavernas atravessam chunks sem costura).
 */
export class WorldGenerator {
  readonly seed: number;
  private readonly terrain: Noise;
  private readonly climate: Noise;
  private readonly caves: Noise;
  private readonly ores: Noise;
  private readonly columnCache = new Map<number, { surface: number; biome: Biome }>();

  constructor(seed: number) {
    this.seed = seed >>> 0;
    this.terrain = new Noise(this.seed);
    this.climate = new Noise(this.seed ^ 0x9e3779b9);
    this.caves = new Noise(this.seed ^ 0x7f4a7c15);
    this.ores = new Noise(this.seed ^ 0x2545f491);
  }

  biomeAt(x: number): Biome {
    return this.column(x).biome;
  }

  /** y do primeiro bloco sólido do terreno natural (sem árvores) na coluna x. */
  surfaceY(x: number): number {
    return this.column(x).surface;
  }

  private column(x: number): { surface: number; biome: Biome } {
    let c = this.columnCache.get(x);
    if (!c) {
      const t = this.climate.fbm1(x / 420 + 31.7, 3);
      const m = this.climate.fbm1(x / 260 - 913.1, 3);
      const biome = pickBiome(t * 1.6, m * 1.6);
      // Montanhas: amplitude varia lentamente; colinas e detalhe somam por cima.
      const mountain = 0.5 + 0.5 * this.terrain.fbm1(x / 600 + 77.3, 2);
      const hills = this.terrain.fbm1(x / 110, 4) * (8 + mountain * 22);
      const detail = this.terrain.fbm1(x / 24 + 500, 2) * 2.5;
      const surface = Math.round(-2 - hills - detail);
      c = { surface, biome };
      if (this.columnCache.size > 8192) this.columnCache.clear();
      this.columnCache.set(x, c);
    }
    return c;
  }

  /** Preenche um array 16×16 (linha a linha) com os blocos do chunk (cx, cy). */
  generateChunk(cx: number, cy: number, out: Uint8Array): void {
    const x0 = cx * CHUNK_SIZE;
    const y0 = cy * CHUNK_SIZE;
    for (let ly = 0; ly < CHUNK_SIZE; ly++) {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        out[ly * CHUNK_SIZE + lx] = this.blockAt(x0 + lx, y0 + ly);
      }
    }
  }

  blockAt(x: number, y: number): BlockId {
    if (y < SKY_LIMIT_Y) return Block.AIR;
    if (y >= BEDROCK_Y) return Block.BEDROCK;
    if (y >= BEDROCK_Y - 3 && hash2(this.seed, x, y) < 0.25 * (y - (BEDROCK_Y - 4))) {
      return Block.BEDROCK;
    }

    const { surface, biome } = this.column(x);
    const isLakeBed = surface > SEA_LEVEL;

    if (y < surface) {
      const feature = this.featureAt(x, y);
      if (feature !== Block.AIR) return feature;
      if (y >= SEA_LEVEL) {
        return y === SEA_LEVEL && biome.key === 'tundra' ? Block.ICE : Block.WATER;
      }
      return Block.AIR;
    }

    const depth = y - surface;

    if (this.isCave(x, y, depth, isLakeBed)) return Block.AIR;

    if (isLakeBed) {
      if (depth < 3) return Block.SAND;
      if (depth < 5) return Block.DIRT;
    } else {
      if (depth === 0) return biome.surface;
      const subDepth = 3 + Math.floor((this.terrain.noise1(x / 9 + 200) + 0.5) * 3);
      if (depth <= subDepth) return biome.subsurface;
    }

    return this.stoneOrOre(x, y, depth);
  }

  private isCave(x: number, y: number, depth: number, isLakeBed: boolean): boolean {
    if (isLakeBed && depth < 8) return false;
    if (depth < 1) return false;
    // Entradas raras perto da superfície; cavernas ficam mais largas com a profundidade.
    const depthFactor = Math.min(1, depth / 30);
    if (depth < 6 && this.caves.noise2(x / 50 + 9.1, 3.3) < 0.25) return false;
    // "Espaguete": túneis finos sinuosos.
    const tunnel = Math.abs(this.caves.fbm2(x / 48, y / 26, 2));
    if (tunnel < 0.035 + 0.03 * depthFactor) return true;
    // "Queijo": salões amplos nas profundezas.
    const cheese = this.caves.fbm2(x / 34 + 1000, y / 22 + 1000, 3);
    return cheese > 0.42 - 0.1 * depthFactor && depth > 10;
  }

  private stoneOrOre(x: number, y: number, depth: number): BlockId {
    if (depth > 60 && this.ores.noise2(x / 4.2 + 300, y / 4.2) > 0.58) return Block.MANA_CRYSTAL;
    if (depth > 35 && this.ores.noise2(x / 4.5 - 700, y / 4.5) > 0.6) return Block.GOLD_ORE;
    if (depth > 5 && this.ores.noise2(x / 5 + 50, y / 5 + 50) > 0.55) return Block.COAL_ORE;
    return Block.STONE;
  }

  /** Árvores e enfeites de superfície (só em células de ar acima do terreno). */
  private featureAt(x: number, y: number): BlockId {
    const kMin = Math.floor((x - 3) / TREE_CELL);
    const kMax = Math.floor((x + 3) / TREE_CELL);
    for (let k = kMin; k <= kMax; k++) {
      const tree = this.treeInCell(k);
      if (!tree) continue;
      const b = treeBlockAt(tree, x, y, this.seed);
      if (b !== Block.AIR) return b;
    }
    const { surface, biome } = this.column(x);
    if (y === surface - 1 && surface < SEA_LEVEL && biome.decoChance > 0) {
      if (this.treeInCell(Math.floor(x / TREE_CELL))?.x === x) return Block.AIR;
      const r = hash2(this.seed, x, 4242);
      if (r < biome.decoChance) {
        const pick = Math.floor(hash2(this.seed, x, 777) * biome.decorations.length);
        return biome.decorations[pick];
      }
    }
    return Block.AIR;
  }

  private treeInCell(k: number): Tree | null {
    const x = k * TREE_CELL + 1 + Math.floor(hash2(this.seed, k, 11) * (TREE_CELL - 2));
    const { surface, biome } = this.column(x);
    if (biome.treeShape === 'none' || surface >= SEA_LEVEL) return null;
    if (hash2(this.seed, k, 23) >= biome.treeChance) return null;
    // Evita árvores em encostas íngremes (raízes flutuando).
    if (Math.abs(this.column(x - 1).surface - surface) > 1 || Math.abs(this.column(x + 1).surface - surface) > 1) {
      return null;
    }
    const r = hash2(this.seed, k, 37);
    const height =
      biome.treeShape === 'cactus' ? 2 + Math.floor(r * 3)
      : biome.treeShape === 'pine' ? 5 + Math.floor(r * 4)
      : 4 + Math.floor(r * 3);
    return { x, baseY: surface, height, shape: biome.treeShape, leaves: biome.treeLeaves, salt: k };
  }
}

function treeBlockAt(t: Tree, x: number, y: number, seed: number): BlockId {
  const top = t.baseY - t.height; // y do bloco mais alto do tronco
  const dx = x - t.x;
  if (t.shape === 'cactus') {
    return dx === 0 && y >= top && y < t.baseY ? Block.CACTUS : Block.AIR;
  }
  if (dx === 0 && y >= top + 1 && y < t.baseY) return Block.LOG;

  const adx = Math.abs(dx);
  if (t.shape === 'pine') {
    // Copa triangular: estreita no topo, larga embaixo.
    const rel = y - (top - 2); // 0 no ápice
    if (rel < 0 || y > t.baseY - 3) return Block.AIR;
    const half = Math.min(2, Math.floor(rel / 2));
    if (adx <= half) return dx === 0 && y >= top + 1 ? Block.LOG : t.leaves;
    return Block.AIR;
  }

  // Copa arredondada estilo anime: 4 linhas, cantos aleatoriamente removidos.
  const rel = y - (top - 2);
  const widths = [1, 2, 2, 1];
  if (rel < 0 || rel >= widths.length) return Block.AIR;
  const w = widths[rel];
  if (adx > w) return Block.AIR;
  if (adx === w && (rel === 0 || rel === 3) && hash2(seed, x * 3 + t.salt, y) < 0.35) return Block.AIR;
  return t.leaves;
}
