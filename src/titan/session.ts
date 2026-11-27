import { GENERATOR_VERSION, TitanGenerator } from './generator';
import type { TerrainGen } from './terrain';
import { HOTBAR, Inventory } from './inventory';
import { isItem, Item } from './items';
import { creatureSpecs, type Farejador, newFromSpec } from './creature';
import { type Fauna, faunaSpecs, newFaunaFromSpecs } from './fauna';
import { type ChestState, chestFromData, chestIsEmpty, chestToData } from './chest';
import { type FurnaceState, furnaceFromData, furnaceToData, rulesOf, showsLit, tickFurnace } from './furnace';
import { maxDurability } from './wear';
import { NUT_REGROW_S, nutId, parseNutId } from './nuts';
import { newVitals, type PlayerVitals, vitalsFromData, vitalsToData } from './vitals';
import { skyAt, START_FRAC, validDay } from './sky';
import { hasWeather, newWeather, stepWeather, weatherFromData, weatherToData, type Weather } from './weather';
import { CROP_SIM_RADIUS, CROP_FRAMES, type Crop, type CropKind, cropId, cropKey, gardenFrame, GARDEN_SPECIES, isFarmland, isGarden, maxAgeOf, nutLook, plantableSoil, randomTick, type Species, soilKind, soilKindFor, spriteFrame, CROP_TICK_MEAN_S } from './crops';
import { isHydrated } from './soil';
import { newBody, safePosition, type Body, type ItemLookup } from './physics';
import { type ChunkRecord, type Drop, type TitanHeader, type TitanSave, type TitanStorage, TITAN_SAVE_VERSION } from './save';
import { TitanVolume } from './volume';
import { furnaceId, furnaceTurn, isBedFoot, isChest, isFurnace, isSolid, T, Y_MAX, Y_MIN } from './voxel';

/**
 * Sessão solo do Titã: seed + versão do gerador + volume + jogador + gravação confirmada (ADR 0039). Sem DOM: o `titanGame.ts` só liga entrada e vídeo.
 * Fluxo: `openSession` decide a partida (?seed= explícita, a última salva ou uma seed sorteada na primeira visita) → gera com a versão
 * registrada → reaplica os deltas → valida a posição. `flush` grava o que mudou (chunks sujos + jogador) numa transação.
 */
export interface TitanSession {
  seed: number;
  volume: TitanVolume;
  body: Body;
  yaw: number;
  pitch: number;
  selected: number;
  resumed: boolean;
  /** Mensagem se a posição gravada estava obstruída e foi trocada por uma segura. */
  relocated: boolean;
  /** Hora do dia (fração 0–1 do dia de 20 minutos): avança com o jogo ativo e vai no save (ADR 0041). */
  time: number;
  /** Dias completos vividos (ADR 0048). */
  days: number;
  /** Clima (ADR 0118): só o Orvalis chove (`isRaining`); no Titã fica sempre limpo e fora do save. */
  weather: Weather;
  /** Hotbar, mochila e grade (ADR 0040). */
  inventory: Inventory;
  /** Ids dos fragmentos de superfície já recolhidos (a base os recria; o save lembra quais sumiram). */
  collected: Set<string>;
  /** Revisões do que não é chunk (inventário + coleta): só a confirmada fica limpa. */
  collectedRev: number;
  /** Braseiros com estado (ADR 0068): `x,y,z` → espaços e temporizadores (fornalha). Vai no save (`header.furnaces`); corre também com a tela fechada, só com o jogo ativo. */
  furnaces: Map<string, FurnaceState>;
  /** Baús (ADR 0089): `x,y,z` → 18 espaços. Nasce na primeira vez que se abre; vai no save (`header.chests`). */
  chests: Map<string, ChestState>;
  /** Ponto de retorno (ADR 0090): a célula do **pé** da cama onde o jogador dormiu ou descansou; `null` = a chegada. Vai no save (`header.spawn`); vale enquanto a cama existir. */
  spawn: { x: number; y: number; z: number } | null;
  /** Plantas de Noz de Duna colhidas: id → segundos de jogo que faltam para rebrotar (ADR 0060). Vai no save (`header.regrow`). */
  regrow: Map<string, number>;
  /** Plantas de junco cultivadas (ADR 0083), por `x,y,z` da célula de ar sobre a areia; a idade vai no save (`header.crops`). */
  crops: Map<string, Crop>;
  /** Animais abatidos que ainda não voltaram (ADR 0069): id do animal → segundos de jogo ativo que faltam (ADR 0074; nas partidas v ≤ 11 o id é o tamanho). Vai no save (`header.respawn`). */
  respawn: Map<string, number>;
  /** Farejadores de Duna da enseada (um grande e um pequeno, ADR 0061): estado só de execução, nascem na toca a cada abertura (não vão no save). Vazio sem toca (gerador antigo ou região sem enseada). */
  creatures: Farejador[];
  /** Fauna de fazenda do Orvalis (ADR 0124): porco, vaca, ovelha e galinha; só de execução, nascem pela seed a cada abertura (não vão ao save: o abate vale até fechar). Vazia no Titã e na v ≤ 2. */
  fauna: Fauna[];
  savedStateRev: number;
  /** Lascas soltas por veios quebrados (v3, ADR 0044): recolhidas por proximidade; vão no cabeçalho do save. */
  drops: Map<string, Drop>;
  /** Relógio só de execução dos drops de bloco (ADR 0082): atraso de coleta e idade; fora do save (recarregar zera). */
  dropFx: Map<string, { delay: number; age: number; /** Queda (ADR 0098): altura real em células e velocidade para baixo; ausentes = repousa. */ fy?: number; vy?: number }>;
  dropsRev: number;
  /** Receitas descobertas (`mesa`, `bancada`; ADR 0045) e adições localizadas de partida legada (a brasa dada uma vez). Vão no cabeçalho do save. */
  known: Set<string>;
  grants: { ember?: [number, number, number] };
  /** Revisão do que não é inventário nem chunk (descobertas e adições). */
  metaRev: number;
  /** Vida, fome e ar (ADR 0059): gravados junto da posição. */
  vitals: PlayerVitals;
  /** Fragmentos de superfície ainda no mundo, por célula (para a mira e o desenho). */
  items: ItemLookup & { remaining(): Array<{ id: string; item: number; x: number; y: number; z: number }> };
}

