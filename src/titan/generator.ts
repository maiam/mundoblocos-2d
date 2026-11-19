import { Noise } from '../world/noise';
import { hash2 } from '../world/random';
import { LAKE_LAST_Y, REGION_MAX, REGION_MIN, T, Y_MIN } from './voxel';

/**
 * Gerador da Margem Silenciosa (ADR 0039). Função pura de **seed + versão + coordenadas globais**: nada depende da ordem de carregamento.
 * Seeds derivadas por finalidade (`derive`), ruído próprio (`world/noise.ts`). Mudar qualquer regra, limiar ou ordem de busca = nova
 * `GENERATOR_VERSION` (o save antigo continua abrindo com a versão em que foi gravado).
 */
export const GENERATOR_VERSION = 1;

export interface Column {
  /** Y do voxel sólido mais alto da coluna. */
  top: number;
  /** Bloco da superfície (Y = top). */
  surface: number;
  /** Bloco das 3 camadas logo abaixo da superfície. */
  sub: number;
}

export interface Arrival {
  /** Canto da clareira (célula do canto inferior-esquerdo) e posição dos pés (centro da célula, Y = 65). */
  x: number; y: number; z: number;
  /** Direção do olhar (rad, Three.js: 0 = −Z) apontando para a costa. */
  yaw: number;
  /** Centro da clareira de 6 × 6. */
  clearing: { x0: number; z0: number; size: number };
}

/** Seed derivada por finalidade: fixa e independente da ordem em que as coisas são geradas. */
export function derive(seed: number, purpose: number): number {
  return (Math.imul(hash2(seed >>> 0, purpose, 0x9e37) * 4294967296 >>> 0, 1) ^ (purpose * 0x85ebca6b)) >>> 0;
}
const PURPOSE = { relevo: 1, dunas: 2, lago: 3, rocha: 4, gelo: 5, chegada: 6, formacao: 7, veios: 8, seixos: 9 } as const;

const CLEARING = 6;
const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));

export class TitanGenerator {
  readonly version = GENERATOR_VERSION;
  private readonly nDunas: Noise;
  private readonly nLago: Noise;
  private readonly nRocha: Noise;
  private readonly nGelo: Noise;
  private readonly cols = new Map<number, Column>();
  /** Centro do lago (derivado da seed): a bacia fica de um lado da região. */
  readonly lake: { x: number; z: number; r: number };
  readonly arrival: Arrival;
  /** Formações de superfície reservadas (rocha e gelo recolhíveis na entrega 2), em área seca e alcançável. */
  readonly formations: ReadonlyArray<{ kind: 'rock' | 'ice'; x: number; z: number }>;

  constructor(readonly seed: number) {
    this.nDunas = new Noise(derive(seed, PURPOSE.dunas));
    this.nLago = new Noise(derive(seed, PURPOSE.lago));
    this.nRocha = new Noise(derive(seed, PURPOSE.rocha));
    this.nGelo = new Noise(derive(seed, PURPOSE.gelo));
    const theta = hash2(derive(seed, PURPOSE.lago), 1, 1) * Math.PI * 2;
    this.lake = { x: Math.round(Math.cos(theta) * 21), z: Math.round(Math.sin(theta) * 21), r: 17 };
    this.arrival = this.findArrival();
    this.formations = this.placeFormations();
  }

  // ---- Campos 2D (relevo bruto; ignoram clareira e formações) ----

  /** Campo do lago: > 0 dentro da bacia; ≈ distância (em blocos) da margem. */
  lakeField(x: number, z: number): number {
    const warp = 1 + 0.28 * this.nLago.noise2(x / 13 + 7.3, z / 13 + 1.9) + 0.1 * this.nLago.noise2(x / 5 + 3.1, z / 5 + 8.7);
    const dx = x - this.lake.x;
    const dz = z - this.lake.z;
    return this.lake.r - Math.hypot(dx, dz) * warp;
  }

