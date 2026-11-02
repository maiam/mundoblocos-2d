import { CHUNK_SIZE, MAX_STACK, UNLOAD_MARGIN } from '../config';
import { Block, type BlockId, blockDef, isDoor, isWheat, WHEAT_STAGES, wheatId, wheatStage } from './blocks';
import type { Biome } from './biomes';
import { Chunk, type Level } from './chunk';
import { type DungeonLayout, DungeonTerrain, inRect, planDungeon } from './dungeon';
import { chunkKey, toChunk, toLocal } from './coords';
import { FlatGenerator } from './flatGenerator';
import { WorldGenerator } from './generator';
import { WORLD_PROFILES, type WorldProfile } from './profiles';
import type { TerrainSource } from './terrain';

/** Tempo médio (s) para o trigo avançar um estágio (~1,5 min da semente ao maduro). */
export const WHEAT_STAGE_SECONDS = 6;
/** Único chão onde a semente pode ser plantada. */
const PLANTABLE_GROUND: number = Block.TILLED;
/** Chãos que a enxada transforma em Terra Arada. */
const TILLABLE = new Set<number>([Block.DIRT, Block.GRASS]);
/** Chãos que a pá amassa em Caminho de Terra. */
const FLATTENABLE = new Set<number>([Block.DIRT, Block.GRASS, Block.TILLED]);
/** Blocos que podem substituir a água (viram o chão da célula): todo tipo de terra, Pedra e Tora. */
export const REPLACES_WATER = new Set<number>([Block.DIRT, Block.GRASS, Block.TILLED, Block.PATH, Block.STONE, Block.OAK_LOG]);
/** Tempo para a água encher um buraco vizinho (s). */
export const FLOW_SECONDS = 0.6;

/** De que lado a água chega numa célula que está enchendo. */
export type FlowFrom = 'west' | 'east' | 'south' | 'north';
const FLOW_DIRS: Array<[FlowFrom, number, number]> = [['west', -1, 0], ['east', 1, 0], ['north', 0, -1], ['south', 0, 1]];

