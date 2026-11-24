import { Noise } from '../world/noise';
import { hash2 } from '../world/random';
import { biomeAt } from './biomes';
import { attemptsFor, mulberry32, type OreRule, sampleOreY, veinCells } from './ores';
import { inRegion, LAKE_LAST_Y, regionFor, type Region, T, Y_MIN } from './voxel';

/**
 * Gerador da Margem Silenciosa (ADR 0039). Função pura de **seed + versão + coordenadas globais**: nada depende da ordem de carregamento.
 * Seeds derivadas por finalidade (`derive`), ruído próprio (`world/noise.ts`). Mudar qualquer regra, limiar ou ordem de busca = nova
 * `GENERATOR_VERSION` (o save antigo continua abrindo com a versão em que foi gravado).
 */
/**
 * v1 (entrega 1): formações em qualquer ponto seco e baixo. v2 (entrega 2, ADR 0040): as formações só entram em terreno **plano** (raio 3 com diferença ≤ 1 bloco),
 * para as lascas de superfície ficarem alcançáveis a pé em toda seed. O terreno fora das formações é idêntico nas duas versões.
 * v3 (ADR 0044): as lascas pré-posicionadas saem; as formações passam a ter **veios** (blocos `VEIN_ROCK`/`VEIN_FROST`) que soltam a lasca ao quebrar. A busca só aceita
 * formação **alcançável a pé** desde a chegada (BFS de degraus de 1 bloco) e, se a busca natural falhar, um **afloramento de reserva** garante as duas fontes.
 * O terreno fora das formações segue idêntico nas três versões.
 * v4 (ADR 0045): o depósito de **brasa de âmbar** (`T.EMBER`, no topo de uma coluna de areia úmida alcançável a pé) e os grupos de **junco de vidro** em volta dele; tudo o mais é igual à v3.
 * v5 (ADR 0060, 0061): as **plantas de Noz de Duna** (comida): 2 perto da chegada, em terreno seco e alcançável, e um grupo de até 4 numa enseada afastada, com a **toca do Farejador de Duna** (`den`) no centro dela; terreno, brasa e juncos idênticos à v4.
 * v6 (ADR 0062): a região passa a **8 × 8 chunks (128 × 128 blocos)**; o relevo longe do lago deixa de subir em paredões (a subida é gradual e limitada: o mundo além da bacia é uma planície de dunas que sobe devagar até a borda); o resto das regras é o da v5.
 * v7 (ADR 0063): **afloramentos de cobre** (2 montes de rocha com 3 veios de cobre cada, longe da toca do Farejador) e **hastes secas** de junco no chão; o resto é a v6.
 * v8 (ADR 0066): **abrigos** (2 vãos entre dois pilares de rocha, cada um com uma **placa de carapaça** no chão), fora do território do Farejador; o resto é a v7.
 * v9 (ADR 0070): **veios subterrâneos** (cobre, rocha e gelo enterrados, altura triangular, descarte por exposição ao ar, só substituem a rocha profunda; `ORE_RULES`); os
 * gelos soltos do subsolo da v1–v8 saem; a superfície é idêntica à v8.
 * v13 (ADR 0086): o cultivo do junco assume a Haste Seca: as **hastes secas avulsas** caem de até 8 para as **2 mais próximas da chegada** (uma Picareta de Rocha), e a **Noz de Duna mais próxima da
 * chegada fica sem Farejador** (a primeira refeição é segura; `creatureSpecs`). O resto é a v12.
 * v12 (ADR 0074): a Margem é um bioma (`biomes.ts`); a Noz de Duna nasce **só em areia seca** e na proporção de 1 % da areia seca elegível (cerca de 25 plantas por seed), com espaçamento mínimo de 4; ao menos 2
 * perto da chegada e a enseada da toca continuam. Cada planta tem um Farejador pequeno (`creatureSpecs`) e há um grande a cada 5 plantas. O resto é a v11.
 * v11 (ADR 0073): **brasa de âmbar comum**: 4 depósitos superficiais acessíveis a pé nos 4 × 4 chunks iniciais (cada um com juncos em volta), **veios de âmbar** enterrados de 3 a 8 blocos e ao menos um
 * veio garantido perto da chegada; o resto é a v10.
 * v10 (ADR 0072): **fragmentos à vista**: veios de rocha espalhados pela rocha escura da superfície (mais densos nas camadas altas, Y ≥ 72) e de gelo nas manchas de gelo; o resto é a v9.
 */
export const GENERATOR_VERSION = 13;

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
const PURPOSE = { relevo: 1, dunas: 2, lago: 3, rocha: 4, gelo: 5, chegada: 6, formacao: 7, veios: 8, seixos: 9, veioSuperficie: 10, brasa: 11, junco: 12, noz: 13, cobre: 14, haste: 15, abrigo: 16, mina: 17, fragmentos: 18, ambar: 19 } as const;

/** Regras dos veios subterrâneos (v9). Faixas escaladas do Minecraft para um mundo de superfície em Y ≈ 64 e fundo em Y −64. */
export const ORE_RULES: readonly OreRule[] = [
  { blockId: T.VEIN_COPPER, veinsPerChunk: 3, veinSize: 6, minY: -48, maxY: 48, peakY: 8, airDiscardChance: 0.5 },
  { blockId: T.VEIN_ROCK, veinsPerChunk: 5, veinSize: 5, minY: -60, maxY: 56, airDiscardChance: 0.5 },
  { blockId: T.VEIN_FROST, veinsPerChunk: 3, veinSize: 5, minY: -44, maxY: 8, peakY: -24, airDiscardChance: 0 },
  // v11 (ADR 0073): veio de âmbar de 3 a 8 blocos, mais fundo que a rocha e o cobre (pico em Y −10)
  { blockId: T.EMBER_VEIN, veinsPerChunk: 2, veinSize: 3, veinSizeMax: 8, minY: -48, maxY: 30, peakY: -10, airDiscardChance: 0.3 },
];
/** Regras de veio da versão: a v9 e a v10 têm as três primeiras; o âmbar entra na v11. */
const oreRulesFor = (version: number): readonly OreRule[] => (version >= 11 ? ORE_RULES : ORE_RULES.slice(0, 3));
const CLEARING = 6;
const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));

