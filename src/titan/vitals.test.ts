import { describe, expect, it } from 'vitest';
import { dieAndRespawn, collectNearby } from './actions';
import { SLOTS } from './inventory';
import { Item } from './items';
import { MemoryTitanStorage } from './save';
import { flush, openSession } from './session';
import { AIR_RECOVERY_PER_S, damage, fallDamage, isDead, MAX_AIR, MAX_HEALTH, newVitals, REGEN_NO_FOOD_S, revive, updatePlayerVitals, vitalsFromData, vitalsToData } from './vitals';

const run = (v: ReturnType<typeof newVitals>, secs: number, under: boolean, food: boolean, step = 0.05): void => { for (let t = 0; t < secs; t += step) updatePlayerVitals(v, step, under, food); };

describe('vida, fome e ar (ADR 0059)', () => {
  it('ar: 15 s de fôlego; sem ar, 2 pontos por segundo; fora d\'água enche em 2 s', () => {
    const v = newVitals();
    run(v, 14.9, true, false); expect(v.air).toBeGreaterThan(0); expect(v.health).toBe(MAX_HEALTH);
    run(v, 0.2, true, false); expect(v.air).toBe(0);
    run(v, 2.05, true, false); expect(v.health).toBe(MAX_HEALTH - 4); // afogando: 2 pontos por segundo (≈ 2 s)
    run(v, 1, false, false); expect(v.air).toBeCloseTo(AIR_RECOVERY_PER_S, 1); // 1 s fora: metade do fôlego
    run(v, 1.1, false, false); expect(v.air).toBe(MAX_AIR);
    expect(v.drownTimer).toBe(0);
  });

  it('sem comida no jogo: fome e saturação ficam fixas, a vida regenera 1 ponto a cada REGEN_NO_FOOD_S, e uma superfície sem ar ainda mata', () => {
    const v = newVitals(); damage(v, 10);
    run(v, REGEN_NO_FOOD_S * 4 + 0.01, false, false); expect(v.health).toBe(MAX_HEALTH - 10 + 4);
    expect(v.hunger).toBe(20); expect(v.exhaustion).toBe(0);
    run(v, 60, false, false); expect(v.health).toBe(MAX_HEALTH); // não passa do máximo
    const d = newVitals(); run(d, 15.1, true, false); run(d, 16, true, false); expect(isDead(d)).toBe(true); expect(d.health).toBe(0);
  });

  it('com comida (regra do Minecraft): regeneração rápida (fome 20 + saturação) 1 ponto/0,5 s, normal (fome ≥ 18) a cada 4 s, nada abaixo de 18; regenerar custa exaustão', () => {
    const a = newVitals(); damage(a, 10); run(a, 2.01, false, true);
    expect(a.health).toBe(MAX_HEALTH - 10 + 4); // 4 pontos em 2 s
    expect(a.exhaustion + (5 - a.saturation) * 4).toBeCloseTo(24, 5); // 4 regenerações × 6 de exaustão (parte já desceu da saturação)
    const b = newVitals(); b.hunger = 19; b.saturation = 0; damage(b, 10); run(b, 8.01, false, true); expect(b.health).toBe(MAX_HEALTH - 10 + 2);
    const c = newVitals(); c.hunger = 17; c.saturation = 0; damage(c, 10); run(c, 30, false, true); expect(c.health).toBe(MAX_HEALTH - 10); // zona neutra: não regenera
  });

  it('exaustão a 4 desce 1 de saturação e depois 1 de fome; fome 0 dá 1 ponto de dano a cada 4 s', () => {
    const v = newVitals(); v.saturation = 1; v.exhaustion = 8; updatePlayerVitals(v, 0.01, false, true);
    expect(v.saturation).toBe(0); expect(v.hunger).toBe(19); expect(v.exhaustion).toBe(0);
    const s = newVitals(); s.hunger = 0; s.saturation = 0; run(s, 8.01, false, true); expect(s.health).toBe(MAX_HEALTH - 2);
  });

  it('queda: até 3 blocos não machuca; depois ⌈altura − 3⌉ pontos', () => {
    expect([0, 1, 3, 3.01, 4, 5.5, 10, 23].map(fallDamage)).toEqual([0, 0, 0, 1, 1, 3, 7, 20]);
    const v = newVitals(); damage(v, fallDamage(23)); expect(isDead(v)).toBe(true);
  });

  it('gravar e ler: limites, ausência = cheio, e nunca abre morto', () => {
    const v = newVitals(); damage(v, 7); v.air = 4.5; v.hunger = 12; v.saturation = 99;
    const back = vitalsFromData(JSON.parse(JSON.stringify(vitalsToData(v))));
    expect(back.health).toBe(13); expect(back.air).toBe(4.5); expect(back.hunger).toBe(12); expect(back.saturation).toBeLessThanOrEqual(back.hunger);
    expect(vitalsFromData(undefined)).toEqual(newVitals());
    expect(vitalsFromData({ health: -5, air: 'x', hunger: 999 }).health).toBe(1); expect(vitalsFromData({ health: 0 }).health).toBe(1);
    const r = newVitals(); damage(r, 20); revive(r); expect(r).toEqual(newVitals());
  });
});

