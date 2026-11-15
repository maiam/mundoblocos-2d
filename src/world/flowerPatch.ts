/**
 * Canteiro de flores da missão "Ervas de cura" (ADR 0034, v0.93.119): **garante** que cada seed tenha, perto da cidade, flores suficientes da espécie que o
 * Silvano pede. A espécie sai da seed; o canteiro é um punhado de flores (`FLOWER_BLOCKS`, decoração sem colisão, quebráveis e coletáveis como as demais) numa
 * clareira de grama o mais perto possível do portão (a partir de ~20 células), fora da cidade, da vila, da trilha, da caverna e da dungeon. Função PURA da seed (e do terreno base), como o
 * resto do gerador: `FlowerPatchTerrain` só põe as flores na geração do chunk (edições do jogador continuam valendo por cima).
 */
import { CHUNK_SIZE, SUBDIV } from '../config';
import type { Biome } from './biomes';
import { Block, type BlockId, blockDef, FLOWER_BLOCKS } from './blocks';
import { type Rect, inRect } from './dungeon';
import { hash2 } from './random';
import type { Cell, TerrainSource } from './terrain';

/** Quantas flores a clareira recebe (a missão pede 6: sobra para quem errar o caminho). */
export const PATCH_FLOWERS = 10;
/** Lado (em células) da clareira que precisa ser grama livre. */
const SIDE = 6 * SUBDIV;
/** Distância (células) do portão ao centro da clareira: tenta faixas de 20 células a partir de 20 até `MAX_DIST` (o campo ao sul do portão tem lago em algumas seeds). */
const NEAR = 20 * SUBDIV, BAND = 20 * SUBDIV, MAX_DIST = 140 * SUBDIV;

export interface FlowerPatch {
  /** Espécie (um dos `FLOWER_BLOCKS`) que o canteiro tem e que a missão pede. */
  species: BlockId;
  /** Retângulo da clareira. */
  area: Rect;
  /** Flores postas (célula do mundo). */
  cells: ReadonlyArray<readonly [number, number]>;
}

/** Espécie da seed (todas as 15 têm a mesma chance). */
export function patchSpecies(seed: number): BlockId {
  return FLOWER_BLOCKS[Math.floor(hash2(seed, 0x51f3, 77) * FLOWER_BLOCKS.length)];
}

/**
 * Planeja o canteiro: tenta pontos em volta do portão (ordem sorteada pela seed) até achar uma clareira de grama livre; `avoid` = áreas que não podem ser
 * tocadas (cidade, vila e trilha, caverna, dungeon). Devolve null só se o terreno em volta do portão não tiver nenhuma clareira (mundo todo de água/floresta).
 */
export function planFlowerPatch(seed: number, base: TerrainSource, gate: readonly [number, number], avoid: readonly Rect[]): FlowerPatch | null {
  const free = (x: number, y: number): boolean => {
    if (avoid.some((r) => inRect(r, x, y))) return false;
    const c: Cell = base.cellAt(x, y);
    const g = blockDef(c.ground);
    if (g.liquid || c.ground === Block.HOLE || c.ground === Block.PATH) return false;
    return c.upper === Block.AIR && (c.object === Block.AIR || c.object === Block.TALL_GRASS || c.object === Block.FLOWER);
  };
  for (let t = 0; t < 1600; t++) {
    const band = Math.floor(t / 80); // 80 tentativas por faixa de distância: do mais perto para o mais longe
    const lo = NEAR + band * BAND;
    if (lo > MAX_DIST) break;
    const angle = hash2(seed, 0x6a1, t) * Math.PI * 2;
    const dist = lo + hash2(seed, 0x6a2, t) * BAND;
    const cx = Math.round(gate[0] + Math.cos(angle) * dist), cy = Math.round(gate[1] + Math.sin(angle) * dist);
    const area: Rect = { x0: cx - SIDE / 2, y0: cy - SIDE / 2, x1: cx + SIDE / 2 - 1, y1: cy + SIDE / 2 - 1 };
    let ok = true;
    for (let y = area.y0 - 1; y <= area.y1 + 1 && ok; y++) for (let x = area.x0 - 1; x <= area.x1 + 1 && ok; x++) ok = free(x, y);
    if (!ok) continue;
    // PATCH_FLOWERS células distintas da clareira, sorteadas pela seed.
    const cells: Array<[number, number]> = [];
    const taken = new Set<string>();
    for (let n = 0; cells.length < PATCH_FLOWERS && n < 200; n++) {
      const x = area.x0 + Math.floor(hash2(seed, 0x6b1 + n, t) * SIDE), y = area.y0 + Math.floor(hash2(seed, 0x6b2 + n, t) * SIDE);
      if (taken.has(`${x},${y}`)) continue;
      taken.add(`${x},${y}`);
      cells.push([x, y]);
    }
    if (cells.length === PATCH_FLOWERS) return { species: patchSpecies(seed), area, cells };
  }
  return null;
}

/** Terreno com o canteiro: as flores entram na geração do chunk (e em `cellAt/objectAt`); o resto é o terreno de baixo. */
export class FlowerPatchTerrain implements TerrainSource {
  readonly seed: number;
  private readonly at: Set<string>;

  constructor(private readonly source: TerrainSource, readonly patch: FlowerPatch) {
    this.seed = source.seed;
    this.at = new Set(patch.cells.map(([x, y]) => `${x},${y}`));
  }

  cellAt(x: number, y: number): Cell {
    const c = this.source.cellAt(x, y);
    return this.at.has(`${x},${y}`) ? { ...c, object: this.patch.species } : c;
  }

  groundAt(x: number, y: number): BlockId { return this.source.groundAt(x, y); }
  objectAt(x: number, y: number): BlockId { return this.at.has(`${x},${y}`) ? this.patch.species : this.source.objectAt(x, y); }
  upperAt(x: number, y: number): BlockId { return this.source.upperAt(x, y); }
  biomeAt(x: number, y: number): Biome { return this.source.biomeAt(x, y); }

  generateChunk(cx: number, cy: number, ground: Uint8Array, objects: Uint8Array, upper: Uint8Array): void {
    this.source.generateChunk(cx, cy, ground, objects, upper);
    for (const [x, y] of this.patch.cells) {
      if (Math.floor(x / CHUNK_SIZE) === cx && Math.floor(y / CHUNK_SIZE) === cy) objects[(y - cy * CHUNK_SIZE) * CHUNK_SIZE + (x - cx * CHUNK_SIZE)] = this.patch.species;
    }
  }
}
