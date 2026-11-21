import { describe, expect, it } from 'vitest';
import { creatureSpecs } from './creature';
import { GENERATOR_VERSION, TitanGenerator } from './generator';

/** Gerador v13 (ADR 0086): o cultivo assume a Haste Seca e a primeira Noz fica sem guarda. */
const SEEDS = [1, 2, 7, 42, 99, 150, 300, 512]; // cada geração faz uma busca a pé completa: poucas seeds, tempo folgado
const dist = (a: { x: number; z: number }, b: { x: number; z: number }): number => Math.hypot(a.x - b.x, a.z - b.z);

describe('gerador v13', () => {
  it('é a versão atual e só muda as hastes secas e os animais (a v12 segue igual)', () => {
    expect(GENERATOR_VERSION).toBe(13);
    for (const seed of SEEDS) {
      const a = new TitanGenerator(seed, 12), b = new TitanGenerator(seed, 13);
      expect(b.nutPlants).toEqual(a.nutPlants); expect(b.reeds).toEqual(a.reeds); expect(b.arrival).toEqual(a.arrival); expect(b.den).toEqual(a.den);
      expect(b.blockAt(a.arrival.x, a.arrival.y - 1, a.arrival.z)).toBe(a.blockAt(a.arrival.x, a.arrival.y - 1, a.arrival.z));
    }
  }, 60000);
  it('hastes secas: ficam as 2 avulsas mais próximas da chegada (as mesmas da v12), ordenadas por distância', () => {
    for (const seed of SEEDS) {
      const v12 = new TitanGenerator(seed, 12), v13 = new TitanGenerator(seed, 13), a = v13.arrival;
      expect(v13.dryReeds.length).toBe(Math.min(2, v12.dryReeds.length));
      const nearest = [...v12.dryReeds].sort((p, q) => dist(p, a) - dist(q, a) || p.x - q.x || p.z - q.z).slice(0, 2);
      expect(v13.dryReeds.map((d) => d.id)).toEqual(nearest.map((d) => d.id));
      expect(new TitanGenerator(seed, 13).dryReeds).toEqual(v13.dryReeds); // determinístico
    }
    expect(new TitanGenerator(42, 13).dryReeds.length).toBeGreaterThanOrEqual(1);
  }, 60000);
  it('a Noz mais próxima da chegada fica sem Farejador; as outras plantas seguem guardadas', () => {
    for (const seed of SEEDS) {
      const g = new TitanGenerator(seed, 13), a = g.arrival, plants = g.nutPlants;
      if (plants.length < 2) continue;
      let free = 0; plants.forEach((p, i) => { if (dist(p, a) < dist(plants[free], a)) free = i; });
      const ids = creatureSpecs(g).map((s) => s.id), v12 = creatureSpecs(new TitanGenerator(seed, 12)).map((s) => s.id);
      expect(v12).toContain(`p${free}`); expect(ids).not.toContain(`p${free}`); // o pequeno da planta livre sai
      for (let i = 0; i < plants.length; i++) if (i !== free) expect(ids, `seed ${seed} planta ${i}`).toContain(`p${i}`); // as demais mantêm o pequeno
      const grandes = creatureSpecs(g).filter((s) => s.kind === 'grande' && s.id !== 'g0');
      for (const s of grandes) expect(dist(s, plants[free]) > 0.5 || plants.length === 1).toBe(true); // nenhum grande foi dado à planta livre
    }
  }, 60000);
  it('a v12 não muda: um pequeno por planta, inclusive a mais próxima da chegada', () => {
    const g = new TitanGenerator(42, 12), ids = creatureSpecs(g).map((s) => s.id);
    g.nutPlants.forEach((_, i) => expect(ids).toContain(`p${i}`));
    expect(g.dryReeds.length).toBeGreaterThan(2);
  });
});
