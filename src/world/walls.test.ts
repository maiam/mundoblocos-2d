import { describe, expect, it } from 'vitest';
import {
  CAP_E, CAP_N, CAP_S, CAP_W, INNER_NE, INNER_NW, INNER_SE, INNER_SW, WALL_CAP_PIECES,
  wallCapMask, wallFront, wallInnerCorners, wallNeighbors, wallPiece,
} from './walls';

/** Monta uma grade de texto ('#' = parede) e devolve o predicado `isWall` dela. */
function grid(rows: string[]): (x: number, y: number) => boolean {
  return (x, y) => rows[y]?.[x] === '#';
}

describe('autotile das paredes (ADR 0027)', () => {
  it('a tampa tem 16 peças: a máscara N/E/S/W cobre 0..15 sem repetir', () => {
    const seen = new Set<number>();
    for (let m = 0; m < 16; m++) {
      const nb = { n: !!(m & CAP_N), e: !!(m & CAP_E), s: !!(m & CAP_S), w: !!(m & CAP_W), ne: false, se: false, sw: false, nw: false };
      seen.add(wallCapMask(nb));
    }
    expect(seen.size).toBe(WALL_CAP_PIECES);
  });

  it('parede solta: frente "single", tampa 0, sem cantos internos', () => {
    const p = wallPiece(wallNeighbors(grid(['...', '.#.', '...']), 1, 1));
    expect(p).toEqual({ front: 'single', cap: 0, inner: 0 });
  });

  it('fileira horizontal: ponta esquerda, meio e ponta direita', () => {
    const is = grid(['.....', '.###.', '.....']);
    expect(wallPiece(wallNeighbors(is, 1, 1)).front).toBe('left');
    expect(wallPiece(wallNeighbors(is, 2, 1)).front).toBe('mid');
    expect(wallPiece(wallNeighbors(is, 3, 1)).front).toBe('right');
    expect(wallPiece(wallNeighbors(is, 2, 1)).cap).toBe(CAP_E | CAP_W);
  });

  it('a frente fica escondida quando há parede ao sul', () => {
    const is = grid(['.#.', '.#.', '.#.']);
    expect(wallFront(wallNeighbors(is, 1, 0))).toBeNull();
    expect(wallFront(wallNeighbors(is, 1, 1))).toBeNull();
    expect(wallFront(wallNeighbors(is, 1, 2))).toBe('single'); // só a última mostra a frente
    expect(wallCapMask(wallNeighbors(is, 1, 1))).toBe(CAP_N | CAP_S);
  });

  it('canto em L: máscara e frente de cada ponta', () => {
    const is = grid(['##.', '#..', '...']);
    const corner = wallPiece(wallNeighbors(is, 0, 0)); // canto noroeste: vizinhos leste e sul
    expect(corner.cap).toBe(CAP_E | CAP_S);
    expect(corner.front).toBeNull(); // tem parede ao sul
    const arm = wallPiece(wallNeighbors(is, 1, 0)); // ponta leste do braço de cima
    expect(arm.cap).toBe(CAP_W);
    expect(arm.front).toBe('right');
  });

  it('canto interno: os dois ortogonais são parede e o diagonal não', () => {
    // sala em L: a célula do meio tem parede a leste e ao sul, mas não no diagonal sudeste
    const is = grid(['...', '.##', '.#.']);
    const nb = wallNeighbors(is, 1, 1);
    expect(wallInnerCorners(nb)).toBe(INNER_SE);
    // diagonal presente: sem canto interno
    const full = wallNeighbors(grid(['...', '.##', '.##']), 1, 1);
    expect(wallInnerCorners(full)).toBe(0);
  });

  it('cada um dos quatro cantos internos usa o seu bit', () => {
    const cross = (diagonalMissing: 'ne' | 'se' | 'sw' | 'nw') => {
      const nb = { n: true, e: true, s: true, w: true, ne: true, se: true, sw: true, nw: true };
      nb[diagonalMissing] = false;
      return wallInnerCorners(nb);
    };
    expect(cross('ne')).toBe(INNER_NE);
    expect(cross('se')).toBe(INNER_SE);
    expect(cross('sw')).toBe(INNER_SW);
    expect(cross('nw')).toBe(INNER_NW);
  });

  it('a forma não depende do material: o predicado é quem decide o que conecta', () => {
    const a = wallPiece(wallNeighbors((x, y) => x === 1 && y === 0, 0, 0));
    expect(a.cap).toBe(CAP_E);
  });
});