const stateRev = (s: TitanSession): number => s.inventory.rev + s.collectedRev + s.dropsRev + s.metaRev;
/** Tudo o que está solto no mundo para desenhar: lascas legadas (v1/v2) ainda não recolhidas e as lascas dos veios (v3). */
export function visibleItems(s: TitanSession): Array<{ id: string; item: number; x: number; y: number; z: number }> {
  return [...s.items.remaining(), ...[...s.drops.values()].map((d) => { const fy = s.dropFx.get(d.id)?.fy; return fy === undefined ? d : { ...d, y: fy }; })]; // o item em queda desenha na altura real (ADR 0098)
}
/** Há inventário/coleta ainda não confirmados no banco? */
export const hasPendingState = (s: TitanSession): boolean => stateRev(s) !== s.savedStateRev;

/** Id do junco de vidro numa célula: entra em `collected` (já gravado no save) quando ele é recolhido ou perde o apoio. */
export const reedId = (x: number, y: number, z: number): string => `reed:${x},${y},${z}`;

function makeItems(s: { volume: TitanVolume; collected: Set<string>; grants: TitanSession['grants']; regrow: Map<string, number>; crops: Map<string, Crop> }): TitanSession['items'] {
  const all: Array<{ id: string; item: number; x: number; y: number; z: number }> = [...s.volume.gen.surfaceItems, ...s.volume.gen.dryReeds, ...s.volume.gen.plates];
  const key = (x: number, y: number, z: number): string => `${x},${y},${z}`;
  const byCell = new Map(all.map((i) => [key(i.x, i.y, i.z), i.id]));
  // juncos de vidro (v4, ou a partir da brasa dada numa partida legada): também são alvo da mira e se recolhem como as lascas; montado só na primeira consulta (a adição da migração já foi feita)
  let reeds: Map<string, string> | null = null;
  const reedAt = (x: number, y: number, z: number): string | null => {
    if (!reeds) {
      const gen = s.volume.gen;
      const list = gen.version >= 4 ? gen.reeds : s.grants.ember ? gen.reedsFor(s.grants.ember[0], s.grants.ember[2]) : [];
      reeds = new Map(list.map((r) => [key(r.x, r.y, r.z), reedId(r.x, r.y, r.z)]));
    }
    const id = reeds.get(key(x, y, z));
    return id && !s.collected.has(id) && s.volume.get(x, y, z) === T.AIR && isSolid(s.volume.get(x, y - 1, z)) ? id : null;
  };
  // plantas de Noz de Duna (v5): alvo da mira só enquanto maduras (não colhidas e ainda de pé); a colhida continua desenhada, só não se apanha
  let nuts: Map<string, string> | null = null;
  const nutAt = (x: number, y: number, z: number): string | null => {
    if (!nuts) nuts = new Map(s.volume.gen.nutPlants.map((n) => [key(n.x, n.y, n.z), nutId(n.x, n.y, n.z)]));
    const id = nuts.get(key(x, y, z));
    return id && !s.regrow.has(id) && s.volume.get(x, y, z) === T.AIR && isSolid(s.volume.get(x, y - 1, z)) ? id : null;
  };
  return {
    at: (x, y, z) => { const id = byCell.get(key(x, y, z)); return id && !s.collected.has(id) ? id : reedAt(x, y, z) ?? nutAt(x, y, z) ?? (s.crops.has(cropKey(x, y, z)) ? cropId(x, y, z) : null); },
    remaining: () => all.filter((i) => !s.collected.has(i.id)),
  };
}

