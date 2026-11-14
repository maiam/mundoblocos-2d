import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import type { World } from '../../world/world';
import { SelectionMarkers } from './selection';

const fakeWorld = { inBounds: (x: number, y: number) => x >= 0 && y >= 0 && x < 10 && y < 10, stackHeight: () => 2, cubeLevels: 1 } as unknown as World;

function markers(): { scene: THREE.Scene; sel: SelectionMarkers; marks: THREE.Mesh[] } {
  const scene = new THREE.Scene();
  const sel = new SelectionMarkers(scene, fakeWorld);
  return { scene, sel, marks: scene.children as THREE.Mesh[] };
}

describe('SelectionMarkers (núcleo 3D genérico)', () => {
  it('realce de cursor: no topo da pilha da célula; some se inválido ou fora do mundo', () => {
    const { sel, marks } = markers();
    sel.update({ hover: { x: 3, y: 4, valid: true }, focus: null, breaking: null });
    expect(marks[0].visible).toBe(true);
    expect(marks[0].position.toArray()).toEqual([3.5, 2.03, 4.5]);
    sel.update({ hover: { x: 3, y: 4, valid: false }, focus: null, breaking: null });
    expect(marks[0].visible).toBe(false);
    sel.update({ hover: { x: 30, y: 4, valid: true }, focus: null, breaking: null });
    expect(marks[0].visible).toBe(false);
  });

  it('na regra de blocos de 1/4 (cubeLevels 4) o realce sobe em células, não em níveis', () => {
    const scene = new THREE.Scene();
    const world = { inBounds: () => true, stackHeight: () => 2, cubeLevels: 4 } as unknown as World;
    const sel = new SelectionMarkers(scene, world);
    sel.update({ hover: { x: 3, y: 4, valid: true }, focus: null, breaking: null });
    expect((scene.children[0] as THREE.Mesh).position.y).toBeCloseTo(0.5 + 0.03);
  });

  it('o foco vale quando não há cursor; quebra: opacidade cresce com o progresso e é limitada', () => {
    const { sel, marks } = markers();
    sel.update({ hover: null, focus: { x: 1, y: 1, valid: true }, breaking: { x: 2, y: 2, progress: 0 } });
    expect(marks[0].position.x).toBe(1.5);
    const op0 = (marks[1].material as THREE.MeshBasicMaterial).opacity;
    sel.update({ hover: null, focus: null, breaking: { x: 2, y: 2, progress: 1 } });
    const op1 = (marks[1].material as THREE.MeshBasicMaterial).opacity;
    expect(op0).toBeCloseTo(0.12);
    expect(op1).toBeCloseTo(0.58);
    expect(marks[1].visible).toBe(true);
    sel.update({ hover: null, focus: null, breaking: null });
    expect(marks[1].visible).toBe(false);
  });
});
