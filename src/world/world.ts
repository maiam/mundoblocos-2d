import { CHUNK_SIZE, MAX_STACK, UNLOAD_MARGIN } from '../config';
import { Block, type BlockId, blockDef, isWheat, WHEAT_STAGES, wheatId, wheatStage } from './blocks';
import type { Biome } from './biomes';
import { Chunk } from './chunk';
import { chunkKey, toChunk, toLocal } from './coords';
import { WorldGenerator } from './generator';

/** Tempo médio (s) para o trigo avançar um estágio (~1,5 min da semente ao maduro). */
export const WHEAT_STAGE_SECONDS = 6;
/** Chãos onde a semente pode ser plantada ("terra"): grama, terra e terra arada. */
const SOIL = new Set<number>([Block.GRASS, Block.DIRT, Block.TILLED]);

/** Chave numérica exata do chunk (|cy| < 2^20 chunks ≈ 16 milhões de células). */
function numKey(cx: number, cy: number): number {
  return cx * 2097152 + cy;
}

export interface ChunkRect {
  cx0: number;
  cy0: number;
  cx1: number;
  cy1: number;
}

/**
 * Fonte de verdade do estado do mundo: chunks carregados + edições do jogador.
 * Toda leitura/escrita de bloco passa por aqui; regras de quebrar/colocar/andar também.
 */
export class World {
  readonly generator: WorldGenerator;
  /** Chunks por chave numérica (`numKey`): evita criar strings a cada leitura de célula. */
  private readonly chunks = new Map<number, Chunk>();
  /** Último chunk acessado (leituras vizinhas costumam cair no mesmo). */
  private last: Chunk | null = null;
  /** Células com trigo plantado (crescem com o tempo). Só existem em chunks modificados, que não descarregam. */
  private readonly crops = new Set<string>();

  constructor(seed: number) {
    this.generator = new WorldGenerator(seed);
  }

  get seed(): number {
    return this.generator.seed;
  }

  get loadedCount(): number {
    return this.chunks.size;
  }

  getChunk(cx: number, cy: number): Chunk | undefined {
    const l = this.last;
    if (l && l.cx === cx && l.cy === cy) return l;
    const c = this.chunks.get(numKey(cx, cy));
    if (c) this.last = c;
    return c;
  }

  /** Chunk que contém a célula (x, y), se carregado. */
  private chunkAt(x: number, y: number): Chunk | undefined {
    return this.getChunk(toChunk(x), toChunk(y));
  }

  /** Retorna o chunk, gerando-o de forma síncrona se necessário. */
  loadChunk(cx: number, cy: number): Chunk {
    const key = numKey(cx, cy);
    let chunk = this.chunks.get(key);
    if (!chunk) {
      chunk = new Chunk(cx, cy);
      this.generator.generateChunk(cx, cy, chunk.ground, chunk.objects, chunk.upper);
      this.chunks.set(key, chunk);
    }
    return chunk;
  }

  /** Chão da célula. Fora de chunk carregado consulta o gerador (puro). */
  getGround(x: number, y: number): BlockId {
    const chunk = this.chunkAt(x, y);
    return chunk ? chunk.getGround(toLocal(x), toLocal(y)) : this.generator.groundAt(x, y);
  }

  /** Objeto do nível 0 da célula (AIR se vazio). */
  getObject(x: number, y: number): BlockId {
    const chunk = this.chunkAt(x, y);
    return chunk ? chunk.getObject(toLocal(x), toLocal(y)) : this.generator.objectAt(x, y);
  }

  /** Cubo empilhado no nível 1 (AIR se não houver). */
  getUpper(x: number, y: number): BlockId {
    const chunk = this.chunkAt(x, y);
    return chunk ? chunk.getUpper(toLocal(x), toLocal(y)) : this.generator.upperAt(x, y);
  }

  /** Bloco visível no topo da célula e seu nível (null se vazia). */
  topBlock(x: number, y: number): { id: BlockId; level: 0 | 1 } | null {
    const up = this.getUpper(x, y);
    if (up !== Block.AIR) return { id: up, level: 1 };
    const base = this.getObject(x, y);
    return base !== Block.AIR ? { id: base, level: 0 } : null;
  }

  /** Quantos cubos há empilhados na célula (0..MAX_STACK). */
  stackHeight(x: number, y: number): number {
    if (blockDef(this.getObject(x, y)).shape !== 'cube') return 0;
    return this.getUpper(x, y) !== Block.AIR ? 2 : 1;
  }