export class TitanGenerator {
  readonly world = 'titan' as const;
  readonly version: number;
  private readonly nDunas: Noise;
  private readonly nLago: Noise;
  private readonly nRocha: Noise;
  private readonly nGelo: Noise;
  private readonly cols = new Map<number, Column>();
  /** Veios subterrâneos (v9): célula → minério e prioridade (menor vence: o resultado não depende da ordem de carga). */
  private readonly ores = new Map<number, { id: number; pri: number }>();
  private readonly oreReady = new Set<number>();
  private readonly oreDone = new Set<number>();
  /** Centro do lago (derivado da seed): a bacia fica de um lado da região. */
  readonly lake: { x: number; z: number; r: number };
  readonly arrival: Arrival;
  /** Formações de superfície reservadas (rocha e gelo recolhíveis na entrega 2), em área seca e alcançável. */
  readonly formations: ReadonlyArray<{ kind: 'rock' | 'ice'; x: number; z: number }>;
  /** Fragmentos de superfície (lascas) sobre as formações: 3 de cada, com **id determinístico** (`rock:0`…), recolhidos à mão. Item 5 = rocha, 6 = gelo (`titan/items.ts`). */
  readonly surfaceItems: ReadonlyArray<{ id: string; item: 5 | 6; x: number; y: number; z: number }>;
  /** v3: veios naturais (3 de rocha e 3 de gelo), por coluna (x, z); o voxel é o topo da coluna. Vazio na v1 e na v2. */
  private readonly veins = new Map<number, 'rock' | 'ice'>();
  /** v7: colunas (chave x/z) cujo topo é veio de cobre. */
  private readonly copper = new Set<number>();
  /** v4: o depósito de brasa (célula do topo da coluna, `blockAt` devolve `T.EMBER` ali) e os juncos de vidro (decoração sem colisão, célula de ar sobre areia úmida). Nulo/vazio antes da v4. */
  readonly emberSite: { x: number; y: number; z: number } | null = null;
  /** v11 (ADR 0073): os 4 depósitos de brasa acessíveis a pé (o primeiro é `emberSite`). Antes da v11 só há o primeiro; antes da v4, nenhum. */
  readonly emberSites: ReadonlyArray<{ x: number; y: number; z: number }> = [];
  /** v11: células do veio de âmbar garantido perto da chegada (a menos de 20 blocos, sob a superfície; alcançável cavando). */
  amberGuaranteed: ReadonlyArray<{ x: number; y: number; z: number }> = [];
  private readonly amberKeys = new Map<number, true>();
  private readonly emberKeys = new Set<number>();
  readonly reeds: ReadonlyArray<{ x: number; y: number; z: number }> = [];
  /** v5: plantas de Noz de Duna (célula de ar sobre areia, seca ou úmida — hoje ~86 % em seca —, sem colisão como o junco). Vazio antes da v5. */
  readonly nutPlants: ReadonlyArray<{ x: number; y: number; z: number }> = [];
  /** v7: afloramentos de rocha com veios de cobre (ADR 0063): montes como as formações, longe da toca; os veios (3 por afloramento) ficam no topo. */
  /** Só `placeCopper` (no construtor) escreve; nunca mude depois. */
  copperSites: ReadonlyArray<{ x: number; z: number }> = [];
  copperCells: ReadonlyArray<{ x: number; y: number; z: number }> = [];
  /** v8: abrigos (ADR 0066): centro do vão, os dois pilares de rocha (montes estreitos) e a placa de carapaça no chão entre eles. */
  shelterSites: ReadonlyArray<{ x: number; z: number }> = [];
  plates: ReadonlyArray<{ id: string; item: 25; x: number; y: number; z: number }> = [];
  private pillars: ReadonlyArray<{ x: number; z: number }> = [];
  /** v7: hastes secas de junco, no chão perto dos juncos (id `dry:x,y,z`, item 19), recolhidas à mão (ADR 0063). */
  readonly dryReeds: ReadonlyArray<{ id: string; item: 19; x: number; y: number; z: number }> = [];
  /** v5: a toca do Farejador de Duna (ADR 0061), no centro da enseada de plantas; null se a região não teve enseada. */
  readonly den: { x: number; y: number; z: number } | null = null;
  private reachMemo: Set<number> | null = null;
  /** A coluna (x, z) está dentro da região jogável desta versão? */
  inRegion(x: number, z: number): boolean { return inRegion(x, z, this.region); }
  /** v3: a busca natural não achou as duas formações e o afloramento de reserva entrou (diagnóstico e testes). */
  outcropFallback = false;

  /** Região jogável desta versão (v1–v5: 64 × 64; v6: 128 × 128). */
  readonly region: Region;

  constructor(readonly seed: number, version: number = GENERATOR_VERSION) {
    this.version = version;
    this.region = regionFor(version);
    this.nDunas = new Noise(derive(seed, PURPOSE.dunas));
    this.nLago = new Noise(derive(seed, PURPOSE.lago));
    this.nRocha = new Noise(derive(seed, PURPOSE.rocha));
    this.nGelo = new Noise(derive(seed, PURPOSE.gelo));
    const theta = hash2(derive(seed, PURPOSE.lago), 1, 1) * Math.PI * 2;
    this.lake = { x: Math.round(Math.cos(theta) * 21), z: Math.round(Math.sin(theta) * 21), r: 17 };
    this.arrival = this.findArrival();
    const reach = version >= 3 ? this.walkableFromArrival() : null;
    this.formations = this.placeFormations(reach);
    this.surfaceItems = version >= 3 ? [] : this.placeSurfaceItems();
    if (version >= 7) this.placeCopper();
    if (version >= 8) this.placeShelters(); // antes de qualquer coluna usada pelas buscas seguintes: os montes entram em `computeColumn`
    if (version >= 3) this.placeVeins();
    if (version >= 4) {
      const site = this.planEmber()[0] ?? this.planEmber(false)[0] ?? null; // sem areia úmida alcançável: depósito de reserva em outra coluna livre
      this.emberSite = site ? { x: site.x, y: this.column(site.x, site.z).top, z: site.z } : null;
      this.emberSites = version >= 11 ? this.emberSitesFor(site) : this.emberSite ? [this.emberSite] : [];
      if (version >= 11) this.emberSite = this.emberSites[0] ?? null; // o primeiro depósito dentro dos 4 × 4 chunks iniciais
      for (const e of this.emberSites) this.emberKeys.add((e.x + 4096) * 8192 + (e.z + 4096));
      this.reeds = version >= 11 ? this.reedsForSites() : site ? this.reedsFor(site.x, site.z) : [];
    }
    if (version >= 5) { const n = this.nutsFor(); this.nutPlants = n.plants; this.den = n.den; }
    if (version >= 7) this.dryReeds = this.dryReedsFor();
    if (version >= 11) this.placeAmberGuaranteed();
  }

