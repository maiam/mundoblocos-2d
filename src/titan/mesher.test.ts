import { describe, expect, it } from 'vitest';
import { TitanGenerator } from './generator';
import { meshSection, tileUV } from './mesher';
import { TitanVolume } from './volume';
import tilesCfg from './tiles.json';
import { T } from './voxel';

describe('malha por seção', () => {
  it('uv de cada tile cai na área útil de 32 px (sem a borda de 2 px do atlas de 36 px de passo, 8 colunas)', () => {
    const W = 288, H = 216;
    const [u0, v0, u1, v1] = tileUV(0);
    [u0 * W, u1 * W, (1 - v1) * H, (1 - v0) * H].forEach((n, i) => expect(n).toBeCloseTo([2, 34, 2, 34][i], 6));
    const [a, , b] = tileUV(9); // 2.ª coluna da 2.ª linha: x = 1 * 36 + 2
    expect(a * W).toBeCloseTo(38, 6); expect(b * W).toBeCloseTo(70, 6);
    const [, w0, , w1] = tileUV(17); // 2.ª linha (índice 8..15) e a 3.ª (16..23): linha 2, coluna 1
    expect((1 - w1) * H).toBeCloseTo(2 * 36 + 2, 6); expect((1 - w0) * H).toBeCloseTo(2 * 36 + 34, 6);
  });
  it('o atlas de terreno cobre todos os tiles do tiles.json com 41 entradas únicas', () => {
    expect(new Set(tilesCfg.tiles).size).toBe(tilesCfg.tiles.length); expect(tilesCfg.tiles).toHaveLength(41); expect(tilesCfg.cols * tilesCfg.cols).toBeGreaterThanOrEqual(tilesCfg.tiles.length);
  });
  it('seção de ar não gera malha; a da superfície gera faces e o lago tem malha própria', () => {
    const g = new TitanGenerator(42), v = new TitanVolume(g);
    expect(meshSection(v, 0, 20, 0)).toEqual({ opaque: null, liquid: null });
    const lk = g.lake;
    const m = meshSection(v, Math.floor(lk.x / 16), 7, Math.floor(lk.z / 16)); // y 48..63: topo do lago
    expect(m.liquid).not.toBeNull();
    expect(m.opaque).not.toBeNull();
  });
  it('sem frestas na divisa: remover o bloco de uma borda cria a face exposta na seção vizinha e some da própria', () => {
    const g = new TitanGenerator(42), v = new TitanVolume(g);
    // sólido em volta: coloca dois blocos lado a lado atravessando a divisa x=15|16 no ar, sobre y=150
    v.place(15, 150, 0, T.SAND); v.place(16, 150, 0, T.SAND);
    const quads = (cx: number): number => (meshSection(v, cx, 13, 0).opaque?.idx.length ?? 0) / 6; // y 150 → seção 13
    const before = [quads(0), quads(1)];
    expect(before).toEqual([5, 5]); // a face voltada ao vizinho está escondida nas duas malhas
    v.remove(16, 150, 0);
    expect(quads(0)).toBe(6); // a face +X do bloco 15 aparece sem refazer nada do outro lado além da própria seção
    expect(quads(1)).toBe(0);
  });
});