/** Braseiros gravados: só `x,y,z` de um braseiro de verdade (apagado ou aceso); o resto é descartado. */
function validFurnaces(raw: unknown, vol: TitanVolume): Map<string, FurnaceState> {
  const out = new Map<string, FurnaceState>();
  if (!raw || typeof raw !== 'object') return out;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const m = /^(-?\d+),(-?\d+),(-?\d+)$/.exec(k);
    if (!m) continue;
    const b = vol.get(Number(m[1]), Number(m[2]), Number(m[3]));
    const rules = rulesOf(b);
    if (rules) out.set(k, furnaceFromData(v, rules)); // braseiro (Titã) ou fornalha (Orvalis, ADR 0120)
  }
  return out;
}

/** Ponto de retorno gravado: só vale se ainda houver o pé de uma cama naquela célula. */
function validSpawn(raw: unknown, vol: TitanVolume): { x: number; y: number; z: number } | null {
  const p = raw as { x?: unknown; y?: unknown; z?: unknown } | null;
  if (!p || ![p.x, p.y, p.z].every((v) => Number.isInteger(v))) return null;
  const x = p.x as number, y = p.y as number, z = p.z as number;
  return isBedFoot(vol.get(x, y, z)) ? { x, y, z } : null;
}

/** Baús gravados: só `x,y,z` de um baú de verdade; os espaços passam por `chestFromData` e baú vazio não precisa existir. */
function validChests(raw: unknown, vol: TitanVolume): Map<string, ChestState> {
  const out = new Map<string, ChestState>();
  if (!raw || typeof raw !== 'object') return out;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const m = /^(-?\d+),(-?\d+),(-?\d+)$/.exec(k);
    if (!m || !isChest(vol.get(Number(m[1]), Number(m[2]), Number(m[3])))) continue;
    const c = chestFromData(v);
    if (!chestIsEmpty(c)) out.set(k, c);
  }
  return out;
}

/**
 * Passa `dt` s de jogo ativo para todos os braseiros (a tela pode estar fechada). O bloco acompanha o fogo (aceso/apagado); devolve se algo discreto mudou (para redesenhar e gravar). Vai no
 * laço do jogo só enquanto joga; o tempo parado não conta.
 */
export function tickFurnaces(s: TitanSession, dt: number): boolean {
  let any = false;
  for (const [k, f] of s.furnaces) {
    const [x, y, z] = k.split(',').map(Number), cur = s.volume.get(x, y, z), rules = rulesOf(cur);
    if (!rules) continue; // o bloco sumiu (a quebra apaga o estado): nada a fazer
    const r = tickFurnace(f, dt, rules);
    if (!r.changed) continue;
    any = true; s.metaRev++;
    const lit = showsLit(f, rules);
    const want = isFurnace(cur) ? furnaceId(furnaceTurn(cur), lit) : lit ? T.BRAZIER_LIT : T.BRAZIER; // a fornalha acende e apaga sem perder o giro
    if (cur !== want) s.volume.set(x, y, z, want);
  }
  return any;
}

/** Voltas gravadas dos animais abatidos: só tamanhos conhecidos, segundos finitos em (0, 3600]. */
function validRespawn(raw: unknown, ids: ReadonlySet<string>): Map<string, number> {
  const out = new Map<string, number>();
  if (!raw || typeof raw !== 'object') return out;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) if (ids.has(k) && typeof v === 'number' && Number.isFinite(v) && v > 0) out.set(k, Math.min(v, 3600));
  return out;
}

