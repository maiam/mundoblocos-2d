import type { GrunhoCamp } from '../grunho';
import { Noise } from '../../world/noise';
import { hash2 } from '../../world/random';
import type { Arrival, Column } from '../generator';
import { derive } from '../generator';
import type { TerrainGen } from '../terrain';
import { attemptsFor, mulberry32, type OreRule, sampleOreY, veinCells } from '../ores';
import { fenceId, gateId, inRegion, LAKE_LAST_Y, REGION_V6, type Region, T, WALL_E, WALL_N, WALL_S, WALL_W, Y_MIN } from '../voxel';
import { buildingBlockAt, COSTA_BUILDINGS, type Building } from './casas';
import { COSTA_HEIGHT_B64, COSTA_MASK_B64, COSTA_PLAN } from './costaData';
import type { FaunaKind } from '../fauna';

/**
 * Gerador do Orvalis em voxel (ADR 0105): a ilha de florestas do mundo principal refeita em blocos de 1 m, com as regras do motor do Titã. Função pura de **seed + versão +
 * coordenadas globais** (nada depende da ordem de carregamento), com ruído próprio (`world/noise.ts`). Mudar qualquer regra, limiar ou ordem de busca = nova
 * `ORVALIS_GENERATOR_VERSION` (o save antigo continua abrindo com a versão em que foi gravado).
 *
 * v1: região de 128 × 128 cercada de mar; **Campos** e **Bosque de Sakura**, colinas, montanhas de pedra, rios, praias e árvores (carvalho, bétula e cerejeira) de tora e folhas.
 * O líquido é `T.LAKE` (o do motor; a arte da água é a do Orvalis) com superfície em Y = 64, como no Titã, para que balde, pulo de saída e mergulho valham sem mudança.
 * v2 (ADR 0122): **veios de minério de carvão** enterrados na pedra (regra da Minecraft Wiki adaptada, `ORVALIS_ORE_RULES`); o resto é a v1.
 * v4 (ADR 0124): a fauna de fazenda passa à **probabilidade de grupo da Wiki** (0,1 por chunk; a v3 usava 0,4); terreno e blocos iguais.
 * v3 (ADR 0124): **fauna de fazenda** (`titan/fauna.ts`, `faunaSpecs`): o relevo, os blocos e os veios são os da v2; a versão só liga os grupos de porco, vaca, ovelha e galinha em grama.
 */
export const ORVALIS_GENERATOR_VERSION = 6;
/**
 * v6 (ADR 0136): **recifes de coral** em manchas rasas do fundo (profundidade 3 a 10 de água), por um ruído de baixa frequência (`REEF`): montes de 0 a 2 blocos de coral vivo de uma família por mancha, com coral ou gorgônia por cima;
 * no recife não há erva marinha nem alga. Terreno, blocos e flora são os da v5 fora dos recifes.
 */
/**
 * v5 (ADR 0135): **flora marinha** no fundo de areia da água (mar, baías, lagos e rios) com 2 ou mais blocos de água acima do piso — erva marinha (baixa; alta em duas células) e alga (colunas até a superfície menos 1), por
 * regra pura da seed (`floraAt`); o terreno, os blocos e os veios são os da v4.
 */
/** Chances por coluna de fundo (Wiki: oceano morno-ameno tem erva marinha e alga; as densidades são adaptação): alga só com 5+ de água, erva marinha com 2+, alta com 3+. */
/** Recifes (v6): onde o ruído passa do limiar nasce uma mancha; a família é a mesma por quadra de 9 blocos; monte de 0 (35 %), 1 (40 %) ou 2 (25 %) blocos; 35 % têm coral e 25 %, gorgônia por cima (adaptação da Wiki: recifes só no oceano morno). */
export const REEF = { threshold: 0.3, scale: 16, famCell: 9, minDepth: 3, maxDepth: 10, h0: 0.35, h1: 0.75, plant: 0.35, fan: 0.6 } as const;
export const FLORA = { kelp: 0.05, seagrass: 0.2, tallShare: 0.4, kelpMinDepth: 5, kelpBase: 3, kelpSpread: 10 } as const;

const PURPOSE = { recife: 11, relevo: 1, colinas: 2, mar: 3, rio: 4, montanha: 5, bioma: 6, bosque: 7, arvore: 8, chegada: 9, mina: 10 } as const;
/**
 * Veios do Orvalis (v2, ADR 0122), do Minecraft 1.18 adaptados: 20 tentativas por chunk, veios de 4 a 30 blocos (a Wiki fala em 0–37), altura triangular com pico no meio da pedra (Y 40; a Wiki pica em 96 num mundo
 * de 192 de pedra) e descarte de metade dos blocos expostos ao ar. Só substituem a pedra (abaixo do subsolo de 3 blocos).
 */
