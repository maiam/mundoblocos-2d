import { describe, expect, it } from 'vitest';
import { attackGrunho } from '../combat';
import { GRUNHO, grunhoAim, grunhoAlive, grunhoBox, grunhoPose, grunhoSpecs, hurtGrunho, newGrunho, newGrunhosFromSpecs, stepGrunho, type Grunho, type GrunhoCamp } from '../grunho';
import { HOTBAR, BAG } from '../inventory';
import { Item } from '../items';
import { MemoryTitanStorage } from '../save';
import { openSession } from '../session';
import { T } from '../voxel';
import { ORVALIS_GENERATOR_VERSION, OrvalisGenerator, orvalisGeneratorFor } from './generator';

/** Grunho Casca-Rachada (ADR 0147): vida 20, golpe 3 a cada 1,5 s, aviso a 12 m, coleira de 25 m na fogueira, volta em 10 min. */
const open = () => openSession(new MemoryTitanStorage(), 42, () => 1, orvalisGeneratorFor, ORVALIS_GENERATOR_VERSION, (s, v) => new OrvalisGenerator(s, v));
type S = Awaited<ReturnType<typeof open>>;
const hold = (s: S, item: number): void => { s.inventory.add(item, 1); const i = [...Array(HOTBAR + BAG).keys()].find((k) => s.inventory.get(k)?.item === item)!; s.selected = i; };

/** Uma arena plana de pedra (81 × 81, 3 de ar) em volta da chegada: devolve o centro e o nível dos pés. */
async function arena(): Promise<{ s: S; cx: number; cz: number; y: number }> {
  const s = await open(), v = s.volume, a = v.gen.arrival, cx = Math.floor(a.x), cz = Math.floor(a.z), y = a.y;
  for (let x = cx - 40; x <= cx + 40; x++) for (let z = cz - 40; z <= cz + 40; z++) { v.set(x, y - 1, z, T.STONE); for (let h = 0; h < 4; h++) v.set(x, y + h, z, T.AIR); }
  return { s, cx, cz, y };
}
const mk = (id: string, x: number, y: number, z: number, campX: number, campZ: number): Grunho => newGrunho({ id, x, y, z, campX, campZ }, 42);
const run = (g: Grunho, s: S, secs: number, targets: Array<{ id: string; x: number; y: number; z: number }>): number => { let hits = 0; for (let t = 0; t < secs; t += 0.05) hits += stepGrunho(g, s.volume, 0.05, targets).hits.length; return hits; };

describe('Grunho: geração e estado', () => {
  it('um goblin por lugar de cada acampamento, ids estáveis, olhando para a fogueira', () => {
    const camps: GrunhoCamp[] = [{ id: 'a', x: 10, y: 70, z: 10, slots: [{ x: 13, y: 70, z: 10 }, { x: 7, y: 70, z: 10 }] }, { id: 'b', x: 50, y: 70, z: 50, slots: [{ x: 50, y: 70, z: 53 }] }];
    const sp = grunhoSpecs({ camps });
    expect(sp.map((e) => e.id)).toEqual(['g:a:0', 'g:a:1', 'g:b:0']); expect(grunhoSpecs({})).toEqual([]);
    const gs = newGrunhosFromSpecs(sp, 42);
    expect(gs[0].hp).toBe(20); expect(gs[0].camp).toEqual({ x: 10.5, z: 10.5 }); expect(gs[0].phase).toBe('wander');
    expect(Math.round(Math.sin(gs[0].yaw))).toBe(1); // em x = 13 olha para −X: o modelo olha para −Z com 0, então o giro é +90°
  });
});

