import { describe, expect, it } from 'vitest';
import { Block } from '../world/blocks';
import { World } from '../world/world';
import { Player } from './player';

describe('Player', () => {
  it('anda nas direções da tela e vira o sprite pelo eixo dominante', () => {
    const w = new World(7);
    const [sx, sy] = w.outsideGate();
    const p = new Player(sx + 0.5, sy + 0.5);
    p.update(0.05, 1, 0, w);
    expect(p.x).toBeGreaterThan(sx + 0.5);
    expect(p.facing).toBe('right');
    p.update(0.05, 0, -1, w);
    expect(p.facing).toBe('up');
    p.update(0.05, 0, 0, w);
    expect(p.moving).toBe(false);
  });

  /** Corredor horizontal limpo à direita do spawn, com bordas de árvore. */
  function corridor(seed: number): [World, number, number] {
    const w = new World(seed);
    const [sx, sy] = w.outsideGate();
    for (let dx = -1; dx <= 6; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        while (w.topBlock(sx + dx, sy + dy)) w.breakBlock(sx + dx, sy + dy);
        w.setObject(sx + dx, sy + dy, dy === 0 ? Block.AIR : Block.OAK_TREE);
      }
    }
    return [w, sx, sy];
  }

  it('sobe 1 bloco, depois outro, e desce livremente', () => {
    const [w, sx, sy] = corridor(7);
    w.placeBlock(sx + 2, sy, Block.STONE); // degrau de 1
    w.placeBlock(sx + 3, sy, Block.STONE);
    w.placeBlock(sx + 3, sy, Block.STONE); // pilha de 2
    const p = new Player(sx + 0.5, sy + 0.5);
    for (let i = 0; i < 120; i++) p.update(1 / 60, 1, 0, w);
    expect(p.x).toBeGreaterThan(sx + 4); // passou por cima e desceu do outro lado
    expect(p.z).toBe(0);
  });

  it('não sobe pilha de 4 blocos (1 célula); sobe de 1 a 3', () => {
    const [w, sx, sy] = corridor(7);
    for (let i = 0; i < 4; i++) w.placeBlock(sx + 2, sy, Block.STONE);
    const p = new Player(sx + 0.5, sy + 0.5);
    for (let i = 0; i < 90; i++) p.update(1 / 60, 1, 0, w);
    expect(p.x).toBeLessThan(sx + 2);
    expect(p.z).toBe(0);
    expect(p.occupies(sx + 1, sy)).toBe(true);
  });

  it('não entra em buraco', () => {
    const [w, sx, sy] = corridor(7);
    w.breakBlock(sx + 2, sy);
    expect(w.getGround(sx + 2, sy)).toBe(Block.HOLE);
    const p = new Player(sx + 0.5, sy + 0.5);
    for (let i = 0; i < 90; i++) p.update(1 / 60, 1, 0, w);
    expect(p.x).toBeLessThan(sx + 2);
    w.placeBlock(sx + 2, sy, Block.OAK_PLANKS); // tapado: vira piso e libera a passagem
    for (let i = 0; i < 90; i++) p.update(1 / 60, 1, 0, w);
    expect(p.x).toBeGreaterThan(sx + 3);
    expect(p.z).toBe(0);
  });

  it('não atravessa árvores', () => {
    const [w, sx, sy] = corridor(7);
    w.setObject(sx + 2, sy, Block.OAK_TREE);
    const p = new Player(sx + 0.5, sy + 0.5);
    for (let i = 0; i < 90; i++) p.update(1 / 60, 1, 0, w);
    expect(p.x).toBeLessThan(sx + 2);
  });
});

import { isTabletScreen, shouldReenter } from './screenMode';
describe('Tablet', () => {
  it('toque com lado menor ≥ 600 px é tablet; celular deitado e computador não', () => {
    expect(shouldReenter(true, false, false, true, true)).toBe(true); // saiu com o dedo na tela: volta (ADR 0077)
    expect(shouldReenter(true, false, true, true, true)).toBe(false); // saída nossa (campo de texto)
    expect(shouldReenter(true, false, false, false, true)).toBe(false); // aba escondida
    expect(shouldReenter(true, false, false, true, false)).toBe(false); // sem toque: foi de propósito (gesto de voltar)
    expect(shouldReenter(false, false, false, true, true)).toBe(false); expect(shouldReenter(true, true, false, true, true)).toBe(false);
    expect(isTabletScreen(true, 1180, 820)).toBe(true); // iPad Air
    expect(isTabletScreen(true, 1280, 800)).toBe(true); // tablet Android
    expect(isTabletScreen(true, 844, 390)).toBe(false); // iPhone deitado
    expect(isTabletScreen(true, 915, 412)).toBe(false); // Android deitado
    expect(isTabletScreen(false, 1920, 1080)).toBe(false); // computador
  });
});
