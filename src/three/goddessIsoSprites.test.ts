import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  goddessIsoDirectionByInput,
  goddessIsoAnimationFrame,
  setGoddessIsoFrame,
  GODDESS_ISO_FILES,
} from './goddessIsoSprites';

describe('Deusa isométrica — 4×4 por animação', () => {
  it('preserva exatamente as quatro direções e mantém a última ao parar', () => {
    expect(goddessIsoDirectionByInput(0, 1, 'left')).toBe('down');
    expect(goddessIsoDirectionByInput(0, -1, 'left')).toBe('up');
    expect(goddessIsoDirectionByInput(-1, 0, 'down')).toBe('left');
    expect(goddessIsoDirectionByInput(1, 0, 'up')).toBe('right');
    expect(goddessIsoDirectionByInput(0, 0, 'right')).toBe('right');
    expect(goddessIsoDirectionByInput(0.05, 0.05, 'up')).toBe('up');
    expect(Object.values(GODDESS_ISO_FILES)).toEqual([
      'deusa_iso_idle_4x4.png', 'deusa_iso_walk_4x4.png', 'deusa_iso_sit_4x4.png',
    ]);
  });

  it('recorta a folha nas mesmas células 4×4 sem usar o atlas 7×4 antigo', () => {
    const t = new THREE.Texture();
    for (const [facing, row] of [['down',0],['left',1],['right',2],['up',3]] as const) {
      for (let column = 0; column < 4; column++) {
        setGoddessIsoFrame(t, facing, column);
        expect(t.repeat.x).toBeCloseTo(0.25);
        expect(t.repeat.y).toBeCloseTo(0.25);
        expect(t.offset.x).toBeCloseTo(column / 4);
        expect(t.offset.y).toBeCloseTo(1 - (row + 1) / 4);
      }
    }
    t.dispose();
  });

  it('caminha em loop de quatro frames e senta sem perder a pose de repouso', () => {
    expect([0, 0.12, 0.24, 0.36, 0.48].map(t =>
      goddessIsoAnimationFrame('walk', t, t))).toEqual([0,1,2,3,0]);
    expect(goddessIsoAnimationFrame('idle', 0, 0)).toBe(0);
    expect(goddessIsoAnimationFrame('sit', 0, 0, 2)).toBe(2);
    expect(goddessIsoAnimationFrame('sit', 0, 0, 5)).toBe(3);
  });
});
