import { describe, expect, it } from 'vitest';
import { chooseWorldRenderer, useSolidPhysics } from './rendererChoice';

describe('escolha do renderer do Mundo (a virada, M6)', () => {
  it('3D é o padrão com WebGL; sem WebGL cai no 2D', () => {
    expect(chooseWorldRenderer('', true)).toBe('3d');
    expect(chooseWorldRenderer('?seed=42', true)).toBe('3d');
    expect(chooseWorldRenderer('', false)).toBe('2d');
    expect(chooseWorldRenderer('?render=3d', false)).toBe('2d'); // forçar 3D não cria WebGL
  });

  it('?render=2d volta ao Canvas 2D (reserva); ?render=3d com WebGL continua no 3D', () => {
    expect(chooseWorldRenderer('?render=2d', true)).toBe('2d');
    expect(chooseWorldRenderer('?seed=7&render=2d&fps=1', true)).toBe('2d');
    expect(chooseWorldRenderer('?render=3d', true)).toBe('3d');
    expect(chooseWorldRenderer('?render=qualquer', true)).toBe('3d');
  });

  it('física sem degrau só no 3D; ?fisica=degrau devolve a regra antiga mesmo no 3D', () => {
    expect(useSolidPhysics('', '3d')).toBe(true);
    expect(useSolidPhysics('?render=3d', '3d')).toBe(true);
    expect(useSolidPhysics('?fisica=degrau', '3d')).toBe(false);
    expect(useSolidPhysics('', '2d')).toBe(false);
    expect(useSolidPhysics('?fisica=solida', '2d')).toBe(false); // a flag antiga não liga nada no 2D
    expect(useSolidPhysics('?fisica=solida', '3d')).toBe(true);
  });
});