/** Plantas de junco gravadas (`x,y,z` → idade): só com areia sob a célula, ar nela e idade inteira dentro do limite da espécie; o resto é descartado. */
function validCrops(raw: unknown, vol: TitanVolume): Map<string, Crop> {
  const out = new Map<string, Crop>();
  if (!raw || typeof raw !== 'object') return out;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const m = /^(-?\d+),(-?\d+),(-?\d+)$/.exec(k);
    const tag = v && typeof v === 'object' ? (v as { s?: unknown }).s : undefined, other = typeof tag === 'string' && (tag === 'noz' || (GARDEN_SPECIES as readonly string[]).includes(tag)); // junco = só a idade; os demais = { s: espécie, a: idade }
    const age = other ? (v as { a?: unknown }).a : v;
    if (!m || typeof age !== 'number' || !Number.isInteger(age) || age < 0) continue;
    const [x, y, z] = [Number(m[1]), Number(m[2]), Number(m[3])], species: Species = other ? (tag as Species) : 'junco', below = vol.get(x, y - 1, z), kind = soilKindFor(species, below);
    if (kind && plantableSoil(species, below) && vol.get(x, y, z) === T.AIR && vol.gen.inRegion(x, z) && age <= maxAgeOf(species, kind)) out.set(k, { x, y, z, age, species });
  }
  return out;
}

/** Rebrote gravado: só `nut:x,y,z` com segundos finitos em (0, `NUT_REGROW_S`]; o resto é descartado. */
function validRegrow(raw: unknown): Map<string, number> {
  const out = new Map<string, number>();
  if (!raw || typeof raw !== 'object') return out;
  for (const [id, v] of Object.entries(raw as Record<string, unknown>)) if (parseNutId(id) && typeof v === 'number' && Number.isFinite(v) && v > 0) out.set(id, Math.min(v, NUT_REGROW_S));
  return out;
}

/** Itens soltos gravados: só entradas bem formadas (id, item conhecido, contagem 1–64 opcional e células inteiras no domínio); o resto é descartado. */
function validDrops(raw: unknown, gen: TerrainGen): Map<string, Drop> {
  const out = new Map<string, Drop>();
  if (!Array.isArray(raw)) return out;
  for (const d of raw as Drop[]) {
    if (!d || typeof d.id !== 'string' || !isItem(d.item) || ![d.x, d.y, d.z].every(Number.isInteger) || !(d.y > Y_MIN && d.y <= Y_MAX) || !gen.inRegion(d.x, d.z)) continue;
    const count = d.count === undefined ? undefined : Number.isInteger(d.count) && d.count >= 1 && d.count <= 64 ? d.count : null;
    if (count === null) continue;
    const max = maxDurability(d.item), wear = max !== null && Number.isInteger(d.wear) && (d.wear as number) >= 1 && (d.wear as number) < max ? (d.wear as number) : undefined;
    out.set(d.id, { id: d.id, item: d.item, ...(count && count > 1 ? { count } : {}), ...(wear ? { wear } : {}), x: d.x, y: d.y, z: d.z });
  }
  return out;
}

export type GeneratorFactory = (seed: number, version: number) => TerrainGen | null;
/** Versões suportadas: uma partida antiga nunca é reinterpretada por um gerador novo (docs Titã 05 §6). */
export const generatorFor: GeneratorFactory = (seed, version) => (version >= 1 && version <= GENERATOR_VERSION && Number.isInteger(version) ? new TitanGenerator(seed, version) : null);

export class UnsupportedVersionError extends Error {}

/** `explicitSeed`: vindo de `?seed=`; `newSeed`: sorteio para a primeira visita ou "Nova partida". */
/** `freshVersion`: gerador da partida nova (padrão = o atual; testes do legado pedem a v1/v2). `create`: como se constrói o gerador da partida nova (o Titã por padrão; o Orvalis passa o dele, ADR 0105). */
export async function openSession(storage: TitanStorage, explicitSeed: number | null, newSeed: () => number, factory: GeneratorFactory = generatorFor, freshVersion: number = GENERATOR_VERSION, create: (seed: number, version: number) => TerrainGen = (s, v) => new TitanGenerator(s, v)): Promise<TitanSession> {
  let seed = explicitSeed;
  if (seed === null) seed = await storage.latestSeed();
  const saved = seed !== null ? await storage.load(seed) : null;
  if (saved) {
    const gen = factory(saved.header.seed, saved.header.generatorVersion);
    if (!gen) throw new UnsupportedVersionError(`Esta partida usa o gerador v${saved.header.generatorVersion}, que esta versão do jogo não tem.`);
    return resume(gen, saved);
  }
  return fresh(create(seed ?? newSeed(), freshVersion));
}

