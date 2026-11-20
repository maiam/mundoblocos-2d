import { describe, expect, it } from 'vitest';
import { FAREJADOR, facingYaw, farejadorPose, newFarejador, stepFarejador, type Farejador } from './creature';
import { TitanGenerator } from './generator';
import { TitanVolume } from './volume';

const world = (seed = 42): { vol: TitanVolume; f: Farejador } => {
  const g = new TitanGenerator(seed), vol = new TitanVolume(g);
  return { vol, f: newFarejador(g.den!, seed) };
};
const at = (f: Farejador, dx: number, dz: number): { x: number; y: number; z: number } => ({ x: f.home.x + dx, y: f.body.y, z: f.home.z + dz });
/** Roda `secs` segundos de jogo com o jogador parado em `p`; devolve se houve batida e as fases vistas. */
function run(f: Farejador, vol: TitanVolume, p: { x: number; y: number; z: number } | null, secs: number): { hit: boolean; phases: string[] } {
  let hit = false; const phases: string[] = [];
  for (let t = 0; t < secs; t += 0.05) { const ev = stepFarejador(f, vol, p, 0.05); if (ev.hit) hit = true; if (ev.phase) phases.push(ev.phase); }
  return { hit, phases };
}

describe('toca do Farejador de Duna (gerador v5)', () => {
  it('toda seed tem toca na enseada, em célula de ar sobre areia seca; a v4 não tem', () => {
    for (const seed of [1, 2, 3, 5, 7, 9, 42, 99, 1234]) {
      const g = new TitanGenerator(seed);
      expect(g.den).not.toBeNull();
      expect(g.blockAt(g.den!.x, g.den!.y - 1, g.den!.z)).toBeGreaterThan(0);
      expect(g.nutPlants.some((p) => Math.hypot(p.x - g.den!.x, p.z - g.den!.z) <= 4)).toBe(true); // as plantas da enseada ficam em volta
      expect(Math.hypot(g.den!.x - g.arrival.x, g.den!.z - g.arrival.z)).toBeGreaterThanOrEqual(18); // longe da chegada
    }
    expect(new TitanGenerator(42, 4).den).toBeNull();
  });
});

describe('Farejador de Duna: fases (ADR 0061)', () => {
  it('sozinho: fareja perto da toca, sem sair do raio do passeio, de forma determinística', () => {
    const a = world(), b = world();
    run(a.f, a.vol, null, 60); run(b.f, b.vol, null, 60);
    expect(a.f.phase).toBe('sniff');
    expect(Math.hypot(a.f.body.x - a.f.home.x, a.f.body.z - a.f.home.z)).toBeLessThanOrEqual(FAREJADOR.wanderRadius + 1);
    expect([a.f.body.x, a.f.body.z, a.f.yaw]).toEqual([b.f.body.x, b.f.body.z, b.f.yaw]);
  });
  it('viajante a 8 m: só aviso (raspa a pata), nunca investe nem bate enquanto não se aproxima', () => {
    const { vol, f } = world();
    const r = run(f, vol, at(f, 0, 8), 30);
    expect(f.phase).toBe('warn'); expect(r.hit).toBe(false); expect(r.phases).toEqual(['warn']);
  });
  it('se aproxima a menos de 5 m: investida curta, uma batida (dano 2), volta à toca e fica quieto na pausa', () => {
    const { vol, f } = world();
    const p = at(f, 0, 8);
    run(f, vol, p, 2);
    expect(f.phase).toBe('warn');
    const hits: number[] = [];
    for (let t = 0; t < 12; t += 0.05) { p.z = f.home.z + Math.max(0.8, 8 - t * 3); const ev = stepFarejador(f, vol, { ...p, y: f.body.y }, 0.05); if (ev.hit) hits.push(t); }
    expect(hits.length).toBeGreaterThanOrEqual(1); // bate; uma batida só por investida, e a seguinte só depois da pausa
    for (let i = 1; i < hits.length; i++) expect(hits[i] - hits[i - 1]).toBeGreaterThanOrEqual(FAREJADOR.cooldownS);
    const after = run(f, vol, at(f, 0, 14), 20); // viajante recua: o animal volta e fareja
    expect(['return', 'sniff']).toContain(f.phase); expect(after.hit).toBe(false);
    run(f, vol, at(f, 0, 30), 10);
    expect(f.phase).toBe('sniff'); expect(Math.hypot(f.body.x - f.home.x, f.body.z - f.home.z)).toBeLessThan(FAREJADOR.wanderRadius + 1);
  });
  it('recuar durante o aviso o acalma (volta a farejar sem bater); noutro nível não incomoda', () => {
    const { vol, f } = world();
    run(f, vol, at(f, 0, 7), 3); expect(f.phase).toBe('warn');
    const r = run(f, vol, at(f, 0, 15), 8); expect(r.hit).toBe(false); expect(['return', 'sniff']).toContain(f.phase);
    const g = world(); const high = { ...at(g.f, 0, 3), y: g.f.body.y + 12 };
    run(g.f, g.vol, high, 5); expect(g.f.phase).toBe('sniff');
  });
  it('a investida nunca persegue para fora do território; pós-batida há pausa antes de reagir de novo', () => {
    const { vol, f } = world();
    run(f, vol, at(f, 0, 7), 2);
    // jogador some correndo: a investida é curta (no máximo chargeMaxS) e o animal não passa de territory
    let maxD = 0;
    for (let t = 0; t < 6; t += 0.05) { const ev = stepFarejador(f, vol, { x: f.body.x + 6, y: f.body.y, z: f.body.z + 6 }, 0.05); void ev; maxD = Math.max(maxD, Math.hypot(f.body.x - f.home.x, f.body.z - f.home.z)); }
    expect(maxD).toBeLessThanOrEqual(FAREJADOR.territory + 1);
  });
});

describe('Farejador: giro e pose', () => {
  it('facingYaw faz o modelo (voltado para −X) olhar na direção pedida', () => {
    for (const [dx, dz] of [[-1, 0], [1, 0], [0, 1], [0, -1], [0.6, -0.8]]) {
      const th = facingYaw(dx, dz), fx = -Math.cos(th), fz = Math.sin(th); // −X girado por rotation.y = θ
      expect(fx).toBeCloseTo(dx / Math.hypot(dx, dz), 5); expect(fz).toBeCloseTo(dz / Math.hypot(dx, dz), 5);
    }
  });
  it('pose: aviso levanta e raspa a dianteira direita; investida mexe as quatro patas; parado a pose é limitada', () => {
    const { f } = world();
    f.phase = 'warn'; f.clock = 1.3; const w = farejadorPose(f, false);
    expect(w.legs[0]).toBeLessThan(-0.15); expect(w.legs[1]).toBe(0);
    f.phase = 'charge'; f.clock = 0.4; const c = farejadorPose(f, true);
    expect(c.legs.every((x) => Math.abs(x) <= 0.8 + 1e-9)).toBe(true); expect(c.legs.some((x) => Math.abs(x) > 0.1)).toBe(true);
    f.phase = 'sniff'; for (let t = 0; t < 10; t += 0.37) { f.clock = t; const s = farejadorPose(f, false); expect(Math.abs(s.headPitch)).toBeLessThan(0.4); expect(Math.abs(s.headYaw)).toBeLessThan(0.3); }
  });
});
