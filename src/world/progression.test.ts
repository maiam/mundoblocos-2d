import { describe, expect, it } from 'vitest';
import { BASE_STATS, CRIT_MULTIPLIER, MONSTER_STATS, playerStats, rollDamage, weaponPower } from './progression';
import { mulberry32 } from './random';

describe('Progressão — vida e dano (Fase P, entrega 1)', () => {
  it('heroína começa com 100 de vida; espada bate mais que machado; sem arma não soma poder', () => {
    expect(playerStats(1)).toEqual(BASE_STATS);
    expect(BASE_STATS.maxHp).toBe(100);
    expect(weaponPower('sword')).toBeGreaterThan(weaponPower('axe'));
    expect(weaponPower(null)).toBe(0);
    expect(weaponPower('hoe')).toBe(0);
  });

  it('dano = ataque − defesa com ±10%, crítico ~5% (×1,5), nunca menos de 1', () => {
    const r = mulberry32(7);
    const n = 4000;
    let crits = 0;
    for (let i = 0; i < n; i++) {
      const h = rollDamage(20, 5, r); // base 15
      if (h.crit) {
        crits++;
        expect(h.amount).toBeGreaterThanOrEqual(Math.round(13.5 * CRIT_MULTIPLIER) - 1);
        expect(h.amount).toBeLessThanOrEqual(Math.round(16.5 * CRIT_MULTIPLIER) + 1);
      } else {
        expect(h.amount).toBeGreaterThanOrEqual(13);
        expect(h.amount).toBeLessThanOrEqual(17);
      }
    }
    expect(crits / n).toBeGreaterThan(0.03);
    expect(crits / n).toBeLessThan(0.07);
    expect(rollDamage(1, 50, r).amount).toBe(1);
  });

  it('mesmo sorteio → mesmo dano (determinístico com a semente)', () => {
    const a = mulberry32(3);
    const b = mulberry32(3);
    for (let i = 0; i < 50; i++) expect(rollDamage(17, 2, a)).toEqual(rollDamage(17, 2, b));
  });

  it('aranhas: Rainha mais forte que a grande, que é mais forte que a pequena', () => {
    const s = MONSTER_STATS;
    expect(s['spider-boss'].hp).toBeGreaterThan(s['spider-big'].hp);
    expect(s['spider-big'].hp).toBeGreaterThan(s['spider-small'].hp);
    expect(s['spider-boss'].attack).toBeGreaterThan(s['spider-big'].attack);
    // Espada derruba a pequena em ~2 golpes (como antes).
    const espada = BASE_STATS.attack + weaponPower('sword') - s['spider-small'].defense;
    expect(Math.ceil(s['spider-small'].hp / espada)).toBe(2);
  });
});