export const ORVALIS_ORE_RULES: readonly OreRule[] = [
  { blockId: T.COAL_ORE, veinsPerChunk: 20, veinSize: 4, veinSizeMax: 30, minY: -60, maxY: 90, peakY: 40, airDiscardChance: 0.5 },
];
const CLEARING = 6;
/** Faixa de mar em volta da região: o relevo desce até o fundo do mar nas bordas (a parede invisível do motor fica dentro da água). */
const SEA_BAND = 20;
/** Lado da grade de sorteio das árvores: uma raiz por célula da grade. */
const GRID = 5;
const sm = (k: number): number => { const c = Math.min(1, Math.max(0, k)); return c * c * (3 - 2 * c); };

type Species = 'oak' | 'birch' | 'cherry';
interface Tree { x: number; z: number; top: number; h: number; sp: Species; seed: number }
const LOG: Record<Species, number> = { oak: T.LOG_OAK, birch: T.LOG_BIRCH, cherry: T.LOG_CHERRY };
const LEAVES: Record<Species, number> = { oak: T.LEAVES_OAK, birch: T.LEAVES_BIRCH, cherry: T.LEAVES_CHERRY };
/** Raio da copa em cada camada, de H − 2 até H + 1 (a última é em cruz). A cerejeira é mais larga. */
const CROWN: Record<Species, readonly [number, number, number, number]> = { oak: [2, 2, 1, 1], birch: [2, 2, 1, 1], cherry: [2, 3, 2, 1] };
const NO_TREES: readonly Tree[] = [];

export class OrvalisGenerator implements TerrainGen {
  readonly world = 'orvalis' as const;
  readonly region: Region = REGION_V6;
  readonly arrival: Arrival;
  // Conteúdo próprio do Titã: vazio aqui (o motor lê os mesmos campos em todo mundo; ver `TerrainGen`).
  readonly surfaceItems: TerrainGen['surfaceItems'] = [];
  readonly plates: TerrainGen['plates'] = [];
  readonly dryReeds: TerrainGen['dryReeds'] = [];
  readonly reeds: TerrainGen['reeds'] = [];
  readonly nutPlants: TerrainGen['nutPlants'] = [];
  readonly den = null;
  reedsFor(): Array<{ x: number; y: number; z: number }> { return []; }
  planEmber(): Array<{ x: number; z: number }> { return []; }

  private readonly nLand: Noise;
  private readonly nHills: Noise;
  private readonly nSea: Noise;
  private readonly nRiver: Noise;
  private readonly nMount: Noise;
  private readonly nBiome: Noise;
  private readonly nForest: Noise;
  private readonly nReef: Noise;
  private readonly cols = new Map<number, Column>();
  private readonly treeCells = new Map<number, Tree | null>();
  private readonly near = new Map<number, readonly Tree[]>();
  private readonly ores = new Map<number, { id: number; pri: number }>();
  private readonly oreDone = new Set<number>();
  private readonly oreReady = new Set<number>();

  constructor(readonly seed: number, readonly version: number = ORVALIS_GENERATOR_VERSION) {
    this.nLand = new Noise(derive(seed, PURPOSE.relevo));
    this.nHills = new Noise(derive(seed, PURPOSE.colinas));
    this.nSea = new Noise(derive(seed, PURPOSE.mar));
    this.nRiver = new Noise(derive(seed, PURPOSE.rio));
    this.nMount = new Noise(derive(seed, PURPOSE.montanha));
    this.nBiome = new Noise(derive(seed, PURPOSE.bioma));
    this.nForest = new Noise(derive(seed, PURPOSE.bosque));
    this.nReef = new Noise(derive(seed, PURPOSE.recife));
    this.arrival = this.findArrival();
  }

  inRegion(x: number, z: number): boolean { return inRegion(x, z, this.region); }

  /** Bioma da coluna: `true` = Bosque de Sakura (cerejeiras); `false` = Campos. */
  sakura(x: number, z: number): boolean { return this.nBiome.fbm2(x / 60 + 3.5, z / 60 + 8.5, 2) > 0.2; }

  // ---- Relevo ----

  /** Altura do terreno sem a clareira da chegada (pura em x, z). */
  private rawTop(x: number, z: number): number {
    let h = 69 + 6 * this.nLand.fbm2(x / 70 + 0.5, z / 70 + 0.5, 3) + 3 * this.nHills.fbm2(x / 26 + 5.5, z / 26 + 1.5, 3);
    const m = this.nMount.fbm2(x / 80 + 2.5, z / 80 + 6.5, 3); // montanhas: onde o ruído passa de 0,05, o terreno sobe até ~35 blocos
    if (m > 0.05) h += (m - 0.05) * 110;
    const s = this.nSea.fbm2(x / 110 + 7.5, z / 110 + 3.5, 2); // baías e lagos interiores: onde o ruído é baixo o terreno cede ao fundo do mar
    if (s < -0.3) h = h + (46 - h) * sm((-0.3 - s) / 0.25) * 0.8;
    const r = Math.abs(this.nRiver.noise2(x / 48 + 1.5, z / 48 + 9.5)); // rios: faixas finas onde o ruído cruza zero, cavadas até 3 blocos abaixo do mar
    const bank = 1 - r / 0.05;
    if (bank > 0 && h >= 63) h += (61 - h) * sm(bank) * (1 - sm((h - 72) / 10));
    const edge = Math.min(x - this.region.min, this.region.max - 1 - x, z - this.region.min, this.region.max - 1 - z) + 6 * this.nLand.noise2(x / 17 + 9.5, z / 17 + 4.5); // mar em volta da ilha, com a costa ondulada
    if (edge < SEA_BAND) h -= sm((SEA_BAND - edge) / SEA_BAND) * (h - 44);
    return Math.round(h);
  }