/** Célula enchendo de água: progresso 0..1 e lado de onde a água vem. */
export interface WaterFlow {
  x: number;
  y: number;
  from: FlowFrom;
  t: number;
}

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
  readonly generator: TerrainSource;
  readonly profile: WorldProfile;
  /** Limites em células (inclusivos) quando o perfil limita o mundo. */
  private readonly cellBounds: { x0: number; y0: number; x1: number; y1: number } | null;
  /** Chunks por chave numérica (`numKey`): evita criar strings a cada leitura de célula. */
  private readonly chunks = new Map<number, Chunk>();
  /** Último chunk acessado (leituras vizinhas costumam cair no mesmo). */
  private last: Chunk | null = null;
  /** Células com trigo plantado (crescem com o tempo). Só existem em chunks modificados, que não descarregam. */
  private readonly crops = new Set<string>();
  /** Dungeon deste mundo (perfil com `dungeon`), ou null. Área protegida: só se luta lá dentro. */
  readonly dungeon: DungeonLayout | null = null;
  /** Buracos enchendo de água (estado de execução; ao carregar, `settleWater` reagenda). */
  private readonly flows = new Map<string, WaterFlow>();
  /** Spawn calculado no terreno base (a dungeon é posta longe dele e não o altera). */
  private spawn: [number, number] | null = null;

  constructor(seed: number, profile: WorldProfile = WORLD_PROFILES.principal) {
    this.profile = profile;
    this.generator = profile.terrain.kind === 'flat'
      ? new FlatGenerator(seed, profile.terrain.ground)
      : new WorldGenerator(seed);
    const b = profile.bounds;
    this.cellBounds = b
      ? { x0: b.cx0 * CHUNK_SIZE, y0: b.cy0 * CHUNK_SIZE, x1: (b.cx1 + 1) * CHUNK_SIZE - 1, y1: (b.cy1 + 1) * CHUNK_SIZE - 1 }
      : null;
    if (profile.dungeon) {
      const base = this.generator;
      const [sx, sy] = (this.spawn = this.findSpawn());
      this.dungeon = planDungeon(base, sx, sy);
      this.generator = new DungeonTerrain(base, this.dungeon);
    }
  }

  /** Célula dentro da dungeon (muralha incluída)? Lá nada é quebrado, colocado, arado nem plantado. */
  isProtected(x: number, y: number): boolean {
    return !!this.dungeon && inRect(this.dungeon.area, x, y);
  }

  /** A célula está dentro dos limites do mundo? (sempre true em mundo ilimitado) */
  inBounds(x: number, y: number): boolean {
    const b = this.cellBounds;
    return !b || (x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1);
  }

  /** Retângulo de chunks recortado aos limites do mundo (null se não sobra nada). */
  clampRect(rect: ChunkRect): ChunkRect | null {
    const b = this.profile.bounds;
    if (!b) return rect;
    const r = { cx0: Math.max(rect.cx0, b.cx0), cy0: Math.max(rect.cy0, b.cy0), cx1: Math.min(rect.cx1, b.cx1), cy1: Math.min(rect.cy1, b.cy1) };
    return r.cx0 > r.cx1 || r.cy0 > r.cy1 ? null : r;
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

  /** Chão da célula. Fora de chunk carregado consulta o gerador (puro); fora dos limites, céu. */
  getGround(x: number, y: number): BlockId {
    if (!this.inBounds(x, y)) return Block.VOID;
    const chunk = this.chunkAt(x, y);
    return chunk ? chunk.getGround(toLocal(x), toLocal(y)) : this.generator.groundAt(x, y);
  }

  /** Objeto do nível 0 da célula (AIR se vazio). */
  getObject(x: number, y: number): BlockId {
    if (!this.inBounds(x, y)) return Block.AIR;
    const chunk = this.chunkAt(x, y);
    return chunk ? chunk.getObject(toLocal(x), toLocal(y)) : this.generator.objectAt(x, y);
  }

  /** Cubo empilhado no nível 1 (AIR se não houver). */
  getUpper(x: number, y: number): BlockId {
    if (!this.inBounds(x, y)) return Block.AIR;
    const chunk = this.chunkAt(x, y);
    return chunk ? chunk.getLevel(toLocal(x), toLocal(y), 1) : this.generator.upperAt(x, y);
  }

  /** Bloco de um nível da pilha (0 = objeto no chão). O gerador só preenche os níveis 0 e 1. */
  getLevel(x: number, y: number, level: Level): BlockId {
    if (level === 0) return this.getObject(x, y);
    if (level === 1) return this.getUpper(x, y);
    if (!this.inBounds(x, y)) return Block.AIR;
    const chunk = this.chunkAt(x, y);
    return chunk ? chunk.getLevel(toLocal(x), toLocal(y), level) : Block.AIR;
  }

  /** Bloco visível no topo da célula e seu nível (null se vazia). */
  topBlock(x: number, y: number): { id: BlockId; level: Level } | null {
    for (let level = MAX_STACK - 1; level >= 0; level--) {
      const id = this.getLevel(x, y, level);
      if (id !== Block.AIR) return { id, level };
    }
    return null;
  }

  /** Quantos cubos há empilhados na célula (0..MAX_STACK). */
  stackHeight(x: number, y: number): number {
    if (blockDef(this.getObject(x, y)).shape !== 'cube') return 0;
    let n = 1;
    while (n < MAX_STACK && this.getLevel(x, y, n) !== Block.AIR) n++;
    return n;
  }

  /**
   * Altura em que se fica de pé na célula, ou null se não dá para ficar
   * (água, árvore, cacto, porta fechada). Cubos são superfícies: altura = nº de cubos.
   * Porta aberta é passável no nível do chão.
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

  private setLevel(x: number, y: number, level: Level | 'ground', id: BlockId): void {
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
    if (this.isProtected(x, y)) return null;
    const top = this.topBlock(x, y);
    if (top) return blockDef(top.id).breakable ? 'object' : null;
    return blockDef(this.getGround(x, y)).breakable ? 'ground' : null;
  }

  canBreak(x: number, y: number): boolean {
    return this.breakTarget(x, y) !== null;
  }

  /** Bloco que um golpe de quebra atingiria (topo do objeto ou o chão), ou null. */
  breakTargetId(x: number, y: number): BlockId | null {
    const t = this.breakTarget(x, y);
    if (t === 'object') return this.topBlock(x, y)!.id;
    if (t === 'ground') return this.getGround(x, y);
    return null;
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
      this.scheduleFlow(x, y); // vizinho de água: o buraco enche sozinho
      return id;
    }
    return null;
  }

  /**
   * Onde o bloco seria colocado, ou null se não pode.
   * 'ground': preenche um buraco — só cubos, que viram piso nivelado.
   * Nível 0: chão firme, célula vazia ou com enfeite (substituído).
   * Níveis 1..MAX_STACK-1: cubo sobre cubo. Enfeites, árvores e portas só no chão; nada empilha sobre porta.
   */
  placementLevel(x: number, y: number, id: BlockId): 'ground' | Level | null {
    const def = blockDef(id);
    if (!def.placeable || def.layer !== 'object') return null;
    // Cada mundo só aceita os blocos do seu perfil (ex.: Santuário = só blocos celestiais).
    if (!this.profile.blocks.includes(id) || this.isProtected(x, y)) return null;
    if (this.getGround(x, y) === Block.HOLE) return def.shape === 'cube' ? 'ground' : null;
    // Água não quebra, mas Terra, Pedra ou Tora a substituem (viram o chão da célula).
    if (this.getGround(x, y) === Block.WATER) return REPLACES_WATER.has(id) ? 'ground' : null;
    if (!this.isGroundStandable(x, y)) return null;
    const base = blockDef(this.getObject(x, y));
    if (base.id === Block.AIR || base.shape === 'decoration') {
      if (def.shape === 'door' && !this.hasDoorFrame(x, y)) return null;
      return 0;
    }
    if (def.shape === 'cube' && base.shape === 'cube') {
      const h = this.stackHeight(x, y);
      return h < MAX_STACK ? h : null;
    }
    return null;
  }

  // ---- Água ----

  /**
   * Agenda o enchimento de um buraco vizinho de água (ou de outro buraco já enchendo não conta: só água pronta).
   * O lado de onde a água vem segue uma ordem fixa (oeste, leste, norte, sul) — determinístico.
   */
  private scheduleFlow(x: number, y: number): void {
    if (this.getGround(x, y) !== Block.HOLE || this.flows.has(chunkKey(x, y))) return;
    for (const [from, dx, dy] of FLOW_DIRS) {
      if (this.getGround(x + dx, y + dy) === Block.WATER) {
        this.flows.set(chunkKey(x, y), { x, y, from, t: 0 });
        return;
      }
    }
  }

  /** Avança o enchimento: buraco cheio vira água e passa a encher os buracos vizinhos (em cadeia). */
  private tickWater(dt: number): void {
    if (!this.flows.size) return;
    const done: WaterFlow[] = [];
    for (const [key, f] of this.flows) {
      // Tapado no meio do caminho (bloco colocado no buraco): desiste.
      if (this.getGround(f.x, f.y) !== Block.HOLE) {
        this.flows.delete(key);
        continue;
      }
      f.t += dt / FLOW_SECONDS;
      if (f.t >= 1) done.push(f);
    }
    for (const f of done) {
      this.flows.delete(chunkKey(f.x, f.y));
      this.setLevel(f.x, f.y, 'ground', Block.WATER);
      for (const [, dx, dy] of FLOW_DIRS) this.scheduleFlow(f.x + dx, f.y + dy);
    }
  }

  /** Células enchendo agora (para a animação do render). */
  waterFlows(): Iterable<WaterFlow> {
    return this.flows.values();
  }

  /** Reagenda buracos vizinhos de água nos chunks editados (depois de carregar um salvamento). */
  settleWater(): void {
    for (const c of this.chunks.values()) {
      if (!c.modified) continue;
      for (let ly = 0; ly < CHUNK_SIZE; ly++) {
        for (let lx = 0; lx < CHUNK_SIZE; lx++) {
          if (c.getGround(lx, ly) === Block.HOLE) this.scheduleFlow(c.cx * CHUNK_SIZE + lx, c.cy * CHUNK_SIZE + ly);
        }
      }
    }
  }

  // ---- Portas ----

  /** Cubo de madeira (Tora ou Piso de Carvalho) ou de Pedra no nível 0 — serve de batente para a porta. */
  private isDoorJamb(x: number, y: number): boolean {
    const d = blockDef(this.getObject(x, y));
    return d.shape === 'cube' && (d.organic === 'wood' || d.id === Block.STONE);
  }

  /** A porta só vai entre dois batentes (madeira ou pedra, podem misturar): células da esquerda e da direita. */
  hasDoorFrame(x: number, y: number): boolean {
    return this.isDoorJamb(x - 1, y) && this.isDoorJamb(x + 1, y);
  }

  isDoor(x: number, y: number): boolean {
    return isDoor(this.getObject(x, y));
  }

  isDoorOpen(x: number, y: number): boolean {
    return this.getObject(x, y) === Block.OAK_DOOR_OPEN;
  }

  /**
   * Abre/fecha a porta da célula (o id guarda o estado: fechada bloqueia, aberta deixa passar).
   * Quem chama garante que ninguém está na célula ao fechar. Retorna false se não há porta.
   */
  toggleDoor(x: number, y: number): boolean {
    const id = this.getObject(x, y);
    if (!isDoor(id)) return false;
    this.setLevel(x, y, 0, id === Block.OAK_DOOR ? Block.OAK_DOOR_OPEN : Block.OAK_DOOR);
    return true;
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
    if (this.spawn) return this.spawn;
    const b = this.profile.bounds;
    if (b) {
      // Mundo limitado: centro da área.
      const cx = Math.floor(((b.cx0 + b.cx1 + 1) * CHUNK_SIZE) / 2);
      const cy = Math.floor(((b.cy0 + b.cy1 + 1) * CHUNK_SIZE) / 2);
      return this.nearestWalkable(cx, cy, 64);
    }
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

  /** A semente pode ser plantada aqui? Só em chão de Terra Arada, com a célula livre (ou com enfeite). */
  canPlant(x: number, y: number): boolean {
    if (this.isProtected(x, y)) return false;
    if (this.getGround(x, y) !== PLANTABLE_GROUND) return false;
    const base = blockDef(this.getObject(x, y));
    return base.id === Block.AIR || base.shape === 'decoration';
  }

  /**
   * A enxada pode arar aqui? Chão de Terra ou Terra com Grama, sem nada em cima
   * (enfeites como capim/flor são removidos ao arar).
   */
  canTill(x: number, y: number): boolean {
    if (this.isProtected(x, y)) return false;
    if (!TILLABLE.has(this.getGround(x, y))) return false;
    const base = blockDef(this.getObject(x, y));
    return base.id === Block.AIR || base.shape === 'decoration';
  }

  /** Ara o chão: Terra/Terra com Grama → Terra Arada. */
  till(x: number, y: number): boolean {
    if (!this.canTill(x, y)) return false;
    if (this.getObject(x, y) !== Block.AIR) this.setLevel(x, y, 0, Block.AIR);
    this.setLevel(x, y, 'ground', Block.TILLED);
    return true;
  }

  /**
   * A pá pode amassar aqui? Chão de Terra, Terra com Grama ou Terra Arada, sem nada em cima
   * (enfeites são removidos; trigo plantado impede).
   */
  canFlatten(x: number, y: number): boolean {
    if (this.isProtected(x, y)) return false;
    if (!FLATTENABLE.has(this.getGround(x, y))) return false;
    const base = blockDef(this.getObject(x, y));
    return base.id === Block.AIR || base.shape === 'decoration';
  }

  /** Amassa o chão: Terra/Terra com Grama/Terra Arada → Caminho de Terra. */
  flatten(x: number, y: number): boolean {
    if (!this.canFlatten(x, y)) return false;
    if (this.getObject(x, y) !== Block.AIR) this.setLevel(x, y, 0, Block.AIR);
    this.setLevel(x, y, 'ground', Block.PATH);
    return true;
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
    this.tickWater(dt);
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
  ensureChunks(area: ChunkRect, budget: number): number {
    const rect = this.clampRect(area);
    if (!rect) return 0;
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

  // ---- Persistência (o salvamento em si fica em game/save.ts) ----

  /** Chunks editados pelo jogador: o único estado do mapa que precisa ser salvo (o resto vem da seed). */
  modifiedChunks(): Chunk[] {
    return [...this.chunks.values()].filter((c) => c.modified);
  }

  /**
   * Restaura um chunk salvo (substitui o gerado pela seed) e reconstrói as plantações dele.
   * Camadas a mais que o motor atual são ignoradas; a menos ficam vazias.
   */
  restoreChunk(cx: number, cy: number, ground: Uint8Array, levels: Uint8Array[]): void {
    const c = new Chunk(cx, cy);
    c.ground.set(ground.subarray(0, c.ground.length));
    levels.forEach((l, i) => { if (i < c.levels.length) c.levels[i].set(l.subarray(0, c.levels[i].length)); });
    c.modified = true;
    c.version++;
    this.chunks.set(numKey(cx, cy), c);
    this.last = null;
    for (let ly = 0; ly < CHUNK_SIZE; ly++) {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        if (isWheat(c.getObject(lx, ly))) this.crops.add(chunkKey(cx * CHUNK_SIZE + lx, cy * CHUNK_SIZE + ly));
      }
    }
  }
}