/** Os Farejadores nascem na toca, com o passeio derivado da seed. */
const creaturesFor = (gen: TerrainGen): Farejador[] => creatureSpecs(gen).map((sp) => newFromSpec(sp, gen.seed));
const faunaFor = (gen: TerrainGen): Fauna[] => newFaunaFromSpecs(faunaSpecs(gen), gen.seed);

export function fresh(gen: TerrainGen): TitanSession {
  const volume = new TitanVolume(gen);
  const a = gen.arrival;
  const collected = new Set<string>();
  const regrow = new Map<string, number>();
  const crops = new Map<string, Crop>();
  const grants: TitanSession['grants'] = {};
  const s = { seed: gen.seed, volume, body: newBody(a.x, a.y, a.z), yaw: a.yaw, pitch: -0.12, selected: 0, resumed: false, relocated: false, time: START_FRAC, days: 0, weather: newWeather(Math.random), inventory: Inventory.starting(), collected, collectedRev: 0, regrow, crops, furnaces: new Map<string, FurnaceState>(), chests: new Map<string, ChestState>(), spawn: null, respawn: new Map<string, number>(), creatures: creaturesFor(gen), fauna: faunaFor(gen), savedStateRev: -1, drops: new Map(), dropFx: new Map(), dropsRev: 0, vitals: newVitals(), known: new Set<string>(), grants, metaRev: 0, items: makeItems({ volume, collected, grants, regrow, crops }) };
  return s;
}

export function resume(gen: TerrainGen, save: TitanSave): TitanSession {
  const volume = new TitanVolume(gen);
  volume.load(save.chunks);
  const a = gen.arrival;
  const p = save.header.player;
  const safe = safePosition(volume, p, a);
  const moved = Math.abs(safe.x - p.x) > 1e-6 || Math.abs(safe.y - p.y) > 1e-6 || Math.abs(safe.z - p.z) > 1e-6;
  // save da v1 (sem inventário) abre com o inventário inicial (vazio desde a v4); o que estava na grade de fabricação volta para a mochila
  const inv = save.header.inventory ? Inventory.fromData(save.header.inventory.bag) : Inventory.starting();
  const revBefore = inv.rev;
  // migração da cápsula (ADR 0045): save anterior à v4 → a cápsula remanescente (mochila ou grade, inclusive receita antiga já iniciada) vira brasa de âmbar, uma única vez (o save regravado já é v4)
  const converted = save.header.v < 4 ? inv.convertItem(Item.CAPSULE, Item.EMBER) : 0;
  inv.returnCraft();
  inv.returnBench(); // a grade da mesa volta à bolsa ao abrir; o que não couber fica na grade (e no save) até haver espaço
  const collected = new Set<string>((save.header.inventory?.collected ?? []).filter((x): x is string => typeof x === 'string'));
  const grants: TitanSession['grants'] = {};
  const g = save.header.grants?.ember;
  if (Array.isArray(g) && g.length === 3 && g.every(Number.isInteger)) grants.ember = [g[0], g[1], g[2]];
  const regrow = validRegrow(save.header.regrow);
  const crops = validCrops(save.header.crops, volume);
  const respawn = validRespawn(save.header.respawn, new Set(creatureSpecs(gen).map((c) => c.id)));
  const known = new Set<string>((save.header.recipes ?? []).filter((x): x is string => typeof x === 'string'));
  const s: TitanSession = { seed: gen.seed, volume, body: newBody(safe.x, safe.y, safe.z), yaw: p.yaw, pitch: p.pitch, selected: Math.max(0, Math.min(HOTBAR - 1, save.header.selected | 0)), resumed: true, relocated: moved, time: validDay(save.header.time), days: Number.isInteger(save.header.days) && save.header.days! >= 0 ? save.header.days! : 0, weather: weatherFromData(save.header.weather, Math.random), inventory: inv, collected, collectedRev: 0, regrow, crops, furnaces: validFurnaces(save.header.furnaces, volume), chests: validChests(save.header.chests, volume), spawn: validSpawn(save.header.spawn, volume), respawn, creatures: creaturesFor(gen).filter((c) => !respawn.has(c.id)), fauna: faunaFor(gen), savedStateRev: -1, drops: validDrops(save.header.drops, gen), dropFx: new Map(), dropsRev: 0, known, grants, metaRev: 0, vitals: vitalsFromData(save.header.vitals), items: makeItems({ volume, collected, grants, regrow, crops }) };
  // partida de gerador antigo sem a fonte nova: adição localizada e determinística do depósito de brasa (respeita edições, construções e o que já foi consumido)
  const granted = gen.version < 4 && !grants.ember ? grantEmber(s) : false;
  discoverRecipes(s);
  const clean = save.header.inventory && inv.rev === revBefore && !converted && !granted && save.header.v >= TITAN_SAVE_VERSION; // v1/v2/v3, grade devolvida, cápsula convertida ou brasa dada: há o que gravar
  s.savedStateRev = clean ? stateRev(s) : -1;
  return s;
}

