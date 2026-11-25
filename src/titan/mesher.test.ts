import { describe, expect, it } from 'vitest';
import { TitanGenerator } from './generator';
import { meshSection, tileUV } from './mesher';
import { TitanVolume } from './volume';
import tilesCfg from './tiles.json';
import { T } from './voxel';

describe('malha por seção', () => {
  it('uv de cada tile cai na área útil do tile (sem a borda duplicada), no atlas de 16 px e no de 8 px (mesmas proporções)', () => {
    for (const [tile, pad] of [[tilesCfg.tile, tilesCfg.pad], [tilesCfg.iso.tile, tilesCfg.iso.pad]]) {
      const pitch = tile + 2 * pad, W = tilesCfg.cols * pitch, H = Math.ceil(tilesCfg.tiles.length / tilesCfg.cols) * pitch;
      const [u0, v0, u1, v1] = tileUV(0);
      [u0 * W, u1 * W, (1 - v1) * H, (1 - v0) * H].forEach((n, i) => expect(n).toBeCloseTo([pad, pad + tile, pad, pad + tile][i], 6));
      const [a, , b] = tileUV(9); // 2.ª coluna da 2.ª linha
      expect(a * W).toBeCloseTo(pitch + pad, 6); expect(b * W).toBeCloseTo(pitch + pad + tile, 6);
      const [, w0, , w1] = tileUV(17); // 3.ª linha, 2.ª coluna: linha 2
      expect((1 - w1) * H).toBeCloseTo(2 * pitch + pad, 6); expect((1 - w0) * H).toBeCloseTo(2 * pitch + pad + tile, 6);
    }
    expect(tilesCfg.iso.tile * 2).toBe(tilesCfg.tile); expect(tilesCfg.iso.pad * 2).toBe(tilesCfg.pad); // a variante de 8 px vale com os mesmos UVs
  });
  it('o atlas de terreno cobre todos os tiles do tiles.json com 63 entradas únicas', () => {
    expect(new Set(tilesCfg.tiles).size).toBe(tilesCfg.tiles.length); expect(tilesCfg.tiles).toHaveLength(63); expect(tilesCfg.cols * tilesCfg.cols).toBeGreaterThanOrEqual(tilesCfg.tiles.length);
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
