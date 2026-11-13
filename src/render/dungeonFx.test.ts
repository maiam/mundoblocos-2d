import { describe, expect, it } from 'vitest';
import type { Camera } from '../game/camera';
import { darkenOutside, drawBeacon } from './dungeonFx';

// câmera de teste: 1 célula = 32 px, origem da tela no mundo (0, 0)
const cam = { worldToScreenX: (x: number) => x, worldToScreenY: (y: number) => y, zoom: 1 } as unknown as Camera;
function ctx() {
  const fills: number[][] = [];
  const o = { fills, fillStyle: '' as unknown, strokeStyle: '', lineWidth: 0, globalAlpha: 1,
    fillRect: (...a: number[]) => fills.push(a), save() {}, restore() {}, translate() {}, rotate() {}, beginPath() {}, moveTo() {}, lineTo() {}, closePath() {}, fill() {}, stroke() {}, ellipse() {},
    createLinearGradient: () => ({ addColorStop() {} }) };
  return o;
}

describe('efeitos de tela da dungeon (compartilhados entre o 2D e o 3D)', () => {
  it('escurece só fora do retângulo do labirinto (4 faixas), limitado à tela', () => {
    const c = ctx();
    darkenOutside(c as unknown as CanvasRenderingContext2D, cam, { x0: 2, y0: 3, x1: 4, y1: 5 }, 400, 300);
    expect(c.fillStyle).toBe('#0b0612');
    // área em px: x 64..160, y 96..192 → acima, abaixo, esquerda, direita
    expect(c.fills).toEqual([[0, 0, 400, 96], [0, 192, 400, 108], [0, 96, 64, 96], [160, 96, 240, 96]]);
  });

  it('farol: coluna de luz quando a entrada está na tela; seta na borda quando está fora', () => {
    const on = ctx();
    drawBeacon(on as unknown as CanvasRenderingContext2D, cam, [5, 5], 0, 400, 300);
    expect(on.fills.length).toBe(2); // coluna roxa + núcleo claro (e a elipse no chão, que não é fillRect)
    const off = ctx();
    drawBeacon(off as unknown as CanvasRenderingContext2D, cam, [500, 5], 0, 400, 300);
    expect(off.fills.length).toBe(0); // fora da tela: só a seta (path), nenhuma coluna
  });
});