  column(x: number, z: number): Column {
    const key = (x + 4096) * 8192 + (z + 4096);
    const hit = this.cols.get(key);
    if (hit) return hit;
    const col = this.computeColumn(x, z);
    this.cols.set(key, col);
    return col;
  }

  protected computeColumn(x: number, z: number): Column {
    const c = this.arrival.clearing;
    const inClear = x >= c.x0 && x < c.x0 + c.size && z >= c.z0 && z < c.z0 + c.size;
    const top = inClear ? this.arrival.y - 1 : this.rawTop(x, z);
    if (inClear) return { top, surface: T.GRASS, sub: T.DIRT };
    const slope = Math.max(Math.abs(this.rawTop(x + 1, z) - top), Math.abs(this.rawTop(x - 1, z) - top), Math.abs(this.rawTop(x, z + 1) - top), Math.abs(this.rawTop(x, z - 1) - top));
    if (top <= 65) return { top, surface: T.BEACH, sub: T.BEACH }; // praia, margem de rio e fundo do mar
    if (top >= 86 || slope >= 4) return { top, surface: T.STONE, sub: T.STONE }; // picos e paredões
    return { top, surface: T.GRASS, sub: T.DIRT };
  }

  // ---- Chegada ----

  /** Clareira plana de grama a que o jogador chega, e o olhar voltado para a água mais próxima (ou para o centro da ilha). */
  protected findArrival(): Arrival {
    const base = derive(this.seed, PURPOSE.chegada);
    const flat = (x0: number, z0: number): number | null => { // alvo = nível do centro; só vale se tudo é grama seca, plana e longe da pedra
      let lo = Infinity, hi = -Infinity;
      for (let z = z0 - 2; z < z0 + CLEARING + 2; z++) for (let x = x0 - 2; x < x0 + CLEARING + 2; x++) {
        const t = this.rawTop(x, z);
        if (t < 67 || t > 78) return null;
        lo = Math.min(lo, t); hi = Math.max(hi, t);
      }
      return hi - lo <= 2 ? Math.round((lo + hi) / 2) : null;
    };
    let pick: { x0: number; z0: number; level: number } | null = null;
    const span = this.region.max - this.region.min - 2 * (SEA_BAND + 6);
    for (let k = 0; k < 800 && !pick; k++) {
      const x0 = Math.floor(hash2(base, k, 11) * span) + this.region.min + SEA_BAND + 6, z0 = Math.floor(hash2(base, k, 23) * span) + this.region.min + SEA_BAND + 6;
      const level = flat(x0, z0);
      if (level !== null) pick = { x0, z0, level };
    }
    if (!pick) pick = { x0: -3, z0: -3, level: 68 }; // reserva (a clareira é nivelada de qualquer jeito)
    const cx = pick.x0 + CLEARING / 2, cz = pick.z0 + CLEARING / 2;
    let best = { d: Infinity, dx: -cx, dz: -cz };
    for (let a = 0; a < 16; a++) { // água mais próxima numa varredura de 16 direções
      const ang = (a * Math.PI) / 8, dx = Math.cos(ang), dz = Math.sin(ang);
      for (let d = 4; d <= 60 && d < best.d; d += 2) if (this.rawTop(Math.round(cx + dx * d), Math.round(cz + dz * d)) <= 63) { best = { d, dx: dx * d, dz: dz * d }; break; }
    }
    return { x: cx, y: pick.level + 1, z: cz, yaw: Math.atan2(-best.dx, -best.dz), clearing: { x0: pick.x0, z0: pick.z0, size: CLEARING } };
  }

  // ---- Árvores ----

