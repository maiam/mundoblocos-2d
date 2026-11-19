import { GENERATOR_VERSION, TitanGenerator } from './generator';
import { Inventory } from './inventory';
import { AFTERNOON, validDay } from './sky';
import { newBody, safePosition, type Body, type ItemLookup } from './physics';
import { type ChunkRecord, type Drop, type TitanHeader, type TitanSave, type TitanStorage, TITAN_SAVE_VERSION } from './save';
import { TitanVolume } from './volume';
import { inRegion, Y_MAX, Y_MIN } from './voxel';

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
  /** Hotbar, mochila e grade (ADR 0040). */
  inventory: Inventory;
  /** Ids dos fragmentos de superfície já recolhidos (a base os recria; o save lembra quais sumiram). */
  collected: Set<string>;
  /** Revisões do que não é chunk (inventário + coleta): só a confirmada fica limpa. */
  collectedRev: number;
  savedStateRev: number;
  /** Lascas soltas por veios quebrados (v3, ADR 0044): recolhidas por proximidade; vão no cabeçalho do save. */
  drops: Map<string, Drop>;
  dropsRev: number;
  /** Fragmentos de superfície ainda no mundo, por célula (para a mira e o desenho). */
  items: ItemLookup & { remaining(): Array<{ id: string; item: number; x: number; y: number; z: number }> };
}

const stateRev = (s: TitanSession): number => s.inventory.rev + s.collectedRev + s.dropsRev;
/** Tudo o que está solto no mundo para desenhar: lascas legadas (v1/v2) ainda não recolhidas e as lascas dos veios (v3). */
export function visibleItems(s: TitanSession): Array<{ id: string; item: number; x: number; y: number; z: number }> {
  return [...s.items.remaining(), ...s.drops.values()];
}
/** Há inventário/coleta ainda não confirmados no banco? */
export const hasPendingState = (s: TitanSession): boolean => stateRev(s) !== s.savedStateRev;

function makeItems(s: { volume: TitanVolume; collected: Set<string> }): TitanSession['items'] {
  const all = s.volume.gen.surfaceItems;
  const key = (x: number, y: number, z: number): string => `${x},${y},${z}`;
  const byCell = new Map(all.map((i) => [key(i.x, i.y, i.z), i.id]));
  return {
    at: (x, y, z) => { const id = byCell.get(key(x, y, z)); return id && !s.collected.has(id) ? id : null; },
    remaining: () => all.filter((i) => !s.collected.has(i.id)),
  };
}

/** Lascas gravadas: só entradas bem formadas (id, item 5/6 e células inteiras no domínio); o resto é descartado. */
function validDrops(raw: unknown): Map<string, Drop> {
  const out = new Map<string, Drop>();
  if (!Array.isArray(raw)) return out;
  for (const d of raw as Drop[]) {
    if (d && typeof d.id === 'string' && (d.item === 5 || d.item === 6) && [d.x, d.y, d.z].every(Number.isInteger) && d.y > Y_MIN && d.y <= Y_MAX && inRegion(d.x, d.z)) out.set(d.id, { id: d.id, item: d.item, x: d.x, y: d.y, z: d.z });
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

export function fresh(gen: TitanGenerator): TitanSession {
  const volume = new TitanVolume(gen);
  const a = gen.arrival;
  const collected = new Set<string>();
  const s = { seed: gen.seed, volume, body: newBody(a.x, a.y, a.z), yaw: a.yaw, pitch: -0.12, selected: 0, resumed: false, relocated: false, time: AFTERNOON, inventory: Inventory.starting(), collected, collectedRev: 0, savedStateRev: -1, drops: new Map(), dropsRev: 0, items: makeItems({ volume, collected }) };
  return s;
}

function resume(gen: TitanGenerator, save: TitanSave): TitanSession {
  const volume = new TitanVolume(gen);
  volume.load(save.chunks);
  const a = gen.arrival;
  const p = save.header.player;
  const safe = safePosition(volume, p, a);
  const moved = Math.abs(safe.x - p.x) > 1e-6 || Math.abs(safe.y - p.y) > 1e-6 || Math.abs(safe.z - p.z) > 1e-6;
  // save da v1 (sem inventário) abre com o inventário inicial; o que estava na grade de fabricação volta para a mochila
  const inv = save.header.inventory ? Inventory.fromData(save.header.inventory.bag) : Inventory.starting();
  const revBefore = inv.rev;
  inv.returnCraft();
  const collected = new Set<string>((save.header.inventory?.collected ?? []).filter((x): x is string => typeof x === 'string'));
  const savedStateRev = save.header.inventory && inv.rev === revBefore ? inv.rev : -1; // v1 ou grade devolvida: há o que gravar
  return { seed: gen.seed, volume, body: newBody(safe.x, safe.y, safe.z), yaw: p.yaw, pitch: p.pitch, selected: Math.max(0, Math.min(6, save.header.selected | 0)), resumed: true, relocated: moved, time: validDay(save.header.time), inventory: inv, collected, collectedRev: 0, savedStateRev, drops: validDrops(save.header.drops), dropsRev: 0, items: makeItems({ volume, collected }) };
}

export function headerOf(s: TitanSession): TitanHeader {
  return { v: TITAN_SAVE_VERSION, world: 'titan', seed: s.seed, generatorVersion: s.volume.gen.version, savedAt: Date.now(), player: { x: s.body.x, y: s.body.y, z: s.body.z, yaw: s.yaw, pitch: s.pitch }, selected: s.selected, time: s.time, inventory: { bag: s.inventory.toData(), collected: [...s.collected].sort() }, drops: [...s.drops.values()].sort((a, b) => (a.id < b.id ? -1 : 1)) };
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
