import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../world/random';
import { World } from '../world/world';
import { Entities, SWORD_REACH } from './entities';
import { ATTACK_SECONDS, Player } from './player';
import { Sheep } from './sheep';

function setup() {
  const w = new World(7);
  const [sx, sy] = w.findSpawn();
  const p = new Player(sx + 0.5, sy + 0.5);
  const e = new Entities(p, mulberry32(1));
  return { w, p, e, sx, sy };
}

describe('Espada', () => {
  it('golpe dura ATTACK_SECONDS, avança 4 quadros e acerta uma única vez no meio', () => {
    const { w, p } = setup();
    expect(p.startAttack()).toBe(true);
    expect(p.startAttack()).toBe(false); // um golpe por vez
    const frames = new Set<number>();
    let hits = 0;
    for (let t = 0; t < ATTACK_SECONDS + 0.1; t += 1 / 60) {
      frames.add(p.attackFrame);
      if (p.consumeHit()) hits++;
      p.update(1 / 60, 0, 0, w);
    }
    expect(hits).toBe(1);
    expect([...frames].sort()).toEqual([0, 1, 2, 3]);
    expect(p.attacking).toBe(false);
  });

  it('direção do golpe não muda durante a animação, mesmo andando', () => {
    const { w, p } = setup();
    p.facing = 'right';
    p.startAttack();
    p.update(0.05, 0, -1, w); // tenta andar para cima
    expect(p.facing).toBe('right');
  });

  it('acerta animais no arco à frente e eles somem; atrás ou longe não', () => {
    const { p, e, sx, sy } = setup();
    const front = new Sheep(p.x + 1, p.y, sx, sy, mulberry32(2));
    const behind = new Sheep(p.x - 1, p.y, sx, sy, mulberry32(3));
    const far = new Sheep(p.x + SWORD_REACH + 0.5, p.y, sx, sy, mulberry32(4));
    e.npcs.push(front, behind, far);
    expect(e.strike('right')).toBe(1);
    expect(e.npcs).not.toContain(front);
    expect(e.npcs).toContain(behind);
    expect(e.npcs).toContain(far);
    expect(e.actors.find((a) => a.kind === 'sheep' && a.x === front.x)).toBeUndefined();
  });

  it('atingir uma ovelha com par desfaz o par/namoro da outra', () => {
    const { p, e, sx, sy } = setup();
    const a = new Sheep(p.x, p.y + 1, sx, sy, mulberry32(5));
    const b = new Sheep(p.x + 3, p.y + 1, sx, sy, mulberry32(6));
    a.partner = b; b.partner = a; b.courtship = 2;
    e.npcs.push(a, b);
    expect(e.strike('down')).toBe(1);
    expect(b.partner).toBeNull();
    expect(b.courtship).toBe(0);
  });

  it('personagem atacando usa o sprite de golpe com o quadro da animação', () => {
    const { p, e } = setup();
    p.equipped = 'sword';
    expect(e.actors[0].kind).toBe('heroine-sword');
    p.startAttack();
    expect(e.actors[0].kind).toBe('heroine-sword-attack');
    expect(e.actors[0].frame).toBe(0);
  });
});
