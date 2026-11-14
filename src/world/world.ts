import { SLAB_STACK_MAX, slabHeightOf } from './slabs';
import { CHUNK_SIZE, DAY_LENGTH_S, MAX_STACK, SANCTUARY_MAX_STACK, SUBDIV, UNLOAD_MARGIN } from '../config';
import { adultOfStage, Block, type BlockId, blockDef, CROP_STAGES, cropId, cropKind, type CropKind, cropStage, isCrop, isCropSeedling, isGrowingTree, isOpen, isOpenable, isRemovedBlock, isWall, isWallLike, toggled, TREE_NEXT } from './blocks';
import { type WallPiece, wallNeighbors, wallPiece } from './walls';
import type { Biome } from './biomes';
import { Chunk, type Level } from './chunk';
import { type CaveEntrance, dungeonEntry, dungeonGuard, type DungeonLayout, DungeonTerrain, inRect, isDungeonExit, isolatedDungeon, planCave, type Rect } from './dungeon';
import { grow, TOWN_MARGIN, TOWN_SOUTH_FIELD, TOWN_WALL, type TownBuilding, type TownLayout, townLayout, TownTerrain } from './town';
import { chunkKey, toChunk, toLocal } from './coords';
import { type InteriorDoor, type InteriorLayout, interiorLayouts, InteriorTerrain, tentLayout } from './interiors';
import { FlatGenerator } from './flatGenerator';
import { SanctuarySeedGenerator } from './sanctuarySeedGenerator';
import { hash2 } from './random';
import { WorldGenerator } from './generator';
import { GoblinCampTerrain, planGoblinCamps, planLizardPacks, type GoblinCamp, type LizardPack } from './goblins';
import { WORLD_PROFILES, type WorldProfile } from './profiles';
import type { TerrainSource } from './terrain';

/** Tempo médio (s) para o trigo avançar um estágio (~1,5 min da semente ao maduro). */
export const WHEAT_STAGE_SECONDS = 6;
/** Tempo médio (s) por estágio de cada cultura: hortaliças demoram um pouco mais que o trigo (~2–2,5 min). */
export const CROP_STAGE_SECONDS: Readonly<Record<CropKind, number>> = { wheat: WHEAT_STAGE_SECONDS, potato: 8, carrot: 8, tomato: 10 };
/** Tempo médio (s) para a macieira colhida voltar a ter maçãs. */
export const FRUIT_REGROW_SECONDS = 150;
/** Único chão onde a semente pode ser plantada. */
const PLANTABLE_GROUND: number = Block.TILLED;
/** Chãos que a enxada transforma em Terra Arada. */
const TILLABLE = new Set<number>([Block.DIRT, Block.GRASS]);
/** Chãos que a pá amassa em Caminho de Terra. */
const FLATTENABLE = new Set<number>([Block.DIRT, Block.GRASS, Block.TILLED]);
/** Blocos que podem substituir a água (viram o chão da célula): todo tipo de terra, Pedra e Tora. */
/** Células da tenda 2×2 com canto inferior esquerdo em (x, y): o próprio canto primeiro. */
export function tentCells(x: number, y: number): Array<[number, number]> {
  return [[x, y], [x + 1, y], [x, y - 1], [x + 1, y - 1]];
}

/** Blocos que substituem a água (viram o chão da célula): todo tipo de terra, Pedra, Tora e Tábua. */
/** Espaços de um baú. */
export const CHEST_SLOTS = 27;
/** Um espaço de baú: pilha (id do que se carrega + quantidade) ou vazio. */
export type ChestSlots = Array<{ item: string; count: number } | null>;