  /** A árvore da célula (gx, gz) da grade de sorteio, ou null: depende só da seed e das colunas dela (nunca de outras árvores). */
  private treeIn(gx: number, gz: number): Tree | null {
    const ck = (gx + 1024) * 2048 + (gz + 1024);
    if (this.treeCells.has(ck)) return this.treeCells.get(ck)!;
    const base = derive(this.seed, PURPOSE.arvore);
    const x = gx * GRID + Math.floor(hash2(base, ck, 1) * GRID), z = gz * GRID + Math.floor(hash2(base, ck, 2) * GRID);
    let tree: Tree | null = null;
    const c = this.arrival.clearing;
    const inside = x >= this.region.min + 4 && x < this.region.max - 4 && z >= this.region.min + 4 && z < this.region.max - 4;
    const nearClearing = x >= c.x0 - 4 && x < c.x0 + c.size + 4 && z >= c.z0 - 4 && z < c.z0 + c.size + 4;
    if (inside && !nearClearing) {
      const col = this.column(x, z), sak = this.sakura(x, z);
      const density = (sak ? 0.5 : 0.2) + 0.35 * Math.max(0, this.nForest.fbm2(x / 34 + 4.5, z / 34 + 2.5, 2)); // mata em manchas
      if (col.surface === T.GRASS && col.top >= 66 && hash2(base, ck, 3) < density) {
        const p = hash2(base, ck, 4);
        const sp: Species = sak ? (p < 0.8 ? 'cherry' : 'oak') : p < 0.55 ? 'oak' : p < 0.9 ? 'birch' : 'cherry';
        tree = { x, z, top: col.top, h: 4 + Math.floor(hash2(base, ck, 5) * 3) + (sp === 'birch' ? 1 : 0), sp, seed: Math.floor(hash2(base, ck, 6) * 4294967296) };
      }
    }
    this.treeCells.set(ck, tree);
    return tree;
  }

  /** Árvores cujo tronco ou copa pode tocar a coluna (x, z): raiz a até 3 blocos de distância. */
  protected treesNear(x: number, z: number): readonly Tree[] {
    const key = (x + 4096) * 8192 + (z + 4096), hit = this.near.get(key);
    if (hit) return hit;
    let out: Tree[] | null = null;
    for (let gz = Math.floor((z - 3 - (GRID - 1)) / GRID); gz <= Math.floor((z + 3) / GRID); gz++) for (let gx = Math.floor((x - 3 - (GRID - 1)) / GRID); gx <= Math.floor((x + 3) / GRID); gx++) {
      const t = this.treeIn(gx, gz);
      if (t && Math.abs(t.x - x) <= 3 && Math.abs(t.z - z) <= 3) (out ??= []).push(t);
    }
    const r = out ?? NO_TREES;
    this.near.set(key, r);
    return r;
  }

  /** Bloco (tora ou folha) que a árvore põe na célula, ou 0. */
  protected treeBlock(t: Tree, x: number, y: number, z: number): number {
    const dx = x - t.x, dz = z - t.z, dy = y - t.top; // dy = 1 é a primeira tora, acima do chão
    if (dx === 0 && dz === 0 && dy >= 1 && dy <= t.h) return LOG[t.sp];
    const layer = dy - (t.h - 2);
    if (layer < 0 || layer > 3) return 0;
    const r = CROWN[t.sp][layer], d2 = dx * dx + dz * dz;
    if (d2 > r * r + 0.5 || (dx === 0 && dz === 0 && layer < 3)) return 0;
    if (d2 >= r * r - 0.5 && r >= 2 && hash2(t.seed, x * 31 + dy, z) < 0.14) return 0; // borda irregular
    return LEAVES[t.sp];
  }

  /** O recife da coluna (v6, ADR 0136), ou null: altura do monte de coral, a planta de cima (0 = nenhuma) e a família (0–4). Só em fundo de areia, com `REEF.minDepth` a `REEF.maxDepth` de água, onde o ruído passa do limiar. */
  private reefInfo(x: number, z: number, top: number): { h: number; plant: number } | null {
    const depth = LAKE_LAST_Y - top;
    if (depth < REEF.minDepth || depth > REEF.maxDepth || top > 60) return null;
    const cl = this.arrival.clearing;
    if (this.column(x, z).surface !== T.BEACH || (x >= cl.x0 && x < cl.x0 + cl.size && z >= cl.z0 && z < cl.z0 + cl.size)) return null;
    if (this.nReef.fbm2(x / REEF.scale + 3.5, z / REEF.scale + 8.5, 2) < REEF.threshold) return null;
    const r = hash2(this.seed ^ 0x7e1, x, z), r2 = hash2(this.seed ^ 0x3a9, x, z);
    const fam = Math.floor(hash2(this.seed ^ 0x2c5, Math.floor(x / REEF.famCell), Math.floor(z / REEF.famCell)) * 5);
    const h = Math.min(depth - 2, r < REEF.h0 ? 0 : r < REEF.h1 ? 1 : 2); // a planta de cima fica no máximo em Y = 62: a superfície nunca é tocada
    return { h, plant: r2 < REEF.plant ? T.CORAL + fam : r2 < REEF.fan ? T.CORAL_FAN + fam : 0 };
  }

  /** Bloco do recife na célula `(x, y, z)` acima do piso `top` (0 = nada): monte de coral vivo e, por cima, coral ou gorgônia. */
  private reefBlock(x: number, y: number, z: number, top: number): number {
    const k = y - top;
    if (k < 1 || k > 3) return 0;
    const r = this.reefInfo(x, z, top);
    if (!r) return 0;
    if (k <= r.h) return T.CORAL_BLOCK + Math.floor(hash2(this.seed ^ 0x2c5, Math.floor(x / REEF.famCell), Math.floor(z / REEF.famCell)) * 5);
    return k === r.h + 1 ? r.plant : 0;
  }