describe('Grunho: comportamento', () => {
  it('sossegado, passeia perto do lugar dele e não sai da roda', async () => {
    const { s, cx, cz, y } = await arena(), g = mk('g:t:0', cx + 3, y, cz, cx, cz);
    run(g, s, 60, []);
    expect(Math.hypot(g.body.x - g.home.x, g.body.z - g.home.z)).toBeLessThanOrEqual(GRUNHO.wanderRadius + 0.6); expect(g.phase).toBe('wander');
  });

  it('avisa a 12 m (não a 13), persegue correndo e golpeia: acerta 3 a cada 1,5 s', async () => {
    const { s, cx, cz, y } = await arena(), far = mk('g:t:1', cx, y, cz, cx, cz);
    run(far, s, 5, [{ id: 'p', x: cx + 13, y, z: cz }]); expect(far.phase).toBe('wander'); // a 13 m, não o vê
    const g = mk('g:t:2', cx, y, cz, cx, cz), p = { id: 'p', x: cx + 11.5, y, z: cz };
    run(g, s, 0.2, [p]); expect(g.phase).toBe('chase'); expect(g.target).toBe('p');
    const x0 = g.body.x; run(g, s, 1, [p]); expect(g.body.x - x0).toBeGreaterThan(1.5); expect(g.body.x - x0).toBeLessThan(3.5); // corre a ~3 m/s, bem menos que o jogador (4,3)
    // parado a 1 m: golpes com 1,5 s de intervalo (0 → 0,3; 1,5 → 1,8; 3 → 3,3; 4,5 → 4,8)
    const h = mk('g:t:3', cx, y, cz, cx, cz), q = { id: 'p', x: h.body.x + 1, y, z: h.body.z };
    let hits = 0; const times: number[] = [];
    for (let t = 0; t < 6; t += 0.05) { const e = stepGrunho(h, s.volume, 0.05, [q]); if (e.hits.length) { hits++; times.push(Math.round(t * 100) / 100); expect(e.hits[0]).toMatchObject({ target: 'p', damage: 3 }); } }
    expect(hits).toBe(4); expect(times[1] - times[0]).toBeGreaterThanOrEqual(1.45); expect(times[1] - times[0]).toBeLessThanOrEqual(1.6);
  });

  it('o golpe só acerta se o alvo ainda está ao alcance quando a clava desce', async () => {
    const { s, cx, cz, y } = await arena(), g = mk('g:t:4', cx, y, cz, cx, cz);
    let hits = 0;
    for (let t = 0; t < 0.6; t += 0.05) hits += stepGrunho(g, s.volume, 0.05, [{ id: 'p', x: g.body.x + 1, y, z: g.body.z }]).hits.length; // começa a golpear
    expect(g.swing === -1 || g.swing >= 0).toBe(true); expect(hits).toBe(1);
    const h = mk('g:t:5', cx, y, cz, cx, cz); let miss = 0;
    stepGrunho(h, s.volume, 0.05, [{ id: 'p', x: h.body.x + 1, y, z: h.body.z }]); // o golpe começa…
    for (let t = 0; t < 0.6; t += 0.05) miss += stepGrunho(h, s.volume, 0.05, [{ id: 'p', x: h.body.x + 6, y, z: h.body.z }]).hits.length; // …e o jogador já saiu
    expect(miss).toBe(0);
  });

  it('coleira: quem foge para além de 25 m da fogueira é largado; o goblin volta à roda e se cura', async () => {
    const { s, cx, cz, y } = await arena(), g = mk('g:t:6', cx, y, cz, cx, cz);
    g.hp = 5;
    run(g, s, 2, [{ id: 'p', x: cx + 10, y, z: cz }]); expect(g.phase).toBe('chase');
    run(g, s, 12, [{ id: 'p', x: cx + 31, y, z: cz }]); // o viajante está a 31 m da fogueira: fora da coleira
    expect(['return', 'wander']).toContain(g.phase);
    run(g, s, 60, []);
    expect(g.phase).toBe('wander'); expect(g.hp).toBe(20); expect(Math.hypot(g.body.x - g.home.x, g.body.z - g.home.z)).toBeLessThan(GRUNHO.wanderRadius + 1);
  });
});

