import { CHUNK_SIZE } from '../config';
import { Block, type BlockId } from './blocks';
import { type Biome, pickBiome } from './biomes';
import { Noise } from './noise';
import { hash2 } from './random';

/** Limiares de elevação (ruído ~[-1, 1]). */
const WATER_LEVEL = -0.26;
const BEACH_LEVEL = -0.2;
const MOUNTAIN_LEVEL = 0.36;
const DEEP_MOUNTAIN = 0.5;

export interface Cell {
  ground: BlockId;
  object: BlockId;
}

/**
 * Gerador procedural determinístico para o plano visto de cima. `cellAt(x, y)`
 * é função PURA da seed — chunks são contínuos nas bordas sem costura.
 */
export class WorldGenerator {
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
    const continent = this.terrain.fbm2(x / 420 + 11.3, y / 420 - 7.1, 3) * 0.45;
    const local = this.terrain.fbm2(x / 70, y / 70, 5);
    return local * 0.8 + continent;
  }

  biomeAt(x: number, y: number): Biome {
    x += this.climateOx;
    y += this.climateOy;
    const t = this.climate.fbm2(x / 480 + 31.7, y / 480 + 5.2, 3);
    const m = this.climate.fbm2(x / 300 - 913.1, y / 300 + 77.7, 3);
    return pickBiome(t * 1.9, m * 1.9);
  }

  private isRiver(x: number, y: number): boolean {
    return Math.abs(this.terrain.fbm2(x / 230 + 400, y / 230 - 400, 3)) < 0.022;
  }

  /** Classe do terreno sem objetos: usada pelo chão e pelos objetos. */
  private terrainAt(x: number, y: number): { e: number; biome: Biome; wet: boolean } {
    const e = this.elevation(x, y);
    const biome = this.biomeAt(x, y);
    const wet = e < WATER_LEVEL || (e < MOUNTAIN_LEVEL - 0.04 && this.isRiver(x, y));
    return { e, biome, wet };
  }

  groundAt(x: number, y: number): BlockId {
    const { e, biome, wet } = this.terrainAt(x, y);
    if (wet) return biome.water;
    if (e < BEACH_LEVEL && biome.key !== 'tundra') return Block.SAND;
    if (e > MOUNTAIN_LEVEL - 0.05 && biome.key !== 'desert' && biome.key !== 'tundra') return Block.DIRT;
    return biome.ground;
  }

  objectAt(x: number, y: number): BlockId {
    const { e, biome, wet } = this.terrainAt(x, y);
    if (wet || e < BEACH_LEVEL) return Block.AIR;

    if (e > MOUNTAIN_LEVEL) {
      const ore = this.detail.noise2(x / 4.5 + 300, y / 4.5);
      if (e > DEEP_MOUNTAIN && ore > 0.55) return Block.MANA_CRYSTAL;
      if (e > DEEP_MOUNTAIN - 0.05 && this.detail.noise2(x / 4 - 700, y / 4) > 0.58) return Block.GOLD_ORE;
      if (ore < -0.5) return Block.COAL_ORE;
      return biome.key === 'desert' ? Block.SANDSTONE : Block.STONE;
    }

    const r = hash2(this.seed, x, y);
    const forest = this.detail.fbm2(x / 38 + 50, y / 38 - 50, 2);
    const density = biome.treeDensity * (forest > 0.05 ? 1 : 0.12);
    if (r < density) return biome.tree;
    // Pedregulhos e arbustos ocasionais.
    if (r > 0.994) return biome.key === 'desert' ? Block.SANDSTONE : Block.STONE;
    if (r > 0.988 && biome.key !== 'desert' && biome.key !== 'tundra') {
      return biome.key === 'sakura' ? Block.SAKURA_LEAVES : biome.key === 'enchanted' ? Block.MAGIC_LEAVES : Block.LEAVES;
    }
    const d = hash2(this.seed, x, y + 7919);
    if (d < biome.decoChance) {
      return biome.decorations[Math.floor(hash2(this.seed, x - 31, y) * biome.decorations.length)];
    }
    return Block.AIR;
  }

  cellAt(x: number, y: number): Cell {
    return { ground: this.groundAt(x, y), object: this.objectAt(x, y) };
  }

  /** Preenche as camadas 16×16 (linha a linha) do chunk (cx, cy). */
  generateChunk(cx: number, cy: number, ground: Uint8Array, objects: Uint8Array): void {
    const x0 = cx * CHUNK_SIZE;
    const y0 = cy * CHUNK_SIZE;
    for (let ly = 0; ly < CHUNK_SIZE; ly++) {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        const i = ly * CHUNK_SIZE + lx;
        ground[i] = this.groundAt(x0 + lx, y0 + ly);
        objects[i] = this.objectAt(x0 + lx, y0 + ly);
      }
    }
  }
}