export const REPLACES_WATER = new Set<number>([Block.DIRT, Block.GRASS, Block.TILLED, Block.PATH, Block.STONE, Block.OAK_LOG, Block.OAK_PLANKS, Block.CHERRY_LOG, Block.CHERRY_PLANKS, Block.BIRCH_LOG, Block.BIRCH_PLANKS]);
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
  /** Profundidade de pilha específica do perfil: Mundo 2, Santuário 5. */
  /** Níveis de pilha por célula (2 no Mundo, 5 no Santuário; o piloto das lajes eleva para `SLAB_STACK_MAX` enquanto ligado). */
  maxStack: number;
  private readonly baseMaxStack: number;
  /** Limites em células (inclusivos) quando o perfil limita o mundo. */
  private readonly cellBounds: { x0: number; y0: number; x1: number; y1: number } | null;
  /** Chunks por chave numérica (`numKey`): evita criar strings a cada leitura de célula. */
  private readonly chunks = new Map<number, Chunk>();
  /** Último chunk acessado (leituras vizinhas costumam cair no mesmo). */
  private last: Chunk | null = null;
  /** Células com trigo plantado (crescem com o tempo). Só existem em chunks modificados, que não descarregam. */
  private readonly crops = new Set<string>();
  /** Árvores plantadas crescendo e macieiras colhidas (avançam em `tick`). */
  private readonly trees = new Set<string>();
  /**
   * Covil deste mundo (perfil com `dungeon`), ou null: labirinto isolado do mapa (ADR 0019), protegido; só se luta lá
   * dentro. No mundo fica só a entrada, a caverna (`cave`).
   */
  readonly dungeon: DungeonLayout | null = null;
  /** Entrada do covil no mundo (a pelo menos 10 chunks do castelo), ou null. */
  readonly cave: CaveEntrance | null = null;
  /** Cidade do Despertar (perfil com `town`), ou null. Área protegida; início e renascer sem tenda. */
  readonly town: TownLayout | null = null;
  /** Camps with seven goblins around the existing Campfire block (seed based). */
  readonly goblinCamps: GoblinCamp[] = [];
  /** Bandos de três homens-lagarto na margem dos rios (seed based, v0.93.60). */
  readonly lizardPacks: LizardPack[] = [];
  /** Interiores das construções da cidade (ADR 0014): cômodos isolados e protegidos. Vazio sem cidade. */
  readonly interiors: InteriorLayout[] = [];
  /** Buracos enchendo de água (estado de execução; ao carregar, `settleWater` reagenda). */
  private readonly flows = new Map<string, WaterFlow>();
  /**
   * Chão quebrado sem bloco: buraco ("x,y" → segundos que está assim). Quando faz um dia inteiro (`DAY_LENGTH_S`) o buraco
   * ganha um chão igual ao de um vizinho (dono do produto, 2026-11-08). Ao carregar, as idades voltam do salvamento
   * (`loadHoleAges`); buraco sem idade guardada começa a contar do zero.
   */
  private readonly holeAge = new Map<string, number>();
  /** Spawn calculado no terreno base (a dungeon é posta longe dele e não o altera). */
  private spawn: [number, number] | null = null;

  constructor(seed: number, profile: WorldProfile = WORLD_PROFILES.principal) {
    this.profile = profile;
    this.maxStack = this.baseMaxStack = profile.id === 'santuario' ? SANCTUARY_MAX_STACK : MAX_STACK;
    this.generator = profile.id === 'santuario' && profile.bounds
      ? new SanctuarySeedGenerator(seed, profile.bounds)
      : profile.terrain.kind === 'flat'
        ? new FlatGenerator(seed, profile.terrain.ground)
        : new WorldGenerator(seed);
    const baseTerrain = this.generator;
    const b = profile.bounds;
    this.cellBounds = b
      ? { x0: b.cx0 * CHUNK_SIZE, y0: b.cy0 * CHUNK_SIZE, x1: (b.cx1 + 1) * CHUNK_SIZE - 1, y1: (b.cy1 + 1) * CHUNK_SIZE - 1 }
      : null;
    if (profile.town) {
      // A cidade é a mesma em toda seed; o início fica na praça logo dentro do portão.
      this.town = townLayout();
      this.generator = new TownTerrain(this.generator, this.town);
      this.spawn = this.town.start;
    }
    if (profile.dungeon) {
      const base = this.generator;
      const spawn = (this.spawn = this.findSpawn());
      // Caverna fora da cidade, do anel em volta, da estrada do portão e do campo do rebanho (ao sul do portão),
      // a pelo menos 10 chunks do castelo; o labirinto em si fica no canto isolado.
      const keep = this.town ? grow(this.town.area, TOWN_MARGIN + 4) : null;
      if (keep) keep.y1 = this.town!.area.y1 + TOWN_SOUTH_FIELD;
      const castle = this.town?.buildings.find((b) => b.id === Block.CASTLE);
      const center: [number, number] = castle ? [castle.x + castle.w / 2, castle.y - castle.d / 2] : spawn;
      this.dungeon = isolatedDungeon(seed);
      this.cave = planCave(base, center, keep);
      this.generator = new DungeonTerrain(base, this.dungeon, this.cave);
    }
    if (this.town) this.interiors = interiorLayouts(this.town);
    // Mundos com tenda ganham o cômodo dela (um só, para todas as tendas).
    if (this.profile.blocks.includes(Block.TENT)) this.interiors = [...this.interiors, tentLayout()];
    if (this.interiors.length) this.generator = new InteriorTerrain(this.generator, this.interiors);
    // Generated campfires live in the same terrain layer as every other object:
    // no permanent writes to chunks, and saved player edits still win.
    this.goblinCamps.push(...planGoblinCamps(this));
    if (this.goblinCamps.length) this.generator = new GoblinCampTerrain(this.generator, this.goblinCamps);
    if (baseTerrain instanceof WorldGenerator) this.lizardPacks.push(...planLizardPacks(this, (x, y) => baseTerrain.riverAt(x, y), this.goblinCamps));
  }

  /**
   * Célula dentro da dungeon, da cidade (muralhas incluídas) ou de um interior — ou num chunk que tem pedaço da muralha
   * da cidade (regra do dono do produto, 2026-11-08: não se constrói no chunk do muro, mesmo fora dos limites da
   * cidade)? Lá nada é quebrado, colocado, arado nem plantado.
   */
  isProtected(x: number, y: number): boolean {
    return this.inGuardedArea(x, y) || (!!this.town && this.inWallChunk(this.town.area, x, y));
  }

  /**
   * Áreas fixas do mapa (dungeon, covil, cidade, interiores): voltam sempre do gerador ao carregar. A regra do chunk do
   * muro NÃO entra aqui: o que já foi construído fora da cidade, nesses chunks, continua lá (só não se constrói mais).
   */
  private inGuardedArea(x: number, y: number): boolean {
    return (!!this.dungeon && inRect(dungeonGuard(this.dungeon), x, y)) || (!!this.cave && inRect(this.cave.guard, x, y))
      || (!!this.town && inRect(this.town.area, x, y))
      || this.interiors.some((l) => inRect(l.guard, x, y));
  }

  /** O chunk da célula contém alguma célula da muralha (o anel de `TOWN_WALL` na borda da área da cidade)? */
  private inWallChunk(area: Rect, x: number, y: number): boolean {
    const x0 = Math.floor(x / CHUNK_SIZE) * CHUNK_SIZE;
    const y0 = Math.floor(y / CHUNK_SIZE) * CHUNK_SIZE;
    const x1 = x0 + CHUNK_SIZE - 1;
    const y1 = y0 + CHUNK_SIZE - 1;
    if (x1 < area.x0 || x0 > area.x1 || y1 < area.y0 || y0 > area.y1) return false; // não encosta na cidade
    const inside = x0 >= area.x0 + TOWN_WALL && x1 <= area.x1 - TOWN_WALL && y0 >= area.y0 + TOWN_WALL && y1 <= area.y1 - TOWN_WALL;
    return !inside; // só dentro do miolo (sem muralha) o chunk não conta
  }

  /** Interior (cômodo) que contém a célula, ou null. */
  interiorAt(x: number, y: number): InteriorLayout | null {
    return this.interiors.find((l) => inRect(l.area, x, y)) ?? null;
  }

  /** Porta (e cômodo) cuja entrada fica diante desta célula da rua (andar para cima nela = entrar), ou null. */
  interiorDoorAt(x: number, y: number): { room: InteriorLayout; door: InteriorDoor } | null {
    for (const room of this.interiors) {
      for (const door of room.doors) {
        // a porta tem `SUBDIV` células de largura na grade fina (a célula da rua guardada é a da esquerda)
        if (door.outside && y === door.outside[1] && x >= door.outside[0] && x < door.outside[0] + SUBDIV) return { room, door };
      }
    }
    return null;
  }

  /** Interior cuja porta fica diante desta célula da rua, ou null. */
  interiorEntrance(x: number, y: number): InteriorLayout | null {
    return this.interiorDoorAt(x, y)?.room ?? null;
  }

  /** Cômodo da tenda (mundos com tenda), ou null. */
  get tentRoom(): InteriorLayout | null {
    return this.interiors.find((l) => l.def.id === 'tent') ?? null;
  }

  /**
   * Diante da frente de uma tenda (a célula logo abaixo de uma das duas da fileira de baixo)? Devolve o canto da tenda
   * (andar para cima aqui = entrar nela), ou null.
   */
  tentDoorAt(x: number, y: number): [number, number] | null {
    if (!this.tentRoom) return null;
    const a = this.tentAnchor(x, y - 1);
    return a && a[1] === y - 1 ? a : null;
  }

  /** Diante da boca da caverna (andar para cima aqui = entrar no covil)? */
  isCaveDoor(x: number, y: number): boolean {
    // a boca tem `SUBDIV` células de largura na grade fina
    return !!this.cave && y === this.cave.outside[1] && x >= this.cave.outside[0] && x < this.cave.outside[0] + SUBDIV;
  }

  /** Dentro do covil (labirinto), sem o anel em volta? */
  inDungeon(x: number, y: number): boolean {
    return !!this.dungeon && inRect(this.dungeon.area, x, y);
  }

  /** Pisar nesta célula sai do covil (anel externo do vão da entrada)? */
  isDungeonExit(x: number, y: number): boolean {
    return !!this.dungeon && isDungeonExit(this.dungeon, x, y);
  }

  /** Onde se chega ao entrar no covil (logo para dentro do vão), ou null sem covil. */
  dungeonEntry(): [number, number] | null {
    return this.dungeon ? dungeonEntry(this.dungeon) : null;
  }

  /** Construção (ou placa) da cidade que ocupa a célula, ou null. */
  townBuildingAt(x: number, y: number): TownBuilding | null {
    const t = this.town;
    if (!t || !inRect(t.area, x, y)) return null;
    const k = t.buildingAt[(y - t.area.y0) * t.w + (x - t.area.x0)];
    return k >= 0 ? t.buildings[k] : null;
  }

  /** Do lado de fora do portão da cidade (na estrada); sem cidade, o início. */
  outsideGate(): [number, number] {
    if (!this.town) return this.findSpawn();
    let [x, y] = this.town.doorstep;
    while (this.isProtected(x, y)) y++; // a estrada sai do portão: o primeiro trecho já é o chunk do muro (protegido)
    return [x, y];
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
      chunk = new Chunk(cx, cy, this.maxStack);
      this.generator.generateChunk(cx, cy, chunk.ground, chunk.objects, chunk.upper);
      if (this.generator instanceof SanctuarySeedGenerator)
        this.generator.fillHighLevels(cx, cy, chunk.levels);
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

  /** Objeto do nível 0 (chunk carregado ou gerador). */
  getObject(x: number, y: number): BlockId {
    if (!this.inBounds(x, y)) return Block.AIR;
    const chunk = this.chunkAt(x, y);
    return chunk ? chunk.getObject(toLocal(x), toLocal(y)) : this.generator.objectAt(x, y);
  }

  /** Nível superior (1). */
  getUpper(x: number, y: number): BlockId {
    if (!this.inBounds(x, y)) return Block.AIR;
    const chunk = this.chunkAt(x, y);
    return chunk ? chunk.getLevel(toLocal(x), toLocal(y), 1) : this.generator.upperAt(x, y);
  }

  /** Bloco de um nível da pilha (0 = objeto no chão). O gerador só preenche os níveis 0 e 1. */
  getLevel(x: number, y: number, level: Level): BlockId {
    // Older saves may still refer to the discontinued third construction tier.
    if (!Number.isInteger(level) || level < 0 || level >= this.maxStack) return Block.AIR;
    if (level === 0) return this.getObject(x, y);
    if (level === 1) return this.getUpper(x, y);
    if (!this.inBounds(x, y)) return Block.AIR;
    const chunk = this.chunkAt(x, y);
    if (chunk) return chunk.getLevel(toLocal(x), toLocal(y), level);
    return this.generator instanceof SanctuarySeedGenerator ? this.generator.levelAt(x, y, level) : Block.AIR;
  }

  /** Bloco visível no topo da célula e seu nível (null se vazia). */
  topBlock(x: number, y: number): { id: BlockId; level: Level } | null {
    for (let level = this.maxStack - 1; level >= 0; level--) {
      const id = this.getLevel(x, y, level);
      if (id !== Block.AIR) return { id, level };
    }
    return null;
  }

  /** Quantos cubos há empilhados na célula (0..MAX_STACK). */
  stackHeight(x: number, y: number): number {
    if (blockDef(this.getObject(x, y)).shape !== 'cube') return 0;
    let n = 1;
    while (n < this.maxStack && this.getLevel(x, y, n) !== Block.AIR) n++;
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
    // Laje (piloto): andável, no nível do chão para a lógica; o corpo sobe `SLAB_HEIGHT` só no visual (`slabLift`).
    if (base.shape === 'cube' && this.isSlabAt(x, y)) return 0;
    if (base.shape === 'cube') return this.stackHeight(x, y);
    return base.solid ? null : 0;
  }

  /** Blocos que viram laje (piloto `?tabua=laje`, ver `world/slabs.ts`); vazio = nenhum (o padrão, e sempre na sala). */
  private slabs: ReadonlySet<BlockId> = new Set();

  /** Liga o piloto (ids de laje) ou o desliga (`[]`). Ligado, o limite de níveis sobe para `SLAB_STACK_MAX` (e os chunks já gerados crescem). */
  setSlabBlocks(ids: readonly BlockId[]): void {
    this.slabs = new Set(ids);
    this.maxStack = ids.length > 0 ? Math.max(this.baseMaxStack, SLAB_STACK_MAX) : this.baseMaxStack;
    if (ids.length > 0) for (const c of this.chunks.values()) c.growLevels(this.maxStack);
  }

  get hasSlabs(): boolean {
    return this.slabs.size > 0;
  }

  /**
   * A célula é uma pilha só de lajes (nível 0 de laje e, acima, só lajes ou nada)? Cubo comum em qualquer nível desfaz a laje.
   */
  isSlabAt(x: number, y: number): boolean {
    if (this.slabs.size === 0 || !this.slabs.has(this.getObject(x, y))) return false;
    for (let level = 1; level < this.maxStack; level++) {
      const id = this.getLevel(x, y, level);
      if (id !== Block.AIR && !this.slabs.has(id)) return false;
    }
    return true;
  }

  /** Quantas lajes há empilhadas na célula (0 se não é pilha de lajes). */
  slabCount(x: number, y: number): number {
    if (!this.isSlabAt(x, y)) return 0;
    let n = 0;
    while (n < this.maxStack && this.slabs.has(this.getLevel(x, y, n))) n++;
    return n;
  }

  /** Altura (células) das lajes abaixo do nível `level` da célula: onde assenta a laje desse nível. */
  slabBase(x: number, y: number, level: number): number {
    let h = 0;
    for (let l = 0; l < level; l++) h += slabHeightOf(this.getLevel(x, y, l));
    return h;
  }

  /** Quanto o corpo sobe por cima da célula (visual): a soma das alturas das lajes empilhadas, 0 no resto. */
  slabLift(x: number, y: number): number {
    return this.isSlabAt(x, y) ? this.slabBase(x, y, this.slabCount(x, y)) : 0;
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
    if (isRemovedBlock(id)) id = Block.AIR; // bloco que saiu do jogo (antigas paredes): vindo de dados ou de versão antiga
    id = adultOfStage(id) as BlockId; // muda/árvore jovem aposentadas (v0.88.0) viram a árvore adulta
    if (level === 'ground') {
      // Buraco novo começa a contar o dia; qualquer outro chão (água, bloco colocado, regeneração) para a contagem.
      if (id === Block.HOLE) this.holeAge.set(chunkKey(x, y), 0);
      else this.holeAge.delete(chunkKey(x, y));
      chunk.setGround(lx, ly, id);
    }
    else chunk.setLevel(lx, ly, level, id);
    if (level === 0) {
      if (isCrop(id)) this.crops.add(chunkKey(x, y));
      else this.crops.delete(chunkKey(x, y));
      if (isGrowingTree(id)) this.trees.add(chunkKey(x, y));
      else this.trees.delete(chunkKey(x, y));
    }
    // Vizinhos usam esta célula para sombras/bordas.
    if (lx === 0) this.touch(cx - 1, cy);
    if (lx === CHUNK_SIZE - 1) this.touch(cx + 1, cy);
    if (ly === 0) this.touch(cx, cy - 1);
    if (ly === CHUNK_SIZE - 1) this.touch(cx, cy + 1);
    // As transições de chão (render) olham também os vizinhos diagonais: o canto do chunk avisa o chunk da diagonal.
    const dx = lx === 0 ? -1 : lx === CHUNK_SIZE - 1 ? 1 : 0;
    const dy = ly === 0 ? -1 : ly === CHUNK_SIZE - 1 ? 1 : 0;
    if (dx !== 0 && dy !== 0) this.touch(cx + dx, cy + dy);
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
    if (t === 'object') {
      const id = this.topBlock(x, y)!.id;
      return id === Block.TENT_PART ? Block.TENT : id; // parte da tenda = a tenda
    }
    if (t === 'ground') return this.getGround(x, y);
    return null;
  }

  /** Quebra o topo da célula (empilhado → objeto → chão). Retorna o id removido ou null. */
  breakBlock(x: number, y: number): BlockId | null {
    const target = this.breakTarget(x, y);
    if (target === 'object') {
      const top = this.topBlock(x, y)!;
      if (top.id === Block.CHEST) this.chests.delete(chunkKey(x, y)); // quem quebra lê o conteúdo antes (chestAt)
      if (top.id === Block.TENT || top.id === Block.TENT_PART) {
        // Tenda 2×2: qualquer parte derruba a tenda inteira; se era a última colocada, o renascer volta ao início.
        const a = this.tentAnchor(x, y);
        if (a && this.tent && a[0] === this.tent[0] && a[1] === this.tent[1]) this.tent = null;
        if (a) for (const [cx, cy] of tentCells(a[0], a[1])) this.setLevel(cx, cy, 0, Block.AIR);
        else this.setLevel(x, y, 0, Block.AIR);
        return Block.TENT;
      }
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
    if ((!this.profile.blocks.includes(id) && !(this.slabs.has(id))) || this.isProtected(x, y)) return null;
    // Lajes (piloto): empilham até `SLAB_STACK_MAX` (misturando as três); cubo em cima de laje e laje em cima de cubo ou objeto não.
    if (this.slabs.has(id)) {
      if (this.getGround(x, y) === Block.HOLE || !this.isGroundStandable(x, y)) return null;
      if (this.isSlabAt(x, y)) { const n = this.slabCount(x, y); return n < SLAB_STACK_MAX && n < this.maxStack ? n : null; }
      const o = blockDef(this.getObject(x, y));
      return o.id === Block.AIR || o.shape === 'decoration' ? 0 : null;
    }
    if (this.isSlabAt(x, y)) return null;
    if (this.getGround(x, y) === Block.HOLE) return def.shape === 'cube' ? 'ground' : null;
    // Água não quebra, mas Terra, Pedra ou Tora a substituem (viram o chão da célula).
    if (this.getGround(x, y) === Block.WATER) return REPLACES_WATER.has(id) ? 'ground' : null;
    if (!this.isGroundStandable(x, y)) return null;
    const base = blockDef(this.getObject(x, y));
    if (base.id === Block.AIR || base.shape === 'decoration') {
      if (def.shape === 'door' && !this.hasDoorFrame(x, y)) return null;
      if (def.shape === 'wall-door' && !this.canPlaceWallDoor(x, y)) return null;
      // Tenda ocupa 2×2 (esta célula = canto inferior esquerdo): as 4 precisam estar livres em chão firme.
      if (id === Block.TENT && !tentCells(x, y).every(([cx, cy]) => this.isFootprintFree(cx, cy))) return null;
      return 0;
    }
    if (def.shape === 'cube' && base.shape === 'cube') {
      const h = this.stackHeight(x, y);
      return h < this.maxStack ? h : null;
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

  /**
   * Batente da porta: qualquer bloco (cubo) de madeira ou de pedra no nível 0 (dono do produto, 07/11: a porta vai entre
   * quaisquer blocos de madeira ou pedra).
   */
  private isDoorJamb(x: number, y: number): boolean {
    const d = blockDef(this.getObject(x, y));
    return d.shape === 'cube' && (d.organic === 'wood' || d.stone);
  }

  // ---- Assentos ----

  /**
   * Assento em (x, y) para quem está em (px, py): a cadeira, ou a célula do banco da cidade mais perto de quem senta.
   * Retorna a célula onde se senta, ou null se ali não há assento.
   */
  seatAt(x: number, y: number, px: number, py: number): [number, number] | null {
    const b = this.townBuildingAt(x, y);
    if (b) return blockDef(b.id).seat ? [Math.max(b.x, Math.min(b.x + b.w - 1, Math.floor(px))), b.y] : null;
    void py;
    return blockDef(this.getObject(x, y)).seat ? [x, y] : null;
  }

  /** A porta só vai entre dois batentes (qualquer bloco de madeira — tora ou tábuas, de qualquer árvore — ou de pedra, podem misturar): células da esquerda e da direita. */
  hasDoorFrame(x: number, y: number): boolean {
    return this.isDoorJamb(x - 1, y) && this.isDoorJamb(x + 1, y);
  }

  /**
   * Porta de parede (ADR 0027): só dentro de uma fileira leste–oeste, entre duas paredes comuns (não porta) e sem parede ao norte nem ao sul
   * (a frente da porta precisa aparecer e a tampa é a da fileira).
   */
  canPlaceWallDoor(x: number, y: number): boolean {
    return isWall(this.getObject(x - 1, y)) && isWall(this.getObject(x + 1, y)) &&
      !this.isWallAt(x, y - 1) && !this.isWallAt(x, y + 1);
  }

  /** Porta ou portão da cerca (abre e fecha com um toque)? */
  isDoor(x: number, y: number): boolean {
    return isOpenable(this.getObject(x, y));
  }

  /** Porta ou portão aberto? */
  isDoorOpen(x: number, y: number): boolean {
    return isOpen(this.getObject(x, y));
  }

  /**
   * Abre/fecha a porta ou o portão da célula (o id guarda o estado: fechado bloqueia, aberto deixa passar).
   * Quem chama garante que ninguém está na célula ao fechar. Retorna false se não há porta nem portão.
   */
  toggleDoor(x: number, y: number): boolean {
    const next = toggled(this.getObject(x, y));
    if (next === null) return false;
    this.setLevel(x, y, 0, next);
    return true;
  }

  canPlace(x: number, y: number, id: BlockId): boolean {
    return this.placementLevel(x, y, id) !== null;
  }

  placeBlock(x: number, y: number, id: BlockId): boolean {
    const level = this.placementLevel(x, y, id);
    if (level === null) return false;
    this.setLevel(x, y, level, id);
    if (id === Block.TENT) {
      for (const [cx, cy] of tentCells(x, y).slice(1)) this.setLevel(cx, cy, 0, Block.TENT_PART);
      this.tent = [x, y];
    }
    return true;
  }

  /** A célula tem uma parede (bloco de forma `wall` no nível 0)? */
  isWallAt(x: number, y: number): boolean {
    return isWallLike(this.getObject(x, y));
  }

  /** Peça de autotile da parede em (x, y) (ADR 0027), ou null se a célula não é parede. */
  wallPieceAt(x: number, y: number): WallPiece | null {
    if (!this.isWallAt(x, y)) return null;
    return wallPiece(wallNeighbors((cx, cy) => this.isWallAt(cx, cy), x, y));
  }

  /** Célula livre (vazia ou com enfeite) em chão firme, fora da dungeon — para objetos de várias células. */
  private isFootprintFree(x: number, y: number): boolean {
    if (this.isProtected(x, y) || !this.isGroundStandable(x, y) || this.getGround(x, y) === Block.HOLE) return false;
    const b = blockDef(this.getObject(x, y));
    return b.id === Block.AIR || b.shape === 'decoration';
  }

  /** Células que um bloco ocupa ao ser colocado em (x, y) (tenda 2×2; os demais, 1). */
  footprint(id: BlockId, x: number, y: number): Array<[number, number]> {
    return id === Block.TENT ? tentCells(x, y) : [[x, y]];
  }

  /**
   * Cantos possíveis para um objeto de várias células cobrir a célula (x, y) (tenda: 4 opções).
   * Quem coloca escolhe o que não pega ninguém; blocos de 1 célula têm só (x, y).
   */
  footprintAnchors(id: BlockId, x: number, y: number): Array<[number, number]> {
    return id === Block.TENT ? [[x, y], [x - 1, y], [x, y + 1], [x - 1, y + 1]] : [[x, y]];
  }

  /** Canto (TENT) da tenda que contém a célula, ou null. */
  tentAnchor(x: number, y: number): [number, number] | null {
    for (const [dx, dy] of [[0, 0], [-1, 0], [0, 1], [-1, 1]]) {
      if (this.getObject(x + dx, y + dy) === Block.TENT) return [x + dx, y + dy];
    }
    return null;
  }

  /** Última tenda colocada (ponto de renascer), se ainda estiver de pé. */
  tent: [number, number] | null = null;

  /** Conteúdo dos baús, por célula ("x,y"): 27 espaços (pilha ou null). Parte do estado do mundo (salvo). */
  readonly chests = new Map<string, ChestSlots>();

  /** Espaços do baú da célula (null se não há baú). */
  chestAt(x: number, y: number): ChestSlots | null {
    return this.getObject(x, y) === Block.CHEST ? this.chests.get(chunkKey(x, y)) ?? this.newChest(x, y) : null;
  }

  private newChest(x: number, y: number): ChestSlots {
    const c: ChestSlots = Array(CHEST_SLOTS).fill(null);
    this.chests.set(chunkKey(x, y), c);
    return c;
  }

  /** Onde renascer: ao lado da última tenda (se ainda existir), senão o início. */
  respawnPoint(): [number, number] {
    const t = this.tent;
    if (t && this.getObject(t[0], t[1]) === Block.TENT) {
      // Em volta da tenda 2×2 (frente primeiro).
      for (const [dx, dy] of [[0, 1], [1, 1], [-1, 0], [2, 0], [-1, 1], [2, 1], [0, -2], [1, -2]]) {
        if (this.isWalkable(t[0] + dx, t[1] + dy)) return [t[0] + dx, t[1] + dy];
      }
    }
    this.tent = null;
    return this.findSpawn();
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
      // O Santuário agora tem cubos em 100% das células, sem áreas com
      // standHeight=0. O centro tem a plataforma de altura 1 garantida.
      if (this.generator instanceof SanctuarySeedGenerator) return [cx, cy];
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

  /**
   * Dá para plantar `id` aqui? Plantação (trigo, batata, tomate, cenoura): só em Terra Arada. Não há mais mudas de árvore
   * (v0.88.0: as árvores só aparecem adultas).
   * Sempre com a célula livre (ou só com enfeite).
   */
  canPlant(x: number, y: number, id: BlockId = Block.WHEAT_0): boolean {
    if (this.isProtected(x, y)) return false;
    if (!isCropSeedling(id) || this.getGround(x, y) !== PLANTABLE_GROUND) return false;
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

  plant(x: number, y: number, id: BlockId = Block.WHEAT_0): boolean {
    if (!this.canPlant(x, y, id)) return false;
    this.setLevel(x, y, 0, id);
    return true;
  }

  /** Macieira carregada aqui (tocar colhe)? */
  canPick(x: number, y: number): boolean {
    return this.getObject(x, y) === Block.APPLE_TREE && !this.isProtected(x, y);
  }

  /** Colhe as maçãs: a macieira fica florida e as frutas voltam com o tempo (as maçãs em si: `pickDrops`). */
  pick(x: number, y: number): boolean {
    if (!this.canPick(x, y)) return false;
    this.setLevel(x, y, 0, Block.APPLE_TREE_BARE);
    return true;
  }

  /** Árvores plantadas crescendo (testes e depuração). */
  get growingTreeCount(): number {
    return this.trees.size;
  }

  get cropCount(): number {
    return this.crops.size;
  }

  /**
   * Avança o tempo: cada plantação não madura sobe um estágio com probabilidade dt / CROP_STAGE_SECONDS[cultura]
   * (crescimento natural, não sincronizado); depois as árvores.
   */
  /**
   * Avança o tempo do mundo: água sempre; crescimento de plantas/árvores só com `grow` (no multiplayer quem faz crescer
   * é a sala do servidor, que avisa cada célula pelo `onGrow`).
   */
  tick(dt: number, rand: () => number = Math.random, grow = true, onGrow?: (x: number, y: number, id: BlockId) => void): void {
    this.tickWater(dt);
    if (grow) {
      this.tickGrowth(dt, rand, onGrow);
      this.tickHoles(dt, onGrow);
    }
  }

  /**
   * Chão quebrado: cada buraco sem bloco envelhece; ao completar um dia inteiro ganha um chão igual ao de um vizinho
   * (`healedGround`). Quem decide é quem faz crescer (o jogo sozinho ou a sala), que avisa a célula pelo `onGrow`.
   */
  private tickHoles(dt: number, onFill?: (x: number, y: number, id: BlockId) => void): void {
    if (!this.holeAge.size) return;
    for (const [key, age] of [...this.holeAge]) {
      const next = age + dt;
      if (next < DAY_LENGTH_S) { this.holeAge.set(key, next); continue; }
      const [x, y] = key.split(',').map(Number);
      const id = this.getGround(x, y) === Block.HOLE ? this.healedGround(x, y) : null;
      if (id === null) { this.holeAge.set(key, Math.min(next, DAY_LENGTH_S)); continue; } // sem vizinho aproveitável: tenta de novo depois
      this.setLevel(x, y, 'ground', id); // também tira o buraco da contagem
      onFill?.(x, y, id);
    }
  }

  /**
   * Chão que um buraco antigo ganha: o de um vizinho (primeiro os de lado, depois as diagonais), escolhido pela seed e
   * pela posição — o mesmo buraco sempre ganha o mesmo chão. Só chão de bloco (não água, não outro buraco). Null se
   * nenhum vizinho serve.
   */
  healedGround(x: number, y: number): BlockId | null {
    const usable = (nx: number, ny: number): BlockId | null => {
      const g = this.getGround(nx, ny);
      const d = blockDef(g);
      return g !== Block.HOLE && g !== Block.AIR && d.shape === 'cube' && !d.liquid ? g : null;
    };
    for (const ring of [[[0, -1], [1, 0], [0, 1], [-1, 0]], [[1, -1], [1, 1], [-1, 1], [-1, -1]]] as const) {
      const found = ring.map(([dx, dy]) => usable(x + dx, y + dy)).filter((g): g is BlockId => g !== null);
      if (found.length) return found[Math.floor(hash2(this.seed, x * 7 + 1, y * 13 + 3) * found.length)];
    }
    return null;
  }

  /** Idades (s) dos buracos para o salvamento: `[x, y, segundos]`. */
  holeAges(): Array<[number, number, number]> {
    return [...this.holeAge].map(([key, age]) => {
      const [x, y] = key.split(',').map(Number);
      return [x, y, Math.round(age)];
    });
  }

  /** Devolve as idades salvas (só vale para célula que ainda é buraco; idade fora do razoável é ignorada). */
  loadHoleAges(list: ReadonlyArray<readonly [number, number, number]> | undefined): void {
    for (const e of list ?? []) {
      if (!Array.isArray(e) || e.length !== 3 || !e.every(Number.isFinite)) continue;
      const [x, y, age] = e;
      if (Math.abs(x) + Math.abs(y) > 2 ** 30 || age < 0 || age > DAY_LENGTH_S) continue;
      if (this.getGround(x, y) === Block.HOLE && this.holeAge.has(chunkKey(x, y))) this.holeAge.set(chunkKey(x, y), age);
    }
  }

  /** Buracos esperando virar chão (testes e depuração). */
  get holeCount(): number {
    return this.holeAge.size;
  }

  /** Plantas e árvores: cada estágio avança com probabilidade dt / tempo do estágio. */
  private tickGrowth(dt: number, rand: () => number, onGrow?: (x: number, y: number, id: BlockId) => void): void {
    const set = (x: number, y: number, id: BlockId) => { this.setLevel(x, y, 0, id); onGrow?.(x, y, id); };
    for (const key of [...this.crops]) {
      const [x, y] = key.split(',').map(Number);
      const id = this.getObject(x, y);
      const kind = cropKind(id);
      if (!kind) { this.crops.delete(key); continue; }
      const stage = cropStage(id);
      if (stage < CROP_STAGES - 1 && rand() < dt / CROP_STAGE_SECONDS[kind]) set(x, y, cropId(kind, stage + 1));
    }
    // Árvores: só a macieira colhida volta a dar maçãs (não há mais estágios de crescimento).
    for (const key of [...this.trees]) {
      const [x, y] = key.split(',').map(Number);
      const id = this.getObject(x, y);
      const next = TREE_NEXT[id];
      if (next === undefined) { this.trees.delete(key); continue; }
      if (rand() < dt / FRUIT_REGROW_SECONDS) set(x, y, next);
    }
  }

  /**
   * Multiplayer: aplica o crescimento que a sala decidiu (só se a célula ainda tem planta ou árvore que cresce — uma
   * ação que chegou antes vale). Retorna se aplicou.
   */
  applyGrowth(x: number, y: number, id: BlockId): boolean {
    // Buraco antigo que a sala preencheu com um chão (mesmo formato do crescimento; aparelho antigo ignora).
    if (this.getGround(x, y) === Block.HOLE && this.getObject(x, y) === Block.AIR && blockDef(id).shape === 'cube' && !blockDef(id).liquid) {
      this.setLevel(x, y, 'ground', id);
      return true;
    }
    const cur = this.getObject(x, y);
    if (!isCrop(cur) && TREE_NEXT[cur] === undefined) return false;
    this.setLevel(x, y, 0, id);
    return true;
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
   * Camadas a mais que o motor atual (o 3º nível, aposentado com `MAX_STACK = 2`) são descartadas; a menos ficam
   * vazias. Devolve quantos blocos foram descartados, para quem restaura avisar (jogo) ou registrar (servidor).
   */
  restoreChunk(cx: number, cy: number, ground: Uint8Array, levels: Uint8Array[]): number {
    const c = new Chunk(cx, cy, this.maxStack);
    c.ground.set(ground.subarray(0, c.ground.length));
    let dropped = 0;
    for (let i = c.levels.length; i < levels.length; i++) for (const b of levels[i]) if (b !== Block.AIR) dropped++;
    levels.forEach((l, i) => { if (i < c.levels.length) c.levels[i].set(l.subarray(0, c.levels[i].length)); });
    // Blocos que saíram do jogo (antigas paredes) em mundos e salas salvos viram vazio.
    for (const l of c.levels) for (let i = 0; i < l.length; i++) l[i] = isRemovedBlock(l[i]) ? Block.AIR : adultOfStage(l[i]); // + estágios de árvore aposentados
    // Áreas protegidas (cidade/dungeon) sempre voltam do gerador: salvamentos antigos podem ter outro terreno ali.
    for (let ly = 0; ly < CHUNK_SIZE; ly++) {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        const x = cx * CHUNK_SIZE + lx;
        const y = cy * CHUNK_SIZE + ly;
        if (!this.inGuardedArea(x, y)) continue;
        const cell = this.generator.cellAt(x, y);
        c.setGround(lx, ly, cell.ground);
        c.levels.forEach((l, i) => { l[ly * CHUNK_SIZE + lx] = i === 0 ? cell.object : i === 1 ? cell.upper : Block.AIR; });
      }
    }
    c.modified = true;
    c.version++;
    this.chunks.set(numKey(cx, cy), c);
    this.last = null;
    for (let ly = 0; ly < CHUNK_SIZE; ly++) {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        const id = c.getObject(lx, ly);
        const key = chunkKey(cx * CHUNK_SIZE + lx, cy * CHUNK_SIZE + ly);
        if (isCrop(id)) this.crops.add(key);
        if (isGrowingTree(id)) this.trees.add(key);
        // Buracos do chunk voltam a contar o dia do zero (as idades salvas entram depois, `loadHoleAges`).
        if (c.getGround(lx, ly) === Block.HOLE) this.holeAge.set(key, 0);
        else this.holeAge.delete(key);
      }
    }
    return dropped;
  }
}
