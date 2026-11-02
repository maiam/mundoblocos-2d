import { describe, expect, it } from 'vitest';
import { monsterDrops } from '../world/items';
import { mulberry32 } from '../world/random';
import { World } from '../world/world';
import { Entities } from './entities';
import { MONSTERS } from './monster';
import { HURT_INVULN_S, MAX_HP, Player, REGEN_DELAY_S, REGEN_EVERY_S } from './player';

function setup(seed = 42) {
  const w = new World(seed);
  const d = w.dungeon!;
  const p = new Player(d.doorstep[0] + 0.5, d.doorstep[1] + 0.5);
  const e = new Entities(p, mulberry32(3));
  e.spawnMonsters(w);
  return { w, d, p, e };
}

describe('Combate — espólios', () => {
  it('pequena às vezes solta seda; grande sempre seda (e às vezes presa); Rainha solta o Coração', () => {
    const r = mulberry32(9);
    const small = Array.from({ length: 200 }, () => monsterDrops('spider-small', r));
    expect(small.some((d) => d.length === 0) && small.some((d) => d[0]?.item === 'silk')).toBe(true);
    const big = Array.from({ length: 200 }, () => monsterDrops('spider-big', r));
    expect(big.every((d) => d[0].item === 'silk' && d[0].count >= 1)).toBe(true);
    expect(big.some((d) => d.some((x) => x.item === 'fang'))).toBe(true);
    const boss = monsterDrops('spider-boss', r);
    expect(boss.find((d) => d.item === 'queen_heart')?.count).toBe(1);
    expect(boss.find((d) => d.item === 'silk')!.count).toBeGreaterThanOrEqual(5);
  });
});

describe('Combate — vida da heroína', () => {
  it('dano tira meios corações, invencibilidade curta, regenera fora de combate e renasce cheia', () => {
    const w = new World(7);
    const [sx, sy] = w.findSpawn();
    const p = new Player(sx + 0.5, sy + 0.5);
    expect(p.hp).toBe(MAX_HP);
    expect(p.hurt(2, p.x + 1, p.y, w)).toBe(true);
    expect(p.hp).toBe(MAX_HP - 2);
    expect(p.hurt(2, p.x + 1, p.y, w)).toBe(false); // invencível
    for (let t = 0; t < HURT_INVULN_S + 0.05; t += 0.05) p.update(0.05, 0, 0, w);
    expect(p.hurt(1, p.x + 1, p.y, w)).toBe(true);
    expect(p.hp).toBe(MAX_HP - 3);
    // Regenera ½ coração a cada REGEN_EVERY_S depois de REGEN_DELAY_S sem dano.
    for (let t = 0; t < REGEN_DELAY_S + REGEN_EVERY_S + 0.1; t += 0.05) p.update(0.05, 0, 0, w);
    expect(p.hp).toBe(MAX_HP - 2);
    p.hp = 1;
    p.invuln = 0;
    p.hurt(4, p.x + 1, p.y, w);
    expect(p.dead).toBe(true);
    p.respawn(sx + 0.5, sy + 0.5);
    expect(p.hp).toBe(MAX_HP);
    expect(p.invuln).toBeGreaterThan(0);
  });
});

describe('Combate — monstros', () => {
  it('monstro encostado morde (dano do tipo) respeitando o intervalo', () => {
    const { w, p, e } = setup();
    const big = e.monsters.find((m) => m.kind === 'spider-big')!;
    e.monsters.splice(0, e.monsters.length, big);
    p.x = big.x + big.reach - 0.1;
    p.y = big.y;
    e.update(1 / 60, w);
    expect(p.hp).toBe(MAX_HP - MONSTERS['spider-big'].damage);
    p.invuln = 0;
    e.update(1 / 60, w); // ainda no intervalo da mordida
    expect(p.hp).toBe(MAX_HP - MONSTERS['spider-big'].damage);
  });

  it('persegue pelos corredores (mapa de distâncias): aproxima-se pelo caminho, não em linha reta', () => {
    const { w, d, p, e } = setup();
    const small = e.monsters.find((m) => m.kind === 'spider-small')!;
    e.monsters.splice(0, e.monsters.length, small);
    // Personagem parada numa célula livre a ~8 passos da aranha pelo labirinto.
    const a = d.area;
    const W = a.x1 - a.x0 + 1;
    const H = a.y1 - a.y0 + 1;
    const dist = new Int32Array(W * H).fill(-1);
    const s0 = (Math.floor(small.y) - a.y0) * W + (Math.floor(small.x) - a.x0);
    dist[s0] = 0;
    const q = [s0];
    let goal = -1;
    for (let h = 0; h < q.length && goal < 0; h++) {
      const i = q[h];
      const x = i % W;
      const y = (i - x) / W;
      for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
        const j = ny * W + nx;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H || dist[j] >= 0 || w.standHeight(a.x0 + nx, a.y0 + ny) !== 0) continue;
        dist[j] = dist[i] + 1;
        q.push(j);
        if (dist[j] === 8) goal = j;
      }
    }
    expect(goal).toBeGreaterThanOrEqual(0);
    p.x = a.x0 + (goal % W) + 0.5;
    p.y = a.y0 + Math.floor(goal / W) + 0.5;
    p.invuln = 999; // só medir a perseguição
    for (let t = 0; t < 360; t++) e.update(1 / 60, w);
    expect(Math.hypot(p.x - small.x, p.y - small.y)).toBeLessThan(small.reach + 0.3);
  });

  it('derrotado: anima a morte, avisa o Game (espólios) e renasce depois do tempo, longe da heroína', () => {
    const { w, d, p, e } = setup();
    const killed: string[] = [];
    e.onMonsterKilled = (m) => killed.push(m.kind);
    const boss = e.monsters.find((m) => m.kind === 'spider-boss')!;
    const total = e.monsters.length;
    let n = 0;
    while (e.monsters.includes(boss) && n++ < 50) {
      p.x = boss.x; p.y = boss.y - 1.2; p.facing = 'down';
      e.strike('down', w);
    }
    expect(killed).toEqual(['spider-boss']);
    expect(e.dying).toHaveLength(1);
    expect(e.actors.some((a) => a.kind === 'spider-boss' && a.dying !== undefined)).toBe(true);
    // Heroína perto do ponto: não renasce mesmo depois do tempo.
    for (let t = 0; t < MONSTERS['spider-boss'].deathSeconds + 0.1; t += 0.1) e.update(0.1, w);
    expect(e.dying).toHaveLength(0);
    e.respawns[0].timer = 0;
    p.x = d.bossHome[0] + 0.5; p.y = d.bossHome[1] + 2.5; p.invuln = 999;
    e.update(0.1, w);
    expect(e.monsters.some((m) => m.kind === 'spider-boss')).toBe(false);
    // Heroína longe (fora da dungeon): a Rainha volta.
    p.x = d.doorstep[0] + 0.5; p.y = d.doorstep[1] + 0.5;
    e.respawns[0].timer = 0;
    e.update(0.1, w);
    expect(e.monsters.some((m) => m.kind === 'spider-boss')).toBe(true);
    expect(e.monsters).toHaveLength(total);
    expect(MONSTERS['spider-boss'].respawn).toBeGreaterThan(MONSTERS['spider-small'].respawn);
  });
});
