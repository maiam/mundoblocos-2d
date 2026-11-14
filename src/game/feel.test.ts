import { describe, expect, it } from 'vitest';
import { World } from '../world/world';
import { Block } from '../world/blocks';
import { dustFor, DUST_STRIDE } from '../render/footDust';
import { aimFacing, aimRange } from './aimAssist';
import { feelOn, INPUT_ACCEL, INPUT_DECEL } from './feel';
import { Player } from './player';

/** Sensação de movimento (v0.93.69). */
describe('Inércia curta e passo pela distância', () => {
  const world = new World(42);
  const [sx, sy] = world.outsideGate();
  const mk = (smooth: boolean) => { const p = new Player(sx + 0.5, sy + 0.6); p.smooth = smooth; return p; };
  const run = (p: Player, dt: number, n: number, ix: number, iy: number) => { for (let i = 0; i < n; i++) p.update(dt, ix, iy, world); };

  it('sem `smooth` o movimento é o de antes: velocidade total no primeiro quadro', () => {
    const p = mk(false);
    const x0 = p.x;
    p.update(0.016, 1, 0, world);
    expect(p.x - x0).toBeCloseTo(p.spec.speed * 0.016, 5);
  });

  it('com `smooth` ele arranca em rampa: o 1º quadro anda menos que a velocidade total e em ~0,25 s já está em regime', () => {
    const p = mk(true);
    const x0 = p.x;
    p.update(0.016, 1, 0, world);
    expect(p.x - x0).toBeGreaterThan(0);
    expect(p.x - x0).toBeLessThan(p.spec.speed * 0.016 * 0.5);
    run(p, 0.016, 15, 1, 0); // ~0,25 s
    expect(p.vx).toBeGreaterThan(0.98);
  });

  it('ao soltar, para em poucos quadros sem corte seco (continua um instante) e a entrada volta a zero', () => {
    const p = mk(true);
    run(p, 0.016, 30, 1, 0);
    const x1 = p.x;
    p.update(0.016, 0, 0, world);
    expect(p.x - x1).toBeGreaterThan(0); // ainda desliza um pouquinho
    run(p, 0.016, 30, 0, 0);
    expect(Math.hypot(p.vx, p.vy)).toBeLessThan(0.01);
    expect(p.moving).toBe(false);
    expect(p.walkTime).toBe(0);
    expect(INPUT_DECEL).toBeGreaterThan(INPUT_ACCEL); // para mais rápido do que arranca
  });

  it('o passo anda pela distância: devagar o ciclo é mais lento; a toda velocidade, 1 ciclo por segundo; parado contra a parede não corre', () => {
    const slow = mk(true), fast = mk(true);
    run(slow, 0.016, 60, 0.4, 0);
    run(fast, 0.016, 60, 1, 0);
    expect(fast.walkTime).toBeGreaterThan(slow.walkTime * 1.5);
    expect(fast.walkTime).toBeGreaterThan(0.6);
    expect(fast.walkTime).toBeLessThan(1.3);
  });

  it('?sensacao=0 desliga', () => {
    expect(feelOn('')).toBe(true);
    expect(feelOn('?sensacao=1')).toBe(true);
    expect(feelOn('?sensacao=0')).toBe(false);
  });
});

describe('Mira assistida do golpe', () => {
  const me = { x: 0, y: 0 };
  it('vira para o monstro mais perto à frente (eixo dominante) e ignora os fora do alcance ou atrás', () => {
    const r = aimRange(2.9);
    expect(aimFacing(me, 'right', [{ x: 2, y: 1.2 }], r)).toBe('right');
    expect(aimFacing(me, 'right', [{ x: 1.2, y: 2 }], r)).toBe('down'); // um pouco torto para baixo: corrige
    expect(aimFacing(me, 'right', [{ x: -2, y: 0 }], r)).toBeNull(); // atrás
    expect(aimFacing(me, 'right', [{ x: r + 1, y: 0 }], r)).toBeNull(); // longe
    expect(aimFacing(me, 'right', [], r)).toBeNull();
    // o mais perto vence
    expect(aimFacing(me, 'right', [{ x: 2.5, y: 0.5 }, { x: 0.5, y: 1.5 }], r)).toBe('down');
  });
});

describe('Poeira de passos', () => {
  it('cada chão tem sua cor e quantidade; água e buraco não levantam nada', () => {
    expect(dustFor(Block.WATER)).toBeNull();
    expect(dustFor(Block.HOLE)).toBeNull();
    const sand = dustFor(Block.SAND)!, grass = dustFor(Block.GRASS)!, dirt = dustFor(Block.DIRT)!;
    expect(sand.amount).toBeGreaterThan(grass.amount);
    expect(dirt.color[0]).toBeGreaterThan(dirt.color[2]); // terra: tom quente
    expect(grass.color[1]).toBeGreaterThan(grass.color[0]); // grama: esverdeada
    expect(DUST_STRIDE).toBeGreaterThan(0);
  });
});

describe('Vento e pegadas (v0.93.69)', () => {
  it('só o capim e as flores balançam no vento; árvores, pedras e cubos não', async () => {
    const { swaysInWind, SWAY_PUSH_RADIUS } = await import('../render/wind');
    expect(swaysInWind(Block.TALL_GRASS)).toBe(true);
    expect(swaysInWind(Block.FLOWER)).toBe(true);
    expect(swaysInWind(Block.STONE)).toBe(false);
    expect(swaysInWind(Block.AIR)).toBe(false);
    expect(SWAY_PUSH_RADIUS).toBeGreaterThan(0);
  });

  it('pegadas só no chão macio (areia, terra, caminho, terra arada); a grama e a pedra não marcam', async () => {
    const { printFor, PRINT_LIFE } = await import('../render/footDust');
    for (const id of [Block.SAND, Block.DIRT, Block.PATH, Block.TILLED]) expect(printFor(id)).not.toBeNull();
    for (const id of [Block.GRASS, Block.STONE, Block.WATER, Block.AIR]) expect(printFor(id)).toBeNull();
    expect(PRINT_LIFE).toBeGreaterThan(2);
    expect(printFor(Block.SAND)!.alpha).toBeLessThanOrEqual(0.6);
  });
});
