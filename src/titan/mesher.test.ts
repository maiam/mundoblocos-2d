import { describe, expect, it } from 'vitest';
import { TitanGenerator } from './generator';
import { meshSection, tileUV } from './mesher';
import { TitanVolume } from './volume';
import { T } from './voxel';

describe('malha por seção', () => {
  it('uv de cada tile cai na área útil de 16 px (sem a borda de 2 px do atlas)', () => {
    const [u0, v0, u1, v1] = tileUV(0);
    [u0 * 80, u1 * 80, (1 - v1) * 80, (1 - v0) * 80].forEach((n, i) => expect(n).toBeCloseTo([2, 18, 2, 18][i], 6));
    const [a, , b] = tileUV(7);
    expect(a * 80).toBeCloseTo(62, 6);
    expect(b * 80).toBeCloseTo(78, 6);
    const [, w0, , w1] = tileUV(9); // linha 3: veios (ADR 0044)
    expect((1 - w1) * 80).toBeCloseTo(42, 6);
    expect((1 - w0) * 80).toBeCloseTo(58, 6);
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