  /**
   * Altura em que se fica de pé na célula, ou null se não dá para ficar
   * (água, árvore, cacto). Cubos são superfícies: altura = nº de cubos.
   */
  standHeight(x: number, y: number): number | null {
    if (!this.isGroundStandable(x, y)) return null;
    const base = blockDef(this.getObject(x, y));
    if (base.shape === 'cube') return this.stackHeight(x, y);
    return base.solid ? null : 0;
  }

  /** Mantido para o objeto do nível 0 (testes/ferramentas). */
  setObject(x: number, y: number, id: BlockId): void {
    this.setLevel(x, y, 0, id);
  }

  private setLevel(x: number, y: number, level: 0 | 1 | 'ground', id: BlockId): void {
    const cx = toChunk(x);
    const cy = toChunk(y);
    const lx = toLocal(x);
    const ly = toLocal(y);
    const chunk = this.loadChunk(cx, cy);
    if (level === 'ground') chunk.setGround(lx, ly, id);
    else chunk.setLevel(lx, ly, level, id);
    if (level === 0) {
      if (isWheat(id)) this.crops.add(chunkKey(x, y));
      else this.crops.delete(chunkKey(x, y));
    }
    // Vizinhos usam esta célula para sombras/bordas.
    if (lx === 0) this.touch(cx - 1, cy);
    if (lx === CHUNK_SIZE - 1) this.touch(cx + 1, cy);
    if (ly === 0) this.touch(cx, cy - 1);
    if (ly === CHUNK_SIZE - 1) this.touch(cx, cy + 1);
  }

  private touch(cx: number, cy: number): void {
    const c = this.getChunk(cx, cy);
    if (c) c.version++;
  }

  biomeAt(x: number, y: number): Biome {
    return this.generator.biomeAt(x, y);
  }

  /**
   * O chão aguenta personagens/animais? Falso para água e buraco. Um cubo
   * colocado num buraco vira piso e volta a ser pisável.
   */
  isGroundStandable(x: number, y: number): boolean {
    const g = blockDef(this.getGround(x, y));
    return g.layer === 'object' ? g.shape === 'cube' : g.standable;
  }

  /** Célula livre no nível do chão (sem cubos, água ou árvore)? */
  isWalkable(x: number, y: number): boolean {
    return this.standHeight(x, y) === 0;
  }

  // ---- Regras de interação (domínio) ----

  /**
   * O que um golpe na célula quebraria: o objeto do topo ou, com a célula vazia,
   * o próprio chão (que vira buraco). null se nada pode ser quebrado.
   */
  breakTarget(x: number, y: number): 'object' | 'ground' | null {
    const top = this.topBlock(x, y);
    if (top) return blockDef(top.id).breakable ? 'object' : null;
    return blockDef(this.getGround(x, y)).breakable ? 'ground' : null;
  }

  canBreak(x: number, y: number): boolean {
    return this.breakTarget(x, y) !== null;
  }

  /** Quebra o topo da célula (empilhado → objeto → chão). Retorna o id removido ou null. */
  breakBlock(x: number, y: number): BlockId | null {
    const target = this.breakTarget(x, y);
    if (target === 'object') {
      const top = this.topBlock(x, y)!;
      this.setLevel(x, y, top.level, Block.AIR);
      return top.id;
    }
    if (target === 'ground') {
      const id = this.getGround(x, y);
      this.setLevel(x, y, 'ground', Block.HOLE);
      return id;
    }
    return null;
  }

  /**
   * Onde o bloco seria colocado, ou null se não pode.
   * 'ground': preenche um buraco — só cubos, que viram piso nivelado.
   * Nível 0: chão firme, célula vazia ou com enfeite (substituído).
   * Nível 1: cubo sobre cubo, até MAX_STACK. Enfeites e árvores só no chão.
   */
  placementLevel(x: number, y: number, id: BlockId): 'ground' | 0 | 1 | null {
    const def = blockDef(id);
    if (!def.placeable || def.layer !== 'object') return null;
    if (this.getGround(x, y) === Block.HOLE) return def.shape === 'cube' ? 'ground' : null;
    if (!this.isGroundStandable(x, y)) return null;
    const base = blockDef(this.getObject(x, y));
    if (base.id === Block.AIR || base.shape === 'decoration') return 0;
    if (def.shape === 'cube' && base.shape === 'cube' && this.stackHeight(x, y) < MAX_STACK) return 1;
    return null;
  }

  canPlace(x: number, y: number, id: BlockId): boolean {
    return this.placementLevel(x, y, id) !== null;
  }

