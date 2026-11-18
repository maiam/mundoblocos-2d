import { describe, expect, it } from 'vitest';
import { WORLD_PROFILES } from '../../world/profiles';
import { LANDSCAPE_HUT } from '../../world/sanctuaryLandscape';
import { World } from '../../world/world';
import { computeCutaway } from './cutaway';

const world = (): World => {
  const w = new World(1, WORLD_PROFILES.santuario);
  for (let cx = -2; cx <= 1; cx++) for (let cy = -2; cy <= 1; cy++) w.loadChunk(cx, cy);
  return w;
};
const { x: HX, y: HY, w: HW, h: HH } = LANDSCAPE_HUT;

describe('corte da casa (telhado some quando a jogadora está dentro)', () => {
  it('dentro da casa: a construção toda (paredes + telhado) esconde o que passa do 1º nível de parede', () => {
    const w = world();
    const cut = computeCutaway(w, HX + 2, HY + 2);
    expect(cut).not.toBeNull();
    expect(cut!.size).toBe(HW * HH); // as 30 células da casa (interior e paredes)
    expect([...cut!.values()].every((v) => v === 3)).toBe(true); // piso em 2 → esconde do nível 3 para cima
    expect(cut!.has(HX + ',' + HY)).toBe(true); // canto (parede)
  });

  it('fora da casa, ou em cima do telhado, nada é cortado', () => {
    const w = world();
    expect(computeCutaway(w, 0, 0)).toBeNull(); // clareira
    expect(computeCutaway(w, HX - 2, HY + 2)).toBeNull(); // ao lado da casa
    expect(computeCutaway(w, HX + 2, HY + HH + 1)).toBeNull(); // diante da porta
    // sobre o telhado (piso mais alto): sem telhado acima
    expect(w.standHeight(HX + 2, HY + 2)).toBe(2);
  });
});
