import type { MonsterKind } from './dungeon';
import type { ToolId } from './items';

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
