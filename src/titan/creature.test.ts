import { describe, expect, it } from 'vitest';
import { FAREJADOR, facingYaw, farejadorPose, KINDS, newFarejador, newPack, stepFarejador, type Farejador, type Kind } from './creature';
import { TitanGenerator } from './generator';
import { TitanVolume } from './volume';

const world = (kind: Kind = 'grande', seed = 42): { vol: TitanVolume; f: Farejador } => {
  const g = new TitanGenerator(seed), vol = new TitanVolume(g);
  return { vol, f: newFarejador(kind, g.den!, seed) };
};
const at = (f: Farejador, dx: number, dz: number, dy = 0): { x: number; y: number; z: number } => ({ x: f.home.x + dx, y: f.body.y + dy, z: f.home.z + dz });
interface Run { hits: Array<{ t: number; damage: number }>; phases: string[] }
/** Roda `secs` s de jogo; `player` pode ser uma função do tempo e do animal. */
function run(f: Farejador, vol: TitanVolume, player: ((t: number) => { x: number; y: number; z: number } | null) | { x: number; y: number; z: number } | null, secs: number): Run {
  const r: Run = { hits: [], phases: [] };
  for (let t = 0; t < secs; t += 0.05) {
    const p = typeof player === 'function' ? player(t) : player;
    const ev = stepFarejador(f, vol, p, 0.05);
    if (ev.hit) r.hits.push({ t, damage: ev.damage });
    if (ev.phase) r.phases.push(ev.phase);
  }
  return r;
}

describe('toca e bando (gerador v5)', () => {
  it('toda seed tem toca na enseada, em célula de ar sobre areia seca, longe da chegada; a v4 não tem', () => {
    for (const seed of [1, 2, 3, 5, 7, 9, 42, 99, 1234]) {
      const g = new TitanGenerator(seed);
      expect(g.den).not.toBeNull();
      expect(g.blockAt(g.den!.x, g.den!.y - 1, g.den!.z)).toBeGreaterThan(0);
      expect(g.nutPlants.some((p) => Math.hypot(p.x - g.den!.x, p.z - g.den!.z) <= 4)).toBe(true);
      expect(Math.hypot(g.den!.x - g.arrival.x, g.den!.z - g.arrival.z)).toBeGreaterThanOrEqual(18);
    }
    expect(new TitanGenerator(42, 4).den).toBeNull();
  });
  it('o bando é um grande (1,3×) e um pequeno (0,5×); o pequeno dá menos dano que o grande', () => {
    const g = new TitanGenerator(42), pack = newPack(g.den!, 42);
    expect(pack.map((f) => f.kind)).toEqual(['grande', 'pequeno']);
    expect(KINDS.grande.scale).toBe(1.3); expect(KINDS.pequeno.scale).toBe(0.5);
    expect(KINDS.pequeno.damage).toBeLessThan(KINDS.grande.damage);
    expect(pack[0].seed).not.toBe(pack[1].seed); // passeios diferentes
  });
});