  /** Planta aquática da célula `(x, y, z)` acima do piso `top` (0 = só água): erva marinha, erva alta ou alga, pela regra pura `FLORA` (v5, ADR 0135). */
  private floraBlock(x: number, y: number, z: number, top: number): number {
    const k = y - top, depth = LAKE_LAST_Y - top; // k = altura sobre o piso; depth = blocos de água acima do piso (top + 1 até a superfície)
    if (k < 1 || k > 13 || depth < 2 || top > 61) return 0;
    if (this.version >= 6 && this.reefInfo(x, z, top) !== null) return 0; // no recife não há erva marinha nem alga (v6)
    const c = this.column(x, z);
    if (c.surface !== T.BEACH || this.arrival.clearing && x >= this.arrival.clearing.x0 && x < this.arrival.clearing.x0 + this.arrival.clearing.size && z >= this.arrival.clearing.z0 && z < this.arrival.clearing.z0 + this.arrival.clearing.size) return 0;
    const r = hash2(this.seed ^ 0x51ea, x, z), r2 = hash2(this.seed ^ 0xa17, x, z);
    if (depth >= FLORA.kelpMinDepth && r < FLORA.kelp) {
      const h = Math.min(depth - 2, FLORA.kelpBase + Math.floor(r2 * FLORA.kelpSpread));
      return k < h ? T.KELP : k === h ? T.KELP_TOP : 0;
    }
    if (r >= FLORA.kelp && r < FLORA.kelp + FLORA.seagrass) {
      if (depth >= 3 && r2 < FLORA.tallShare) return k === 1 ? T.SEAGRASS_TALL : k === 2 ? T.SEAGRASS_TALL_TOP : 0;
      return k === 1 ? T.SEAGRASS : 0;
    }
    return 0;
  }

  /** Voxel da base (sem edições) em coordenadas globais. */
  blockAt(x: number, y: number, z: number): number {
    if (y <= Y_MIN) return T.BEDROCK;
    const c = this.column(x, z);
    if (y > c.top) {
      if (y <= LAKE_LAST_Y) { const f = (this.version >= 6 ? this.reefBlock(x, y, z, c.top) : 0) || (this.version >= 5 ? this.floraBlock(x, y, z, c.top) : 0); return f || T.LAKE; } // v5: flora marinha; v6: recifes de coral
      const ts = this.treesNear(x, z);
      for (let i = 0; i < ts.length; i++) { const b = this.treeBlock(ts[i], x, y, z); if (b) return b; }
      return T.AIR;
    }
    if (y === c.top) return c.surface;
    if (y >= c.top - 3) return c.sub;
    if (this.version >= 2) { const o = this.oreAt(x, y, z); if (o !== null) return o; } // v2: minério de carvão enterrado
    return T.STONE;
  }

  /** Minério da célula (v2), ou `null`. Garante que os 3 × 3 chunks em volta já foram gerados, porque um veio passa de um chunk para o vizinho (o resultado nunca depende da ordem de leitura). */
  private oreAt(x: number, y: number, z: number): number | null {
    const cx = x >> 4, cz = z >> 4, rk = (cx + 512) * 1024 + (cz + 512);
    if (!this.oreReady.has(rk)) {
      for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) this.genOreChunk(cx + dx, cz + dz);
      this.oreReady.add(rk);
    }
    return this.ores.get(((x + 4096) * 8192 + (z + 4096)) * 512 + (y + 64))?.id ?? null;
  }

  private genOreChunk(cx: number, cz: number): void {
    const ck = (cx + 512) * 1024 + (cz + 512);
    if (this.oreDone.has(ck)) return;
    this.oreDone.add(ck);
    if (!this.inRegion(cx * 16 + 8, cz * 16 + 8) && !this.inRegion(cx * 16, cz * 16) && !this.inRegion(cx * 16 + 15, cz * 16 + 15)) return;
    const replaceable = (x: number, y: number, z: number): boolean => y > Y_MIN && this.inRegion(x, z) && y < this.column(x, z).top - 3;
    const exposed = (x: number, y: number, z: number): boolean => [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].some(([dx, dy, dz]) => y + dy > this.column(x + dx, z + dz).top && y + dy > LAKE_LAST_Y);
    ORVALIS_ORE_RULES.forEach((rule, ri) => {
      const rng = mulberry32((derive(this.seed, PURPOSE.mina) ^ Math.imul(ck + 1, 0x9e3779b1) ^ Math.imul(ri + 1, 0x85ebca6b)) >>> 0);
      const n = attemptsFor(rng, rule.veinsPerChunk);
      for (let k = 0; k < n; k++) {
        const x = cx * 16 + Math.floor(rng() * 16), z = cz * 16 + Math.floor(rng() * 16), y = sampleOreY(rng, rule), pri = ri * 1e10 + ck * 1000 + k;
        for (const [vx, vy, vz] of veinCells(rng, x, y, z, rule, replaceable, exposed)) {
          const key = ((vx + 4096) * 8192 + (vz + 4096)) * 512 + (vy + 64), old = this.ores.get(key);
          if (!old || pri < old.pri) this.ores.set(key, { id: rule.blockId, pri });
        }
      }
    });
  }
}