/**
 * Adição localizada do depósito de brasa em partida de gerador antigo (ADR 0045): o primeiro candidato determinístico (`planEmber`) cuja coluna continua intacta
 * (nenhuma edição, ar em cima, sem lasca no lugar). Fica registrada em `grants` (reabrir não repete nem recria o minério depois de consumido).
 */
export function grantEmber(s: TitanSession): boolean {
  const gen = s.volume.gen, v = s.volume;
  for (const c of [...gen.planEmber(), ...gen.planEmber(false)]) {
    const y = gen.column(c.x, c.z).top;
    if (v.get(c.x, y, c.z) !== gen.blockAt(c.x, y, c.z) || v.get(c.x, y + 1, c.z) !== T.AIR || s.drops.has(`v:${c.x},${y},${c.z}`)) continue;
    if (!v.set(c.x, y, c.z, T.EMBER)) continue;
    s.grants.ember = [c.x, y, c.z];
    s.metaRev++;
    return true;
  }
  return false;
}

/**
 * Descoberta de receitas, derivada do **estado** (nunca de um evento único): a Mesa de Trabalho aparece ao ter rocha escura (ou uma mesa no inventário ou no mundo); as receitas da
 * mesa, ao ter ou colocar uma mesa. Devolve as que acabaram de ser descobertas (a interface avisa uma vez).
 */
export function discoverRecipes(s: TitanSession): string[] {
  const out: string[] = [];
  const hasBench = s.inventory.total(Item.WORKBENCH) > 0 || s.volume.workbenchCells().length > 0;
  const add = (id: string, cond: boolean): void => { if (cond && !s.known.has(id)) { s.known.add(id); out.push(id); } };
  const hasWood = [Item.LOG_OAK, Item.LOG_CHERRY, Item.LOG_BIRCH, Item.TABUA_CARVALHO, Item.TABUA_CEREJEIRA, Item.TABUA_BETULA, Item.HASTE].some((i) => s.inventory.total(i) > 0); // madeira revela as receitas pessoais (ADR 0107)
  add('bancada', hasBench || s.inventory.total(Item.MESA_CARPINTARIA) > 0);
  add('mesa', s.inventory.total(Item.DARK_ROCK) > 0 || hasBench || hasWood);
  add('braseiro', s.inventory.total(Item.COPPER_SHARD) > 0 || s.inventory.total(Item.COPPER_INGOT) > 0 || s.inventory.total(Item.BRAZIER) > 0 || s.furnaces.size > 0); // o cobre ou um braseiro revela as receitas do braseiro
  if (out.length) s.metaRev++;
  return out;
}

/** Lista dos juncos de vidro ainda em pé: a posição de ar sobre sólido, sem nada construído no lugar (o gerador v4 os traz; partida legada, a partir da brasa dada). */
export function standingReeds(s: TitanSession): Array<{ x: number; y: number; z: number }> {
  const gen = s.volume.gen;
  const list = gen.version >= 4 ? gen.reeds : s.grants.ember ? gen.reedsFor(s.grants.ember[0], s.grants.ember[2]) : [];
  return list.filter((r) => !s.collected.has(reedId(r.x, r.y, r.z)) && s.volume.get(r.x, r.y, r.z) === T.AIR && isSolid(s.volume.get(r.x, r.y - 1, r.z)));
}

