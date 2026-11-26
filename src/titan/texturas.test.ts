import { describe, expect, it } from 'vitest';
import { ROWS, showcaseCells, STEP, TexturesGen, texturesCaption, texturesSession, X0 } from './texturas';
import { BLOCK_NAMES, isSolid, T, tileFor } from './voxel';

describe('cena de texturas (dev)', () => {
  it('o piso é rocha-mãe, a piscina é água e a chegada tem espaço livre', () => {
    const g = new TexturesGen(1);
    expect(g.blockAt(10, 63, -10)).toBe(T.BEDROCK);
    expect(g.blockAt(10, 64, -10)).toBe(T.AIR);
    expect(g.blockAt(2, 62, 32)).toBe(T.LAKE);
    expect(g.blockAt(2, 60, 32)).toBe(T.BEDROCK);
    const a = g.arrival;
    for (let y = a.y; y < a.y + 3; y++) expect(isSolid(g.blockAt(Math.floor(a.x), y, Math.floor(a.z)))).toBe(false);
  });

  it('cada bloco da vitrine ganha cubo, massa 3×3×3 e parede 3×3, sem células repetidas, e tem nome e tile', async () => {
    const s = texturesSession(1, 'orvalis');
    ROWS.forEach((row) => row.blocks.forEach((id, i) => {
      const cells = showcaseCells(id, i, row.z0);
      expect(cells).toHaveLength(1 + 27 + 9);
      expect(new Set(cells.map(([x, y, z]) => `${x},${y},${z}`)).size).toBe(cells.length);
      for (const [x, y, z] of cells) expect(s.volume.get(x, y, z)).toBe(id);
      expect(BLOCK_NAMES[id]).toBeTruthy();
      expect(tileFor(id, 'top')).toBeGreaterThanOrEqual(0);
    }));
    for (const r of ROWS) expect(X0 + (r.blocks.length - 1) * STEP + 2).toBeLessThan(64); // cabe na região
  });

  it('a legenda lista os blocos das duas fileiras', () => {
    const c = texturesCaption();
    expect(c).toHaveLength(4);
    expect(c[0]).toContain('Terra com Grama');
    expect(c[1]).toContain('Tábuas de Carvalho'); expect(c[2]).toContain('Areia ocre');
  });
});