  placeBlock(x: number, y: number, id: BlockId): boolean {
    const level = this.placementLevel(x, y, id);
    if (level === null) return false;
    this.setLevel(x, y, level, id);
    return true;
  }

  /**
   * Ponto inicial: procura (em anéis de 24 células) um bioma acolhedor perto da
   * origem e devolve a célula andável mais próxima dele.
   */
  findSpawn(): [number, number] {
    const welcoming = new Set(['meadow', 'sakura', 'enchanted']);
    for (let r = 0; r <= 60; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const x = dx * 24;
          const y = dy * 24;
          if (welcoming.has(this.biomeAt(x, y).key)) return this.nearestWalkable(x, y);
        }
      }
    }
    return this.nearestWalkable(0, 0);
  }

  // ---- Plantação ----

  /** A semente pode ser plantada aqui? Terra (grama/terra) com a célula vazia ou com enfeite. */
  canPlant(x: number, y: number): boolean {
    if (!SOIL.has(this.getGround(x, y))) return false;
    const base = blockDef(this.getObject(x, y));
    return base.id === Block.AIR || base.shape === 'decoration';
  }

  plant(x: number, y: number): boolean {
    if (!this.canPlant(x, y)) return false;
    this.setLevel(x, y, 0, Block.WHEAT_0);
    return true;
  }

  get cropCount(): number {
    return this.crops.size;
  }

  /**
   * Avança o tempo das plantações: cada trigo não maduro sobe um estágio com
   * probabilidade dt / WHEAT_STAGE_SECONDS (crescimento natural, não sincronizado).
   */
  tick(dt: number, rand: () => number = Math.random): void {
    const p = dt / WHEAT_STAGE_SECONDS;
    for (const key of [...this.crops]) {
      const [x, y] = key.split(',').map(Number);
      const id = this.getObject(x, y);
      if (!isWheat(id)) { this.crops.delete(key); continue; }
      const stage = wheatStage(id);
      if (stage < WHEAT_STAGES - 1 && rand() < p) this.setLevel(x, y, 0, wheatId(stage + 1));
    }
  }

  /** Célula andável (com vizinhos andáveis) mais próxima de (x0, y0), em espiral. */
  nearestWalkable(x0: number, y0: number, maxRadius = 200): [number, number] {
    const ok = (x: number, y: number) =>
      this.isWalkable(x, y) && this.isWalkable(x + 1, y) && this.isWalkable(x - 1, y) &&
      this.isWalkable(x, y + 1) && this.isWalkable(x, y - 1);
    for (let r = 0; r <= maxRadius; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          if (ok(x0 + dx, y0 + dy)) return [x0 + dx, y0 + dy];
        }
      }
    }
    return [x0, y0];
  }

  // ---- Ciclo de vida de chunks ----

  /** Gera até `budget` chunks faltantes no retângulo, do centro para fora. Retorna quantos. */
  ensureChunks(rect: ChunkRect, budget: number): number {
    const ccx = (rect.cx0 + rect.cx1) / 2;
    const ccy = (rect.cy0 + rect.cy1) / 2;
    const missing: [number, number, number][] = [];
    for (let cy = rect.cy0; cy <= rect.cy1; cy++) {
      for (let cx = rect.cx0; cx <= rect.cx1; cx++) {
        if (!this.chunks.has(numKey(cx, cy))) missing.push([cx, cy, (cx - ccx) ** 2 + (cy - ccy) ** 2]);
      }
    }
    missing.sort((a, b) => a[2] - b[2]);
    const n = Math.min(budget, missing.length);
    for (let i = 0; i < n; i++) this.loadChunk(missing[i][0], missing[i][1]);
    return n;
  }

  /** Descarta chunks não modificados longe da área ativa. Retorna as chaves removidas. */
  unloadFar(rect: ChunkRect): string[] {
    const removed: string[] = [];
    for (const [key, c] of this.chunks) {
      if (c.modified) continue;
      if (
        c.cx < rect.cx0 - UNLOAD_MARGIN || c.cx > rect.cx1 + UNLOAD_MARGIN ||
        c.cy < rect.cy0 - UNLOAD_MARGIN || c.cy > rect.cy1 + UNLOAD_MARGIN
      ) {
        this.chunks.delete(key);
        if (this.last === c) this.last = null;
        removed.push(chunkKey(c.cx, c.cy));
      }
    }
    return removed;
  }

  forEachChunk(fn: (c: Chunk) => void): void {
    for (const c of this.chunks.values()) fn(c);
  }
}
