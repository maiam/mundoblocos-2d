import { describe, expect, it } from 'vitest';
import { drawBreakingRing, drawFocusBrackets, drawHoverFrame } from './selectionFx';

function ctx() {
  const o = { strokeStyle: '' as unknown, fillStyle: '' as unknown, lineWidth: 0, lineCap: '', shadowColor: '', shadowBlur: 0, rects: [] as number[][], moves: 0, arcs: 0,
    save() {}, restore() {}, beginPath() {}, clip() {}, stroke() {}, fill() {},
    strokeRect(...a: number[]) { o.rects.push(a); }, fillRect() {}, rect() {}, moveTo() { o.moves++; }, lineTo() {}, arc() { o.arcs++; } };
  return o as typeof o & CanvasRenderingContext2D;
}
const rect = { sx: 10, sy: 20, w: 64, h: 128 };

describe('desenhos de seleção compartilhados (2D e 3D)', () => {
  it('moldura do cursor: branca se válida, rosada se não, 1 px para dentro do retângulo', () => {
    const a = ctx(); drawHoverFrame(a, rect, true);
    expect(a.rects).toEqual([[11, 21, 62, 126]]);
    expect(a.strokeStyle).toBe('rgba(255, 255, 255, 0.95)');
    const b = ctx(); drawHoverFrame(b, rect, false);
    expect(b.strokeStyle).toBe('rgba(255, 120, 140, 0.9)');
  });

  it('cantoneiras do alvo: 4 cantos; dourado se válido, rosado se não', () => {
    const a = ctx(); drawFocusBrackets(a, rect, 2, true, 0);
    expect(a.moves).toBe(4);
    expect(a.strokeStyle).toBe('#ffe9a8');
    const b = ctx(); drawFocusBrackets(b, rect, 2, false, 0);
    expect(b.strokeStyle).toBe('rgba(255, 150, 170, 0.9)');
  });

  it('anel de carregamento: trilho + arco de progresso, sem linhas de rachadura', () => {
    const none = ctx(); drawBreakingRing(none, rect, 0);
    const full = ctx(); drawBreakingRing(full, rect, 1);
    expect(none.moves).toBe(0);
    expect(full.moves).toBe(0); // nenhuma fissura
    expect(full.arcs).toBe(2); // trilho + progresso
  });
});
