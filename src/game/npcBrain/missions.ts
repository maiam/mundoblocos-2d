/**
 * Missões narrativas do Capítulo 1 — "O Despertar" (ADR 0034, nível 4; v0.93.121): uma corrente de missões **concluídas uma única vez**, dadas pelo Mestre da
 * Guilda, que levam a jogadora de aventureira desconhecida a alguém reconhecido pela cidade. Puro e sem DOM; o estado vai no **salvamento do jogador**
 * (`SaveData.missions`, v20), não na sala. Cada missão é uma lista de **metas em paralelo** (falar com, juntar, abater, construir…); quando todas estão
 * cumpridas, a jogadora entrega a missão a quem a recebe (`turnIn`: o Mestre ou outro NPC). Os contratos repetíveis da guilda ficam em outra camada.
 */
import { Block } from '../../world/blocks';
import { blockStack, Item, type ItemId, type StackId } from '../../world/items';
import { SELL_PRICE } from '../../world/shop';
import { type MonsterKind, WOLF_KINDS } from '../../world/dungeon';

export type MissionId = 'm01' | 'm02' | 'm03' | 'm04' | 'm05' | 'm06' | 'm07' | 'm08' | 'm09' | 'm10';

/** Um acontecimento do jogo que pode andar uma meta (`MissionLog.progress`). */
export type MissionEvent =
  | { type: 'talk'; npc: string }
  | { type: 'kill'; monster: MonsterKind }
  | { type: 'place'; block: number }
  /** A jogadora chegou perto de um lugar (`goblin-camp`: a fogueira de um acampamento de goblins). */
  | { type: 'near'; spot: 'goblin-camp' };

export interface Goal {
  id: string;
  /** Texto curto para o diário ("Falar com o ferreiro Black"). */
  text: string;
  /** Quantas vezes (ou unidades). */
  count: number;
  /** `have`: unidades no inventário (somando as pilhas; entregues no fim); os outros: contador do evento, só depois de aceitar. */
  /** `have`: inventário; `event`: contagem de eventos depois de aceitar; `probe`: lido do mundo (`probe(key)`), ex.: terra arada no terreno indicado. */
  kind: 'have' | 'event' | 'probe';
  items?: readonly StackId[];
  probe?: string;
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
  /** Bônus por unidade entregue (a Guilda paga o valor de cada espólio: `SELL_PRICE`). */
  bonusPerItem?: Readonly<Partial<Record<string, number>>>;
  /** Conversa ao oferecer (a pergunta `prompt` vem depois, com Aceitar/Agora não) e ao aceitar. */
  offer: string;
  prompt: string;
  accepted: string;
  /** Em andamento / na entrega. */
  progress: string;
  complete: string;
}

