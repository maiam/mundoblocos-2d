import type { MonsterKind } from './dungeon';
import type { ItemId, ToolId } from './items';

/**
 * Progressão do personagem (Fase P) — fonte única das REGRAS NUMÉRICAS de vida e dano: atributos, poder das armas,
 * ficha dos monstros e a fórmula de dano. Função pura: o sorteio vem de fora (`rand`), sem DOM nem `Math.random`.
 * Entrega 1: atributos fixos do nível 1. Entrega 2 (nível e XP) faz `playerStats` crescer com o nível.
 */

export interface Stats {
  /** Vida máxima em pontos. */
  maxHp: number;
  /** Ataque base (somado ao poder da arma). */
  attack: number;
  /** Defesa: descontada do ataque de quem bate. */
  defense: number;
}

/** Atributos da heroína no nível 1. */
export const BASE_STATS: Stats = { maxHp: 100, attack: 5, defense: 2 };

/** Atributos da heroína no nível dado (por enquanto, sempre os do nível 1). */
export function playerStats(_level = 1): Stats {
  return { ...BASE_STATS };
}

/** Poder de cada ferramenta que golpeia (somado ao ataque). Espada é a arma; machado bate menos. */
export const WEAPON_POWER: Partial<Record<ToolId, number>> = { sword: 12, axe: 7 };

export function weaponPower(tool: ToolId | null): number {
  return (tool && WEAPON_POWER[tool]) ?? 0;
}

/** Ficha de combate dos monstros (vida em pontos, ataque e defesa). */
export const MONSTER_STATS: Record<MonsterKind, { hp: number; attack: number; defense: number }> = {
  'spider-small': { hp: 20, attack: 8, defense: 0 },
  'spider-big': { hp: 45, attack: 14, defense: 2 },
  'spider-boss': { hp: 180, attack: 36, defense: 6 },
  // Lobos (v0.91.0): mais fortes quanto mais claros; bando de 1 a 3.
  'wolf-brown': { hp: 35, attack: 11, defense: 1 },
  'wolf-gray': { hp: 45, attack: 13, defense: 2 },
  'wolf-white': { hp: 55, attack: 15, defense: 3 },
  /** Goblin comum: vida 60, ataque nominal 15, mesma fórmula dos lobos. */
  goblin: { hp: 60, attack: 15, defense: 2 },
  /** Homem-lagarto (v0.93.60): vida 100, ataque nominal 15 (dono do produto, 14/11/2026); defesa como a do goblin. */
  lizard: { hp: 100, attack: 15, defense: 2 },
};

/** Variação do dano (±10%), chance e multiplicador de crítico. */
export const DAMAGE_SPREAD = 0.1;
export const CRIT_CHANCE = 0.05;
export const CRIT_MULTIPLIER = 1.5;

export interface Hit {
  amount: number;
  crit: boolean;
}

/**
 * Dano de um golpe: (ataque − defesa, mínimo 1) com ±10% de variação e 5% de chance de crítico (×1,5).
 * Sempre pelo menos 1. `rand` devolve [0, 1).
 */
export function rollDamage(attack: number, defense: number, rand: () => number): Hit {
  const base = Math.max(1, attack - defense);
  const varied = base * (1 + (rand() * 2 - 1) * DAMAGE_SPREAD);
  const crit = rand() < CRIT_CHANCE;
  return { amount: Math.max(1, Math.round(varied * (crit ? CRIT_MULTIPLIER : 1))), crit };
}

/** Regeneração fora de combate: começa após `delay` s sem dano; recupera `fraction` da vida máxima a cada `every` s. */
export const REGEN = { delay: 6, every: 1.5, fraction: 0.05 } as const;

// ---------------------------------------------------------------------------------------------
// Fome (Fase P, entrega 4 — comida). Números do dono do produto: os alimentos têm pesos diferentes.
// ---------------------------------------------------------------------------------------------

/**
 * Fome: barra de 0 a `max` (cheia = satisfeita) que esvazia `perSecond` por segundo (~12 min de cheia a vazia). Abaixo
 * de `regenMin` a vida não se recupera sozinha; vazia, a fome tira `starveDamage` de vida a cada `starveEvery` s (sem
 * nunca derrubar: para em 1). Renascer volta com a fome cheia.
 */
export const HUNGER = { max: 100, perSecond: 100 / 720, regenMin: 30, starveEvery: 4, starveDamage: 2 } as const;

/**
 * Quanto cada alimento enche a barra de fome. Cru: maçã, cenoura, batata e tomate. Feitos no caldeirão (Cozinheiro):
 * pão (2 trigos) e macarrão ao molho (4 trigos + 2 tomates) — os pratos rendem mais do que os ingredientes crus.
 */
export const FOOD: Readonly<Partial<Record<ItemId, number>>> = {
  apple: 15,
  carrot: 12,
  potato: 10,
  tomato: 8,
  bread: 35,
  pasta_tomato: 70,
  milk: 10,
  cheese: 25,
  apple_pie: 60,
};

/** Quanto o item enche a fome (0 = não é comida). */
export function foodValue(id: ItemId): number {
  return FOOD[id] ?? 0;
}
