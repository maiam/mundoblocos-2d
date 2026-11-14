import { CHUNK_SIZE } from '../config';
import type { World } from '../world/world';
import { mapColor } from './mapColors';

/**
 * Imagens de chunk do mapa (minimapa e mapa grande): cada chunk vira uma imagem de `CHUNK_SIZE` × `CHUNK_SIZE` px, só com as
 * células já descobertas, refeita quando o mapa (`Chunk.version`) ou a névoa dele mudam. Só lê o `World`; nunca lê pixels de volta.
 */
export interface ChunkImage {
  canvas: HTMLCanvasElement;
  terrain: number;
  fog: number;
  used: number;
}

export class MapChunkCache {
  private readonly cache = new Map<string, ChunkImage>();
  private tick = 0;

  constructor(private readonly maxEntries = 600) {}

  /** Chamar uma vez por redesenho (marca o "uso" para a limpeza do cache). */
  beginFrame(): void {
    this.tick++;
  }

  clear(): void {
    this.cache.clear();
  }

  /**
   * Imagem do chunk (cx, cy) com a névoa `fog`. `canBuild = false`: sem orçamento neste quadro, devolve a imagem antiga (se houver).
   * `built` diz se esta chamada refez a imagem (para o chamador contar o orçamento).
   */
  get(world: World, cx: number, cy: number, fog: { bits: Uint8Array; version: number }, canBuild: boolean): { image: ChunkImage; built: boolean } | null {
    const key = `${cx},${cy}`;
    const terrain = world.getChunk(cx, cy)?.version ?? 0;
    const cached = this.cache.get(key);
    if (cached && cached.terrain === terrain && cached.fog === fog.version) {
      cached.used = this.tick;
      return { image: cached, built: false };
    }
    if (!canBuild) return cached ? { image: cached, built: false } : null;
    const canvas = cached?.canvas ?? document.createElement('canvas');
    canvas.width = CHUNK_SIZE;
    canvas.height = CHUNK_SIZE;
    const c = canvas.getContext('2d')!;
    c.clearRect(0, 0, CHUNK_SIZE, CHUNK_SIZE);
    const x0 = cx * CHUNK_SIZE;
    const y0 = cy * CHUNK_SIZE;
    for (let ly = 0; ly < CHUNK_SIZE; ly++) {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        const i = ly * CHUNK_SIZE + lx;
        if (!(fog.bits[i >> 3] & (1 << (i & 7)))) continue;
        c.fillStyle = mapColor(world, x0 + lx, y0 + ly);
        c.fillRect(lx, ly, 1, 1);
      }
    }
    const entry: ChunkImage = { canvas, terrain, fog: fog.version, used: this.tick };
    this.cache.set(key, entry);
    return { image: entry, built: true };
  }

  /** Descarta os menos usados quando passa do limite. */
  evict(): void {
    if (this.cache.size <= this.maxEntries) return;
    const old = [...this.cache.entries()].sort((a, b) => a[1].used - b[1].used);
    for (const [k] of old.slice(0, this.cache.size - this.maxEntries)) this.cache.delete(k);
  }
}
