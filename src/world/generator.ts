import { CHUNK_SIZE, SUBDIV } from '../config';
import { Block, type BlockId } from './blocks';
import { type Biome, pickBiome } from './biomes';
import { Noise } from './noise';
import { hash2 } from './random';
import type { Cell, TerrainSource } from './terrain';

/** Limiares de elevação (ruído ~[-1, 1]). */
const WATER_LEVEL = -0.26;
const BEACH_LEVEL = -0.2;
const MOUNTAIN_LEVEL = 0.36;
/** Acima disto a montanha tem 2 cubos de altura (escalável a partir das bordas de 1). */
const HIGH_MOUNTAIN = 0.43;

export type { Cell } from './terrain';

/**
 * Gerador procedural determinístico para o plano visto de cima. `cellAt(x, y)`
 * é função PURA da seed — chunks são contínuos nas bordas sem costura.
 */
export class WorldGenerator implements TerrainSource {
  readonly seed: number;
  private readonly terrain: Noise;
  private readonly climate: Noise;
  private readonly detail: Noise;
  /** Deslocamento do mapa climático por seed (varia o bioma de origem entre mundos). */
  private readonly climateOx: number;
  private readonly climateOy: number;

  constructor(seed: number) {
    this.seed = seed >>> 0;
    this.terrain = new Noise(this.seed);
    this.climate = new Noise(this.seed ^ 0x9e3779b9);
    this.detail = new Noise(this.seed ^ 0x2545f491);
    this.climateOx = Math.floor(hash2(this.seed, 1, 2) * 20000) - 10000;
    this.climateOy = Math.floor(hash2(this.seed, 3, 4) * 20000) - 10000;
  }

  elevation(x: number, y: number): number {
    // Grade fina (ADR 0032): as formas do mundo seguem do mesmo tamanho em pixels; só a resolução sobe.
    x /= SUBDIV;
    y /= SUBDIV;
    const continent = this.terrain.fbm2(x / 420 + 11.3, y / 420 - 7.1, 3) * 0.45;
    const local = this.terrain.fbm2(x / 70, y / 70, 5);
    return local * 0.8 + continent;
  }

  biomeAt(x: number, y: number): Biome {
    x = x / SUBDIV + this.climateOx;
    y = y / SUBDIV + this.climateOy;
    const t = this.climate.fbm2(x / 480 + 31.7, y / 480 + 5.2, 3);
    const m = this.climate.fbm2(x / 300 - 913.1, y / 300 + 77.7, 3);
    return pickBiome(t * 1.9, m * 1.9);
  }

  /** Célula de rio (água de rio, não de lago nem de mar)? Usada para plantar os bandos de homem-lagarto. */
  riverAt(x: number, y: number): boolean {
    const e = this.elevation(x, y);
    return e >= WATER_LEVEL && e < MOUNTAIN_LEVEL - 0.04 && this.isRiver(x, y);
  }

  private isRiver(x: number, y: number): boolean {
    x /= SUBDIV;
    y /= SUBDIV;
    return Math.abs(this.terrain.fbm2(x / 230 + 400, y / 230 - 400, 3)) < 0.022;
  }

  /**
   * Célula completa numa única avaliação de ruído (elevação, clima, rio, trilha).
   * `groundAt/objectAt/upperAt` derivam daqui — antes cada um recalculava o terreno
   * (até 5× por célula ao gerar um chunk).
   */
  cellAt(x: number, y: number): Cell {
    const e = this.elevation(x, y);
    if (e < WATER_LEVEL || (e < MOUNTAIN_LEVEL - 0.04 && this.isRiver(x, y))) {
      return { ground: Block.WATER, object: Block.AIR, upper: Block.AIR };
    }
    const biome = this.biomeAt(x, y);
    if (e < BEACH_LEVEL) return { ground: Block.SAND, object: Block.AIR, upper: Block.AIR };

    let ground: BlockId = biome.ground;
    if (e > MOUNTAIN_LEVEL - 0.05 && biome.key !== 'desert') ground = Block.DIRT;
    // Trilhas naturais de terra batida cortando os campos (sempre livres).
    else if (biome.key !== 'desert' && Math.abs(this.detail.fbm2(x / SUBDIV / 90 - 300, y / SUBDIV / 90 + 300, 2)) < 0.012) {
      return { ground: Block.PATH, object: Block.AIR, upper: Block.AIR };
    }

    if (e > MOUNTAIN_LEVEL) {
      return { ground, object: Block.STONE, upper: e > HIGH_MOUNTAIN ? Block.STONE : Block.AIR };
    }

    const r = hash2(this.seed, x, y);
    const forest = this.detail.fbm2(x / SUBDIV / 38 + 50, y / SUBDIV / 38 - 50, 2);
    // Itens por célula: a mesma densidade por área em pixels (cada célula fina é 1/SUBDIV² da antiga).
    const area = SUBDIV * SUBDIV;
    const density = biome.treeDensity * (forest > 0.05 ? 1 : 0.12) / area;
    let object: BlockId = Block.AIR;
    if (r < density) {
      // Árvore da vez: a principal do bioma ou, numa fração, uma das misturadas (macieiras e bétulas nos Campos).
      object = biome.tree;
      const alts = biome.altTrees ?? [];
      for (let i = 0; i < alts.length; i++) {
        if (hash2(this.seed, x + 4409 + i * 1013, y - 2027 + i * 389) < alts[i].share) { object = alts[i].id; break; }
      }
    }
    else if (r > (area === 1 ? 0.994 : 1 - 0.006 / area)) object = Block.ROCK_BOULDER; // pedregulhos ocasionais (arte da prancha de pedras)
    else if (hash2(this.seed, x, y + 7919) < biome.decoChance / area) {
      object = biome.decorations[Math.floor(hash2(this.seed, x - 31, y) * biome.decorations.length)];
    }
    return { ground, object, upper: Block.AIR };
  }

  groundAt(x: number, y: number): BlockId {
    return this.cellAt(x, y).ground;
  }

  objectAt(x: number, y: number): BlockId {
    return this.cellAt(x, y).object;
  }

  /** Segundo cubo da pilha (nível 1): só em montanhas altas. */
  upperAt(x: number, y: number): BlockId {
    return this.cellAt(x, y).upper;
  }

  /** Preenche as camadas 16×16 (linha a linha) do chunk (cx, cy). */
  generateChunk(cx: number, cy: number, ground: Uint8Array, objects: Uint8Array, upper: Uint8Array): void {
    const x0 = cx * CHUNK_SIZE;
    const y0 = cy * CHUNK_SIZE;
    for (let ly = 0; ly < CHUNK_SIZE; ly++) {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        const i = ly * CHUNK_SIZE + lx;
        const c = this.cellAt(x0 + lx, y0 + ly);
        ground[i] = c.ground;
        objects[i] = c.object;
        upper[i] = c.upper;
      }
    }
  }
}