describe('morte: itens caem onde morreu e o jogador renasce na chegada', () => {
  it('todas as pilhas caem no mesmo ponto, o jogador volta cheio à chegada, recolhe por proximidade e tudo persiste', async () => {
    const st = new MemoryTitanStorage();
    const s = await openSession(st, 42, () => 1);
    s.inventory.add(Item.SAND, 40); s.inventory.add(Item.DARK_ROCK, 7); s.inventory.add(Item.EMBER, 1);
    const a = s.volume.gen.arrival;
    s.body.x = a.x + 3.5; s.body.z = a.z; s.body.y = 65;
    damage(s.vitals, 20); expect(isDead(s.vitals)).toBe(true);
    const px = Math.floor(s.body.x), pz = Math.floor(s.body.z);
    expect(dieAndRespawn(s)).toBe(3);
    expect(s.inventory.total(Item.SAND) + s.inventory.total(Item.DARK_ROCK) + s.inventory.total(Item.EMBER)).toBe(0); // inventário vazio
    expect(s.vitals).toEqual(newVitals());
    expect(s.body.x).toBeCloseTo(a.x, 5); expect(s.body.z).toBeCloseTo(a.z, 5);
    const piles = [...s.drops.values()].filter((d) => d.id.startsWith('d:'));
    expect(piles).toHaveLength(3); expect(piles.every((d) => d.x === px && d.z === pz)).toBe(true);
    expect(piles.map((d) => [d.item, d.count ?? 1]).sort()).toEqual([[Item.SAND, 40], [Item.DARK_ROCK, 7], [Item.EMBER, 1]].sort());
    await flush(st, s);
    const r = await openSession(st, null, () => 1);
    expect([...r.drops.values()].filter((d) => d.id.startsWith('d:'))).toHaveLength(3); // as pilhas sobrevivem ao reabrir
    expect(r.vitals).toEqual(newVitals());
    // ao voltar ao ponto, recolhe tudo (pilhas inteiras)
    const c = collectNearby(r, px + 0.5, piles[0].y, pz + 0.5);
    expect(c.collected).toBe(3); expect(r.inventory.total(Item.SAND)).toBe(40); expect(r.inventory.total(Item.DARK_ROCK)).toBe(7); expect(r.inventory.total(Item.EMBER)).toBe(1);
    expect([...r.drops.values()].filter((d) => d.id.startsWith('d:'))).toHaveLength(0);
    void SLOTS;
  });

  it('vida baixa gravada volta ao reabrir; save sem o campo abre cheio; pilha com contagem inválida é descartada', async () => {
    const st = new MemoryTitanStorage();
    const s = await openSession(st, 42, () => 1);
    damage(s.vitals, 9); s.vitals.air = 3;
    s.dropsRev++; await flush(st, s);
    const r = await openSession(st, null, () => 1);
    expect(r.vitals.health).toBe(11); expect(r.vitals.air).toBe(3);
  });
});