/**
 * **Aldeia da Costa** (ADR 0142, `COSTA_GENERATOR_VERSION` 100): o terreno **não é sorteado** — vem de um mapa feito à mão (`costaData.ts`, gerado de `assets-src/orvalis-voxel/cenarios/aldeia-da-costa/` por
 * `make-orvalis-costa.py`): altura por coluna, material pela máscara, muro de pedra, cercas e porteiras de carvalho, árvores (só carvalho) e a chegada no portão da praia. É a sala 102; a partida individual segue
 * com o relevo por ruído (`ORVALIS_GENERATOR_VERSION`). Herda do `OrvalisGenerator` o que continua valendo — flora marinha, recifes e veios de carvão (regras v6) — e a fauna espalhada de `faunaSpecs`; soma os animais dos
 * cercados (`farmFauna`). Muda o mapa, o muro ou a regra → versão nova.
 */
export const COSTA_GENERATOR_VERSION = 102; // 102 (ADR 0149): Casa 1, 2, 3 e Celeiro (paredes de carvalho, telhado de degraus, alçapões nas janelas, portas na entrada); um arquivo salvo da v101 é recusado (a sala recomeça; o antigo fica na cópia `.bak` do servidor); 101 (ADR 0147): 4 acampamentos de goblins fora do muro; 100 era a aldeia sem eles (um arquivo salvo da sala 100 é recusado: a sala começa de novo, o antigo fica numa cópia `.bak` do servidor)
export const COSTA_LEGACY_VERSION = 100;
/** As construções da aldeia (ADR 0149), na ordem das bases do pacote; só a partir da v102. */
const COSTA_BUILDS: readonly Building[] = COSTA_PLAN.bases.map((b, i) => ({ ...COSTA_BUILDINGS[i], caixa: b.caixa }));
/** Acampamentos do Grunho (ADR 0147), fora do muro, em terreno quase plano (achados no mapa pela altura e pelo material): o gerador aplaina uma clareira de terra batida de `CAMP_FLAT_R` m (na altura mediana do local), com rampa até `CAMP_BLEND_R`, tira as árvores de perto e põe a Fogueira no centro e 12 lugares numa roda de `CAMP_RING_R` m. */
export const COSTA_CAMP_SITES: ReadonlyArray<{ id: string; x: number; z: number }> = [{ id: 'oeste', x: -38, z: 4 }, { id: 'sudoeste', x: -32, z: 28 }, { id: 'nordeste', x: 35, z: -10 }, { id: 'sudeste', x: 37, z: 26 }];
export const CAMP_SIZE = 12, CAMP_FLAT_R = 5.5, CAMP_BLEND_R = 12, CAMP_RING_R = 3.5, CAMP_TREE_R = 10;
const COSTA_N = 128, COSTA_MIN = -64;
const b64 = (s: string): Uint8Array => {
  const al = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/', out: number[] = [];
  let acc = 0, bits = 0;
  for (const ch of s) { const v = al.indexOf(ch); if (v < 0) continue; acc = (acc << 6) | v; bits += 6; if (bits >= 8) { bits -= 8; out.push((acc >> bits) & 255); acc &= (1 << bits) - 1; } }
  return Uint8Array.from(out);
};
const COSTA_H = b64(COSTA_HEIGHT_B64), COSTA_M = b64(COSTA_MASK_B64);
const costaIdx = (x: number, z: number): number => (z - COSTA_MIN) * COSTA_N + (x - COSTA_MIN);
const costaIn = (x: number, z: number): boolean => x >= COSTA_MIN && x < COSTA_MIN + COSTA_N && z >= COSTA_MIN && z < COSTA_MIN + COSTA_N;
const cellKey = (x: number, z: number): number => (x + 256) * 1024 + (z + 256);
const COSTA_WALL = new Set(COSTA_PLAN.muro.celulas.map(([x, z]) => cellKey(x, z)));
const COSTA_FENCE = new Set(COSTA_PLAN.cercas.celulas.map(([x, z]) => cellKey(x, z)));
const COSTA_GATES = new Map(COSTA_PLAN.cercados.map((c) => [cellKey(c.porteira[0], c.porteira[1]), c.porteira] as const)); // as porteiras ficam no vão da cerca
const COSTA_GATE_X = (x: number, z: number): boolean => COSTA_FENCE.has(cellKey(x - 1, z)) || COSTA_FENCE.has(cellKey(x + 1, z)); // o painel corre em X se há cerca nos lados de leste e oeste
/** Animais dos cercados (a Wiki põe os animais na criação; as espécies e as quantidades são escolha do mapa): cercado A = 3 galinhas e 1 porco; cercado B = 2 vacas e 2 ovelhas. */
/** Os talhões 1 e 2 da horta inicial (caixas do `implantacao.json`). */
const COSTA_PLANTIO = [COSTA_PLAN.talhoes[0].caixa, COSTA_PLAN.talhoes[1].caixa] as const;
const COSTA_PENS: ReadonlyArray<{ pen: number; kind: FaunaKind; n: number }> = [{ pen: 0, kind: 'galinha', n: 3 }, { pen: 0, kind: 'porco', n: 1 }, { pen: 1, kind: 'vaca', n: 2 }, { pen: 1, kind: 'ovelha', n: 2 }];

