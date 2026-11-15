import { describe, expect, it } from 'vitest';
import { useSolidPhysics } from './rendererChoice';

describe('opções do renderer do Mundo (o Canvas 2D foi removido na v0.93.105)', () => {
  it('física sem degrau por padrão; ?fisica=degrau devolve a regra antiga', () => {
    expect(useSolidPhysics('')).toBe(true);
    expect(useSolidPhysics('?seed=7&render=2d')).toBe(true); // a flag antiga ?render=2d não muda nada
    expect(useSolidPhysics('?fisica=solida')).toBe(true);
    expect(useSolidPhysics('?fisica=degrau')).toBe(false);
  });
});
