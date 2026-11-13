import { describe, expect, it } from 'vitest';
import { Block } from '../world/blocks';
import { wallNeighbors } from '../world/walls';
import {
  capRect, frontPieceFor, frontRect, wallArtPiece, WALL_ART_CELL, WALL_ART_FRONT_H, WALL_ART_MATERIALS, WALL_ATLAS_H, WALL_ATLAS_W,
} from './wallAtlas';

const nb = (rows: string[], x: number, y: number) => wallNeighbors((cx, cy) => rows[cy]?.[cx] === '#', x, y);

describe('atlas de paredes (W3)', () => {
  it('as 16 tampas e as 4 frentes cabem no atlas, sem sobrepor', () => {
    const rects = [...Array.from({ length: 16 }, (_, m) => capRect(m)), ...(['front_mid', 'front_end_left', 'front_end_right', 'front_post'] as const).map(frontRect)];
    for (const r of rects) {
      expect(r.x).toBeGreaterThanOrEqual(0); expect(r.y).toBeGreaterThanOrEqual(0);
      expect(r.x + r.w).toBeLessThanOrEqual(WALL_ATLAS_W); expect(r.y + r.h).toBeLessThanOrEqual(WALL_ATLAS_H);
    }
    for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i], b = rects[j];
      expect(a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h).toBe(false);
    }
    expect(capRect(15)).toEqual({ x: 3 * WALL_ART_CELL, y: 3 * WALL_ART_CELL, w: WALL_ART_CELL, h: WALL_ART_CELL });
    expect(frontRect('front_post').h).toBe(WALL_ART_FRONT_H);
  });

  it('bloco isolado: tampa 0 e frente "poste"', () => {
    expect(wallArtPiece(nb(['.#.'], 1, 0))).toEqual({ cap: 0, front: 'front_post' });
  });

  it('fileira: ponta esquerda, meio e ponta direita, com a tampa da fileira', () => {
    const rows = ['###'];
    expect(wallArtPiece(nb(rows, 0, 0))).toEqual({ cap: 2, front: 'front_end_left' });
    expect(wallArtPiece(nb(rows, 1, 0))).toEqual({ cap: 10, front: 'front_mid' });
    expect(wallArtPiece(nb(rows, 2, 0))).toEqual({ cap: 8, front: 'front_end_right' });
  });

  it('coluna: a frente só aparece no último bloco ao sul (poste de fim de coluna)', () => {
    const rows = ['#', '#', '#'];
    expect(wallArtPiece(nb(rows, 0, 0))).toEqual({ cap: 4, front: null });
    expect(wallArtPiece(nb(rows, 0, 1))).toEqual({ cap: 5, front: null });
    expect(wallArtPiece(nb(rows, 0, 2))).toEqual({ cap: 1, front: 'front_post' });
  });

  it('canto de cima e de baixo de uma sala', () => {
    const rows = ['##', '#.']; // canto noroeste: vizinhos L e S
    expect(wallArtPiece(nb(rows, 0, 0))).toEqual({ cap: 6, front: null }); // há parede ao sul
    const bottom = ['#.', '##']; // canto sudoeste da sala: vizinhos N e L
    expect(wallArtPiece(nb(bottom, 0, 1))).toEqual({ cap: 3, front: 'front_end_left' });
  });

  it('a frente de cada variante e o registro de materiais', () => {
    expect(frontPieceFor('single')).toBe('front_post');
    expect(frontPieceFor('end')).toBe('front_post');
    expect(frontPieceFor('mid')).toBe('front_mid');
    expect(WALL_ART_MATERIALS[Block.WALL_PLANKS]).toBe('tabuas');
    expect(WALL_ART_MATERIALS[Block.WALL_STONE]).toBeUndefined(); // Pedra ainda sem arte
  });
});