export class CostaGenerator extends OrvalisGenerator {
  private costaTrees: Map<number, Tree[]> | null = null;

  private campList: GrunhoCamp[] | null = null;

  constructor(seed: number, version: number = COSTA_GENERATOR_VERSION) { super(seed, version); }

  /** Há acampamentos só a partir da versão 101. */
  private get hasCamps(): boolean { return this.version >= 101; }

  /** Altura mediana (Y do topo natural) num raio de 5 em volta do centro: a altura da clareira. */
  private campBase(cx: number, cz: number): number {
    const hs: number[] = [];
    for (let dz = -5; dz <= 5; dz++) for (let dx = -5; dx <= 5; dx++) if (dx * dx + dz * dz <= 25 && costaIn(cx + dx, cz + dz)) hs.push(COSTA_H[costaIdx(cx + dx, cz + dz)]);
    hs.sort((a, b) => a - b);
    return hs[hs.length >> 1];
  }

  private campAround(x: number, z: number, r: number): { id: string; x: number; z: number; y: number } | null {
    if (!this.hasCamps) return null;
    for (const c of COSTA_CAMP_SITES) if (Math.hypot(x - c.x, z - c.z) <= r) return { ...c, y: this.campBase(c.x, c.z) };
    return null;
  }

  /** Os acampamentos (ADR 0147): a Fogueira (`x, y, z` = a célula dela) e os `CAMP_SIZE` lugares dos goblins na roda, nos pés (sobre a clareira). */
  get camps(): ReadonlyArray<GrunhoCamp> | undefined {
    if (!this.hasCamps) return undefined;
    if (!this.campList) {
      this.campList = COSTA_CAMP_SITES.map((c) => {
        const y = this.column(c.x, c.z).top + 1;
        const slots = Array.from({ length: CAMP_SIZE }, (_, i) => {
          const a = (i / CAMP_SIZE) * Math.PI * 2, sx = c.x + Math.round(Math.cos(a) * CAMP_RING_R), sz = c.z + Math.round(Math.sin(a) * CAMP_RING_R);
          return { x: sx, y: this.column(sx, sz).top + 1, z: sz };
        });
        return { id: c.id, x: c.x, y, z: c.z, slots };
      });
    }
    return this.campList;
  }

  /** Chegada no portão da praia (vão do muro em Z = 35, X 5–9), de frente para a aldeia (norte). */
  protected override findArrival(): Arrival {
    const g = COSTA_PLAN.portoes[1], x = (g.x[0] + g.x[1] + 1) / 2, z = g.z + 0.5, top = COSTA_H[costaIdx(Math.floor(x), g.z)];
    return { x, y: top + 1, z, yaw: 0, clearing: { x0: g.x[0], z0: g.z - 1, size: 3 } };
  }

  protected override computeColumn(x: number, z: number): Column {
    if (!costaIn(x, z)) return { top: 44, surface: T.BEACH, sub: T.BEACH }; // fora do mapa: fundo do mar (a parede invisível do motor fica dentro da água)
    const i = costaIdx(x, z), m = COSTA_M[i];
    let top = COSTA_H[i], trodden = false;
    const camp = m === 0 ? null : this.campAround(x, z, CAMP_BLEND_R); // clareira do acampamento (ADR 0147): plana e de terra batida no miolo, com rampa suave até o terreno natural
    if (camp) {
      const d = Math.hypot(x - camp.x, z - camp.z);
      if (d <= CAMP_FLAT_R) { top = camp.y; trodden = true; } else top = Math.round(camp.y + (top - camp.y) * ((d - CAMP_FLAT_R) / (CAMP_BLEND_R - CAMP_FLAT_R)));
    }
    if (top <= LAKE_LAST_Y || m === 0 || m === 1) return { top, surface: T.BEACH, sub: T.BEACH };
    if (trodden) return { top, surface: T.PATH, sub: T.DIRT };
    switch (m) {
      case 4: return { top, surface: T.STONE, sub: T.STONE };
      case 5: return { top, surface: T.PATH, sub: T.DIRT };
      case 6: return { top, surface: T.FARMLAND_DRY, sub: T.DIRT }; // talhão arado, seco: a água é do jogador
      case 8: return { top, surface: T.PLANKS_OAK, sub: T.DIRT }; // base edificável: só piso
      default: return { top, surface: T.GRASS, sub: T.DIRT }; // grama, floresta e pasto
    }
  }

