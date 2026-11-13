import { describe, expect, it } from 'vitest';
import { drawFade, drawHurtVignette, Overlay2D } from './overlay2d';

function fakeCtx() {
  const calls: string[] = [];
  const stops: Array<[number, string]> = [];
  const ctx = {
    calls, stops, fillStyle: '' as unknown,
    setTransform: (...a: number[]) => calls.push('transform:' + a.join(',')),
    clearRect: () => calls.push('clear'),
    fillRect: (...a: number[]) => calls.push('fill:' + a.join(',')),
    createRadialGradient: () => ({ addColorStop: (o: number, c: string) => stops.push([o, c]) }),
  };
  return ctx;
}
function fakeCanvas(ctx: unknown) {
  const removed: boolean[] = [];
  const el = {
    width: 0, height: 0, style: {} as Record<string, string>, attrs: {} as Record<string, string>,
    getContext: () => ctx, setAttribute(k: string, v: string) { el.attrs[k] = v; }, remove() { removed.push(true); }, removed,
  };
  return el;
}

describe('Overlay2D (camada 2D sobre o WebGL)', () => {
  it('canvas irmão colado ao do jogo, sem pegar toques, inserido logo depois dele', () => {
    const ctx = fakeCtx();
    const overlay = fakeCanvas(ctx);
    const inserted: unknown[] = [];
    const host = { after: (el: unknown) => inserted.push(el) } as unknown as HTMLCanvasElement;
    new Overlay2D(host, () => overlay as unknown as HTMLCanvasElement);
    expect(inserted).toEqual([overlay]);
    expect(overlay.style.pointerEvents).toBe('none');
    expect(overlay.style.position).toBe('fixed');
    expect(overlay.attrs['aria-hidden']).toBe('true');
  });

  it('acompanha o tamanho e a densidade da tela; apaga a cada quadro; dispose remove o canvas', () => {
    const ctx = fakeCtx();
    const el = fakeCanvas(ctx);
    const o = new Overlay2D({ after() {} } as unknown as HTMLCanvasElement, () => el as unknown as HTMLCanvasElement);
    expect(o.begin(400, 200, 2)).toBe(ctx);
    expect([el.width, el.height]).toEqual([800, 400]);
    expect(ctx.calls).toEqual(['transform:2,0,0,2,0,0', 'clear']);
    el.width = 1; // se algo mexesse no canvas, só o tamanho novo o redimensiona
    o.begin(400, 200, 2);
    expect(el.width).toBe(1);
    o.begin(500, 200, 2);
    expect(el.width).toBe(1000);
    o.dispose();
    expect(el.removed).toHaveLength(1);
  });

  it('sem contexto 2D não desenha nada', () => {
    const o = new Overlay2D({ after() {} } as unknown as HTMLCanvasElement, () => fakeCanvas(null) as unknown as HTMLCanvasElement);
    expect(o.begin(10, 10, 1)).toBeNull();
  });

  it('vinheta de dano: nada em 0; borda com 45% de alfa × intensidade; fade: nada em 0, limitado a 1', () => {
    const a = fakeCtx();
    drawHurtVignette(a as unknown as CanvasRenderingContext2D, 100, 50, 0);
    expect(a.calls).toEqual([]);
    drawHurtVignette(a as unknown as CanvasRenderingContext2D, 100, 50, 0.5);
    expect(a.stops[1][1]).toBe('rgba(255, 40, 80, 0.225)');
    expect(a.calls).toEqual(['fill:0,0,100,50']);
    const b = fakeCtx();
    drawFade(b as unknown as CanvasRenderingContext2D, 100, 50, undefined);
    drawFade(b as unknown as CanvasRenderingContext2D, 100, 50, 0);
    expect(b.calls).toEqual([]);
    drawFade(b as unknown as CanvasRenderingContext2D, 100, 50, 3);
    expect(b.fillStyle).toBe('rgba(10, 6, 16, 1)');
  });
});
