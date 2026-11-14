import { describe, expect, it } from 'vitest';
import { CUBE_LEVELS } from '../config';
import { Block } from './blocks';
import { quarterLevel } from './quarters';

describe('quarterLevel (ADR 0033): cubos antigos viram blocos de 1/4', () => {
  it('1 cubo antigo → 4 blocos iguais (a mesma altura de antes)', () => {
    expect([0, 1, 2, 3, 4].map((l) => quarterLevel(Block.STONE, Block.AIR, l)))
      .toEqual([Block.STONE, Block.STONE, Block.STONE, Block.STONE, Block.AIR]);
  });
  it('2 cubos antigos → 2 + 2 (preserva os dois materiais, perde 1 de altura)', () => {
    expect([0, 1, 2, 3].map((l) => quarterLevel(Block.STONE, Block.SAND, l)))
      .toEqual([Block.STONE, Block.STONE, Block.SAND, Block.SAND]);
  });
  it('objetos que não são bloco de construção não mudam', () => {
    expect(quarterLevel(Block.CACTUS, Block.AIR, 0)).toBe(Block.CACTUS);
    expect(quarterLevel(Block.CACTUS, Block.AIR, 1)).toBe(Block.AIR);
  });
  it('fora da pilha é ar', () => {
    expect(quarterLevel(Block.STONE, Block.AIR, CUBE_LEVELS)).toBe(Block.AIR);
    expect(quarterLevel(Block.STONE, Block.AIR, -1)).toBe(Block.AIR);
  });
});