  /** As árvores do mapa (só carvalho), indexadas pelas colunas que a copa ou o tronco pode tocar. */
  protected override treesNear(x: number, z: number): readonly Tree[] {
    if (!this.costaTrees) {
      const m = new Map<number, Tree[]>();
      COSTA_PLAN.arvores.forEach(([tx, tz], n) => {
        if (this.campAround(tx, tz, CAMP_TREE_R)) return; // sem árvore em volta do acampamento (a clareira é aberta)
        const t: Tree = { x: tx, z: tz, top: this.column(tx, tz).top, h: 4 + Math.floor(hash2(this.seed, n, 31) * 3), sp: 'oak', seed: Math.floor(hash2(this.seed, n, 37) * 4294967296) };
        for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) { const k = cellKey(tx + dx, tz + dz); (m.get(k) ?? m.set(k, []).get(k)!).push(t); }
      });
      this.costaTrees = m;
    }
    return this.costaTrees.get(cellKey(x, z)) ?? NO_TREES;
  }

  /** Muro de pedra lisa (4 blocos), cercas e porteiras de carvalho por cima do terreno; o resto é o da base. */
  override blockAt(x: number, y: number, z: number): number {
    const k = cellKey(x, z);
    if (this.hasCamps && COSTA_CAMP_SITES.some((c) => c.x === x && c.z === z) && y === this.column(x, z).top + 1) return T.CAMPFIRE; // a Fogueira do acampamento (ADR 0147)
    if (this.version >= 102 && y > COSTA_PLAN.soloY) for (const b of COSTA_BUILDS) { const id = buildingBlockAt(b, x, y, z); if (id) return id; } // casas e celeiro (ADR 0149)
    if (y >= COSTA_PLAN.muro.y[0] && y <= COSTA_PLAN.muro.y[1] && COSTA_WALL.has(k)) return T.STONE_SMOOTH;
    if (y === COSTA_PLAN.cercas.yBase) {
      if (COSTA_FENCE.has(k)) {
        const link = (cx: number, cz: number, axisX: boolean): boolean => { const kk = cellKey(cx, cz); return COSTA_FENCE.has(kk) || (COSTA_GATES.has(kk) && COSTA_GATE_X(cx, cz) === axisX); };
        return fenceId(0, (link(x, z - 1, false) ? WALL_N : 0) | (link(x + 1, z, true) ? WALL_E : 0) | (link(x, z + 1, false) ? WALL_S : 0) | (link(x - 1, z, true) ? WALL_W : 0));
      }
      if (COSTA_GATES.has(k)) return gateId(0, COSTA_GATE_X(x, z) ? 0 : 1, false);
    }
    return super.blockAt(x, y, z);
  }

  /** A horta inicial (ADR 0144): cenoura no talhão 1 e batata no talhão 2, em xadrez (metade das células de terra arada), com idades sorteadas pela seed — umas maduras, outras crescendo. O talhão 3 fica livre. */
  get startCrops(): ReadonlyArray<{ x: number; y: number; z: number; species: 'cenoura' | 'batata'; age: number }> {
    const out: Array<{ x: number; y: number; z: number; species: 'cenoura' | 'batata'; age: number }> = [];
    for (const [n, species] of [[0, 'cenoura'], [1, 'batata']] as const) {
      const [x0, z0, x1, z1] = COSTA_PLANTIO[n];
      for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
        if ((x + z) % 2 !== 0 || this.column(x, z).surface !== T.FARMLAND_DRY) continue;
        out.push({ x, y: this.column(x, z).top + 1, z, species, age: Math.floor(hash2(this.seed, x * 131 + z, 53 + n) * 8) });
      }
    }
    return out;
  }

  /** Animais da criação: dentro de cada cercado (a caixa do JSON sem a cerca), no pasto. */
  get farmFauna(): ReadonlyArray<{ id: string; kind: FaunaKind; x: number; y: number; z: number }> {
    const out: Array<{ id: string; kind: FaunaKind; x: number; y: number; z: number }> = [];
    for (const { pen, kind, n } of COSTA_PENS) {
      const [x0, z0, x1, z1] = COSTA_PLAN.cercados[pen].caixa, w = x1 - x0 - 1, d = z1 - z0 - 1; // o interior fica a 1 bloco da cerca
      for (let i = 0; i < n; i++) {
        const x = x0 + 1 + Math.floor(hash2(this.seed, pen * 97 + i, 41 + kind.length) * w), z = z0 + 1 + Math.floor(hash2(this.seed, pen * 97 + i, 43 + kind.length) * d);
        out.push({ id: `fc${pen}_${kind}_${i}`, kind, x, y: this.column(x, z).top + 1, z });
      }
    }
    return out;
  }
}

export const orvalisGeneratorFor = (seed: number, version: number): OrvalisGenerator | null =>
  version === COSTA_GENERATOR_VERSION || version === COSTA_LEGACY_VERSION || version === 101 ? new CostaGenerator(seed, version) : Number.isInteger(version) && version >= 1 && version <= ORVALIS_GENERATOR_VERSION ? new OrvalisGenerator(seed, version) : null;
