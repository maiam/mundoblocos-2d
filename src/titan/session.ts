import { GENERATOR_VERSION, TitanGenerator } from './generator';
import { newBody, safePosition, type Body } from './physics';
import { type ChunkRecord, type TitanHeader, type TitanSave, type TitanStorage, TITAN_SAVE_VERSION } from './save';
import { TitanVolume } from './volume';

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
}

export type GeneratorFactory = (seed: number, version: number) => TitanGenerator | null;
/** Versões suportadas: uma partida antiga nunca é reinterpretada por um gerador novo (docs Titã 05 §6). */
export const generatorFor: GeneratorFactory = (seed, version) => (version === GENERATOR_VERSION ? new TitanGenerator(seed) : null);

export class UnsupportedVersionError extends Error {}

/** `explicitSeed`: vindo de `?seed=`; `newSeed`: sorteio para a primeira visita ou "Nova partida". */
export async function openSession(storage: TitanStorage, explicitSeed: number | null, newSeed: () => number, factory: GeneratorFactory = generatorFor): Promise<TitanSession> {
  let seed = explicitSeed;
  if (seed === null) seed = await storage.latestSeed();
  const saved = seed !== null ? await storage.load(seed) : null;
  if (saved) {
    const gen = factory(saved.header.seed, saved.header.generatorVersion);
    if (!gen) throw new UnsupportedVersionError(`Esta partida usa o gerador v${saved.header.generatorVersion}, que esta versão do jogo não tem.`);
    return resume(gen, saved);
  }
  return fresh(new TitanGenerator(seed ?? newSeed()));
}

export function fresh(gen: TitanGenerator): TitanSession {
  const volume = new TitanVolume(gen);
  const a = gen.arrival;
  return { seed: gen.seed, volume, body: newBody(a.x, a.y, a.z), yaw: a.yaw, pitch: -0.12, selected: 0, resumed: false, relocated: false };
}

function resume(gen: TitanGenerator, save: TitanSave): TitanSession {
  const volume = new TitanVolume(gen);
  volume.load(save.chunks);
  const a = gen.arrival;
  const p = save.header.player;
  const safe = safePosition(volume, p, a);
  const moved = Math.abs(safe.x - p.x) > 1e-6 || Math.abs(safe.y - p.y) > 1e-6 || Math.abs(safe.z - p.z) > 1e-6;
  return { seed: gen.seed, volume, body: newBody(safe.x, safe.y, safe.z), yaw: p.yaw, pitch: p.pitch, selected: save.header.selected | 0, resumed: true, relocated: moved };
}

export function headerOf(s: TitanSession): TitanHeader {
  return { v: TITAN_SAVE_VERSION, world: 'titan', seed: s.seed, generatorVersion: s.volume.gen.version, savedAt: Date.now(), player: { x: s.body.x, y: s.body.y, z: s.body.z, yaw: s.yaw, pitch: s.pitch }, selected: s.selected, inventory: null };
}

/**
 * Grava jogador + chunks sujos na mesma transação (a cópia e a revisão de cada chunk são tiradas no início). Só marca limpo, e só aquela revisão, depois da confirmação; se falhar, o estado sujo fica para a próxima
 * tentativa e o erro sobe (a interface o mostra e o último estado confirmado continua no banco).
 */
export async function flush(storage: TitanStorage, s: TitanSession): Promise<void> {
  const dirty = s.volume.dirtyChunks();
  const puts: ChunkRecord[] = dirty.filter((c) => c.edits.length > 0).map(({ cx, cz, edits }) => ({ cx, cz, edits }));
  const deletes = dirty.filter((c) => c.edits.length === 0).map(({ cx, cz }) => ({ cx, cz }));
  await storage.commit(headerOf(s), puts, deletes);
  s.volume.markClean(dirty); // só a revisão confirmada: edição feita durante a gravação continua pendente
}
