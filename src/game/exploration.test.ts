import { describe, expect, it } from 'vitest';
import { Exploration } from './exploration';

describe('névoa do minimapa (Exploration)', () => {
  it('revela um círculo em volta do jogador, inclusive em coordenadas negativas', () => {
    const e = new Exploration();
    expect(e.revealAround(-1, -1, 3)).toBe(true);
    expect(e.isExplored(-1, -1)).toBe(true);
    expect(e.isExplored(-4, -1)).toBe(true); // borda do raio
    expect(e.isExplored(-4, -4)).toBe(false); // canto fora do círculo
    expect(e.isExplored(2, -1)).toBe(true); // atravessa a borda do chunk
    const n = e.count;
    expect(e.revealAround(-1, -1, 3)).toBe(false); // nada novo
    expect(e.count).toBe(n);
    expect(e.chunk(-1, -1)!.version).toBeGreaterThan(0);
    expect(e.chunk(5, 5)).toBeNull();
  });

  it('ida e volta pelo salvamento; item corrompido é ignorado', () => {
    const e = new Exploration();
    e.revealAround(40, -20, 6);
    const saved = JSON.parse(JSON.stringify(e.toSave()));
    const b = new Exploration();
    b.load([...saved, { cx: 9, cy: 9, bits: '###' }, { cx: 1.5, cy: 0, bits: saved[0].bits }]);
    expect(b.count).toBe(e.count);
    expect(b.isExplored(40, -20)).toBe(true);
    expect(b.isExplored(40, -30)).toBe(false);
  });
});
