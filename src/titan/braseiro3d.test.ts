import { describe, expect, it } from 'vitest';
import { BRAZIER_SIZE, modelBox } from './models';
import { raycast } from './physics';
import { MemoryTitanStorage } from './save';
import { openSession } from './session';
import { BRAZIER_HEIGHT, T, blockSpan, blocksLight, isBrazier, isFull, isModelBlock, isSolid, isTarget, modelOf } from './voxel';

/** Braseiro de Rocha 3D (ADR 0092): modelo instanciado, apagado e aceso, com altura própria. */
const open = async () => openSession(new MemoryTitanStorage(), 42, () => 1, undefined, 2);
const Y = 150;

describe('braseiro 3D: regras do bloco', () => {
  it('apagado e aceso são modelos distintos, sólidos até 0,774 m, não cubo, e saem da malha do terreno', () => {
    expect(modelOf(T.BRAZIER)).toEqual({ kind: 'braseiro', turn: 0 });
    expect(modelOf(T.BRAZIER_LIT)).toEqual({ kind: 'braseiroAceso', turn: 0 });
    for (const id of [T.BRAZIER, T.BRAZIER_LIT]) {
      expect(isBrazier(id) && isSolid(id) && isTarget(id) && isModelBlock(id)).toBe(true); expect(blocksLight(id)).toBe(false); // deixa a luz passar (ADR 0119)
      expect(isFull(id)).toBe(false); expect(blockSpan(id)).toEqual([0, BRAZIER_HEIGHT]);
    }
    expect(BRAZIER_HEIGHT).toBeCloseTo(0.774, 3);
  });
  it('a caixa da mira é a do modelo (0,935 de lado, centrada) com folga de toque', () => {
    expect(modelBox(T.BRAZIER, 10, 5, 20)).toEqual([10.5 - BRAZIER_SIZE.w / 2, 5, 20.5 - BRAZIER_SIZE.d / 2, 10.5 + BRAZIER_SIZE.w / 2, 5 + BRAZIER_HEIGHT, 20.5 + BRAZIER_SIZE.d / 2]);
    const p = modelBox(T.BRAZIER_LIT, 10, 5, 20, 0.1), q = modelBox(T.BRAZIER_LIT, 10, 5, 20);
    expect(p[3] - q[3]).toBeCloseTo(0.1); expect(p[4] - q[4]).toBeCloseTo(0.1);
  });
});

describe('braseiro 3D: no mundo', () => {
  it('a mira acerta o topo do modelo (0,774 m), passa por cima dele e a instância muda de modelo ao acender', async () => {
    const s = await open(); const v = s.volume, a = v.gen.arrival, x = Math.floor(a.x) + 6, z = Math.floor(a.z) + 6;
    expect(v.place(x, Y, z, T.BRAZIER)).toBe(true);
    expect(v.modelCells('braseiro')).toEqual([[x, Y, z, 0]]); expect(v.modelCells('braseiroAceso')).toEqual([]);
    const baixo = raycast(v, x + 0.5, Y + 2, z + 0.5, 0, -1, 0, 6)!; // de cima: acerta o topo
    expect([baixo.x, baixo.y, baixo.z, baixo.ny]).toEqual([x, Y, z, 1]); expect(baixo.hy).toBeCloseTo(BRAZIER_HEIGHT, 2);
    expect(raycast(v, x + 0.5, Y + 0.9, z - 2.5, 0, 0, 1, 6)).toBeNull(); // raio rente, acima de 0,774 m: passa por cima
    expect(raycast(v, x + 0.5, Y + 0.4, z - 2.5, 0, 0, 1, 6)).toMatchObject({ x, y: Y, z });
    v.set(x, Y, z, T.BRAZIER_LIT); // o braseiro acende (a sessão troca o id)
    expect(v.modelCells('braseiro')).toEqual([]); expect(v.modelCells('braseiroAceso')).toEqual([[x, Y, z, 0]]);
    v.remove(x, Y, z);
    expect(v.modelCells('braseiroAceso')).toEqual([]);
  });
});
