import { describe, expect, it } from 'vitest';
import { Block } from '../world/blocks';
import { World } from '../world/world';
import { Walker, type WalkerSpec, scaleSpecBy } from './walker';

const PLAYER: WalkerSpec = { speed: 4.2, halfW: 0.27, halfD: 0.15, stepHeight: 1, maxHalfW: 0.45 };

describe('Grade fina: especificação em células (ADR 0032)', () => {
  it('com 1 devolve a mesma especificação', () => {
    expect(scaleSpecBy(PLAYER, 1)).toBe(PLAYER);
  });

  it('com 2 dobra velocidade e profundidade; a meia-largura respeita o teto (passa por vão de 1 célula)', () => {
    const s = scaleSpecBy(PLAYER, 2);
    expect(s.speed).toBe(8.4);
    expect(s.halfD).toBeCloseTo(0.3);
    expect(s.halfW).toBe(0.45); // 0,54 sem o teto: corpo de 1,08 não passaria por 1 célula
    expect(s.halfW * 2).toBeLessThan(1);
    expect(s.stepHeight).toBe(1);
  });

  it('sem teto (monstros, animais) a meia-largura dobra', () => {
    expect(scaleSpecBy({ speed: 3, halfW: 0.36, halfD: 0.2, stepHeight: 1 }, 2).halfW).toBeCloseTo(0.72);
  });

  /** Vão de 1 célula numa fileira de pedras (porta numa parede): o corpo mais estreito que a célula atravessa; o mais largo, não. */
  function gap(): [World, number, number] {
    const w = new World(7);
    const [sx, sy] = w.outsideGate();
    for (let dx = -1; dx <= 6; dx++) {
      for (let dy = -4; dy <= 4; dy++) {
        while (w.topBlock(sx + dx, sy + dy)) w.breakBlock(sx + dx, sy + dy);
        w.setObject(sx + dx, sy + dy, Block.AIR);
      }
    }
    w.placeBlock(sx + 1, sy, Block.STONE); // pedras dos dois lados do vão em x = sx + 2
    w.placeBlock(sx + 3, sy, Block.STONE);
    return [w, sx, sy];
  }
  const through = (halfW: number): number => {
    const [w, sx, sy] = gap();
    const walker = new Walker(sx + 2.5, sy + 3.5, { speed: 4, halfW, halfD: 0.15, stepHeight: 0 });
    for (let i = 0; i < 180; i++) walker.move(1 / 60, 0, -1, w); // sobe pelo vão
    return sy - walker.y;
  };

  it('o corpo de 0,9 de largura atravessa o vão de 1 célula; o de 1,08 trava na entrada', () => {
    expect(through(0.45)).toBeGreaterThan(3); // passou pela fileira (de sy + 3,5 até acima de sy)
    expect(through(0.54)).toBeLessThan(-1); // parou diante da fileira (y ainda abaixo da fileira, na tela)
  });
});
