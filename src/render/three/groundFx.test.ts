import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { glintAlpha } from '../groundFxMath';
import { GroundFx, type GroundFxSource } from './groundFx';

function setup(over: Partial<GroundFxSource> = {}) {
  const scene = new THREE.Scene();
  const flows: Array<{ x: number; y: number; from: 'west' | 'east' | 'south' | 'north'; t: number }> = [];
  const src: GroundFxSource = {
    seed: 42, createCanvas: () => ({ getContext: () => null } as unknown as HTMLCanvasElement), isOpenWater: () => true, waterFlows: () => flows, flowSheet: () => null, ...over,
  };
  return { scene, flows, fx: new GroundFx(scene, src) };
}
const view = { x0: 0, y0: 0, x1: 30, y1: 20 };

describe('GroundFx (brilho da água, água enchendo, nuvens)', () => {
  it('brilhos: só nas células de água aberta e nunca acima do teto do pool', () => {
    const open = setup();
    let max = 0;
    for (let t = 0; t < 30; t += 0.1) { open.fx.update(view, t); max = Math.max(max, open.fx.glintCount); }
    expect(max).toBeGreaterThan(0);
    expect(max).toBeLessThanOrEqual(96);
    const dry = setup({ isOpenWater: () => false });
    for (let t = 0; t < 30; t += 0.1) { dry.fx.update(view, t); expect(dry.fx.glintCount).toBe(0); }
  });

  it('brilho acende exatamente nas células com intensidade > 0 (mesma matemática)', () => {
    const { fx } = setup();
    const t = 1.3;
    let expected = 0;
    for (let y = 0; y <= 20; y++) for (let x = 0; x <= 30; x++) if (glintAlpha(42, x, y, t) > 0) expected++;
    fx.update(view, t);
    expect(fx.glintCount).toBe(Math.min(96, expected));
  });

  it('nuvens: sombras visíveis, no máximo o teto do pool', () => {
    const { fx } = setup();
    fx.update(view, 0);
    expect(fx.visibleClouds).toBeGreaterThan(0);
    expect(fx.visibleClouds).toBeLessThanOrEqual(16);
  });

  it('água enchendo: sem a folha de arte nada aparece; com ela, um plano por buraco com o quadro e a linha certos', () => {
    const noArt = setup();
    noArt.flows.push({ x: 4, y: 6, from: 'east', t: 0.6 });
    noArt.fx.update(view, 0);
    expect(noArt.fx.visibleFlows).toBe(0);

    const sheet = {} as HTMLCanvasElement;
    const { fx, flows, scene } = setup({ flowSheet: () => sheet });
    flows.push({ x: 4, y: 6, from: 'east', t: 0.6 }, { x: 9, y: 2, from: 'north', t: 0 });
    fx.update(view, 0);
    expect(fx.visibleFlows).toBe(2);
    const planes = scene.children.filter((o) => o.name === 'Mundo: água enchendo') as THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>[];
    expect(planes[0].position.toArray()).toEqual([4.5, 0.025, 6.5]);
    const off0 = planes[0].material.map!.offset;
    expect(off0.x).toBeCloseTo(2 * 0.25);          // t 0,6 → quadro 2
    expect(off0.y).toBeCloseTo(1 - 2 * 0.25);      // leste = linha 1 (de cima) → v = 1 − 2/4
    expect(planes[1].material.map!.offset.y).toBeCloseTo(1 - 4 * 0.25); // norte = linha 3
    flows.length = 0;
    fx.update(view, 0);
    expect(fx.visibleFlows).toBe(0);
  });

  it('dispose remove tudo da cena', () => {
    const { fx, scene } = setup();
    fx.update(view, 0);
    fx.dispose();
    expect(scene.children).toHaveLength(0);
  });
});
