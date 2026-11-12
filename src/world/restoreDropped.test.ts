import { describe, expect, it } from 'vitest';
import { MAX_STACK } from '../config';
import { Block } from './blocks';
import { World } from './world';

describe('restoreChunk: 3º nível aposentado (MAX_STACK = 2)', () => {
  const setup = () => {
    const w = new World(7);
    const [gx, gy] = w.outsideGate();
    return { cx: Math.floor((gx + 3) / 16), cy: Math.floor((gy + 4) / 16) };
  };

  it('conta e descarta os blocos acima do limite, sem tocar nos níveis válidos', () => {
    const { cx, cy } = setup();
    const ground = new Uint8Array(256).fill(Block.GRASS);
    const layers = Array.from({ length: MAX_STACK + 1 }, () => new Uint8Array(256));
    layers[0][5] = Block.STONE;
    layers[1][5] = Block.STONE;
    layers[2][5] = Block.STONE;
    layers[2][6] = Block.STONE;
    const target = new World(7);
    expect(target.restoreChunk(cx, cy, ground, layers)).toBe(2);
    expect(target.getLevel(cx * 16 + 5, cy * 16, 1)).toBe(Block.STONE);
    expect(target.getLevel(cx * 16 + 5, cy * 16, 2)).toBe(Block.AIR);
  });

  it('salvamento sem 3º nível não descarta nada', () => {
    const { cx, cy } = setup();
    const layers = Array.from({ length: MAX_STACK }, () => new Uint8Array(256));
    layers[0][1] = Block.STONE;
    expect(new World(7).restoreChunk(cx, cy, new Uint8Array(256).fill(Block.GRASS), layers)).toBe(0);
  });
});