/** Plantas de Noz de Duna de pé (célula de ar sobre sólido, sem construção por cima), com o estado: `ripe` = com frutos. Sem plantas antes do gerador v5. */
export function standingNuts(s: TitanSession): Array<{ x: number; y: number; z: number; ripe: boolean; s?: number }> {
  return s.volume.gen.nutPlants
    .filter((n) => s.volume.get(n.x, n.y, n.z) === T.AIR && isSolid(s.volume.get(n.x, n.y - 1, n.z)))
    .map((n) => ({ ...n, ripe: !s.regrow.has(nutId(n.x, n.y, n.z)) } as { x: number; y: number; z: number; ripe: boolean; s?: number }))
    .concat([...s.crops.values()].filter((c) => c.species === 'noz' && s.volume.get(c.x, c.y, c.z) === T.AIR && s.volume.get(c.x, c.y - 1, c.z) === T.SAND).map((c) => { const l = nutLook(c.age); return { x: c.x, y: c.y, z: c.z, ripe: l.ripe, s: l.scale }; })); // as plantadas pelo viajante (ADR 0083), com o tamanho da fase
}

/** Passa `dt` segundos de jogo ativo para as plantas colhidas; devolve se alguma voltou a dar frutos (o desenho precisa refazer). */
export function tickRegrow(s: TitanSession, dt: number): boolean {
  let ripened = false;
  for (const [id, left] of [...s.regrow]) {
    const rest = left - dt;
    if (rest <= 0) { s.regrow.delete(id); ripened = true; } else s.regrow.set(id, rest);
  }
  return ripened;
}

/** Plantas de junco cultivadas para desenhar: a coluna do atlas de cultivo (0 muda, 1 crescendo, 2 adulto, 3 ressecado). */
export function standingCrops(s: TitanSession): Array<{ x: number; y: number; z: number; frame: number }> {
  const out: Array<{ x: number; y: number; z: number; frame: number }> = [];
  for (const c of s.crops.values()) {
    const below = s.volume.get(c.x, c.y - 1, c.z), kind = soilKind(below);
    if (s.volume.get(c.x, c.y, c.z) !== T.AIR) continue;
    if (c.species === 'junco' && kind) out.push({ x: c.x, y: c.y, z: c.z, frame: Math.min(CROP_FRAMES - 1, spriteFrame(kind, c.age)) });
    else if (isGarden(c.species) && isFarmland(below)) out.push({ x: c.x, y: c.y, z: c.z, frame: gardenFrame(c.species, c.age) }); // a horta usa o atlas dela (ADR 0113)
  }
  return out;
}

/** Chove agora neste mundo? (ADR 0118: só o Orvalis tem clima.) */
export const isRaining = (s: TitanSession): boolean => s.weather.raining && hasWeather(s.volume.gen.world);
/** Passa `dt` s de jogo ativo no clima; devolve se o marcador virou (o save e, na sala, os clientes precisam saber). */
export function tickWeather(s: TitanSession, dt: number, rng: () => number): boolean { return hasWeather(s.volume.gen.world) && stepWeather(s.weather, dt, rng); }
/** Nenhum bloco sólido acima da célula (x, y, z) até o topo do mundo: a chuva e a luz do céu chegam. */
export function skyOpenAbove(s: TitanSession, x: number, y: number, z: number): boolean {
  for (let yy = y + 1; yy <= Y_MAX; yy++) if (isSolid(s.volume.get(x, yy, z))) return false;
  return true;
}

/** Luz (0–15) no bloco de cima da planta: o céu aberto vale `ambiente do dia × 15` (0,3 à noite … 1 à tarde; com chuva, até 12 em pleno dia) e a lanterna, o seu nível; vale o maior. */
export function cropLight(s: TitanSession, x: number, y: number, z: number): number {
  return Math.max(skyOpenAbove(s, x, y, z) ? skyAt(s.time, 'titan', isRaining(s) ? 1 : 0).ambient * 15 : 0, s.volume.light(x, y + 1, z));
}

/**
 * Random ticks das plantas de junco (ADR 0083): passa `dt` s de jogo ativo; cada planta a até `CROP_SIM_RADIUS` m do viajante sorteia em média a cada `CROP_TICK_MEAN_S` s.
 * Devolve se alguma subiu de fase (o desenho e o save precisam refazer). `rng` entra de fora (testes determinísticos).
 */
