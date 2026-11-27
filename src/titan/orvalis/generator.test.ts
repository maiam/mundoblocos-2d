import { describe, expect, it } from 'vitest';
import { isSolid, T, Y_MAX, Y_MIN } from '../voxel';
import { ORVALIS_GENERATOR_VERSION, OrvalisGenerator, orvalisGeneratorFor } from './generator';

const SEEDS = [1, 7, 42, 99, 2024, 31337, 123456789, 4000000000];

describe('Orvalis em voxel — gerador (ADR 0105)', () => {
  it('é determinístico: mesma seed e versão dão os mesmos voxels, em qualquer ordem de leitura', () => {
    const a = new OrvalisGenerator(42), b = new OrvalisGenerator(42);
    const cells: Array<[number, number, number]> = [];
    for (let i = 0; i < 400; i++) cells.push([((i * 37) % 128) - 64, 40 + ((i * 11) % 60), ((i * 53) % 128) - 64]);
    const fwd = cells.map(([x, y, z]) => a.blockAt(x, y, z));
    const back = [...cells].reverse().map(([x, y, z]) => b.blockAt(x, y, z)).reverse();
    expect(back).toEqual(fwd);
    expect(new OrvalisGenerator(43).blockAt(0, 60, 0)).toBeTypeOf('number');
  });

  it('só devolve ids de bloco conhecidos e rocha-mãe no fundo', () => {
    const g = new OrvalisGenerator(42);
    const ok = new Set<number>([T.AIR, T.LAKE, T.BEDROCK, T.GRASS, T.DIRT, T.STONE, T.BEACH, T.LOG_OAK, T.LEAVES_OAK, T.LOG_CHERRY, T.LEAVES_CHERRY, T.LOG_BIRCH, T.LEAVES_BIRCH, T.COAL_ORE]); // v2: minério de carvão (ADR 0122)
    for (let x = -64; x < 64; x += 3) for (let z = -64; z < 64; z += 3) for (let y = Y_MIN; y <= 130; y += 2) expect(ok.has(g.blockAt(x, y, z))).toBe(true);
    expect(g.blockAt(5, Y_MIN, 5)).toBe(T.BEDROCK);
    expect(g.blockAt(5, Y_MAX, 5)).toBe(T.AIR);
  });

  it('a chegada é uma clareira de grama plana com espaço livre para o corpo, longe das árvores', () => {
    for (const seed of SEEDS) {
      const g = new OrvalisGenerator(seed), a = g.arrival, c = a.clearing;
      for (let z = c.z0; z < c.z0 + c.size; z++) for (let x = c.x0; x < c.x0 + c.size; x++) {
        expect(g.column(x, z).top).toBe(a.y - 1);
        expect(g.blockAt(x, a.y - 1, z)).toBe(T.GRASS);
        for (let y = a.y; y < a.y + 4; y++) expect(isSolid(g.blockAt(x, y, z)) || g.blockAt(x, y, z) === T.LAKE).toBe(false);
      }
      expect(a.y).toBeGreaterThanOrEqual(67);
      expect(g.inRegion(a.x, a.z)).toBe(true);
    }
  });

  it('tem mar nas bordas, praia, mata de verdade (tora e folha) e as três espécies em alguma seed', () => {
    const kinds = new Set<number>();
    for (const seed of SEEDS) {
      const g = new OrvalisGenerator(seed);
      let water = 0, beach = 0, logs = 0, leaves = 0;
      for (let x = -64; x < 64; x++) for (let z = -64; z < 64; z++) {
        const c = g.column(x, z);
        if (c.top < 64) water++;
        if (c.surface === T.BEACH) beach++;
        for (let y = c.top + 1; y <= c.top + 9; y++) { const b = g.blockAt(x, y, z); if (b === T.LOG_OAK || b === T.LOG_BIRCH || b === T.LOG_CHERRY) { logs++; kinds.add(b); } else if (b === T.LEAVES_OAK || b === T.LEAVES_BIRCH || b === T.LEAVES_CHERRY) leaves++; }
      }
      expect(water).toBeGreaterThan(128 * 128 * 0.1); // mar em volta
      expect(beach).toBeGreaterThan(300);
      expect(logs).toBeGreaterThan(80);
      expect(leaves).toBeGreaterThan(logs * 2);
      for (const [x, z] of [[-64, -64], [63, 63], [-64, 63], [0, -64]]) expect(g.column(x, z).top).toBeLessThan(60); // o canto da região é fundo de mar
    }
    expect(kinds.size).toBe(3);
  });

  it('toda árvore tem o tronco inteiro sobre grama e a copa só acima do chão (nada dentro de bloco sólido)', () => {
    const g = new OrvalisGenerator(42);
    for (let x = -50; x < 50; x++) for (let z = -50; z < 50; z++) {
      const c = g.column(x, z);
      for (let y = c.top + 1; y <= c.top + 12; y++) {
        const b = g.blockAt(x, y, z);
        if (b === T.LOG_OAK || b === T.LOG_BIRCH || b === T.LOG_CHERRY) expect(g.blockAt(x, c.top, z)).toBe(T.GRASS); // tronco = sobre grama, e a base tem tora colada ao chão
      }
    }
  });

  it('a fábrica aceita a versão atual e recusa versões desconhecidas', () => {
    expect(orvalisGeneratorFor(1, ORVALIS_GENERATOR_VERSION)).toBeInstanceOf(OrvalisGenerator);
    expect(orvalisGeneratorFor(1, 0)).toBeNull();
    expect(orvalisGeneratorFor(1, ORVALIS_GENERATOR_VERSION + 1)).toBeNull();
    expect(orvalisGeneratorFor(1, 1.5)).toBeNull();
  });
});
