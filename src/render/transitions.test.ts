import { describe, expect, it } from 'vitest';
import { Block } from '../world/blocks';
import { V2_BLOCKS } from './materialsV2';
import { TRANSITION_PIECES, TRANSITION_RULES, transitionPieces } from './transitions';

const N = 0, E = 1, S = 2, W = 3, NE = 4, SE = 5, SW = 6, NW = 7;
/** Vizinhos que avançam, por deslocamento "dx,dy" (dy para baixo). */
const has = (...cells: Array<[number, number]>) => (dx: number, dy: number) => cells.some(([x, y]) => x === dx && y === dy);

describe('Transições entre chãos (ADR 0023)', () => {
  it('sem vizinho que avança, nada a desenhar', () => {
    expect(transitionPieces(has())).toEqual([]);
  });

  it('cada vizinho de lado traz a sua borda', () => {
    expect(transitionPieces(has([0, -1]))).toEqual([N]);
    expect(transitionPieces(has([1, 0]))).toEqual([E]);
    expect(transitionPieces(has([0, 1], [-1, 0]))).toEqual([S, W]);
    expect(transitionPieces(has([0, -1], [1, 0], [0, 1], [-1, 0]))).toEqual([N, E, S, W]);
  });

  it('vizinho só na diagonal traz um canto; com um vizinho de lado ao redor, as bordas já cobrem', () => {
    expect(transitionPieces(has([1, -1]))).toEqual([NE]);
    expect(transitionPieces(has([1, 1]))).toEqual([SE]);
    expect(transitionPieces(has([-1, 1]))).toEqual([SW]);
    expect(transitionPieces(has([-1, -1]))).toEqual([NW]);
    expect(transitionPieces(has([1, -1], [0, -1]))).toEqual([N]); // N já cobre o canto NE
    expect(transitionPieces(has([1, -1], [1, 0]))).toEqual([E]);
    expect(transitionPieces(has([1, -1], [0, -1], [1, 0]))).toEqual([N, E]);
    expect(transitionPieces(has([-1, -1], [1, 1]))).toEqual([SE, NW]); // dois cantos opostos, cada um sozinho
  });

  it('as peças são as 8 do atlas e as regras só citam materiais V2 de chão', () => {
    expect(TRANSITION_PIECES).toHaveLength(8);
    for (const r of TRANSITION_RULES) {
      expect(V2_BLOCKS[r.over]).toBeDefined();
      for (const o of r.onto) {
        expect(V2_BLOCKS[o]).toBeDefined();
        expect(o).not.toBe(r.over);
      }
    }
    // Hoje só a Grama avança, sobre Terra, Caminho e Areia (água, buraco, pedra e piso da cidade ficam de fora).
    expect(TRANSITION_RULES).toEqual([{ over: Block.GRASS, onto: [Block.DIRT, Block.PATH, Block.SAND] }]);
  });
});
