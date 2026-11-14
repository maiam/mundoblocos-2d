import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { angleDiff, FISH_SCARE, fishAlpha, fishYaw, newFish, pickSpecies, spawnPoint, stepFish } from './fishSim';
import { WaterFish } from './three/waterFish';

const pond = (x: number, z: number) => x > 0 && x < 20 && z > 0 && z < 20; // lago quadrado de 20 × 20

describe('fishSim (peixes de ambiente)', () => {
  it('angleDiff é a menor diferença com sinal', () => {
    expect(angleDiff(0.1, 0.3)).toBeCloseTo(0.2);
    expect(angleDiff(Math.PI - 0.1, -Math.PI + 0.1)).toBeCloseTo(0.2);
    expect(Math.abs(angleDiff(0, Math.PI * 2))).toBeLessThan(1e-9);
  });

  it('nunca sai da água: vira antes da margem, durante um minuto de nado', () => {
    const f = newFish(10, 10, 0, 0.3, 0.5, 0.5);
    for (let i = 0; i < 60 * 60; i++) {
      stepFish(f, 1 / 60, pond, null, 0.9);
      expect(pond(f.x, f.z), `passo ${i} em ${f.x.toFixed(2)},${f.z.toFixed(2)}`).toBe(true);
    }
  });

  it('foge do jogador que chega perto (corre mais e vira para longe) e some ao fim da vida', () => {
    const f = newFish(10, 10, 1, 0.5, 0.5, 0.5);
    const calm = f.speed;
    const player = { x: 10 - FISH_SCARE / 2, z: 10 }; // a oeste: o peixe foge para leste
    for (let i = 0; i < 90; i++) stepFish(f, 1 / 60, pond, player, 0.9);
    expect(f.flee).toBeGreaterThan(0);
    expect(f.speed).toBeGreaterThan(calm * 1.5);
    expect(f.x).toBeGreaterThan(10);
    f.life = 0.01;
    expect(stepFish(f, 0.1, pond, null, 0.9)).toBe(false);
  });

  it('opacidade: entra e sai devagar; o desenho (cabeça a nordeste) gira para a direção de nado', () => {
    const f = newFish(5, 5, 0, 0.2, 0.2, 0.2);
    expect(fishAlpha(f)).toBe(0);
    f.age = 5; f.life = 10;
    expect(fishAlpha(f)).toBe(1);
    f.life = 0.75;
    expect(fishAlpha(f)).toBeCloseTo(0.5);
    expect(fishYaw(Math.PI / 4)).toBeCloseTo(0); // já aponta para nordeste: sem giro
    expect(fishYaw(Math.PI / 4 + 1)).toBeCloseTo(1);
  });

  it('espécies pela chance (a carpa é a mais comum) e ponto de nascimento só com água em volta (determinístico)', () => {
    expect(pickSpecies(0.1)).toBe(0);
    expect(pickSpecies(0.99)).toBe(3);
    const a = spawnPoint(42, 7, 10, 10, 2, 6, pond), b = spawnPoint(42, 7, 10, 10, 2, 6, pond);
    expect(a).toEqual(b);
    expect(a).not.toBeNull();
    expect(spawnPoint(42, 7, 0.2, 0.2, 0.1, 0.3, pond)).toBeNull(); // junto à margem: a vizinhança 3 × 3 não é toda água
  });

  it('WaterFish: nasce cardume perto da câmera, nunca passa do limite, limpa e libera', () => {
    const scene = new THREE.Scene();
    const img = {} as HTMLImageElement;
    const images = new Map([['carp', 1], ['silver', 1], ['perch', 1], ['gold', 1]].map(([s]) => ['water-fish-' + s, img] as const));
    const fish = new WaterFish(scene, 42, images);
    for (let i = 0; i < 200; i++) fish.update(0.1, { x: 10, z: 10 }, 12, null, pond);
    expect(fish.live).toBeGreaterThan(0);
    expect(fish.live).toBeLessThanOrEqual(18);
    fish.clear();
    expect(fish.live).toBe(0);
    fish.dispose();
    expect(scene.children).toHaveLength(0);
  });
});
