import { CHUNK_SIZE } from '../config';
import { type Biome, BIOMES } from './biomes';
import { Block, type BlockId } from './blocks';
import { mulberry32 } from './random';
import type { Cell, TerrainSource } from './terrain';
import type { ChunkRect } from './world';

/**
 * Paisagem de teste do Santuário: uma coluna de cubos por célula.
 * Percentuais são sobre TODAS as células, não sobre o nível anterior:
 * altura >= 1: 100%; >= 2: 50%; >= 3: 30%; >= 4: 10%; >= 5: 5%.
 * A seleção é aninhada, exata e determinística pela seed.
 * O topo exposto é grama, com terra nos níveis inferiores.
 *
 * A pequena plataforma inicial de 3x3 tem altura 1, mas está incluída no
 * denominador e nos 100% do nível 1. A seleção das alturas superiores usa
 * as demais células, preservando as porcentagens solicitadas.
 */
export const SANCTUARY_LEVEL_COVERAGE = [1, 0.5, 0.3, 0.1, 0.05] as const;

export class SanctuarySeedGenerator implements TerrainSource {
  readonly seed: number;
  private readonly x0: number;
  private readonly y0: number;
  private readonly width: number;
  private readonly height: number;
  private readonly heights: Uint8Array;

  constructor(seed: number, bounds: ChunkRect) {
    this.seed = seed >>> 0;
    this.x0 = bounds.cx0 * CHUNK_SIZE;
    this.y0 = bounds.cy0 * CHUNK_SIZE;
    this.width = (bounds.cx1 - bounds.cx0 + 1) * CHUNK_SIZE;
    this.height = (bounds.cy1 - bounds.cy0 + 1) * CHUNK_SIZE;

    const count = this.width * this.height;
    this.heights = new Uint8Array(count).fill(1);
    const centerX = this.x0 + Math.floor(this.width / 2);
    const centerY = this.y0 + Math.floor(this.height / 2);
    const eligible: number[] = [];
    for (let i = 0; i < count; i++) {
      const x = this.x0 + (i % this.width);
      const y = this.y0 + Math.floor(i / this.width);
      if (Math.abs(x - centerX) <= 1 && Math.abs(y - centerY) <= 1) continue;
      eligible.push(i);
    }

    const random = mulberry32(this.seed ^ 0x5a17c73d);
    for (let i = eligible.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [eligible[i], eligible[j]] = [eligible[j], eligible[i]];
    }
    for (let level = 2; level <= 5; level++) {
      const required = Math.round(count * SANCTUARY_LEVEL_COVERAGE[level - 1]);
      if (required > eligible.length) throw new Error('Área insuficiente para a distribuição do Santuário');
      for (let i = 0; i < required; i++) this.heights[eligible[i]] = level;
    }
  }

  private heightAt(x: number, y: number): number {
    const lx = x - this.x0, ly = y - this.y0;
    if (lx < 0 || ly < 0 || lx >= this.width || ly >= this.height) return 0;
    return this.heights[ly * this.width + lx];
  }

  /** Nível zero é a primeira camada de construção, sobre o chão de nuvens. */
  levelAt(x: number, y: number, level: number): BlockId {
    const height = this.heightAt(x, y);
    if (level < 0 || level >= height) return Block.AIR;
    return level === height - 1 ? Block.GRASS : Block.DIRT;
  }

  cellAt(x: number, y: number): Cell {
    return { ground: this.groundAt(x, y), object: this.objectAt(x, y), upper: this.upperAt(x, y) };
  }
  groundAt(_x: number, _y: number): BlockId { return Block.CLOUD_SOLID; }
  objectAt(x: number, y: number): BlockId { return this.levelAt(x, y, 0); }
  upperAt(x: number, y: number): BlockId { return this.levelAt(x, y, 1); }
  biomeAt(_x: number, _y: number): Biome { return BIOMES.celestial; }

  /** Não marca o chunk como editado; tudo pode ser recuperado a partir da seed. */
  generateChunk(cx: number, cy: number, ground: Uint8Array, objects: Uint8Array, upper: Uint8Array): void {
    ground.fill(Block.CLOUD_SOLID);
    for (let ly = 0; ly < CHUNK_SIZE; ly++) for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      const i = ly * CHUNK_SIZE + lx;
      const x = cx * CHUNK_SIZE + lx, y = cy * CHUNK_SIZE + ly;
      objects[i] = this.levelAt(x, y, 0);
      upper[i] = this.levelAt(x, y, 1);
    }
  }

  /** Completa 3º, 4º e 5º níveis após o gerador padrão preencher os dois primeiros. */
  fillHighLevels(cx: number, cy: number, levels: Uint8Array[]): void {
    for (let level = 2; level < levels.length; level++) {
      const layer = levels[level];
      for (let ly = 0; ly < CHUNK_SIZE; ly++) for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        layer[ly * CHUNK_SIZE + lx] = this.levelAt(cx * CHUNK_SIZE + lx, cy * CHUNK_SIZE + ly, level);
      }
    }
  }
}
