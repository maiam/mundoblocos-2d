/**
 * Missões narrativas do Capítulo 1 — "O Despertar" (ADR 0034, nível 4; v0.93.121): uma corrente de missões **concluídas uma única vez**, dadas pelo Mestre da
 * Guilda, que levam a jogadora de aventureira desconhecida a alguém reconhecido pela cidade. Puro e sem DOM; o estado vai no **salvamento do jogador**
 * (`SaveData.missions`, v20), não na sala. Cada missão é uma lista de **metas em paralelo** (falar com, juntar, abater, construir…); quando todas estão
 * cumpridas, a jogadora entrega a missão a quem a recebe (`turnIn`: o Mestre ou outro NPC). Os contratos repetíveis da guilda ficam em outra camada.
 */
import { Block } from '../../world/blocks';
import { blockStack, Item, type StackId } from '../../world/items';
import { type MonsterKind, WOLF_KINDS } from '../../world/dungeon';

export type MissionId = 'm01' | 'm02' | 'm03';

/** Um acontecimento do jogo que pode andar uma meta (`MissionLog.progress`). */
export type MissionEvent =
  | { type: 'talk'; npc: string }
  | { type: 'kill'; monster: MonsterKind }
  | { type: 'place'; block: number };

export interface Goal {
  id: string;
  /** Texto curto para o diário ("Falar com o ferreiro Black"). */
  text: string;
  /** Quantas vezes (ou unidades). */
  count: number;
  /** `have`: unidades no inventário (somando as pilhas; entregues no fim); os outros: contador do evento, só depois de aceitar. */
  kind: 'have' | 'event';
  items?: readonly StackId[];
  match?: (e: MissionEvent) => boolean;
}

export interface Mission {
  id: MissionId;
  chapter: 1;
  title: string;
  /** Subtítulo do tipo da missão. */
  kind: string;
  /** Quem recebe a missão pronta: `guild` (o Mestre) ou o id de um NPC nomeado. */
  turnIn: string;
  goals: readonly Goal[];
  reward: { coins: number };
  /** Conversa ao oferecer (a pergunta `prompt` vem depois, com Aceitar/Agora não) e ao aceitar. */
  offer: string;
  prompt: string;
  accepted: string;
  /** Em andamento / na entrega. */
  progress: string;
  complete: string;
}

const talk = (npc: string): ((e: MissionEvent) => boolean) => (e) => e.type === 'talk' && e.npc === npc;
const kills = (kinds: readonly MonsterKind[]): ((e: MissionEvent) => boolean) => (e) => e.type === 'kill' && kinds.includes(e.monster);

export const MISSIONS: readonly Mission[] = [
  {
    id: 'm01', chapter: 1, title: 'Um nome na guilda', kind: 'Introdução', turnIn: 'guild',
    goals: [
      { id: 'guild', text: 'Registrar-se na guilda', count: 1, kind: 'event', match: talk('guild') },
      { id: 'black', text: 'Conhecer o ferreiro Black', count: 1, kind: 'event', match: talk('black') },
      { id: 'bento', text: 'Conhecer o mercador Bento', count: 1, kind: 'event', match: talk('bento') },
    ],
    reward: { coins: 8 },
    offer: 'Mais um aventureiro chegando à Cidade do Despertar, e ninguém sabe de onde veio. Por aqui, quem quer trabalho começa registrando o nome na guilda. É rápido: assino o seu registro agora, e você ainda conhece o ferreiro e o mercador, que vão ser os seus parceiros por aqui.',
    prompt: 'Quer se registrar como aventureira da guilda?',
    accepted: 'Registrado! Agora vá conhecer o ferreiro Black, na Ferraria, e o mercador Bento, no Mercado. Depois volte aqui, que eu pago o seu primeiro contrato.',
    progress: 'Ainda falta conhecer o ferreiro Black e o mercador Bento. Converse com os dois e volte aqui.',
    complete: 'Agora você é de casa! Aqui estão as suas primeiras moedas. A partir de hoje a guilda tem contratos para você. Pode me procurar sempre que quiser trabalho.',
  },
  {
    id: 'm02', chapter: 1, title: 'O pedido do ferreiro', kind: 'Coleta', turnIn: 'black',
    goals: [
      { id: 'logs', text: 'Juntar toras de carvalho', count: 6, kind: 'have', items: [blockStack(Block.OAK_LOG)] },
      { id: 'stone', text: 'Juntar pedras brutas', count: 8, kind: 'have', items: [blockStack(Block.STONE)] },
    ],
    reward: { coins: 12 },
    offer: 'O Black, o ferreiro, está sem material para continuar trabalhando. Ele precisa de 6 toras de carvalho e 8 pedras brutas. Corte árvores com o machado e quebre pedra com a picareta, e leve tudo a ele. Eu cuido do pagamento.',
    prompt: 'Aceita ajudar o ferreiro?',
    accepted: 'Boa! Corte 6 toras de carvalho e junte 8 pedras brutas. Quando tiver tudo, entregue ao Black na Ferraria.',
    progress: 'Ainda estamos juntando o material do Black: 6 toras de carvalho e 8 pedras brutas. Quando tiver, é só entregar a ele.',
    complete: 'Ah, é disso que eu precisava! Com isso volto à forja. Aqui está o seu pagamento, e diga à guilda que o Black ficou satisfeito.',
  },
  {
    id: 'm03', chapter: 1, title: 'Lobos na estrada', kind: 'Combate', turnIn: 'guild',
    goals: [
      { id: 'wolves', text: 'Abater lobos', count: 3, kind: 'event', match: kills(WOLF_KINDS as readonly MonsterKind[]) },
    ],
    reward: { coins: 15 },
    offer: 'Comerciantes contam que lobos andam atacando as estradas perto da cidade. A guilda abriu um contrato: 3 lobos abatidos. Leve vida cheia, use a espada ou o machado, e não deixe que cheguem perto demais.',
    prompt: 'Aceita o contrato dos lobos?',
    accepted: 'Contrato aceito. Abata 3 lobos fora da muralha e volte aqui para receber o pagamento.',
    progress: 'Os lobos ainda estão soltos. O contrato pede 3 abatidos; cuide da sua vida e volte quando terminar.',
    complete: 'Três lobos a menos! As estradas ficam mais seguras graças a você. Aqui está o seu pagamento.',
  },
];