  /** Altura do voxel sólido mais alto no relevo bruto (sem clareira nem formações). */
  rawTop(x: number, z: number): number {
    const s = -this.lakeField(x, z); // > 0 em terra
    if (s < 0) {
      const d = -s;
      if (d < 1) return LAKE_LAST_Y - 0; // aro raso rente à superfície: sólido em Y = 63 (o topo fica em 64)
      return LAKE_LAST_Y - 1 - Math.min(9, Math.floor((d - 1) * 0.9));
    }
    const dunes = Math.max(0, this.nDunas.noise2(x / 9 + 2.2, z / 9 + 5.4)) * 2.6;
    const rise = Math.max(0, s - 3) * 0.16;
    const scarp = s > 24 ? 5 + Math.floor((s - 24) * 0.45) : 0;
    return 64 + Math.floor(rise + dunes) + scarp;
  }

  // ---- Chegada ----

  /** Raspa de rugosidade da caixa da clareira no relevo bruto; Infinity = não serve (lago, fora da região ou desnivelada demais). */
  private clearingScore(x0: number, z0: number): number {
    // margem de 2 blocos em volta da clareira também precisa ser seca e estar dentro da região
    if (x0 - 2 < REGION_MIN + 2 || z0 - 2 < REGION_MIN + 2 || x0 + CLEARING + 2 > REGION_MAX - 2 || z0 + CLEARING + 2 > REGION_MAX - 2) return Infinity;
    let rough = 0;
    for (let dx = -2; dx < CLEARING + 2; dx++) for (let dz = -2; dz < CLEARING + 2; dz++) {
      const x = x0 + dx, z = z0 + dz;
      if (this.lakeField(x, z) > -2) return Infinity; // a faixa precisa ser seca (≥ 2 blocos da margem)
      const t = this.rawTop(x, z);
      if (t < 63 || t > 66) return Infinity;
      rough += Math.abs(t - 64);
    }
    // tem que ficar perto da costa (para a primeira vista e o percurso até a enseada)
    const cx = x0 + CLEARING / 2, cz = z0 + CLEARING / 2;
    const shore = -this.lakeField(cx, cz);
    if (shore < 3 || shore > 14) return Infinity;
    return rough;
  }

  private findArrival(): Arrival {
    const base = derive(this.seed, PURPOSE.chegada);
    let best: { x0: number; z0: number } | null = null;
    // busca em ordem determinística: sorteios derivados da seed, tentativas limitadas; aceita o primeiro de rugosidade baixa
    for (let k = 0; k < 600 && !best; k++) {
      const x0 = Math.floor(hash2(base, k, 11) * (REGION_MAX - REGION_MIN - 16)) + REGION_MIN + 8;
      const z0 = Math.floor(hash2(base, k, 23) * (REGION_MAX - REGION_MIN - 16)) + REGION_MIN + 8;
      if (this.clearingScore(x0, z0) <= 14) best = { x0, z0 };
    }
    // alternativa segura (mesma seed): varredura em ordem fixa, escolhe a de menor rugosidade (empate = primeira)
    if (!best) {
      let bestScore = Infinity;
      for (let z0 = REGION_MIN; z0 < REGION_MAX; z0++) for (let x0 = REGION_MIN; x0 < REGION_MAX; x0++) {
        const sc = this.clearingScore(x0, z0);
        if (sc < bestScore) { bestScore = sc; best = { x0, z0 }; }
      }
    }
    if (!best) best = { x0: -3, z0: -3 }; // inalcançável com o lago de raio 17 a 21 da origem; mantém o contrato
    const cx = best.x0 + CLEARING / 2, cz = best.z0 + CLEARING / 2;
    // olhar para a costa: direção do centro da clareira ao centro do lago (Three.js: forward = (−sin yaw, −cos yaw))
    const yaw = Math.atan2(-(this.lake.x - cx), -(this.lake.z - cz));
    return { x: cx, y: 65, z: cz, yaw, clearing: { x0: best.x0, z0: best.z0, size: CLEARING } };
  }

  private inClearing(x: number, z: number, pad = 0): boolean {
    const c = this.arrival.clearing;
    return x >= c.x0 - pad && x < c.x0 + c.size + pad && z >= c.z0 - pad && z < c.z0 + c.size + pad;
  }

