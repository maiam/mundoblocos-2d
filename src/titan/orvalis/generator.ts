import { Noise } from '../../world/noise';
import { hash2 } from '../../world/random';
import type { Arrival, Column } from '../generator';
import { derive } from '../generator';
import type { TerrainGen } from '../terrain';
import { attemptsFor, mulberry32, type OreRule, sampleOreY, veinCells } from '../ores';
import { inRegion, LAKE_LAST_Y, REGION_V6, type Region, T, Y_MIN } from '../voxel';

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
export const ORVALIS_GENERATOR_VERSION = 5;
/**
 * v5 (ADR 0135): **flora marinha** no fundo de areia da água (mar, baías, lagos e rios) com 2 ou mais blocos de água acima do piso — erva marinha (baixa; alta em duas células) e alga (colunas até a superfície menos 1), por
 * regra pura da seed (`floraAt`); o terreno, os blocos e os veios são os da v4.
 */
/** Chances por coluna de fundo (Wiki: oceano morno-ameno tem erva marinha e alga; as densidades são adaptação): alga só com 5+ de água, erva marinha com 2+, alta com 3+. */
export const FLORA = { kelp: 0.05, seagrass: 0.2, tallShare: 0.4, kelpMinDepth: 5, kelpBase: 3, kelpSpread: 10 } as const;

const PURPOSE = { relevo: 1, colinas: 2, mar: 3, rio: 4, montanha: 5, bioma: 6, bosque: 7, arvore: 8, chegada: 9, mina: 10 } as const;
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

  private computeColumn(x: number, z: number): Column {
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
  private findArrival(): Arrival {
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
  private treesNear(x: number, z: number): readonly Tree[] {
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
  private treeBlock(t: Tree, x: number, y: number, z: number): number {
    const dx = x - t.x, dz = z - t.z, dy = y - t.top; // dy = 1 é a primeira tora, acima do chão
    if (dx === 0 && dz === 0 && dy >= 1 && dy <= t.h) return LOG[t.sp];
    const layer = dy - (t.h - 2);
    if (layer < 0 || layer > 3) return 0;
    const r = CROWN[t.sp][layer], d2 = dx * dx + dz * dz;
    if (d2 > r * r + 0.5 || (dx === 0 && dz === 0 && layer < 3)) return 0;
    if (d2 >= r * r - 0.5 && r >= 2 && hash2(t.seed, x * 31 + dy, z) < 0.14) return 0; // borda irregular
    return LEAVES[t.sp];
  }

  /** Planta aquática da célula `(x, y, z)` acima do piso `top` (0 = só água): erva marinha, erva alta ou alga, pela regra pura `FLORA` (v5, ADR 0135). */
  private floraBlock(x: number, y: number, z: number, top: number): number {
    const k = y - top, depth = LAKE_LAST_Y - top; // k = altura sobre o piso; depth = blocos de água acima do piso (top + 1 até a superfície)
    if (k < 1 || k > 13 || depth < 2 || top > 61) return 0;
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
      if (y <= LAKE_LAST_Y) { const f = this.version >= 5 ? this.floraBlock(x, y, z, c.top) : 0; return f || T.LAKE; } // v5: flora marinha dentro da água
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

export const orvalisGeneratorFor = (seed: number, version: number): OrvalisGenerator | null =>
  Number.isInteger(version) && version >= 1 && version <= ORVALIS_GENERATOR_VERSION ? new OrvalisGenerator(seed, version) : null;
