/**
 * Vida, fome e ar do jogador (ADR 0059), no modelo do Minecraft: três contadores ligados. Sem DOM, sem aleatoriedade, testável em Node; `dt` em segundos.
 * Vida 0–20 (10 corações de 2 pontos; meio coração = 1); fome 0–20 + saturação 0–20 (nunca acima da fome) + exaustão 0–4; ar 0–15 s (10 bolhas de 1,5 s).
 *
 * **Fome desligada por enquanto** (`HUNGER_ENABLED = false`): o Titã ainda não tem comida, então a fome ficaria só caindo sem como se recuperar. Desligada, fome e saturação ficam
 * fixas em 20 e 5, a exaustão não corre e a vida regenera a 1 ponto por `REGEN_NO_FOOD_S` (provisório). Ligada, vale a regra do Minecraft (regeneração por fome ≥ 18, exaustão, inanição).
 */
export const HUNGER_ENABLED = false;
export const MAX_HEALTH = 20, MAX_HUNGER = 20, MAX_AIR = 15;
/** Sem comida no jogo: 1 ponto de vida a cada tanto (segundos). */
export const REGEN_NO_FOOD_S = 1.5;
/** Recuperação do ar: 15 s em 2 s fora d'água. */
export const AIR_RECOVERY_PER_S = MAX_AIR / 2;
/** Queda: dano = ⌈altura − 3⌉ pontos (quedas de até 3 blocos não machucam). */
export const SAFE_FALL = 3;

export interface PlayerVitals {
  health: number; maxHealth: number;
  hunger: number; maxHunger: number; saturation: number; exhaustion: number;
  air: number; maxAir: number;
  regenTimer: number; starveTimer: number; drownTimer: number;
}

export const newVitals = (): PlayerVitals => ({ health: MAX_HEALTH, maxHealth: MAX_HEALTH, hunger: MAX_HUNGER, maxHunger: MAX_HUNGER, saturation: 5, exhaustion: 0, air: MAX_AIR, maxAir: MAX_AIR, regenTimer: 0, starveTimer: 0, drownTimer: 0 });

export const isDead = (v: PlayerVitals): boolean => v.health <= 0;
/** Dano em pontos de vida (nunca abaixo de 0). */
export function damage(v: PlayerVitals, points: number): void { if (points > 0) v.health = Math.max(0, v.health - points); }
/** Dano de uma queda de `height` blocos: ⌈altura − 3⌉ (0 se ≤ 3). */
export const fallDamage = (height: number): number => (height > SAFE_FALL ? Math.ceil(height - SAFE_FALL - 1e-9) : 0);
/** Renasce: vida, fome e ar cheios, contadores zerados. */
export function revive(v: PlayerVitals): void { Object.assign(v, newVitals()); }

/** Um passo da simulação. `isHeadUnderwater` = olhos dentro do líquido. */
export function updatePlayerVitals(v: PlayerVitals, dt: number, isHeadUnderwater: boolean, hungerEnabled: boolean = HUNGER_ENABLED): void {
  if (dt <= 0) return;
  // 1. ar: 15 s de fôlego; sem ar, 2 pontos (1 coração) por segundo; fora d'água enche em 2 s
  if (isHeadUnderwater) {
    v.air = Math.max(0, v.air - dt);
    if (v.air === 0) {
      v.drownTimer += dt;
      while (v.drownTimer >= 1) { v.drownTimer -= 1; damage(v, 2); }
    }
  } else {
    v.drownTimer = 0;
    v.air = Math.min(v.maxAir, v.air + dt * AIR_RECOVERY_PER_S);
  }
  // 2. exaustão → saturação → fome (só com comida no jogo)
  if (hungerEnabled) {
    while (v.exhaustion >= 4) {
      v.exhaustion -= 4;
      if (v.saturation > 0) v.saturation = Math.max(0, v.saturation - 1);
      else if (v.hunger > 0) v.hunger = Math.max(0, v.hunger - 1);
    }
    v.saturation = Math.min(v.saturation, v.hunger);
  } else { v.hunger = v.maxHunger; v.saturation = 5; v.exhaustion = 0; }
  // 3. regeneração: fome ≥ 18 (regenerar custa exaustão); sem comida no jogo, ritmo fixo e grátis
  if (v.health > 0 && v.health < v.maxHealth && v.hunger >= 18) {
    const interval = !hungerEnabled ? REGEN_NO_FOOD_S : v.hunger === v.maxHunger && v.saturation > 0 ? 0.5 : 4;
    v.regenTimer += dt;
    while (v.regenTimer >= interval && v.health < v.maxHealth) {
      v.regenTimer -= interval;
      v.health = Math.min(v.maxHealth, v.health + 1);
      if (hungerEnabled) v.exhaustion += 6;
    }
  } else v.regenTimer = 0;
  // 4. inanição: fome 0 → 1 ponto a cada 4 s
  if (hungerEnabled && v.hunger === 0 && v.health > 0) {
    v.starveTimer += dt;
    while (v.starveTimer >= 4) { v.starveTimer -= 4; damage(v, 1); }
  } else v.starveTimer = 0;
}

/** Estado gravado no save (só o que precisa sobreviver à reabertura). */
export interface VitalsData { health: number; hunger: number; saturation: number; air: number }
export const vitalsToData = (v: PlayerVitals): VitalsData => ({ health: v.health, hunger: v.hunger, saturation: v.saturation, air: v.air });
/** Lê o gravado com limites; ausente ou estragado = tudo cheio. Vida 0 gravada (morreu e fechou) volta com 1 ponto: o jogo nunca abre morto. */
export function vitalsFromData(d: unknown): PlayerVitals {
  const v = newVitals();
  if (!d || typeof d !== 'object') return v;
  const o = d as Partial<VitalsData>;
  const num = (x: unknown, max: number, min = 0): number | null => (typeof x === 'number' && Number.isFinite(x) ? Math.min(max, Math.max(min, x)) : null);
  v.health = num(o.health, MAX_HEALTH, 1) ?? v.health;
  v.hunger = num(o.hunger, MAX_HUNGER) ?? v.hunger;
  v.saturation = Math.min(v.hunger, num(o.saturation, MAX_HUNGER) ?? v.saturation);
  v.air = num(o.air, MAX_AIR) ?? v.air;
  return v;
}