export interface MissionLog {
  /** Missões já cumpridas (cada uma só vale uma vez). */
  done: MissionId[];
  /** A missão em andamento (uma por vez; a corrente é linear). */
  active: MissionId | null;
  /** Contagem das metas de evento da missão ativa (`goal.id` → quantas). */
  progress: Record<string, number>;
}

export const EMPTY_LOG = (): MissionLog => ({ done: [], active: null, progress: {} });

export function missionOf(id: MissionId | null): Mission | null {
  return MISSIONS.find((m) => m.id === id) ?? null;
}

/** A próxima missão da corrente (a primeira ainda não cumprida), ou null se o capítulo acabou. */
export function nextMission(log: MissionLog): Mission | null {
  return MISSIONS.find((m) => !log.done.includes(m.id)) ?? null;
}

/** Aceita a missão: zera a contagem, e qualquer meta de evento já satisfeita pelo próprio ato (registrar-se) é a primeira conversa dada por quem a oferece. */
export function accept(log: MissionLog, id: MissionId): void {
  log.active = id;
  log.progress = {};
}

/** Quanto cada meta já tem (`have` lê o inventário; evento lê a contagem), limitado ao alvo. */
export function goalsOf(m: Mission, log: MissionLog, count: (id: StackId) => number): Array<{ goal: Goal; have: number; done: boolean }> {
  return m.goals.map((goal) => {
    const raw = goal.kind === 'have' ? (goal.items ?? []).reduce((n, id) => n + count(id), 0) : log.progress[goal.id] ?? 0;
    const have = Math.min(goal.count, raw);
    return { goal, have, done: have >= goal.count };
  });
}

export function isReady(m: Mission, log: MissionLog, count: (id: StackId) => number): boolean {
  return goalsOf(m, log, count).every((g) => g.done);
}

/** Um acontecimento: anda as metas de evento da missão ativa. Devolve se algo mudou. */
export function onEvent(log: MissionLog, e: MissionEvent): boolean {
  const m = missionOf(log.active);
  if (!m) return false;
  let changed = false;
  for (const g of m.goals) {
    if (g.kind !== 'event' || !g.match?.(e)) continue;
    const now = log.progress[g.id] ?? 0;
    if (now >= g.count) continue;
    log.progress[g.id] = now + 1;
    changed = true;
  }
  return changed;
}

/** Entrega: tira as unidades das metas `have`, marca a missão como cumprida e limpa a ativa. Devolve false (sem mexer em nada) se não está pronta. */
export function complete(log: MissionLog, m: Mission, count: (id: StackId) => number, take: (id: StackId, n: number) => boolean): boolean {
  if (log.active !== m.id || !isReady(m, log, count)) return false;
  for (const g of m.goals) {
    if (g.kind !== 'have') continue;
    let left = g.count;
    for (const id of g.items ?? []) {
      const n = Math.min(left, count(id));
      if (n > 0 && take(id, n)) left -= n;
      if (left === 0) break;
    }
  }
  log.done.push(m.id);
  log.active = null;
  log.progress = {};
  return true;
}

/** Sinal sobre a cabeça: ! em quem oferece a próxima missão, ? azulado em quem a receberá (em andamento) e ? dourado quando pronta. Chave = NPC (`guild` ou id). */
export function marksOf(log: MissionLog, count: (id: StackId) => number): Record<string, 'offer' | 'progress' | 'ready'> {
  const m = missionOf(log.active);
  if (m) return { [m.turnIn]: isReady(m, log, count) ? 'ready' : 'progress' };
  return nextMission(log) ? { guild: 'offer' } : {};
}

/** Valida o que veio do salvamento. */
export function sanitizeMissions(raw: unknown): MissionLog {
  const log = EMPTY_LOG();
  if (!raw || typeof raw !== 'object') return log;
  const r = raw as Partial<MissionLog>;
  const ids = new Set<string>(MISSIONS.map((m) => m.id));
  if (Array.isArray(r.done)) log.done = MISSIONS.map((m) => m.id).filter((id) => (r.done as unknown[]).includes(id));
  if (typeof r.active === 'string' && ids.has(r.active) && !log.done.includes(r.active as MissionId)) log.active = r.active as MissionId;
  if (log.active && r.progress && typeof r.progress === 'object') {
    for (const g of missionOf(log.active)!.goals) {
      const n = (r.progress as Record<string, unknown>)[g.id];
      if (g.kind === 'event' && typeof n === 'number' && Number.isFinite(n)) log.progress[g.id] = Math.max(0, Math.min(g.count, Math.floor(n)));
    }
  }
  return log;
}

export const COIN: StackId = Item.COPPER_COIN;
