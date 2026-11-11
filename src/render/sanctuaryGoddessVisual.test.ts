import { describe, expect, it } from 'vitest';
import {
  GODDESS_BILLBOARD_CANVAS,
  GODDESS_SHADOW_RADII,
  sanctuaryGoddessVisualPlacement,
} from './sanctuaryGoddessVisual';

describe('Santuário Three.js — Deusa flutuante com sombra física', () => {
  it('ancora o desenho na base da textura, sem deslocar seus pés lógicos', () => {
    expect(GODDESS_BILLBOARD_CANVAS).toEqual({
      width: 256, height: 320, drawX: 128, groundY: 320, zoom: 3,
    });
    expect(GODDESS_BILLBOARD_CANVAS.groundY)
      .toBe(GODDESS_BILLBOARD_CANVAS.height);
  });

  it('alinha a sombra ao ponto de colisão sem adiantar o billboard na direção da câmera', () => {
    const position = sanctuaryGoddessVisualPlacement({
      x: 25.5, y: -8.5, z: 0, visualZ: 0,
    }, 0);
    expect(position.billboard).toEqual({ x: 25.5, y: 0.03, z: -8.5 });
    expect(position.shadow).toEqual({ x: 25.5, y: 0.018, z: -8.5 });
    expect(position.billboard.z).toBe(position.shadow.z);
  });

  it('a sombra acompanha o nível real de apoio, não a altitude suavizada do sprite', () => {
    const position = sanctuaryGoddessVisualPlacement({
      x: -3.2, y: 7.5, z: 2, visualZ: 0.4,
    }, 10);
    expect(position.shadow).toEqual({ x: -3.2, y: 2.018, z: 7.5 });
    expect(position.billboard.y).toBeCloseTo(0.43, 6);
  });

  it('a sombra não pula com a animação, só muda suavemente de escala', () => {
    const base = { x: 1, y: 2, z: 0, visualZ: 0 };
    const p1 = sanctuaryGoddessVisualPlacement(base, 0);
    const p2 = sanctuaryGoddessVisualPlacement(base, Math.PI / (2 * 2.4));
    expect(p1.shadow).toEqual(p2.shadow);
    expect(p1.billboard).toEqual(p2.billboard);
    expect(p2.shadowRadii.x).toBeLessThan(p1.shadowRadii.x);
    expect(p2.shadowRadii.z).toBeLessThan(p1.shadowRadii.z);
    expect(p1.shadowRadii.x).toBeGreaterThan(0);
    expect(p1.shadowRadii.x).toBeLessThanOrEqual(GODDESS_SHADOW_RADII.x);
    expect(p1.shadowRadii.z).toBeLessThanOrEqual(GODDESS_SHADOW_RADII.z);
  });
});