export function tickCrops(s: TitanSession, dt: number, rng: () => number, near: { x: number; z: number }): boolean {
  let changed = false;
  const pTick = 1 - Math.exp(-dt / CROP_TICK_MEAN_S);
  for (const c of s.crops.values()) {
    if (Math.hypot(c.x + 0.5 - near.x, c.z + 0.5 - near.z) > CROP_SIM_RADIUS || rng() >= pTick) continue;
    const kindAt = (dx: number, dz: number): CropKind | null => soilKindFor(c.species, s.volume.get(c.x + dx, c.y - 1, c.z + dz)); // a horta só lê terra arada; o junco e a Noz, areia
    if (isGarden(c.species)) { // a terra arada seca ou umedece conforme a água ao alcance (ADR 0113): troca o bloco e só então cresce
      const below = s.volume.get(c.x, c.y - 1, c.z), wet = isHydrated(s.volume, c.x, c.y - 1, c.z) || (isRaining(s) && skyOpenAbove(s, c.x, c.y - 1, c.z)); // a chuva hidrata a terra arada a céu aberto (Wiki, ADR 0118)
      if (below === T.FARMLAND_DRY && wet) { s.volume.set(c.x, c.y - 1, c.z, T.FARMLAND_WET); changed = true; }
      else if (below === T.FARMLAND_WET && !wet) { s.volume.set(c.x, c.y - 1, c.z, T.FARMLAND_DRY); changed = true; }
    }
    const self = kindAt(0, 0);
    const sameAt = (dx: number, dz: number): boolean => !!self && s.crops.get(cropKey(c.x + dx, c.y, c.z + dz))?.species === c.species && kindAt(dx, dz) === self;
    if (randomTick(c, { soilAt: kindAt, sameAt, light: cropLight(s, c.x, c.y, c.z) }, rng)) { changed = true; s.metaRev++; }
  }
  return changed;
}

export function headerOf(s: TitanSession): TitanHeader {
  return { v: TITAN_SAVE_VERSION, world: s.volume.gen.world, seed: s.seed, generatorVersion: s.volume.gen.version, savedAt: Date.now(), player: { x: s.body.x, y: s.body.y, z: s.body.z, yaw: s.yaw, pitch: s.pitch }, selected: s.selected, time: s.time, days: s.days, ...(hasWeather(s.volume.gen.world) ? { weather: weatherToData(s.weather) } : {}), inventory: { bag: s.inventory.toData(), collected: [...s.collected].sort() }, recipes: [...s.known].sort(), grants: s.grants.ember ? { ember: s.grants.ember } : undefined, drops: [...s.drops.values()].sort((a, b) => (a.id < b.id ? -1 : 1)), vitals: vitalsToData(s.vitals), ...(s.respawn.size ? { respawn: Object.fromEntries(s.respawn) } : {}), ...(s.spawn ? { spawn: s.spawn } : {}), ...(s.chests.size ? { chests: Object.fromEntries([...s.chests].filter(([, c]) => !chestIsEmpty(c)).map(([k, c]) => [k, chestToData(c)])) } : {}), ...(s.furnaces.size ? { furnaces: Object.fromEntries([...s.furnaces].map(([k, f]) => [k, furnaceToData(f)])) } : {}), ...(s.regrow.size ? { regrow: Object.fromEntries([...s.regrow].map(([id, t]) => [id, Math.round(t * 10) / 10])) } : {}), ...(s.crops.size ? { crops: Object.fromEntries([...s.crops.values()].map((c) => [cropKey(c.x, c.y, c.z), c.species === 'junco' ? c.age : { s: c.species, a: c.age }])) } : {}) };
}

/**
 * Grava jogador + chunks sujos na mesma transação (a cópia e a revisão de cada chunk são tiradas no início). Só marca limpo, e só aquela revisão, depois da confirmação; se falhar, o estado sujo fica para a próxima
 * tentativa e o erro sobe (a interface o mostra e o último estado confirmado continua no banco).
 */
export async function flush(storage: TitanStorage, s: TitanSession): Promise<void> {
  const rev = stateRev(s); // inventário e coleta saem no mesmo instante da cópia dos chunks e do cabeçalho
  const dirty = s.volume.dirtyChunks();
  const puts: ChunkRecord[] = dirty.filter((c) => c.edits.length > 0).map(({ cx, cz, edits }) => ({ cx, cz, edits }));
  const deletes = dirty.filter((c) => c.edits.length === 0).map(({ cx, cz }) => ({ cx, cz }));
  await storage.commit(headerOf(s), puts, deletes);
  s.volume.markClean(dirty); // só a revisão confirmada: edição feita durante a gravação continua pendente
  s.savedStateRev = rev; // idem para inventário e coleta
}
