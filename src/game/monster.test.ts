import { describe, expect, it } from 'vitest';
import { inRect } from '../world/dungeon';
import { mulberry32 } from '../world/random';
import { World } from '../world/world';
import { Entities } from './entities';
import { Monster, MONSTERS } from './monster';
import { Player } from './player';

function setup(seed = 42) {
  const w = new World(seed);
  const d = w.dungeon!;
  const p = new Player(d.doorstep[0] + 0.5, d.doorstep[1] + 0.5);
  const e = new Entities(p, mulberry32(3));
  e.spawnMonsters(w);
  return { w, d, p, e };
}

describe('Monstros da dungeon', () => {
  it('nascem os 16 da dungeon e nunca saem do interior (passeando ou perseguindo)', () => {
    const { w, d, p, e } = setup();
    expect(e.monsters).toHaveLength(16);
    // Personagem parada logo fora da entrada: ninguém atravessa a muralha nem a entrada.
    for (let t = 0; t < 1500; t++) e.update(1 / 30, w);
    for (const m of e.monsters) {
      expect(m.insideAt(m.x, m.y)).toBe(true);
      expect(inRect(d.interior, Math.floor(m.x), Math.floor(m.y))).toBe(true);
    }
    void p;
  });

  it('perseguem a personagem dentro da dungeon', () => {
    const { w, d, p, e } = setup();
    const small = e.monsters.find((m) => m.kind === 'spider-small')!;
    // Coloca a personagem a 3 células da aranha, dentro do interior.
    p.x = Math.min(d.interior.x1 - 1, small.x + 3) + 0.0;
    p.y = small.y;
    const before = Math.hypot(p.x - small.x, p.y - small.y);
    for (let t = 0; t < 60; t++) e.update(1 / 30, w);
    expect(Math.hypot(p.x - small.x, p.y - small.y)).toBeLessThan(before);
  });

  it('golpe tira 1 de vida, pisca e empurra; sem vida, o monstro some. Chefe aguenta mais', () => {
    const { w, d, p, e } = setup();
    const boss = e.monsters.find((m) => m.kind === 'spider-boss')!;
    expect(boss.maxHp).toBeGreaterThan(MONSTERS['spider-big'].hp);
    p.x = boss.x;
    p.y = boss.y - 1.2;
    p.facing = 'down';
    let hits = 0;
    while (e.monsters.includes(boss) && hits < 50) {
      p.x = boss.x; p.y = boss.y - 1.2; // segue o chefe (o golpe o empurra)
      expect(e.strike('down', w)).toBeGreaterThan(0);
      hits++;
      if (e.monsters.includes(boss)) expect(boss.hurt).toBeGreaterThan(0);
    }
    expect(hits).toBe(MONSTERS['spider-boss'].hp);
    expect(e.monsters).toHaveLength(15);
    void d;
  });

  it('monstro ferido mostra barra de vida; ator usa a folha do tipo', () => {
    const { w, e } = setup();
    const m = e.monsters[1];
    m.hp -= 1;
    const a = e.actors.find((x) => x.x === m.x && x.y === m.y)!;
    expect(a.kind).toBe(m.kind);
    expect(a.hp).toBeCloseTo((m.maxHp - 1) / m.maxHp);
    expect(new Monster('spider-small', 0, 0, { x0: 0, y0: 0, x1: 3, y1: 3 }).insideAt(5, 5)).toBe(false);
    void w;
  });
});
