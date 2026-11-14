import { describe, expect, it } from 'vitest';
import { World } from '../world/world';
import { attackTimingFor, DEFAULT_ATTACK_TIMING, HOOD_SWORD_TIMING } from './attackTiming';
import { ATTACK_BUFFER_S, ATTACK_CHAIN_AT, ATTACK_HIT_AT, ATTACK_SECONDS, Player } from './player';

/** Fluidez do combate do jogador (v0.93.63): cancelar depois do acerto e fila curta de golpes. */
describe('Golpes encadeados e na fila', () => {
  const world = new World(42);
  const [sx, sy] = world.outsideGate();
  const mk = () => new Player(sx + 0.5, sy + 0.6);
  const progress = (p: Player) => 1 - p.attackTime / ATTACK_SECONDS;

  it('não dá para começar outro golpe antes do acerto; o pedido entra na fila e sai sozinho', () => {
    const p = mk();
    expect(p.startAttack('sword')).toBe(true);
    const swings = p.swings;
    expect(p.startAttack('sword')).toBe(false); // cedo demais: ignorado (não empilha)
    expect(p.swings).toBe(swings);
    // Perto do ponto de cancelar o pedido entra na fila e sai sozinho.
    let t = 0;
    for (; t < ATTACK_SECONDS * ATTACK_CHAIN_AT - ATTACK_BUFFER_S + 0.01; t += 0.01) p.update(0.01, 0, 0, world);
    expect(p.startAttack('sword')).toBe(false);
    expect(p.swings).toBe(swings);
    while (p.swings === swings && t < ATTACK_SECONDS * 2) { p.update(0.01, 0, 0, world); p.consumeHit(); t += 0.01; }
    expect(p.swings).toBe(swings + 1);
    // Saiu no ponto de encadear (antes de a animação acabar), não no fim.
    expect(t).toBeLessThan(ATTACK_SECONDS);
    expect(t).toBeGreaterThanOrEqual(ATTACK_SECONDS * ATTACK_CHAIN_AT - 0.02);
  });

  it('o acerto do primeiro golpe acontece antes de poder encadear, e cada golpe acerta uma vez', () => {
    expect(ATTACK_HIT_AT).toBeLessThan(ATTACK_CHAIN_AT);
    const p = mk();
    p.startAttack('sword');
    let hits = 0;
    for (let i = 0; i < 100; i++) {
      p.update(0.01, 0, 0, world);
      if (p.consumeHit()) hits++;
    }
    expect(hits).toBe(1);
    expect(progress(p)).toBeGreaterThanOrEqual(1 - 1e-9);
  });

  it('pedido cedo demais não dispara golpe fantasma depois', () => {
    const p = mk();
    p.startAttack('sword');
    p.startAttack('sword'); // cedo demais: nem entra na fila
    const swings = p.swings;
    for (let i = 0; i < 100; i++) p.update(0.01, 0, 0, world);
    expect(p.swings).toBe(swings); // nenhum golpe novo depois de a fila expirar
  });

  it('com o golpe terminado, startAttack começa na hora (como sempre)', () => {
    const p = mk();
    expect(p.startAttack('sword')).toBe(true);
    for (let i = 0; i < 50; i++) p.update(0.01, 0, 0, world);
    expect(p.attacking).toBe(false);
    expect(p.startAttack('sword')).toBe(true);
  });
});

describe('Tempo do golpe por personagem (v0.93.64)', () => {
  const world = new World(42);
  const [sx, sy] = world.outsideGate();

  it('o Hood com a espada usa a folha de 8 quadros: 0,48 s e acerto no meio do arco; os outros seguem 0,36 s', () => {
    expect(attackTimingFor('hood', 'sword')).toEqual(HOOD_SWORD_TIMING);
    expect(attackTimingFor('hood', 'axe')).toEqual(DEFAULT_ATTACK_TIMING);
    expect(attackTimingFor('heroine', 'sword')).toEqual(DEFAULT_ATTACK_TIMING);
    expect(HOOD_SWORD_TIMING.seconds).toBeGreaterThan(DEFAULT_ATTACK_TIMING.seconds);
    // O acerto cai no 5º quadro (arco), a partir de 4/8 e antes de 5/8 + margem.
    expect(HOOD_SWORD_TIMING.hitAt).toBeGreaterThanOrEqual(4 / 8);
    expect(HOOD_SWORD_TIMING.hitAt).toBeLessThan(6 / 8);
  });

  it('o Player segue o tempo escolhido: duração, fase (0..1) e acerto uma vez, e ainda encadeia', () => {
    const p = new Player(sx + 0.5, sy + 0.6);
    p.timingFor = (tool) => attackTimingFor('hood', tool);
    expect(p.startAttack('sword')).toBe(true);
    expect(p.attackTime).toBeCloseTo(HOOD_SWORD_TIMING.seconds, 5);
    let hits = 0, lastPhase = 0;
    for (let i = 0; i < 70; i++) {
      p.update(0.01, 0, 0, world);
      if (p.consumeHit()) { hits++; expect(p.attackPhase).toBeGreaterThanOrEqual(HOOD_SWORD_TIMING.hitAt - 0.03); }
      if (p.attacking) { expect(p.attackPhase).toBeGreaterThanOrEqual(lastPhase); lastPhase = p.attackPhase; }
    }
    expect(hits).toBe(1);
    expect(p.attacking).toBe(false);
    expect(p.attackPhase).toBe(0);
  });
});