  private placeFormations(): ReadonlyArray<{ kind: 'rock' | 'ice'; x: number; z: number }> {
    const out: Array<{ kind: 'rock' | 'ice'; x: number; z: number }> = [];
    const base = derive(this.seed, PURPOSE.formacao);
    const a = this.arrival;
    for (const [i, kind] of (['rock', 'ice'] as const).entries()) {
      const phi0 = hash2(base, i, 5) * Math.PI * 2;
      for (let k = 0; k < 48; k++) {
        const phi = phi0 + k * 2.399963; // ângulo áureo: varre em ordem fixa
        const dist = 9 + (k % 4) * 2;
        const x = Math.round(a.x + Math.cos(phi) * dist);
        const z = Math.round(a.z + Math.sin(phi) * dist);
        if (x < REGION_MIN + 6 || x >= REGION_MAX - 6 || z < REGION_MIN + 6 || z >= REGION_MAX - 6) continue;
        if (this.lakeField(x, z) > -4) continue; // seca e afastada da margem
        if (this.rawTop(x, z) > 68) continue; // não sobre a falésia
        if (out.some((o) => Math.hypot(o.x - x, o.z - z) < 8)) continue;
        out.push({ kind, x, z });
        break;
      }
    }
    return out;
  }

  // ---- Colunas e voxels ----

  /** Coluna em (x, z): memoizada (as consultas de voxel e de malha repetem muito a mesma coluna). */
  column(x: number, z: number): Column {
    const key = (x + 4096) * 8192 + (z + 4096);
    const hit = this.cols.get(key);
    if (hit) return hit;
    const col = this.computeColumn(x, z);
    this.cols.set(key, col);
    return col;
  }

  private computeColumn(x: number, z: number): Column {
    const raw = this.rawTop(x, z);
    const s = -this.lakeField(x, z);
    let top = raw;
    // clareira: nivela em Y = 64 e funde o anel de 2 blocos entre 63 e 65, para a chegada ficar plana e acessível
    if (this.inClearing(x, z)) top = 64;
    else if (this.inClearing(x, z, 2)) top = clamp(raw, 63, 65);
    // formações: montes de 3 blocos de rocha escura e gelo, em área seca perto da chegada
    let formation: 'rock' | 'ice' | null = null;
    for (const f of this.formations) {
      const d = Math.hypot(x - f.x, z - f.z);
      if (d < 3.2) {
        const bump = Math.max(0, 3 - Math.floor(d));
        if (bump > 0) { top = Math.max(top, raw + bump); formation = f.kind; }
      }
    }
    // materiais de superfície
    let surface: number = T.SAND;
    if (formation === 'rock') surface = T.DARK_ROCK;
    else if (formation === 'ice') surface = T.FROST;
    else if (s < 4 && top <= 65) surface = T.DAMP_SAND; // praia úmida, bacia e aro
    else if (top >= 84 || (s > 6 && this.nRocha.noise2(x / 6 + 0.5, z / 6 + 9.5) > 0.38)) surface = T.DARK_ROCK; // afloramentos e falésias
    else if (s > 10 && this.nGelo.noise2(x / 5 + 4.5, z / 5 + 1.5) > 0.42) surface = T.FROST; // manchas de gelo
    if (this.inClearing(x, z)) surface = T.SAND;
    const sub = surface === T.DARK_ROCK || surface === T.FROST ? T.DARK_ROCK : surface === T.DAMP_SAND ? T.DAMP_SAND : T.SAND;
    return { top, surface, sub };
  }

  /** Voxel da base (sem edições) em coordenadas globais. */
  blockAt(x: number, y: number, z: number): number {
    if (y <= Y_MIN) return T.BEDROCK;
    const c = this.column(x, z);
    if (y > c.top) return y <= LAKE_LAST_Y ? T.LAKE : T.AIR;
    if (y === c.top) return c.surface;
    if (y >= c.top - 3) return c.sub;
    if (y >= -32 && y < 0 && hash2(derive(this.seed, PURPOSE.veios), x * 31 + z, y) < 0.012) return T.FROST; // veios de gelo no subsolo intermediário
    return T.DARK_ROCK;
  }
}
