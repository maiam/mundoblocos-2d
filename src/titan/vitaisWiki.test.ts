import { describe, expect, it } from 'vitest';
import { addExhaustion, canSprint, EXHAUSTION, hurt, MAX_HEALTH, newVitals, SPRINT_MIN_HUNGER, updatePlayerVitals } from './vitals';

/** Vida e fome pelos valores da Minecraft Wiki (ADR 0130): exaustão por ação, corrida com fome > 6 e dano que cansa. */
describe('Exaustão da Wiki', () => {
  it('andar não custa; correr 0,1 por metro; pular 0,05 (correndo, 0,2); quebrar 0,005; atacar 0,1; levar dano 0,1', () => {
    expect(EXHAUSTION).toEqual({ walkPerBlock: 0, sprintPerBlock: 0.1, jump: 0.05, sprintJump: 0.2, breakBlock: 0.005, attack: 0.1, damageTaken: 0.1 });
  });
  it('1000 m andando não gastam fome; 100 m correndo gastam 10 de exaustão = 2,5 pontos', () => {
    const w = newVitals(); w.saturation = 0; addExhaustion(w, 1000 * EXHAUSTION.walkPerBlock, true); updatePlayerVitals(w, 0.01, false, true);
    expect(w.hunger).toBe(20); expect(w.exhaustion).toBe(0);
    const r = newVitals(); r.saturation = 0; addExhaustion(r, 100 * EXHAUSTION.sprintPerBlock, true); updatePlayerVitals(r, 0.01, false, true);
    expect(r.hunger).toBe(18); expect(r.exhaustion).toBeCloseTo(2, 5);
  });
  it('uma barra de saturação (5) aguenta ~200 m correndo antes de a fome descer', () => {
    const v = newVitals(); addExhaustion(v, 199 * EXHAUSTION.sprintPerBlock, true); updatePlayerVitals(v, 0.01, false, true);
    expect(v.hunger).toBe(20); addExhaustion(v, 5 * EXHAUSTION.sprintPerBlock, true); updatePlayerVitals(v, 0.01, false, true); expect(v.saturation).toBe(0);
  });
});

describe('Corrida e fome', () => {
  it('só corre com fome acima de 6 (com a fome ligada)', () => {
    expect(SPRINT_MIN_HUNGER).toBe(6);
    const v = newVitals();
    v.hunger = 7; expect(canSprint(v, true)).toBe(true);
    v.hunger = 6; expect(canSprint(v, true)).toBe(false);
    v.hunger = 0; expect(canSprint(v, true)).toBe(false);
    expect(canSprint(v, false)).toBe(true); // fome desligada (testes): sempre corre
  });
});

describe('Dano que cansa', () => {
  it('`hurt` tira vida e soma 0,1 de exaustão; `damage` sozinho (inanição, afogamento) não', () => {
    const v = newVitals(); hurt(v, 4, true); expect(v.health).toBe(MAX_HEALTH - 4); expect(v.exhaustion).toBeCloseTo(0.1, 5);
    const z = newVitals(); hurt(z, 0, true); expect(z.exhaustion).toBe(0); expect(z.health).toBe(MAX_HEALTH);
    const off = newVitals(); hurt(off, 2, false); expect(off.health).toBe(MAX_HEALTH - 2); expect(off.exhaustion).toBe(0);
  });
});
