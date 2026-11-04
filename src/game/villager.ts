import type { World } from '../world/world';
import { hash2 } from '../world/random';
import type { Blocker } from './walker';
import { Wanderer } from './wanderer';

/** Personagens-base dos moradores (roupa branca; arte `villager-<id>`). */
export const VILLAGER_BASES = ['blond', 'brown', 'black', 'silver', 'red'] as const;
export type VillagerBase = (typeof VILLAGER_BASES)[number];
/**
 * Roupas vestidas por cima (arte `outfit-<id>`, mesma grade). Roupa nova: folha + id aqui + import no pacote de arte.
 * `CASUAL_OUTFITS` entram no sorteio dos moradores; as de ofício (ferreiro) vestem só quem tem aquele ofício.
 */
export const CASUAL_OUTFITS = ['denim', 'varsity', 'farmer', 'vest', 'hoodie'] as const;
export const OUTFITS = [...CASUAL_OUTFITS, 'smith'] as const;
export type OutfitId = (typeof OUTFITS)[number];

/**
 * Expressões (rosto em camada sobre o personagem-base, `scripts/extract-villagers.py`): ordem das folhas do dono do
 * produto, linha a linha. Costas não têm rosto.
 */
export const EXPRESSIONS = ['calm', 'happy', 'smile', 'laugh', 'surprised', 'wink', 'content', 'excited',
  'sad', 'scared', 'angry', 'smug', 'guffaw', 'neutral', 'shy', 'sleepy'] as const;
export type ExpressionId = (typeof EXPRESSIONS)[number];
/** Expressões com efeito fora do rosto (zzz, veia de raiva, tracinhos de susto): camada extra por cima do cabelo. */
export const EXPRESSION_FX: ExpressionId[] = ['scared', 'angry', 'sleepy'];
/** Expressão de repouso sorteada para os moradores comuns (as tranquilas). */
const RESTING: ExpressionId[] = ['calm', 'happy', 'smile', 'content', 'smug', 'neutral', 'shy'];
/** Ao conversar, por alguns segundos (os de ofício e os comuns reagem diferente). */
const TALKING: ExpressionId[] = ['laugh', 'excited', 'wink', 'guffaw'];
const TALK_SECONDS = 3;

/** Ofícios com morador próprio. */
export type VillagerRole = 'smith';
const ROLE_NAME: Record<VillagerRole, string> = { smith: 'Ferreiro' };
/**
 * Visual de cada ofício — **único** (regra do dono do produto): o personagem-base e a roupa de um ofício não aparecem em
 * mais ninguém. Ferreiro = cabelo preto + roupa de ferreiro.
 */
export const ROLE_LOOK: Record<VillagerRole, { base: VillagerBase; outfit: OutfitId; expression: ExpressionId }> = {
  smith: { base: 'black', outfit: 'smith', expression: 'smile' },
};
/** Personagens-base livres para os moradores comuns (sem os reservados aos ofícios). */
export const TOWNSFOLK_BASES: VillagerBase[] = VILLAGER_BASES.filter((b) => !Object.values(ROLE_LOOK).some((l) => l.base === b));
const ROLE_LINE: Record<VillagerRole, string> = {
  smith: 'Bem-vinda à Ferraria! Logo vou forjar ferramentas e armas para você.',
};
/** Dicas dos moradores (conteúdo; vira diálogo de verdade com NPCs/missões). */
const VILLAGER_LINES = [
  'Bem-vinda à Cidade do Despertar! Aqui dentro da muralha nada se quebra.',
  'Dizem que há aranhas numa caverna lá fora. Leve a espada!',
  'O ferreiro trabalha dentro da Ferraria. Entre pela porta.',
  'Uma tenda armada lá fora vira seu ponto de renascer.',
];

/**
 * Morador da Cidade do Despertar: passeia pelas ruas e praças perto de casa e **nunca sai delas** (a caixa dos pés
 * só entra em células que `onStreet` aceita — a cidade decide; ver `Entities.spawnVillagers`). Visual = base + roupa.
 */
export class Villager extends Wanderer {
  constructor(
    x: number,
    y: number,
    readonly base: VillagerBase,
    readonly outfit: OutfitId,
    private readonly onStreet: (cx: number, cy: number) => boolean,
    rand: () => number = Math.random,
    /** Ofício (fala própria); sem ofício = morador. */
    readonly role: VillagerRole | null = null,
    /** Expressão de repouso (rosto em camada). */
    readonly resting: ExpressionId = 'calm',
  ) {
    super(x, y, { speed: 1.4, halfW: 0.26, halfD: 0.14, stepHeight: 0 }, x, y, rand, { idle: [2, 7], walk: [1, 3], leash: role ? 3 : 6 });
  }

  /** Expressão de agora: a de repouso, ou a da conversa por alguns segundos depois de falar. */
  private talking: ExpressionId | null = null;
  private talkTimer = 0;
  get expression(): ExpressionId {
    return this.talking ?? this.resting;
  }

  /** O que diz ao ser tocado: ofício tem fala própria; moradores revezam dicas (na ordem). Reage com o rosto. */
  private said = 0;
  speak(): string {
    this.talking = TALKING[(this.said + VILLAGER_BASES.indexOf(this.base)) % TALKING.length];
    this.talkTimer = TALK_SECONDS;
    if (this.role) return `${ROLE_NAME[this.role]}: “${ROLE_LINE[this.role]}”`;
    const line = VILLAGER_LINES[(this.said++ + VILLAGER_BASES.indexOf(this.base)) % VILLAGER_LINES.length];
    return `Morador: “${line}”`;
  }

  /** A caixa dos pés inteira fica em rua/praça? */
  allowedAt(x: number, y: number): boolean {
    const { halfW, halfD } = this.spec;
    for (let cy = Math.floor(y - halfD); cy <= Math.floor(y + halfD); cy++) {
      for (let cx = Math.floor(x - halfW); cx <= Math.floor(x + halfW); cx++) if (!this.onStreet(cx, cy)) return false;
    }
    return true;
  }

  update(dt: number, world: World, blocked?: Blocker): void {
    if (this.talking && (this.talkTimer -= dt) <= 0) this.talking = null;
    this.wander(dt, world, (self, x, y) => !this.allowedAt(x, y) || !!blocked?.(self, x, y));
  }
}

/** Roupa de cada morador: sorteio fixo pela seed do mundo (a cidade é igual em toda seed; as roupas variam). */
export function villagerOutfit(seed: number, i: number): OutfitId {
  return CASUAL_OUTFITS[Math.floor(hash2(seed, i, 913) * CASUAL_OUTFITS.length)];
}

/** Expressão de repouso de cada morador comum: sorteio fixo pela seed. */
export function villagerExpression(seed: number, i: number): ExpressionId {
  return RESTING[Math.floor(hash2(seed, i, 917) * RESTING.length)];
}
