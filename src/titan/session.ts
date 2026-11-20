import { GENERATOR_VERSION, TitanGenerator } from './generator';
import { HOTBAR, Inventory } from './inventory';
import { isItem, Item } from './items';
import { type Farejador, newPack } from './creature';
import { type FurnaceState, furnaceFromData, furnaceToData, tickFurnace, isLit } from './furnace';
import { maxDurability } from './wear';
import { NUT_REGROW_S, nutId, parseNutId } from './nuts';
import { newVitals, type PlayerVitals, vitalsFromData, vitalsToData } from './vitals';
import { AFTERNOON, validDay } from './sky';
import { newBody, safePosition, type Body, type ItemLookup } from './physics';
import { type ChunkRecord, type Drop, type TitanHeader, type TitanSave, type TitanStorage, TITAN_SAVE_VERSION } from './save';
import { TitanVolume } from './volume';
import { isSolid, T, Y_MAX, Y_MIN } from './voxel';

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
  /** Hotbar, mochila e grade (ADR 0040). */
  inventory: Inventory;
  /** Ids dos fragmentos de superfície já recolhidos (a base os recria; o save lembra quais sumiram). */
  collected: Set<string>;
  /** Revisões do que não é chunk (inventário + coleta): só a confirmada fica limpa. */
  collectedRev: number;
  /** Braseiros com estado (ADR 0068): `x,y,z` → espaços e temporizadores (fornalha). Vai no save (`header.furnaces`); corre também com a tela fechada, só com o jogo ativo. */
  furnaces: Map<string, FurnaceState>;
  /** Plantas de Noz de Duna colhidas: id → segundos de jogo que faltam para rebrotar (ADR 0060). Vai no save (`header.regrow`). */
  regrow: Map<string, number>;
  /** Farejadores de Duna da enseada (um grande e um pequeno, ADR 0061): estado só de execução, nascem na toca a cada abertura (não vão no save). Vazio sem toca (gerador antigo ou região sem enseada). */
  creatures: Farejador[];
  savedStateRev: number;
  /** Lascas soltas por veios quebrados (v3, ADR 0044): recolhidas por proximidade; vão no cabeçalho do save. */
  drops: Map<string, Drop>;
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
  return [...s.items.remaining(), ...s.drops.values()];
}
/** Há inventário/coleta ainda não confirmados no banco? */
export const hasPendingState = (s: TitanSession): boolean => stateRev(s) !== s.savedStateRev;

/** Id do junco de vidro numa célula: entra em `collected` (já gravado no save) quando ele é recolhido ou perde o apoio. */
export const reedId = (x: number, y: number, z: number): string => `reed:${x},${y},${z}`;

function makeItems(s: { volume: TitanVolume; collected: Set<string>; grants: TitanSession['grants']; regrow: Map<string, number> }): TitanSession['items'] {
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
    at: (x, y, z) => { const id = byCell.get(key(x, y, z)); return id && !s.collected.has(id) ? id : reedAt(x, y, z) ?? nutAt(x, y, z); },
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
    if (b === T.BRAZIER || b === T.BRAZIER_LIT) out.set(k, furnaceFromData(v));
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
    const r = tickFurnace(f, dt);
    if (!r.changed) continue;
    any = true; s.metaRev++;
    const [x, y, z] = k.split(',').map(Number);
    const want = isLit(f) ? T.BRAZIER_LIT : T.BRAZIER, cur = s.volume.get(x, y, z);
    if ((cur === T.BRAZIER || cur === T.BRAZIER_LIT) && cur !== want) s.volume.set(x, y, z, want);
  }
  return any;
}

/** Rebrote gravado: só `nut:x,y,z` com segundos finitos em (0, `NUT_REGROW_S`]; o resto é descartado. */
function validRegrow(raw: unknown): Map<string, number> {
  const out = new Map<string, number>();
  if (!raw || typeof raw !== 'object') return out;
  for (const [id, v] of Object.entries(raw as Record<string, unknown>)) if (parseNutId(id) && typeof v === 'number' && Number.isFinite(v) && v > 0) out.set(id, Math.min(v, NUT_REGROW_S));
  return out;
}