describe('Farejador: passeio, investida e atordoamento (ADR 0061)', () => {
  it('sozinho, passeia em volta da toca sem sair do raio, de forma determinística', () => {
    const a = world(), b = world();
    run(a.f, a.vol, null, 90); run(b.f, b.vol, null, 90);
    expect(a.f.phase).toBe('wander');
    expect(Math.hypot(a.f.body.x - a.f.home.x, a.f.body.z - a.f.home.z)).toBeLessThanOrEqual(FAREJADOR.wanderRadius + 1);
    expect([a.f.body.x, a.f.body.z, a.f.yaw]).toEqual([b.f.body.x, b.f.body.z, b.f.yaw]);
    expect(Math.hypot(a.f.body.x - a.f.home.x, a.f.body.z - a.f.home.z)).toBeGreaterThan(0); // andou
  });
  it('ao avistar o viajante investe; ao bater cai de costas, fica 2 s parado (sem andar) e só depois investe de novo', () => {
    for (const kind of ['pequeno', 'grande'] as const) {
      const { vol, f } = world(kind);
      const p = at(f, 0, KINDS[kind].sight - 1);
      let hitAt = -1, resumedAt = -1, bx = 0, bz = 0, still = true, firstPhase = '';
      for (let t = 0; t < 8; t += 0.05) {
        const ev = stepFarejador(f, vol, p, 0.05);
        if (ev.phase && !firstPhase) firstPhase = ev.phase;
        if (ev.hit && hitAt < 0) { hitAt = t; bx = f.body.x; bz = f.body.z; expect(ev.damage).toBe(KINDS[kind].damage); }
        if (hitAt >= 0 && resumedAt < 0) {
          if (f.phase === 'stunned' && Math.hypot(f.body.x - bx, f.body.z - bz) > 0.05) still = false; // atordoado não anda
          if (f.phase === 'charge') resumedAt = t;
        }
      }
      expect(firstPhase).toBe('charge');
      expect(hitAt).toBeGreaterThanOrEqual(0); expect(still).toBe(true);
      expect(resumedAt).toBeGreaterThanOrEqual(0); expect(resumedAt - hitAt).toBeGreaterThanOrEqual(FAREJADOR.stunS - 0.06); // nova investida só depois dos 2 s
    }
  });
  it('viajante fora da visão (ou em outro nível) não é atacado; além do raio de perseguição da toca também não', () => {
    const { vol, f } = world('grande');
    expect(run(f, vol, at(f, 0, KINDS.grande.sight + 4), 20).phases).not.toContain('charge');
    const h = world('pequeno');
    expect(run(h.f, h.vol, at(h.f, 0, 3, 12), 10).phases).not.toContain('charge');
    const k = world('grande');
    expect(run(k.f, k.vol, at(k.f, 0, FAREJADOR.chaseRadius + 3), 10).phases).not.toContain('charge');
  });
  it('investida que erra (viajante sumiu) termina curta, com pausa antes de reagir, e o animal volta à toca', () => {
    const { vol, f } = world('grande');
    // o viajante aparece e foge de modo que a investida nunca o alcança
    const r = run(f, vol, (t) => (t < 2 ? at(f, 0, 10) : at(f, 0, 40)), 20);
    expect(r.hits).toHaveLength(0);
    expect(['return', 'wander']).toContain(f.phase);
    expect(Math.hypot(f.body.x - f.home.x, f.body.z - f.home.z)).toBeLessThan(FAREJADOR.wanderRadius + 1);
  });
});

describe('Farejador: giro e pose', () => {
  it('facingYaw faz o modelo (voltado para −X) olhar na direção pedida', () => {
    for (const [dx, dz] of [[-1, 0], [1, 0], [0, 1], [0, -1], [0.6, -0.8]]) {
      const th = facingYaw(dx, dz), fx = -Math.cos(th), fz = Math.sin(th);
      expect(fx).toBeCloseTo(dx / Math.hypot(dx, dz), 5); expect(fz).toBeCloseTo(dz / Math.hypot(dx, dz), 5);
    }
  });
  it('atordoado: cai de costas (rolagem π) em flipS, balança as patas e a cabeça, e se vira de volta no fim; investida mexe as quatro patas', () => {
    const { f } = world();
    f.phase = 'stunned';
    f.t = 0; f.clock = 0; expect(farejadorPose(f, false).roll).toBeCloseTo(0, 5);
    f.t = FAREJADOR.flipS; f.clock = 0.8; const mid = farejadorPose(f, false);
    expect(mid.roll).toBeCloseTo(Math.PI, 5); expect(mid.legs.some((x) => Math.abs(x) > 0.1)).toBe(true);
    f.t = 1; f.clock = 1.2; expect(farejadorPose(f, false).roll).toBeCloseTo(Math.PI, 5);
    f.t = FAREJADOR.stunS; expect(farejadorPose(f, false).roll).toBeCloseTo(0, 5);
    f.phase = 'charge'; f.clock = 0.4; const c = farejadorPose(f, true);
    expect(c.roll).toBe(0); expect(c.legs.every((x) => Math.abs(x) <= 0.8 + 1e-9)).toBe(true); expect(c.legs.some((x) => Math.abs(x) > 0.1)).toBe(true);
  });
});
