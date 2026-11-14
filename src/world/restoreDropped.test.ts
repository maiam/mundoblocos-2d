import { describe, expect, it } from 'vitest';
import { MAX_STACK } from '../config';
import { Block } from './blocks';
import { World } from './world';

describe('restoreChunk: limite de pilha (MAX_STACK = 4) e formato antigo de 2 níveis', () => {
  const setup = () => {
    const w = new World(7);
    const [gx, gy] = w.outsideGate();
    return { cx: Math.floor((gx + 3) / 16), cy: Math.floor((gy + 4) / 16) };
  };

  it('conta e descarta os blocos acima do limite, sem tocar nos níveis válidos', () => {
    const { cx, cy } = setup();
    const ground = new Uint8Array(256).fill(Block.GRASS);
    const layers = Array.from({ length: MAX_STACK + 1 }, () => new Uint8Array(256));
    for (let l = 0; l <= MAX_STACK; l++) layers[l][5] = Block.STONE;
    layers[MAX_STACK][6] = Block.STONE;
    const target = new World(7);
    expect(target.restoreChunk(cx, cy, ground, layers)).toBe(2);
    expect(target.getLevel(cx * 16 + 5, cy * 16, MAX_STACK - 1)).toBe(Block.STONE);
    expect(target.getLevel(cx * 16 + 5, cy * 16, MAX_STACK)).toBe(Block.AIR);
  });

  it('salvamento dentro do limite não descarta nada', () => {
    const { cx, cy } = setup();
    const layers = Array.from({ length: MAX_STACK }, () => new Uint8Array(256));
    layers[0][1] = Block.STONE;
    expect(new World(7).restoreChunk(cx, cy, new Uint8Array(256).fill(Block.GRASS), layers)).toBe(0);
  });

  it('formato antigo (2 níveis): cada cubo vira 4 blocos; 2 cubos viram 2+2', () => {
    const { cx, cy } = setup();
    const ground = new Uint8Array(256).fill(Block.GRASS);
    const layers = [new Uint8Array(256), new Uint8Array(256)];
    layers[0][1] = Block.STONE; // 1 cubo
    layers[0][2] = Block.STONE; layers[1][2] = Block.SAND; // 2 cubos
    const w = new World(7);
    expect(w.restoreChunk(cx, cy, ground, layers)).toBe(0);
    const x1 = cx * 16 + 1, x2 = cx * 16 + 2, y = cy * 16;
    expect([0, 1, 2, 3, 4].map((l) => w.getLevel(x1, y, l))).toEqual([Block.STONE, Block.STONE, Block.STONE, Block.STONE, Block.AIR]);
    expect([0, 1, 2, 3].map((l) => w.getLevel(x2, y, l))).toEqual([Block.STONE, Block.STONE, Block.SAND, Block.SAND]);
  });
});