describe('Grunho: dano, morte e volta', () => {
  it('ferido, persegue quem bateu; abatido, não se mexe nem acerta nem aparece na mira e volta em 10 min com a vida cheia', async () => {
    const { s, cx, cz, y } = await arena(), g = mk('g:t:7', cx + 2, y, cz, cx, cz);
    expect(hurtGrunho(g, 5, 'p')).toEqual({ dead: false }); expect(g.hp).toBe(15); expect(g.phase).toBe('chase'); expect(g.target).toBe('p');
    expect(hurtGrunho(g, 15, 'p')).toEqual({ dead: true }); expect(g.phase).toBe('dead'); expect(grunhoAlive(g)).toBe(false);
    expect(grunhoAim([g], cx + 2.5, y + 1, cz + 0.5 - 3, 0, 0, 1, 10)).toBeNull();
    expect(run(g, s, 30, [{ id: 'p', x: g.body.x + 1, y, z: g.body.z }])).toBe(0);
    run(g, s, GRUNHO.respawnS - 30 + 0.1, []); expect(g.phase).toBe('wander'); expect(g.hp).toBe(20); expect(g.body.x).toBeCloseTo(g.home.x, 1);
  });

  it('mira: o raio acerta a caixa 0,7 × 1,4 do goblin vivo e é barrado por bloco mais perto', () => {
    const g = mk('g:t:8', 10, 70, 10, 10, 10), b = grunhoBox(g);
    expect(b.x1 - b.x0).toBeCloseTo(0.7); expect(b.y1 - b.y0).toBeCloseTo(1.4);
    const hit = grunhoAim([g], g.body.x, 71, g.body.z - 4, 0, 0, 1, 6);
    expect(hit?.index).toBe(0); expect(hit?.dist).toBeCloseTo(4 - 0.35, 1);
    expect(grunhoAim([g], g.body.x, 71, g.body.z - 4, 0, 0, 1, 3)).toBeNull(); expect(grunhoAim([g], g.body.x, 71, g.body.z - 4, 0, 0, 1, 6, 2)).toBeNull();
  });

  it('golpe do jogador: dano pela arma na mão (espada de pedra 5 → 4 golpes), gasta a arma e o goblin passa a perseguir', async () => {
    const s = await open(); hold(s, Item.ESPADA_PEDRA);
    s.grunhos = [mk('g:t:9', 10, 70, 10, 10, 10)];
    for (let i = 0; i < 3; i++) { const r = attackGrunho(s, 0, 'p'); expect(r).toMatchObject({ ok: true, damage: 5, dead: false }); }
    expect(s.grunhos[0].hp).toBe(5); expect(s.grunhos[0].target).toBe('p'); expect(s.inventory.get(s.selected)?.wear).toBe(3);
    const last = attackGrunho(s, 0, 'p'); expect(last.dead).toBe(true); expect(last.msg).toContain('Grunho abatido'); expect(s.grunhos[0].phase).toBe('dead');
    expect(attackGrunho(s, 0, 'p').ok).toBe(false); // já abatido
    expect(attackGrunho(s, 5).ok).toBe(false); // índice que não existe
  });

  it('pose: pernas em contrafase andando, o braço da clava sobe (+) e desce rápido (−) no golpe', () => {
    const g = mk('g:t:10', 10, 70, 10, 10, 10);
    const still = grunhoPose(g, false); expect(still.legs[0]).toBeCloseTo(0); expect(still.legs[1]).toBeCloseTo(0);
    const walk = grunhoPose(g, true); expect(walk.legs[0]).toBeCloseTo(-walk.legs[1]);
    g.swing = 0.1; const up = grunhoPose(g, false).armR; g.swing = 0.3; const down = grunhoPose(g, false).armR; g.swing = 0.5; const end = grunhoPose(g, false).armR;
    expect(up).toBeGreaterThan(0.2); expect(down).toBeLessThan(-1.5); expect(Math.abs(end)).toBeLessThan(0.05);
  });
});
