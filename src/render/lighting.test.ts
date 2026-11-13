import { describe, expect, it } from 'vitest';
import { Block } from '../world/blocks';
import {
  AMBIENT_PRESETS, flickerFactor, glowLightFor, lightFalloff, lightIntensityAt, type LightSource, MAX_LIGHTS, parseAmbient, pickLights,
} from './lighting';

const light = (x: number, z: number, radius = 3): LightSource => ({ x, z, height: 0.5, radius, color: [1, 1, 1], flicker: 0 });

describe('iluminação (ADR 0029)', () => {
  it('?luz=: presets, número 0–1; ausente, inválido, off ou ≥ 1 desligam', () => {
    expect(parseAmbient('noite')).toBe(AMBIENT_PRESETS.noite);
    expect(parseAmbient('Penumbra')).toBe(AMBIENT_PRESETS.penumbra);
    expect(parseAmbient('0.3')).toBe(0.3);
    expect(parseAmbient('0,4')).toBe(0.4);
    expect(parseAmbient('-2')).toBe(0);
    expect(parseAmbient('1')).toBeNull();
    expect(parseAmbient('off')).toBeNull();
    expect(parseAmbient('')).toBeNull();
    expect(parseAmbient(null)).toBeNull();
  });

  it('decaimento: 1 no centro, 0 no raio e além, sempre decrescendo', () => {
    expect(lightFalloff(0, 4)).toBe(1);
    expect(lightFalloff(4, 4)).toBe(0);
    expect(lightFalloff(9, 4)).toBe(0);
    expect(lightFalloff(0, 0)).toBe(0);
    let prev = 1;
    for (let d = 0.25; d <= 4; d += 0.25) { const v = lightFalloff(d, 4); expect(v).toBeLessThanOrEqual(prev); prev = v; }
  });

  it('intensidade num ponto é a maior das luzes; fora de todas é 0', () => {
    const ls = [light(0, 0, 3), light(10, 0, 3)];
    expect(lightIntensityAt(ls, 0, 0)).toBe(1);
    expect(lightIntensityAt(ls, 5, 0)).toBe(0);
    expect(lightIntensityAt(ls, 10, 1)).toBeGreaterThan(0);
  });

  it('só blocos que brilham emitem luz; fogo oscila e cristal não', () => {
    expect(glowLightFor(Block.STONE)).toBeNull();
    expect(glowLightFor(Block.OAK_PLANKS)).toBeNull();
    expect(glowLightFor(Block.LIGHT_BLOCK)).not.toBeNull();
    expect(glowLightFor(Block.CAMPFIRE)!.flicker).toBeGreaterThan(0);
    expect(glowLightFor(Block.CRYSTAL_LIFE)!.flicker).toBe(0);
  });

  it('oscilação determinística e limitada; sem oscilação vale 1', () => {
    expect(flickerFactor(0, 3, 7)).toBe(1);
    expect(flickerFactor(0.12, 3, 7)).toBe(flickerFactor(0.12, 3, 7));
    for (let t = 0; t < 5; t += 0.1) expect(Math.abs(flickerFactor(0.12, t, 4) - 1)).toBeLessThanOrEqual(0.12 + 1e-9);
  });

  it('escolhe as mais próximas do foco, respeita o teto e descarta as fora de alcance', () => {
    const many = Array.from({ length: 30 }, (_, i) => light(i, 0, 2));
    const picked = pickLights(many, { x: 0, z: 0 }, 6, 5);
    expect(picked).toHaveLength(5);
    expect(picked.map((l) => l.x)).toEqual([0, 1, 2, 3, 4]);
    expect(pickLights(many, { x: 0, z: 0 }, 6)).toHaveLength(Math.min(MAX_LIGHTS, 9)); // d − raio ≤ 6 → x de 0 a 8 (9 luzes)
    expect(pickLights([light(100, 100, 2)], { x: 0, z: 0 }, 10)).toEqual([]);
  });
});