  // ---- v4: brasa de âmbar e junco de vidro ----

  /** Colunas alcançáveis a pé (memoizado; o mesmo cálculo da v3, para qualquer versão). */
  private walkable(): Set<number> { return this.reachMemo ??= this.walkableFromArrival(); }

  /**
   * Candidatos ao depósito de brasa, em ordem fixa por seed: coluna de **areia úmida** alcançável a pé, perto da chegada, fora da clareira e das formações, com os 4 vizinhos também
   * alcançáveis (a brasa fica acessível por qualquer lado). Serve a v4 (usa o primeiro) e a migração de partidas antigas (usa o primeiro que ainda estiver intacto).
   */
  planEmber(strict = true): Array<{ x: number; z: number }> {
    const a = this.arrival, base = derive(this.seed, PURPOSE.brasa), reach = this.walkable();
    const key = (x: number, z: number): number => (x + 4096) * 8192 + (z + 4096);
    const out: Array<{ x: number; z: number; h: number }> = [];
    for (const k of reach) {
      const x = Math.floor(k / 8192) - 4096, z = (k % 8192) - 4096;
      if (x < this.region.min + 4 || x >= this.region.max - 4 || z < this.region.min + 4 || z >= this.region.max - 4) continue;
      if (Math.hypot(x - a.x, z - a.z) > 30 || this.inClearing(x, z, 3)) continue;
      const c = this.column(x, z);
      if (strict && (c.surface !== T.DAMP_SAND || c.top < 63 || c.top > 65)) continue; // reserva (`strict = false`): qualquer coluna alcançável e livre
      if (c.surface !== T.DAMP_SAND && c.surface !== T.SAND) continue; // nunca sobre rocha, gelo ou formação
      if (this.formations.some((f) => Math.hypot(f.x - x, f.z - z) < 5)) continue;
      if (![[1, 0], [-1, 0], [0, 1], [0, -1]].every(([dx, dz]) => reach.has(key(x + dx, z + dz)))) continue;
      out.push({ x, z, h: hash2(base, x * 131 + z, 3) });
    }
    out.sort((p, q) => p.h - q.h || p.x - q.x || p.z - q.z);
    return out.map(({ x, z }) => ({ x, z }));
  }

  /**
   * v11 (ADR 0073): até 4 depósitos acessíveis a pé nos 4 × 4 chunks iniciais (|x|, |z| ≤ 30), afastados ≥ 12 entre si. O primeiro é o da v4 (`first`); os outros, na ordem fixa de `planEmber`
   * (areia úmida rasa primeiro, depois qualquer coluna livre), sem repetir a região da planta de noz (que sai depois e já se afasta dos depósitos).
   */
  private emberSitesFor(first: { x: number; z: number } | null): Array<{ x: number; y: number; z: number }> {
    const out: Array<{ x: number; y: number; z: number }> = [];
    const take = (c: { x: number; z: number }, apart: number): void => {
      if (out.length >= 4 || out.some((o) => Math.hypot(o.x - c.x, o.z - c.z) < apart)) return;
      out.push({ x: c.x, y: this.column(c.x, c.z).top, z: c.z });
    };
    const inStart = (c: { x: number; z: number }): boolean => Math.abs(c.x) <= 30 && Math.abs(c.z) <= 30;
    if (first && inStart(first)) take(first, 0); // o da v4, se já estiver nos chunks iniciais
    for (const apart of [12, 8, 5]) for (const c of [...this.planEmber(), ...this.planEmber(false)]) if (inStart(c)) take(c, apart);
    return out;
  }

