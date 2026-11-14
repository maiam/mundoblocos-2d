import { describe, expect, it } from 'vitest';
import { actorLightAt } from './actorLight';
import { actorLightOn } from './rendererChoice';

const len = (v: number[]) => Math.hypot(...v);

describe('Luz dos atores (v0.93.64)', () => {
  it('a direção é unitária e o sol vai de leste (manhã) a oeste (tarde), mais alto ao meio-dia', () => {
    const dawn = actorLightAt(0.27), noon = actorLightAt(0.5), dusk = actorLightAt(0.73);
    for (const l of [dawn, noon, dusk]) expect(len(l.dir)).toBeCloseTo(1, 5);
    expect(dawn.dir[0]).toBeGreaterThan(0.2); // leste
    expect(dusk.dir[0]).toBeLessThan(-0.2); // oeste
    expect(Math.abs(noon.dir[0])).toBeLessThan(0.1);
    expect(noon.dir[1]).toBeGreaterThan(dawn.dir[1]);
    expect(noon.dir[1]).toBeGreaterThan(dusk.dir[1]);
  });

  it('a sombra cai do lado oposto ao sol e é mais comprida com o sol baixo', () => {
    const dawn = actorLightAt(0.27), noon = actorLightAt(0.5);
    expect(Math.sign(dawn.shadow.dx)).toBe(-Math.sign(dawn.dir[0]));
    expect(dawn.shadow.len).toBeGreaterThan(noon.shadow.len);
    expect(noon.shadow.len).toBeGreaterThanOrEqual(1);
    expect(noon.shadow.len).toBeLessThanOrEqual(2.6);
  });

  it('o pôr do sol é mais quente que o meio-dia e a noite é azulada e mais fraca', () => {
    const noon = actorLightAt(0.5), dusk = actorLightAt(0.73), night = actorLightAt(0);
    expect(dusk.color[2] / dusk.color[0]).toBeLessThan(noon.color[2] / noon.color[0]);
    expect(night.color[2]).toBeGreaterThan(night.color[0]);
    expect(Math.max(...night.color)).toBeLessThan(Math.max(...noon.color));
    expect(night.shadow.opacity).toBeLessThan(noon.shadow.opacity);
  });

  it('dentro do covil e de cômodos o sombreado é fraco; a hora é cíclica', () => {
    expect(actorLightAt(0.5, 'dungeon').strength).toBeLessThan(actorLightAt(0.5).strength);
    expect(actorLightAt(0.5, 'interior').strength).toBeLessThan(actorLightAt(0.5).strength);
    expect(actorLightAt(1.5).dir).toEqual(actorLightAt(0.5).dir);
    expect(actorLightAt(-0.5).dir).toEqual(actorLightAt(0.5).dir);
  });

  it('?sombreado=0 desliga o sombreado dos atores (e ?luz= não mexe nele)', () => {
    expect(actorLightOn('')).toBe(true);
    expect(actorLightOn('?luz=0')).toBe(true);
    expect(actorLightOn('?sombreado=1')).toBe(true);
    expect(actorLightOn('?sombreado=0')).toBe(false);
  });
});
