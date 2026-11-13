import { describe, expect, it } from 'vitest';
import { selectionRect3d, type SelectionCamera } from './worldSelection';

// câmera de teste: 1 célula = 32 px, zoom 2, a tela começa em (0, 0) do mundo
const cam: SelectionCamera = { worldToScreenX: (px) => px * 2, worldToScreenY: (px) => px * 2, zoom: 2 };
const T = 32, K = 1;
const CELL = T * 2;

describe('retângulo da seleção no 3D (o que o jogador vê)', () => {
  it('chão vazio: o ladrilho da célula', () => {
    expect(selectionRect3d(cam, { x: 3, y: 5, top: null, hit: null }, T, K)).toEqual({ sx: 3 * CELL, sy: 5 * CELL, w: CELL, h: CELL });
  });

  it('cubo no chão: topo + frente = 1 célula de largura e 2 de altura (K = 1), subindo uma célula acima do ladrilho', () => {
    const r = selectionRect3d(cam, { x: 3, y: 5, top: { level: 0, cube: true }, hit: null }, T, K);
    expect(r).toEqual({ sx: 3 * CELL, sy: 4 * CELL, w: CELL, h: 2 * CELL });
    // a frente do cubo cobre exatamente o ladrilho da célula (de sy + CELL até sy + 2·CELL)
    expect(r.sy + r.h).toBe(5 * CELL + CELL);
  });

  it('pilha de 2 níveis: sobe mais uma unidade; K diferente muda só a altura da silhueta', () => {
    const two = selectionRect3d(cam, { x: 3, y: 5, top: { level: 1, cube: true }, hit: null }, T, K);
    expect(two).toEqual({ sx: 3 * CELL, sy: 3 * CELL, w: CELL, h: 2 * CELL });
    const k05 = selectionRect3d(cam, { x: 3, y: 5, top: { level: 0, cube: true }, hit: null }, T, 0.5);
    expect(k05.h).toBeCloseTo(1.5 * CELL);
  });

  it('objeto de sprite (árvore): o retângulo clicável dele, na mesma âncora do 2D; sem hit cai no ladrilho', () => {
    const hit = { x: -16, y: -64, w: 64, h: 96 };
    expect(selectionRect3d(cam, { x: 3, y: 5, top: { level: 0, cube: false }, hit }, T, K)).toEqual({
      sx: 2 * (3 * T - 16), sy: 2 * (5 * T - 64), w: 128, h: 192,
    });
    expect(selectionRect3d(cam, { x: 3, y: 5, top: { level: 0, cube: false }, hit: null }, T, K)).toEqual({ sx: 3 * CELL, sy: 5 * CELL, w: CELL, h: CELL });
  });
});