  /** Juncos de todos os depósitos (v11): a união dos grupos, sem repetir célula e sem tocar nos 8 vizinhos de nenhum depósito. */
  private reedsForSites(): Array<{ x: number; y: number; z: number }> {
    const seen = new Set<number>(), out: Array<{ x: number; y: number; z: number }> = [];
    for (const e of this.emberSites) for (const r of this.reedsFor(e.x, e.z)) {
      const k = (r.x + 4096) * 8192 + (r.z + 4096);
      if (seen.has(k) || this.emberSites.some((o) => Math.abs(r.x - o.x) <= 1 && Math.abs(r.z - o.z) <= 1)) continue;
      seen.add(k); out.push(r);
    }
    // depósito de reserva sem junco por perto (coluna que não é areia úmida rasa): até 3 juncos em volta, em areia alcançável (o junco é a pista para achar a brasa)
    const reach = this.walkable(), base = derive(this.seed, PURPOSE.junco);
    for (const e of this.emberSites) {
      if (out.some((r) => Math.hypot(r.x - e.x, r.z - e.z) <= 5)) continue;
      const ring: Array<{ x: number; z: number; h: number }> = [];
      for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) {
        const x = e.x + dx, z = e.z + dz, k = (x + 4096) * 8192 + (z + 4096), c = Math.max(Math.abs(dx), Math.abs(dz));
        if (c < 2 || seen.has(k) || !reach.has(k) || !this.inRegion(x, z)) continue;
        const col = this.column(x, z);
        if ((col.surface !== T.SAND && col.surface !== T.DAMP_SAND) || this.emberKeys.has(k) || this.copper.has(k)) continue;
        ring.push({ x, z, h: hash2(base, x * 131 + z, 9) });
      }
      ring.sort((p, q) => p.h - q.h || p.x - q.x || p.z - q.z);
      for (const c of ring.slice(0, 3)) { seen.add((c.x + 4096) * 8192 + (c.z + 4096)); out.push({ x: c.x, y: this.column(c.x, c.z).top + 1, z: c.z }); }
    }
    return out;
  }

  /**
   * Veio de âmbar garantido (v11, ADR 0073): o Titã ainda não tem cavernas, então a "primeira caverna acessível" é um veio de 5 a 8 blocos entre 6 e 20 blocos da chegada, 6 a 9 blocos sob a superfície
   * (alcançável cavando). Escolhe, em ordem fixa por seed, a primeira coluna que dá pelo menos 4 células de rocha profunda.
   */
  private placeAmberGuaranteed(): void {
    const a = this.arrival, base = derive(this.seed, PURPOSE.ambar), cands: Array<{ x: number; z: number; h: number }> = [];
    for (let dz = -20; dz <= 20; dz++) for (let dx = -20; dx <= 20; dx++) {
      const x = Math.floor(a.x) + dx, z = Math.floor(a.z) + dz, d = Math.hypot(dx, dz);
      if (d < 6 || d > 20 || !this.inRegion(x, z) || this.inClearing(x, z, 2)) continue;
      cands.push({ x, z, h: hash2(base, x * 131 + z, 1) });
    }
    cands.sort((p, q) => p.h - q.h || p.x - q.x || p.z - q.z);
    const replaceable = (x: number, y: number, z: number): boolean => y > Y_MIN && this.inRegion(x, z) && y < this.column(x, z).top - 3;
    for (const c of cands) {
      const top = this.column(c.x, c.z).top, rng = mulberry32((base ^ Math.imul(c.x * 131 + c.z + 1, 0x9e3779b1)) >>> 0);
      const cells = veinCells(rng, c.x, top - 6 - Math.floor(rng() * 4), c.z, { blockId: T.EMBER_VEIN, veinsPerChunk: 1, veinSize: 8, minY: 0, maxY: 0, airDiscardChance: 0 }, replaceable, () => false);
      const uniq = [...new Map(cells.map(([x, y, z]) => [`${x},${y},${z}`, { x, y, z }])).values()];
      if (uniq.length < 4) continue;
      this.amberGuaranteed = uniq;
      for (const u of uniq) this.amberKeys.set(((u.x + 4096) * 8192 + (u.z + 4096)) * 512 + (u.y + 64), true);
      return;
    }
  }

  /** Grupos de junco de vidro: um em volta do depósito (sem os 8 vizinhos, para a passagem e a brasa ficarem livres) e outro afastado, só em areia úmida alcançável. Puro por seed e posição. */
  reedsFor(ex: number, ez: number): Array<{ x: number; y: number; z: number }> {
    const reach = this.walkable(), base = derive(this.seed, PURPOSE.junco);
    const key = (x: number, z: number): number => (x + 4096) * 8192 + (z + 4096);
    const centers: Array<{ x: number; z: number }> = [{ x: ex, z: ez }];
    const far = this.planEmber().find((c) => Math.hypot(c.x - ex, c.z - ez) >= 9);
    if (far) centers.push(far);
    const seen = new Set<number>(), out: Array<{ x: number; y: number; z: number }> = [];
    for (const c of centers) {
      for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) {
        const x = c.x + dx, z = c.z + dz, k = key(x, z);
        if (seen.has(k) || (Math.abs(x - ex) <= 1 && Math.abs(z - ez) <= 1) || !reach.has(k) || !this.inRegion(x, z)) continue;
        const col = this.column(x, z);
        if (col.surface !== T.DAMP_SAND || col.top < 63 || col.top > 65) continue;
        if (hash2(base, x * 131 + z, 5) > 0.5) continue;
        seen.add(k);
        out.push({ x, y: col.top + 1, z });
      }
    }
    return out;
  }

  /**
   * Plantas de Noz de Duna (v5): candidatas = coluna de areia, **seca ou úmida** (topo 64–66, fora d'água) alcançável a pé com os 4 vizinhos também alcançáveis, fora da clareira (3), das formações (4),
   * da brasa (2) e dos juncos. Em ordem de hash por seed: até 2 plantas "seguras" entre 7 e 16 blocos da chegada (afastadas entre si ≥ 3) e uma enseada de até 4 plantas (afastadas ≥ 2, no raio
   * de 4 do centro) a 26 blocos ou mais da chegada (18 se a região não tiver lugar mais longe). Puro por seed.
   */
  private nutsFor(): { plants: Array<{ x: number; y: number; z: number }>; den: { x: number; y: number; z: number } | null } {
    const a = this.arrival, reach = this.walkable(), base = derive(this.seed, PURPOSE.noz);
    const key = (x: number, z: number): number => (x + 4096) * 8192 + (z + 4096);
    const reeds = new Set(this.reeds.map((r) => key(r.x, r.z)));
    const cands: Array<{ x: number; z: number; top: number; h: number; d: number }> = [];
    for (const k of reach) {
      const x = Math.floor(k / 8192) - 4096, z = (k % 8192) - 4096;
      if (x < this.region.min + 4 || x >= this.region.max - 4 || z < this.region.min + 4 || z >= this.region.max - 4) continue;
      if (this.inClearing(x, z, 3) || reeds.has(key(x, z))) continue;
      const c = this.column(x, z);
      if ((c.surface !== T.SAND && c.surface !== T.DAMP_SAND) || c.top < 64 || c.top > 66) continue;
      if (this.version >= 12 && c.surface !== T.SAND) continue; // v12: só areia seca
      if (this.formations.some((f) => Math.hypot(f.x - x, f.z - z) < 4)) continue;
      if (this.emberSites.some((e) => Math.hypot(e.x - x, e.z - z) < 3)) continue;
      if (this.copperSites.some((s) => Math.hypot(s.x - x, s.z - z) < 6) || this.shelterSites.some((s) => Math.hypot(s.x - x, s.z - z) < 6)) continue; // v7/v8: nada em cima dos afloramentos de cobre nem dos abrigos
      if (![[1, 0], [-1, 0], [0, 1], [0, -1]].every(([dx, dz]) => reach.has(key(x + dx, z + dz)))) continue;
      cands.push({ x, z, top: c.top, h: hash2(base, x * 131 + z, 7), d: Math.hypot(x - a.x, z - a.z) });
    }
    cands.sort((p, q) => p.h - q.h || p.x - q.x || p.z - q.z);
    const out: Array<{ x: number; y: number; z: number }> = [];
    const take = (c: { x: number; z: number; top: number }, spacing: number): boolean => {
      if (out.some((o) => Math.hypot(o.x - c.x, o.z - c.z) < spacing)) return false;
      out.push({ x: c.x, y: c.top + 1, z: c.z });
      return true;
    };
    let near = 0;
    for (const c of cands) { if (near >= 2) break; if (c.d >= 7 && c.d <= 16 && take(c, 3)) near++; }
    // a enseada (e a toca do Farejador) ficam ≥ 28 blocos dos afloramentos de cobre: o território do animal não cobre o minério (ADR 0063)
    const apart = (c: { x: number; z: number }): boolean => this.copperSites.every((s) => Math.hypot(s.x - c.x, s.z - c.z) >= 28) && this.shelterSites.every((s) => Math.hypot(s.x - c.x, s.z - c.z) >= 24);
    const far = cands.find((c) => c.d >= 26 && apart(c)) ?? cands.find((c) => c.d >= 18 && apart(c)) ?? cands.find((c) => c.d >= 26) ?? cands.find((c) => c.d >= 18);
    let den: { x: number; y: number; z: number } | null = null;
    if (far) {
      den = { x: far.x, y: far.top + 1, z: far.z };
      let n = 0;
      for (const c of cands) { if (n >= 4) break; if (Math.hypot(c.x - far.x, c.z - far.z) <= 4 && take(c, 2)) n++; }
    }
    if (this.version >= 12) { // bioma: planta em 1 % da areia seca elegível, espaçadas, longe da chegada, do cobre e dos abrigos (o território dos animais não cobre o minério)
      const b = biomeAt(a.x, a.z), target = Math.round(b.nutRate * cands.length);
      for (const c of cands) {
        if (out.length >= target) break;
        if (c.d < 18 || this.copperSites.some((s) => Math.hypot(s.x - c.x, s.z - c.z) < 22) || this.shelterSites.some((s) => Math.hypot(s.x - c.x, s.z - c.z) < 18)) continue;
        take(c, b.nutSpacing);
      }
    }
    return { plants: out, den };
  }

  // ---- v3: alcance a pé e veios ----

  /** Topo da coluna sem formações (relevo bruto com a clareira nivelada). Usado só para o alcance a pé. */
  private baseTop(x: number, z: number): number {
    const raw = this.rawTop(x, z);
    if (this.inClearing(x, z)) return 64;
    if (this.inClearing(x, z, 2)) return clamp(raw, 63, 65);
    return raw;
  }

  /** Colunas alcançáveis a pé desde a chegada: vizinhas por degraus de até 1 bloco, fora d'água funda (topo ≥ 63) e dentro da região. */
  private walkableFromArrival(): Set<number> {
    const key = (x: number, z: number): number => (x + 4096) * 8192 + (z + 4096);
    const seen = new Set<number>();
    const a = this.arrival;
    const queue: Array<[number, number]> = [[Math.floor(a.x), Math.floor(a.z)]];
    seen.add(key(queue[0][0], queue[0][1]));
    for (let i = 0; i < queue.length; i++) {
      const [x, z] = queue[i];
      const t = this.baseTop(x, z);
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, nz = z + dz;
        if (nx < this.region.min + 1 || nx >= this.region.max - 1 || nz < this.region.min + 1 || nz >= this.region.max - 1) continue;
        const k = key(nx, nz);
        if (seen.has(k)) continue;
        const nt = this.baseTop(nx, nz);
        if (nt < 63 || Math.abs(nt - t) > 1) continue;
        seen.add(k);
        queue.push([nx, nz]);
      }
    }
    return seen;
  }

  /** Afloramento de reserva: a célula alcançável mais perto da chegada, seca, baixa e livre de outras formações (varredura em ordem fixa). */
  private outcropSpot(reach: Set<number>, others: ReadonlyArray<{ x: number; z: number }>, strict: boolean): { x: number; z: number } | null {
    const a = this.arrival;
    const cells: Array<{ x: number; z: number; d: number }> = [];
    for (const k of reach) {
      const x = Math.floor(k / 8192) - 4096, z = (k % 8192) - 4096;
      cells.push({ x, z, d: Math.hypot(x - a.x, z - a.z) });
    }
    cells.sort((p, q) => p.d - q.d || p.x - q.x || p.z - q.z);
    for (const c of cells) {
      if (this.inClearing(c.x, c.z, strict ? 4 : 3)) continue;
      if (c.x < this.region.min + 4 || c.x >= this.region.max - 4 || c.z < this.region.min + 4 || c.z >= this.region.max - 4) continue;
      if (strict && (this.lakeField(c.x, c.z) > -3 || this.rawTop(c.x, c.z) > 68)) continue;
      if (others.some((o) => Math.hypot(o.x - c.x, o.z - c.z) < (strict ? 8 : 6))) continue;
      return { x: c.x, z: c.z };
    }
    return null;
  }

  /** 3 veios por formação: o centro e os dois vizinhos de menor sorteio, no topo da coluna (superfície de rocha escura ou gelo fosco). */
  private placeVeins(): void {
    const base = derive(this.seed, PURPOSE.veioSuperficie);
    const key = (x: number, z: number): number => (x + 4096) * 8192 + (z + 4096);
    for (const f of this.formations) {
      const want = f.kind === 'rock' ? T.DARK_ROCK : T.FROST;
      const ring: Array<{ x: number; z: number; h: number }> = [];
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dz) continue;
        const x = f.x + dx, z = f.z + dz;
        if (this.column(x, z).surface === want) ring.push({ x, z, h: hash2(base, x * 131 + z, f.kind === 'rock' ? 1 : 2) });
      }
      ring.sort((p, q) => p.h - q.h || p.x - q.x || p.z - q.z);
      this.veins.set(key(f.x, f.z), f.kind);
      for (const c of ring.slice(0, 2)) this.veins.set(key(c.x, c.z), f.kind);
    }
  }

  /** Posições (x, y, z) dos veios naturais (v3), com o tipo. Vazio nas versões anteriores. */
  veinCells(): Array<{ kind: 'rock' | 'ice'; x: number; y: number; z: number }> {
    const out: Array<{ kind: 'rock' | 'ice'; x: number; y: number; z: number }> = [];
    for (const [k, kind] of this.veins) { const x = Math.floor(k / 8192) - 4096, z = (k % 8192) - 4096; out.push({ kind, x, y: this.column(x, z).top, z }); }
    return out;
  }

  /**
   * Afloramentos de cobre (v7, ADR 0063): 2 montes de rocha escura em terra seca alcançável a pé (18–55 blocos da chegada, ≥ 10 da costa, relevo plano em volta, longe das formações),
   * afastados ≥ 20 entre si; cada um com 3 veios de cobre no topo (centro + 2 vizinhas). Ordem de hash por seed; usa só o relevo bruto (as colunas ainda não foram memoizadas).
   */
  private placeCopper(): void {
    const a = this.arrival, base = derive(this.seed, PURPOSE.cobre), reach = this.walkable();
    const cands: Array<{ x: number; z: number; h: number }> = [];
    for (const k of reach) {
      const x = Math.floor(k / 8192) - 4096, z = (k % 8192) - 4096;
      if (x < this.region.min + 8 || x >= this.region.max - 8 || z < this.region.min + 8 || z >= this.region.max - 8) continue;
      const d = Math.hypot(x - a.x, z - a.z), t = this.rawTop(x, z);
      if (d < 18 || d > 55 || this.lakeField(x, z) > -10 || t < 64 || t > 72) continue;
      if (this.formations.some((f) => Math.hypot(f.x - x, f.z - z) < 8) || !this.flatAround(x, z)) continue;
      cands.push({ x, z, h: hash2(base, x * 131 + z, 3) });
    }
    cands.sort((p, q) => p.h - q.h || p.x - q.x || p.z - q.z);
    const sites: Array<{ x: number; z: number }> = [];
    for (const c of cands) { if (sites.length >= 2) break; if (sites.every((s) => Math.hypot(s.x - c.x, s.z - c.z) >= 20)) sites.push({ x: c.x, z: c.z }); }
    this.copperSites = sites;
    this.cols.clear();
    const cells: Array<{ x: number; y: number; z: number }> = [];
    const key = (x: number, z: number): number => (x + 4096) * 8192 + (z + 4096);
    for (const s of sites) {
      const ring: Array<{ x: number; z: number; h: number }> = [];
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) if (dx || dz) ring.push({ x: s.x + dx, z: s.z + dz, h: hash2(base, (s.x + dx) * 131 + s.z + dz, 9) });
      ring.sort((p, q) => p.h - q.h || p.x - q.x || p.z - q.z);
      for (const c of [{ x: s.x, z: s.z }, ...ring.slice(0, 2)]) { this.copper.add(key(c.x, c.z)); cells.push({ x: c.x, y: this.column(c.x, c.z).top, z: c.z }); }
    }
    this.copperCells = cells;
  }

  /**
   * Abrigos (v8, ADR 0066): 2 vãos estreitos entre dois pilares de rocha escura (a ±2 blocos do centro, ao longo de X), em terra seca alcançável a pé, 16–55 blocos da chegada, ≥ 10 da costa, em relevo plano,
   * afastados ≥ 14 dos afloramentos de cobre e ≥ 20 entre si; uma **placa de carapaça** no chão do vão. Usa só o relevo bruto (as colunas ainda não foram memoizadas) e roda logo depois do cobre.
   */
  private placeShelters(): void {
    const a = this.arrival, base = derive(this.seed, PURPOSE.abrigo), reach = this.walkable();
    const cands: Array<{ x: number; z: number; h: number }> = [];
    for (const k of reach) {
      const x = Math.floor(k / 8192) - 4096, z = (k % 8192) - 4096;
      if (x < this.region.min + 8 || x >= this.region.max - 8 || z < this.region.min + 8 || z >= this.region.max - 8) continue;
      const d = Math.hypot(x - a.x, z - a.z), t = this.rawTop(x, z);
      if (d < 16 || d > 55 || this.lakeField(x, z) > -10 || t < 64 || t > 70) continue;
      if (this.formations.some((f) => Math.hypot(f.x - x, f.z - z) < 8) || this.copperSites.some((c) => Math.hypot(c.x - x, c.z - z) < 14) || !this.flatAround(x, z)) continue;
      cands.push({ x, z, h: hash2(base, x * 131 + z, 3) });
    }
    cands.sort((p, q) => p.h - q.h || p.x - q.x || p.z - q.z);
    const sites: Array<{ x: number; z: number }> = [];
    for (const c of cands) { if (sites.length >= 2) break; if (sites.every((s) => Math.hypot(s.x - c.x, s.z - c.z) >= 20)) sites.push({ x: c.x, z: c.z }); }
    this.shelterSites = sites;
    this.pillars = sites.flatMap((s) => [{ x: s.x - 2, z: s.z }, { x: s.x + 2, z: s.z }]);
    this.cols.clear();
    this.plates = sites.map((s) => ({ id: `plate:${s.x},${this.column(s.x, s.z).top + 1},${s.z}`, item: 25 as const, x: s.x, y: this.column(s.x, s.z).top + 1, z: s.z }));
  }

  /** Hastes secas (v7): até 8 em colunas de areia perto dos grupos de junco (≤ 7 blocos de um junco), fora das células de junco e de planta, alcançáveis a pé, afastadas ≥ 2 entre si. */
  private dryReedsFor(): Array<{ id: string; item: 19; x: number; y: number; z: number }> {
    const reach = this.walkable(), base = derive(this.seed, PURPOSE.haste);
    const key = (x: number, z: number): number => (x + 4096) * 8192 + (z + 4096);
    const taken = new Set([...this.reeds, ...this.nutPlants].map((r) => key(r.x, r.z)));
    const cands: Array<{ x: number; z: number; top: number; h: number }> = [];
    const seen = new Set<number>();
    for (const r of this.reeds) for (let dz = -7; dz <= 7; dz++) for (let dx = -7; dx <= 7; dx++) {
      const x = r.x + dx, z = r.z + dz, k = key(x, z);
      if (seen.has(k) || taken.has(k) || !reach.has(k) || !this.inRegion(x, z)) continue;
      seen.add(k);
      const c = this.column(x, z);
      if ((c.surface !== T.SAND && c.surface !== T.DAMP_SAND) || c.top < 63 || c.top > 66) continue;
      if (this.copper.has(k) || this.emberKeys.has(k)) continue;
      cands.push({ x, z, top: c.top, h: hash2(base, x * 131 + z, 5) });
    }
    cands.sort((p, q) => p.h - q.h || p.x - q.x || p.z - q.z);
    const out: Array<{ id: string; item: 19; x: number; y: number; z: number }> = [];
    for (const c of cands) {
      if (out.length >= 8) break;
      if (out.some((o) => Math.hypot(o.x - c.x, o.z - c.z) < 2)) continue;
      out.push({ id: `dry:${c.x},${c.top + 1},${c.z}`, item: 19, x: c.x, y: c.top + 1, z: c.z });
    }
    if (this.version < 13) return out;
    // v13 (ADR 0086): o cultivo do junco assume a Haste Seca; ficam só as 2 avulsas mais próximas da chegada (o suficiente para a primeira picareta)
    const a = this.arrival;
    return out.sort((p, q) => Math.hypot(p.x - a.x, p.z - a.z) - Math.hypot(q.x - a.x, q.z - a.z) || p.x - q.x || p.z - q.z).slice(0, 2);
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
    if (this.version >= 6) { // v6: subida gradual e limitada (sem o degrau de 5 blocos em s = 24): a região de 128 × 128 continua andável até a borda
      const gentle = Math.min(6, Math.max(0, s - 3) * 0.16), slope = s > 24 ? Math.min(14, Math.floor((s - 24) * 0.22)) : 0;
      return 64 + Math.floor(gentle + dunes) + slope;
    }
    const rise = Math.max(0, s - 3) * 0.16;
    const scarp = s > 24 ? 5 + Math.floor((s - 24) * 0.45) : 0;
    return 64 + Math.floor(rise + dunes) + scarp;
  }

  // ---- Chegada ----

  /** Raspa de rugosidade da caixa da clareira no relevo bruto; Infinity = não serve (lago, fora da região ou desnivelada demais). */
  private clearingScore(x0: number, z0: number): number {
    // margem de 2 blocos em volta da clareira também precisa ser seca e estar dentro da região
    if (x0 - 2 < this.region.min + 2 || z0 - 2 < this.region.min + 2 || x0 + CLEARING + 2 > this.region.max - 2 || z0 + CLEARING + 2 > this.region.max - 2) return Infinity;
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
      const x0 = Math.floor(hash2(base, k, 11) * (this.region.max - this.region.min - 16)) + this.region.min + 8;
      const z0 = Math.floor(hash2(base, k, 23) * (this.region.max - this.region.min - 16)) + this.region.min + 8;
      if (this.clearingScore(x0, z0) <= 14) best = { x0, z0 };
    }
    // alternativa segura (mesma seed): varredura em ordem fixa, escolhe a de menor rugosidade (empate = primeira)
    if (!best) {
      let bestScore = Infinity;
      for (let z0 = this.region.min; z0 < this.region.max; z0++) for (let x0 = this.region.min; x0 < this.region.max; x0++) {
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

  private placeFormations(reach: Set<number> | null): ReadonlyArray<{ kind: 'rock' | 'ice'; x: number; z: number }> {
    const out: Array<{ kind: 'rock' | 'ice'; x: number; z: number }> = [];
    const base = derive(this.seed, PURPOSE.formacao);
    const v1 = this.version < 2;
    const a = this.arrival;
    for (const [i, kind] of (['rock', 'ice'] as const).entries()) {
      const phi0 = hash2(base, i, 5) * Math.PI * 2;
      let found = false;
      for (let k = 0; k < (v1 ? 48 : 240); k++) {
        const phi = phi0 + k * 2.399963; // ângulo áureo: varre em ordem fixa
        const dist = v1 ? 9 + (k % 4) * 2 : 8 + (k % 6) * 2; // v1: 9..15; v2: 8..18 blocos da chegada
        const x = Math.round(a.x + Math.cos(phi) * dist);
        const z = Math.round(a.z + Math.sin(phi) * dist);
        const m = v1 ? 6 : 5;
        if (x < this.region.min + m || x >= this.region.max - m || z < this.region.min + m || z >= this.region.max - m) continue;
        if (this.lakeField(x, z) > -4) continue; // seca e afastada da margem
        if (this.rawTop(x, z) > 68) continue; // não sobre a falésia
        if (!v1 && !this.flatAround(x, z)) continue; // v2: terreno plano em volta (lascas alcançáveis)
        if (reach && !reach.has((x + 4096) * 8192 + (z + 4096))) continue; // v3: alcançável a pé desde a chegada
        if (out.some((o) => Math.hypot(o.x - x, o.z - z) < 8)) continue;
        out.push({ kind, x, z });
        found = true;
        break;
      }
      if (!found && reach) {
        // afloramento de reserva: a busca natural falhou, a fonte vai para a célula alcançável mais próxima (regras estritas, depois relaxadas)
        const spot = this.outcropSpot(reach, out, true) ?? this.outcropSpot(reach, out, false);
        if (spot) { out.push({ kind, x: spot.x, z: spot.z }); this.outcropFallback = true; }
      }
    }
    return out;
  }

  /** Raio 3 seco e com diferença de altura ≤ 1 bloco em relação ao centro. */
  private flatAround(x: number, z: number): boolean {
    const t = this.rawTop(x, z);
    for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) {
      if (this.lakeField(x + dx, z + dz) > -3 || Math.abs(this.rawTop(x + dx, z + dz) - t) > 1) return false;
    }
    return true;
  }

  private placeSurfaceItems(): ReadonlyArray<{ id: string; item: 5 | 6; x: number; z: number; y: number }> {
    const out: Array<{ id: string; item: 5 | 6; x: number; y: number; z: number }> = [];
    const base = derive(this.seed, PURPOSE.seixos);
    for (const f of this.formations) {
      const want = f.kind === 'rock' ? T.DARK_ROCK : T.FROST;
      const cells: Array<{ x: number; z: number; h: number }> = [];
      for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
        const x = f.x + dx, z = f.z + dz;
        if (this.column(x, z).surface === want) cells.push({ x, z, h: hash2(base, x * 131 + z, f.kind === 'rock' ? 1 : 2) });
      }
      cells.sort((a, b) => a.h - b.h || a.x - b.x || a.z - b.z); // ordem fixa; empate resolvido por coordenada
      cells.slice(0, 3).forEach((c, i) => out.push({ id: `${f.kind}:${i}`, item: f.kind === 'rock' ? 5 : 6, x: c.x, y: this.column(c.x, c.z).top + 1, z: c.z }));
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
    for (const f of this.pillars) { // pilares dos abrigos (v8): montes estreitos de rocha escura
      const d = Math.hypot(x - f.x, z - f.z);
      if (d < 1.6) { top = Math.max(top, raw + 3 - Math.floor(d)); formation = 'rock'; }
    }
    for (const f of this.copperSites) { // afloramento de cobre (v7): monte de rocha escura como as formações
      const d = Math.hypot(x - f.x, z - f.z);
      if (d < 3.2) { const bump = Math.max(0, 3 - Math.floor(d)); if (bump > 0) { top = Math.max(top, raw + bump); formation = 'rock'; } }
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
    if (y === c.top) {
      if (this.emberKeys.has((x + 4096) * 8192 + (z + 4096))) return T.EMBER;
      if (this.copper.size && this.copper.has((x + 4096) * 8192 + (z + 4096))) return T.VEIN_COPPER;
      if (this.veins.size) { const v = this.veins.get((x + 4096) * 8192 + (z + 4096)); if (v) return v === 'rock' ? T.VEIN_ROCK : T.VEIN_FROST; }
      if (this.version >= 10) { const f = this.fragmentAt(x, z, c); if (f) return f; }
      return c.surface;
    }
    if (y >= c.top - 3) return c.sub;
    if (this.version >= 9) { const o = this.oreAt(x, y, z); return o ?? T.DARK_ROCK; }
    if (y >= -32 && y < 0 && hash2(derive(this.seed, PURPOSE.veios), x * 31 + z, y) < 0.012) return T.FROST; // veios de gelo no subsolo intermediário (v1–v8)
    return T.DARK_ROCK;
  }

  /** Veio de fragmento solto na superfície (v10): rocha na rocha escura (12 % nas camadas altas, Y ≥ 72; 6 % abaixo) e gelo nas manchas de gelo (6 %); nunca perto das formações, abrigos e afloramentos de cobre, que têm o seu desenho. */
  private fragmentAt(x: number, z: number, c: Column): number | null {
    if (c.surface !== T.DARK_ROCK && c.surface !== T.FROST) return null;
    const near = (l: ReadonlyArray<{ x: number; z: number }>): boolean => l.some((f) => Math.hypot(f.x - x, f.z - z) < 5);
    if (near(this.formations) || near(this.copperSites) || near(this.shelterSites) || near(this.pillars)) return null;
    const rock = c.surface === T.DARK_ROCK, chance = rock ? (c.top >= 72 ? 0.12 : 0.06) : 0.06;
    return hash2(derive(this.seed, PURPOSE.fragmentos), x, z) < chance ? (rock ? T.VEIN_ROCK : T.VEIN_FROST) : null;
  }

  /** Minério da célula (v9), ou `null`. Garante que os 3 × 3 chunks em volta já foram gerados, porque um veio passa de um chunk para o vizinho. */
  private oreAt(x: number, y: number, z: number): number | null {
    const cx = x >> 4, cz = z >> 4, rk = (cx + 512) * 1024 + (cz + 512);
    if (!this.oreReady.has(rk)) {
      for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) this.genOreChunk(cx + dx, cz + dz);
      this.oreReady.add(rk);
    }
    const k = ((x + 4096) * 8192 + (z + 4096)) * 512 + (y + 64);
    if (this.amberKeys.has(k)) return T.EMBER_VEIN; // o veio garantido da chegada vale mais que o sorteio
    return this.ores.get(k)?.id ?? null;
  }

  private genOreChunk(cx: number, cz: number): void {
    const ck = (cx + 512) * 1024 + (cz + 512);
    if (this.oreDone.has(ck)) return;
    this.oreDone.add(ck);
    if (!inRegion(cx * 16 + 8, cz * 16 + 8, this.region) && !inRegion(cx * 16, cz * 16, this.region) && !inRegion(cx * 16 + 15, cz * 16 + 15, this.region)) return;
    const replaceable = (x: number, y: number, z: number): boolean => y > Y_MIN && inRegion(x, z, this.region) && y < this.column(x, z).top - 3;
    const exposed = (x: number, y: number, z: number): boolean => [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].some(([dx, dy, dz]) => y + dy > this.column(x + dx, z + dz).top && y + dy > LAKE_LAST_Y);
    oreRulesFor(this.version).forEach((rule, ri) => {
      const rng = mulberry32((derive(this.seed, PURPOSE.mina) ^ Math.imul(ck + 1, 0x9e3779b1) ^ Math.imul(ri + 1, 0x85ebca6b)) >>> 0);
      const n = attemptsFor(rng, rule.veinsPerChunk);
      for (let k = 0; k < n; k++) {
        const x = cx * 16 + Math.floor(rng() * 16), z = cz * 16 + Math.floor(rng() * 16), y = sampleOreY(rng, rule);
        const pri = ri * 1e10 + ck * 1000 + k;
        for (const [vx, vy, vz] of veinCells(rng, x, y, z, rule, replaceable, exposed)) {
          const key = ((vx + 4096) * 8192 + (vz + 4096)) * 512 + (vy + 64), old = this.ores.get(key);
          if (!old || pri < old.pri) this.ores.set(key, { id: rule.blockId, pri });
        }
      }
    });
  }
}
