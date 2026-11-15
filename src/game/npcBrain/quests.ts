/**
 * Missões dos NPCs (ADR 0034, primeira do nível 4): um morador que pede algo, explica o motivo, **acompanha a jogadora** enquanto ela procura e
 * paga a recompensa na entrega. Puro e sem DOM; o estado vai no **salvamento do jogador** (`SaveData.quests`), não na sala do servidor.
 * Hoje há uma: **Ervas de cura** (Silvano pede 6 flores de UMA espécie, a do canteiro que a seed garante perto do portão, para o remédio de uma criança da cidade).
 */
import { blockDef } from '../../world/blocks';
import { blockStack, Item, type StackId } from '../../world/items';
import type { World } from '../../world/world';
import type { NpcId } from '../npcs';

export type QuestId = 'ervas-de-cura';
const QUEST_IDS: readonly QuestId[] = ['ervas-de-cura'];
/** Fase da missão para quem olha (`available` e `ready` são derivadas; só `active` e `done` são salvas). */
export type QuestPhase = 'available' | 'active' | 'ready' | 'done';
/** Sinal sobre a cabeça do NPC: ! oferece, ? em andamento, ? dourado = pronta para entregar. */
export type QuestMark = 'offer' | 'progress' | 'ready';

export interface QuestDef {
  id: QuestId;
  giver: NpcId;
  title: string;
  /** O que a jogadora precisa trazer: `count` unidades somando qualquer destas pilhas. */
  items: readonly StackId[];
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
  /** Comentários curtos do acompanhante ao ver a flor pedida por perto. */
  remarks: readonly string[];
  /** Ainda dá para oferecer (o canteiro tem flores o bastante)? Missão já aceita nunca é retirada. */
  offerable: () => boolean;
}

/** Pontos cardeais (8) de um vetor (dx, dy) do mapa (y cresce para o sul). */
export function compass(dx: number, dy: number): string {
  const names = ['leste', 'sudeste', 'sul', 'sudoeste', 'oeste', 'noroeste', 'norte', 'nordeste'];
  const a = Math.atan2(dy, dx); // 0 = leste, π/2 = sul
  return names[(Math.round(a / (Math.PI / 4)) + 8) % 8];
}

/**
 * "Ervas de cura" para esta seed: o Silvano pede **6 flores de UMA espécie** (a do canteiro que o mundo garante perto do portão, `World.flowerPatch`) e só ela
 * vale. O texto diz o nome da flor, para que lado do portão fica o canteiro e a quantos passos. null = o mundo não tem canteiro (Santuário etc.).
 */
export function healingHerbsFor(world: World): QuestDef | null {
  const patch = world.flowerPatch;
  if (!patch) return null;
  const name = blockDef(patch.species).name;
  const [gx, gy] = world.outsideGate();
  const cx = (patch.area.x0 + patch.area.x1) / 2, cy = (patch.area.y0 + patch.area.y1) / 2;
  const dir = compass(cx - gx, cy - gy);
  const steps = Math.max(5, Math.round(Math.hypot(cx - gx, cy - gy) / 5) * 5);
  const where = `num canteiro ao ${dir} do portão da cidade, a uns ${steps} passos`;
  return {
    id: 'ervas-de-cura',
    giver: 'silvano',
    title: 'Ervas de cura',
    items: [blockStack(patch.species)],
    count: 6,
    reward: { item: Item.COPPER_COIN, count: 12 },
    offer: `Preciso da sua ajuda! Uma criança aqui da cidade está de cama, e o remédio que sei fazer pede 6 ${name}. Só essa flor serve! Eu a vi ${where}. Vou junto para ajudar a procurar!`,
    prompt: 'Quer procurar as flores comigo?',
    accept: 'Aceitar',
    decline: 'Agora não',
    accepted: `Que alívio! Vou com você. São 6 ${name}: o canteiro fica ao ${dir} do portão. Quebre as flores e, quando tiver as 6, é só falar comigo.`,
    progress: (have) => `Já temos ${have} de 6 ${name}. Lembre: só ela serve, e o canteiro fica ao ${dir} do portão, a uns ${steps} passos.`,
    ready: `Seis ${name}, tão frescas! Com elas eu preparo o remédio agora mesmo. Aceite estas moedas pelo trabalho, e obrigado por tudo!`,
    done: 'A criança já está de pé, correndo pela rua! Graças a você. Sempre que precisar de ervas, me procure.',
    remarks: [`Olha só, uma ${name} ali!`, `Aquela ${name} serve para o remédio.`, `Mais uma ${name} por perto, está vendo?`],
    offerable: () => patch.cells.filter(([x, y]) => world.getObject(x, y) === patch.species).length >= 6,
  };
}

/** As missões deste mundo. */
export function questsFor(world: World): QuestDef[] {
  const q = healingHerbsFor(world);
  return q ? [q] : [];
}

export function questOf(quests: readonly QuestDef[], npc: NpcId): QuestDef | null {
  return quests.find((q) => q.giver === npc) ?? null;
}

/** Quantas unidades do pedido a jogadora tem (soma das pilhas aceitas). */
export function haveOf(def: QuestDef, count: (id: StackId) => number): number {
  return def.items.reduce((n, id) => n + count(id), 0);
}

/** Tira `def.count` unidades do pedido, pelas pilhas aceitas em ordem; devolve se tirou tudo (não tira nada se não tem o bastante). */
export function takeOf(def: QuestDef, count: (id: StackId) => number, take: (id: StackId, n: number) => boolean): boolean {
  if (haveOf(def, count) < def.count) return false;
  let left = def.count;
  for (const id of def.items) {
    const n = Math.min(left, count(id));
    if (n > 0 && take(id, n)) left -= n;
    if (left === 0) break;
  }
  return left === 0;
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
  for (const id of QUEST_IDS) if (r[id] === 'active' || r[id] === 'done') out[id] = r[id] as 'active' | 'done';
  return out;
}