/** Itens soltos gravados: só entradas bem formadas (id, item conhecido, contagem 1–64 opcional e células inteiras no domínio); o resto é descartado. */
function validDrops(raw: unknown, gen: TitanGenerator): Map<string, Drop> {
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

export type GeneratorFactory = (seed: number, version: number) => TitanGenerator | null;
/** Versões suportadas: uma partida antiga nunca é reinterpretada por um gerador novo (docs Titã 05 §6). */
export const generatorFor: GeneratorFactory = (seed, version) => (version >= 1 && version <= GENERATOR_VERSION && Number.isInteger(version) ? new TitanGenerator(seed, version) : null);

export class UnsupportedVersionError extends Error {}

/** `explicitSeed`: vindo de `?seed=`; `newSeed`: sorteio para a primeira visita ou "Nova partida". */
/** `freshVersion`: gerador da partida nova (padrão = o atual; testes do legado pedem a v1/v2). */
export async function openSession(storage: TitanStorage, explicitSeed: number | null, newSeed: () => number, factory: GeneratorFactory = generatorFor, freshVersion: number = GENERATOR_VERSION): Promise<TitanSession> {
  let seed = explicitSeed;
  if (seed === null) seed = await storage.latestSeed();
  const saved = seed !== null ? await storage.load(seed) : null;
  if (saved) {
    const gen = factory(saved.header.seed, saved.header.generatorVersion);
    if (!gen) throw new UnsupportedVersionError(`Esta partida usa o gerador v${saved.header.generatorVersion}, que esta versão do jogo não tem.`);
    return resume(gen, saved);
  }
  return fresh(new TitanGenerator(seed ?? newSeed(), freshVersion));
}

/** Os Farejadores nascem na toca, com o passeio derivado da seed. */
const creaturesFor = (gen: TitanGenerator): Farejador[] => (gen.den ? newPack(gen.den, gen.seed) : []);

export function fresh(gen: TitanGenerator): TitanSession {
  const volume = new TitanVolume(gen);
  const a = gen.arrival;
  const collected = new Set<string>();
  const regrow = new Map<string, number>();
  const grants: TitanSession['grants'] = {};
  const s = { seed: gen.seed, volume, body: newBody(a.x, a.y, a.z), yaw: a.yaw, pitch: -0.12, selected: 0, resumed: false, relocated: false, time: AFTERNOON, days: 0, inventory: Inventory.starting(), collected, collectedRev: 0, regrow, furnaces: new Map<string, FurnaceState>(), creatures: creaturesFor(gen), savedStateRev: -1, drops: new Map(), dropsRev: 0, vitals: newVitals(), known: new Set<string>(), grants, metaRev: 0, items: makeItems({ volume, collected, grants, regrow }) };
  return s;
}

function resume(gen: TitanGenerator, save: TitanSave): TitanSession {
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
  const known = new Set<string>((save.header.recipes ?? []).filter((x): x is string => typeof x === 'string'));
  const s: TitanSession = { seed: gen.seed, volume, body: newBody(safe.x, safe.y, safe.z), yaw: p.yaw, pitch: p.pitch, selected: Math.max(0, Math.min(HOTBAR - 1, save.header.selected | 0)), resumed: true, relocated: moved, time: validDay(save.header.time), days: Number.isInteger(save.header.days) && save.header.days! >= 0 ? save.header.days! : 0, inventory: inv, collected, collectedRev: 0, regrow, furnaces: validFurnaces(save.header.furnaces, volume), creatures: creaturesFor(gen), savedStateRev: -1, drops: validDrops(save.header.drops, gen), dropsRev: 0, known, grants, metaRev: 0, vitals: vitalsFromData(save.header.vitals), items: makeItems({ volume, collected, grants, regrow }) };
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
  add('bancada', hasBench);
  add('mesa', s.inventory.total(Item.DARK_ROCK) > 0 || hasBench);
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
export function standingNuts(s: TitanSession): Array<{ x: number; y: number; z: number; ripe: boolean }> {
  return s.volume.gen.nutPlants
    .filter((n) => s.volume.get(n.x, n.y, n.z) === T.AIR && isSolid(s.volume.get(n.x, n.y - 1, n.z)))
    .map((n) => ({ ...n, ripe: !s.regrow.has(nutId(n.x, n.y, n.z)) }));
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

export function headerOf(s: TitanSession): TitanHeader {
  return { v: TITAN_SAVE_VERSION, world: 'titan', seed: s.seed, generatorVersion: s.volume.gen.version, savedAt: Date.now(), player: { x: s.body.x, y: s.body.y, z: s.body.z, yaw: s.yaw, pitch: s.pitch }, selected: s.selected, time: s.time, days: s.days, inventory: { bag: s.inventory.toData(), collected: [...s.collected].sort() }, recipes: [...s.known].sort(), grants: s.grants.ember ? { ember: s.grants.ember } : undefined, drops: [...s.drops.values()].sort((a, b) => (a.id < b.id ? -1 : 1)), vitals: vitalsToData(s.vitals), ...(s.furnaces.size ? { furnaces: Object.fromEntries([...s.furnaces].map(([k, f]) => [k, furnaceToData(f)])) } : {}), ...(s.regrow.size ? { regrow: Object.fromEntries([...s.regrow].map(([id, t]) => [id, Math.round(t * 10) / 10])) } : {}) };
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
