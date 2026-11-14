import { describe, expect, it } from 'vitest';
import { Camera, initialZoomMultiplier, LANDSCAPE_INITIAL_ZOOM,
  PORTRAIT_INITIAL_ZOOM, MIN_ZOOM_MUL, MAX_ZOOM_MUL } from './camera';

describe('Zoom do jogo — padrões mobile/tablet e menu', () => {
  it('usa 1,91× na horizontal e 0,95× na vertical', () => {
    expect(initialZoomMultiplier(false)).toBe(1.91);
    expect(initialZoomMultiplier(true)).toBe(0.95);
    expect(LANDSCAPE_INITIAL_ZOOM).toBe(1.91);
    expect(PORTRAIT_INITIAL_ZOOM).toBe(0.95);
  });

  it('permite 1,91× sem ser cortado pelo limite antigo de 1,6×', () => {
    const cam = new Camera();
    cam.resize(844, 390);
    cam.setZoomMultiplier(initialZoomMultiplier(false));
    expect(cam.zoomMul).toBeCloseTo(1.91);
    expect(cam.zoom).toBeGreaterThan(0);
    expect(MAX_ZOOM_MUL).toBeGreaterThanOrEqual(1.91);
  });

  it('o toque em + e − varia o multiplicador no mesmo passo e admite ajustes sucessivos', () => {
    const cam = new Camera();
    cam.setZoomMultiplier(initialZoomMultiplier(true));
    cam.resize(390, 844);
    const before = cam.zoom;
    cam.zoomBy(1.15);
    expect(cam.zoomMul).toBeCloseTo(0.95 * 1.15);
    expect(cam.zoom).toBeGreaterThan(before);
    cam.zoomBy(1 / 1.15);
    expect(cam.zoomMul).toBeCloseTo(PORTRAIT_INITIAL_ZOOM);
    expect(cam.zoom).toBeCloseTo(before);
  });

  it('limita o zoom e ignora entradas inválidas sem prejudicar o estado', () => {
    const cam = new Camera();
    cam.setZoomMultiplier(50);
    expect(cam.zoomMul).toBe(MAX_ZOOM_MUL);
    cam.setZoomMultiplier(0.01);
    expect(cam.zoomMul).toBe(MIN_ZOOM_MUL);
    cam.zoomBy(-1);
    cam.zoomBy(Number.NaN);
    cam.setZoomMultiplier(Infinity);
    expect(cam.zoomMul).toBe(MIN_ZOOM_MUL);
  });

  it('reaplicar o preset em uma rotação é absoluto (não multiplica o valor anterior)', () => {
    const cam = new Camera();
    cam.resize(844, 390);
    cam.setZoomMultiplier(initialZoomMultiplier(false));
    cam.setZoomMultiplier(initialZoomMultiplier(true));
    cam.resize(390, 844);
    expect(cam.zoomMul).toBeCloseTo(0.95);
    cam.setZoomMultiplier(initialZoomMultiplier(false));
    expect(cam.zoomMul).toBeCloseTo(1.91);
  });
});