/** Espólios de monstro que a Guilda compra (sem a Moeda de Cobre). */
const LOOT_FOR_SALE: readonly StackId[] = [Item.SILK, Item.FANG, Item.WOLF_FANG, Item.WOLF_PELT, Item.QUEEN_HEART];
const placed = (blocks: readonly number[]): ((e: MissionEvent) => boolean) => (e) => e.type === 'place' && blocks.includes(e.block);
const near = (spot: 'goblin-camp'): ((e: MissionEvent) => boolean) => (e) => e.type === 'near' && e.spot === spot;
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
  {
    id: 'm04', chapter: 1, title: 'O valor de uma aventura', kind: 'Economia', turnIn: 'guild',
    goals: [{ id: 'loot', text: 'Juntar espólios de monstros', count: 5, kind: 'have', items: LOOT_FOR_SALE }],
    reward: { coins: 10 },
    bonusPerItem: SELL_PRICE,
    offer: 'A guilda compra o que os monstros deixam: seda de aranha, presas e pelagem de lobo. Isso tem valor, e voltar à cidade com a mochila cheia pode ser lucrativo. Traga 5 itens de criaturas derrotadas: eu pago 10 moedas pelo contrato e mais o valor de cada item entregue.',
    prompt: 'Aceita levar espólios para a guilda?',
    accepted: 'Combinado. Derrote criaturas fora da muralha e junte 5 espólios (seda, presas, pelagem…). Quando tiver, volte aqui: pago o contrato e cada item.',
    progress: 'Ainda faltam espólios de monstros: o contrato pede 5 itens (seda, presas, pelagem de lobo). Traga quando tiver.',
    complete: 'Ótimos espólios! Isso rende bom dinheiro. Aqui estão as moedas do contrato e o valor de cada item que você trouxe.',
  },
  {
    id: 'm05', chapter: 1, title: 'A floresta das teias', kind: 'Caçada', turnIn: 'guild',
    goals: [
      { id: 'small', text: 'Derrotar aranhas pequenas', count: 4, kind: 'event', match: kills(['spider-small']) },
      { id: 'big', text: 'Derrotar uma aranha grande', count: 1, kind: 'event', match: kills(['spider-big']) },
    ],
    reward: { coins: 22 },
    offer: 'As aranhas estão se multiplicando na floresta e nas cavernas. O contrato pede 4 aranhas pequenas e 1 grande. As grandes mordem forte e aguentam mais golpes: leve vida cheia e uma boa arma.',
    prompt: 'Aceita caçar as aranhas?',
    accepted: 'Contrato aceito. Derrote 4 aranhas pequenas e 1 grande e volte aqui. Cuidado com as teias!',
    progress: 'As aranhas ainda não foram contidas: faltam as 4 pequenas e a grande do contrato. Volte quando terminar.',
    complete: 'As teias vão dar uma trégua à cidade. Excelente trabalho! Aqui está o seu pagamento.',
  },
  {
    id: 'm06', chapter: 1, title: 'Protegendo nossas terras', kind: 'Construção', turnIn: 'guild',
    goals: [
      { id: 'fence', text: 'Construir trechos de cerca', count: 6, kind: 'event', match: placed([Block.FENCE, Block.FENCE_BIRCH, Block.FENCE_CHERRY]) },
      { id: 'gate', text: 'Construir uma porteira', count: 1, kind: 'event', match: placed([Block.FENCE_GATE, Block.FENCE_GATE_BIRCH, Block.FENCE_GATE_CHERRY]) },
    ],
    reward: { coins: 25 },
    offer: 'Os moradores querem reforçar uma área perto da cidade para proteger as plantações. Preciso de 6 trechos de cerca e 1 porteira de madeira, construídos por você. Faça as tábuas, monte as peças fora da muralha e me avise.',
    prompt: 'Aceita construir a cerca?',
    accepted: 'Ótimo. Construa 6 trechos de cerca e 1 porteira fora da muralha (cercas e porteiras se fazem com tábuas). Depois volte aqui.',
    progress: 'A cerca ainda não está pronta: faltam trechos e a porteira. Construa fora da muralha e volte.',
    complete: 'Agora sim, as terras estão protegidas! A porteira ficou ótima. Aqui está o seu pagamento.',
  },
  {
    id: 'm07', chapter: 1, title: 'Terra para o futuro', kind: 'Preparação do terreno', turnIn: 'guild',
    goals: [{ id: 'soil', text: 'Arar terra no terreno marcado', count: 12, kind: 'probe', probe: 'plot-tilled' }],
    reward: { coins: 18 },
    offer: 'A cidade precisa ampliar a área de produção. Marquei um terreno perto do portão, com um contorno dourado no chão: preciso que você prepare 12 blocos de terra arada ali. Use a enxada, que vira a grama em terra pronta para plantar.',
    prompt: 'Aceita preparar o terreno?',
    accepted: 'Combinado! O terreno está marcado com um contorno dourado perto do portão. Ara 12 blocos ali com a enxada e volte.',
    progress: 'O terreno marcado ainda não tem 12 blocos de terra arada. Use a enxada dentro do contorno dourado.',
    complete: 'Terra boa e pronta para o futuro! A cidade agradece. Aqui está o seu pagamento.',
  },
  {
    id: 'm08', chapter: 1, title: 'Movimento nas margens', kind: 'Caçada', turnIn: 'guild',
    goals: [{ id: 'lizard', text: 'Derrotar homens-lagarto', count: 4, kind: 'event', match: kills(['lizard']) }],
    reward: { coins: 30 },
    offer: 'Pescadores e viajantes veem vultos nas margens dos rios: homens-lagarto, em grupos de três ou mais. São mais rápidos e resistentes que lobos. O contrato pede 4 deles. Vá preparado: leve armadura, comida e uma boa arma.',
    prompt: 'Aceita caçar os homens-lagarto?',
    accepted: 'Contrato aceito. Procure os homens-lagarto perto dos rios, derrote 4 e volte aqui. Eles andam em grupo: não se arrisque sozinho com pouca vida.',
    progress: 'Ainda restam homens-lagarto nas margens: o contrato pede 4. Eles ficam perto dos rios, em grupo.',
    complete: 'Quatro a menos! As margens ficam mais tranquilas. Aqui está o seu pagamento.',
  },
  {
    id: 'm09', chapter: 1, title: 'A fogueira dos goblins', kind: 'Exploração', turnIn: 'guild',
    goals: [
      { id: 'camp', text: 'Encontrar um acampamento de goblins', count: 1, kind: 'event', match: near('goblin-camp') },
      { id: 'goblin', text: 'Derrotar goblins do acampamento', count: 2, kind: 'event', match: kills(['goblin']) },
    ],
    reward: { coins: 35 },
    offer: 'Há fumaça de fogueira fora da muralha: goblins acamparam por perto, e em número. Preciso que você ache a fogueira, derrube 2 deles para medir a força do bando e me conte o que viu. Sem heroísmos: são sete em volta do fogo.',
    prompt: 'Aceita investigar o acampamento?',
    accepted: 'Procure a fogueira dos goblins fora da muralha, derrote 2 goblins e volte aqui para me contar.',
    progress: 'Ainda falta investigar o acampamento: ache a fogueira dos goblins e derrote 2 deles. Depois me conte.',
    complete: 'Então são mesmo sete, e organizados. Bom relatório e bom trabalho. Aqui está o seu pagamento.',
  },
  {
    id: 'm10', chapter: 1, title: 'A ameaça à Cidade do Despertar', kind: 'Missão final', turnIn: 'guild',
    goals: [{ id: 'goblin', text: 'Derrotar os goblins restantes', count: 5, kind: 'event', match: kills(['goblin']) }],
    reward: { coins: 60 },
    offer: 'Agora que sabemos a força deles, é hora de acabar com a ameaça. Restam 5 goblins no acampamento. Leve tudo o que tiver: armas, comida, vida cheia. A cidade inteira confia em você.',
    prompt: 'Aceita enfrentar os goblins restantes?',
    accepted: 'Que a sorte acompanhe você. Derrote os 5 goblins restantes e volte aqui.',
    progress: 'A ameaça ainda não acabou: faltam 5 goblins. Volte quando o acampamento estiver limpo.',
    complete: 'Conseguiu! A Cidade do Despertar está a salvo, e a guilda reconhece o seu nome: de desconhecida a heroína da cidade. Aqui está o seu pagamento. Mas guarde as armas com carinho: dizem que isso era só o começo, e há um mistério maior por trás desses goblins…',
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
export function goalsOf(m: Mission, log: MissionLog, count: (id: StackId) => number, probe: (key: string) => number = () => 0): Array<{ goal: Goal; have: number; done: boolean }> {
  return m.goals.map((goal) => {
    const raw = goal.kind === 'have' ? (goal.items ?? []).reduce((n, id) => n + count(id), 0) : goal.kind === 'probe' ? probe(goal.probe ?? '') : log.progress[goal.id] ?? 0;
    const have = Math.min(goal.count, raw);
    return { goal, have, done: have >= goal.count };
  });
}

export function isReady(m: Mission, log: MissionLog, count: (id: StackId) => number, probe?: (key: string) => number): boolean {
  return goalsOf(m, log, count, probe).every((g) => g.done);
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
export function complete(
  log: MissionLog, m: Mission, count: (id: StackId) => number, take: (id: StackId, n: number) => boolean,
  /** Recebe o que foi entregue (para o bônus por item). */
  taken?: Array<[StackId, number]>, probe?: (key: string) => number,
): boolean {
  if (log.active !== m.id || !isReady(m, log, count, probe)) return false;
  for (const g of m.goals) {
    if (g.kind !== 'have') continue;
    let left = g.count;
    for (const id of g.items ?? []) {
      const n = Math.min(left, count(id));
      if (n > 0 && take(id, n)) { left -= n; taken?.push([id, n]); }
      if (left === 0) break;
    }
  }
  log.done.push(m.id);
  log.active = null;
  log.progress = {};
  return true;
}

/** Sinal sobre a cabeça: ! em quem oferece a próxima missão, ? azulado em quem a receberá (em andamento) e ? dourado quando pronta. Chave = NPC (`guild` ou id). */
export function marksOf(log: MissionLog, count: (id: StackId) => number, probe?: (key: string) => number): Record<string, 'offer' | 'progress' | 'ready'> {
  const m = missionOf(log.active);
  if (m) return { [m.turnIn]: isReady(m, log, count, probe) ? 'ready' : 'progress' };
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

/** Moedas do bônus por item entregue (`bonusPerItem`) para o que foi realmente tirado. */
export function bonusFor(m: Mission, taken: ReadonlyArray<readonly [StackId, number]>): number {
  if (!m.bonusPerItem) return 0;
  return taken.reduce((sum, [id, n]) => sum + (m.bonusPerItem![id as ItemId] ?? 0) * n, 0);
}

export const COIN: StackId = Item.COPPER_COIN;
