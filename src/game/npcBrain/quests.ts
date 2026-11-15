/**
 * Missões dos NPCs (ADR 0034, primeira do nível 4): um morador que pede algo, explica o motivo, **acompanha a jogadora** enquanto ela procura e
 * paga a recompensa na entrega. Puro e sem DOM; o estado vai no **salvamento do jogador** (`SaveData.quests`), não na sala do servidor.
 * Hoje há uma: **Ervas de cura** (Silvano pede 6 flores silvestres para o remédio de uma criança da cidade).
 */
import { Block } from '../../world/blocks';
import { blockStack, Item, type StackId } from '../../world/items';
import type { NpcId } from '../npcs';

export type QuestId = 'ervas-de-cura';
/** Fase da missão para quem olha (`available` e `ready` são derivadas; só `active` e `done` são salvas). */
export type QuestPhase = 'available' | 'active' | 'ready' | 'done';
/** Sinal sobre a cabeça do NPC: ! oferece, ? em andamento, ? dourado = pronta para entregar. */
export type QuestMark = 'offer' | 'progress' | 'ready';

export interface QuestDef {
  id: QuestId;
  giver: NpcId;
  title: string;
  /** O que a jogadora precisa trazer. */
  item: StackId;
  count: number;
  reward: { item: StackId; count: number };
  /** Explicação (conversa em páginas) e a pergunta final com as duas escolhas. */
  offer: string;
  prompt: string;
  accept: string;
  decline: string;
  /** Fala ao aceitar. */
  accepted: string;
  /** Em andamento (`have` = quantas já tem). */
  progress: (have: number) => string;
  /** Na entrega. */
  ready: string;
  /** Depois de concluída (fala única; depois ele volta às falas de sempre). */
  done: string;
  /** Comentários curtos do acompanhante ao ver uma flor por perto. */
  remarks: readonly string[];
}

export const HEALING_HERBS: QuestDef = {
  id: 'ervas-de-cura',
  giver: 'silvano',
  title: 'Ervas de cura',
  item: blockStack(Block.FLOWER),
  count: 6,
  reward: { item: Item.COPPER_COIN, count: 12 },
  offer: 'Preciso da sua ajuda! Uma criança aqui da cidade está de cama, e o remédio que sei fazer pede flores silvestres frescas. Preciso de 6 delas, daquelas que nascem na grama pelos campos e matas. Eu vou junto para ajudar a procurar!',
  prompt: 'Quer procurar as flores comigo?',
  accept: 'Aceitar',
  decline: 'Agora não',
  accepted: 'Que alívio! Vou com você. Quebre as flores que encontrar e, quando tiver as 6, é só falar comigo.',
  progress: (have) => `Já temos ${have} de 6 flores. Continue procurando pelos campos e pelas matas: elas nascem entre o capim.`,
  ready: 'Seis flores, e tão frescas! Com elas eu preparo o remédio agora mesmo. Aceite estas moedas pelo trabalho, e obrigado por tudo!',
  done: 'A criança já está de pé, correndo pela rua! Graças a você. Sempre que precisar de ervas, me procure.',
  remarks: ['Olha só, uma florzinha ali!', 'Aquela flor serve para o remédio.', 'Mais uma flor por perto, está vendo?'],
};

export const QUESTS: readonly QuestDef[] = [HEALING_HERBS];

export function questOf(npc: NpcId): QuestDef | null {
  return QUESTS.find((q) => q.giver === npc) ?? null;
}

/** Estado salvo: só o que não se deduz do inventário. */
export type QuestLog = Partial<Record<QuestId, 'active' | 'done'>>;

export function phaseOf(log: QuestLog, def: QuestDef, have: number): QuestPhase {
  const s = log[def.id];
  if (s === 'done') return 'done';
  if (s === 'active') return have >= def.count ? 'ready' : 'active';
  return 'available';
}

export function markOf(phase: QuestPhase): QuestMark | null {
  return phase === 'available' ? 'offer' : phase === 'active' ? 'progress' : phase === 'ready' ? 'ready' : null;
}

/** Valida o que veio do salvamento. */
export function sanitizeLog(raw: unknown): QuestLog {
  const out: QuestLog = {};
  if (!raw || typeof raw !== 'object') return out;
  const r = raw as Record<string, unknown>;
  for (const q of QUESTS) if (r[q.id] === 'active' || r[q.id] === 'done') out[q.id] = r[q.id] as 'active' | 'done';
  return out;
}
