import { describe, expect, it } from 'vitest';
import { MemoryTitanStorage } from '../save';
import { openSession } from '../session';
import { meshSection } from '../mesher';
import { T, Y_MIN } from '../voxel';
import { ORVALIS_GENERATOR_VERSION, OrvalisGenerator, orvalisGeneratorFor } from './generator';

/** Luz do céu no volume (ADR 0123): conta inteira por demanda e atualização por edição. */
const open = async () => ({ s: await openSession(new MemoryTitanStorage(), 42, () => 1, orvalisGeneratorFor, ORVALIS_GENERATOR_VERSION, (sd, v) => new OrvalisGenerator(sd, v)) });

describe('luz do céu no volume', () => {
  it('o terreno natural: céu aberto 15 em cima, pedra 0 por dentro, fora da região 15; a copa de uma árvore filtra', async () => {
    const { s } = await open(), v = s.volume, a = v.gen.arrival, x = Math.floor(a.x), z = Math.floor(a.z), top = v.gen.column(x, z).top;
    expect(v.skyLight(x, top + 1, z)).toBe(15); expect(v.skyLight(x, top + 30, z)).toBe(15); expect(v.skyLight(x, top - 10, z)).toBe(0); expect(v.skyLight(500, 70, 500)).toBe(15);
  });
  it('escavar e cobrir: um poço aberto leva o 15 ao fundo; tampar o buraco escurece, e destampar clareia (atualização por edição = conta inteira)', async () => {
    const { s } = await open(), v = s.volume, a = v.gen.arrival, x = Math.floor(a.x) + 6, z = Math.floor(a.z) + 6, top = v.gen.column(x, z).top;
    expect(v.skyLight(x, top - 5, z)).toBe(0); // ligou o motor
    for (let y = top; y >= top - 5; y--) v.set(x, y, z, T.AIR); // poço de 6 blocos
    expect(v.skyLight(x, top - 5, z)).toBe(15); // o céu desce inteiro
    for (let y = top - 3; y >= top - 5; y--) { v.set(x + 1, y, z, T.AIR); } // uma galeria ao lado no fundo
    expect(v.skyLight(x + 1, top - 5, z)).toBe(14);
    v.set(x, top, z, T.STONE); // tampa o poço
    expect(v.skyLight(x, top - 5, z)).toBe(0); expect(v.skyLight(x, top + 1, z)).toBe(15);
    v.set(x, top, z, T.AIR); // destampa
    expect(v.skyLight(x, top - 5, z)).toBe(15);
  });
  it('uma edição em outro mundo de leitura: um volume novo com as mesmas edições dá os mesmos níveis (a conta inteira conhece as edições)', async () => {
    const a = await open(), v = a.s.volume, g = v.gen.arrival, x = Math.floor(g.x) + 6, z = Math.floor(g.z) + 6, top = v.gen.column(x, z).top;
    for (let y = top; y >= top - 4; y--) v.set(x, y, z, T.AIR);
    for (let k = 1; k <= 3; k++) v.set(x + k, top - 4, z, T.AIR); // túnel lateral no fundo do poço
    const b = await open(); b.s.volume.load(v.dirtyChunks().map((c) => ({ cx: c.cx, cz: c.cz, edits: c.edits })));
    for (let k = 0; k <= 4; k++) expect(b.s.volume.skyLight(x + k, top - 4, z)).toBe(v.skyLight(x + k, top - 4, z));
    expect(b.s.volume.skyLight(x + 3, top - 4, z)).toBe(12);
  });
});

describe('luz do céu no desenho (fase 2, ADR 0123)', () => {
  it('a malha leva o atributo `sky` (0–1) por vértice: o topo do terreno vê o céu aberto (1) e o fundo de um poço coberto, não', async () => {
    const { s } = await open(), v = s.volume, a = v.gen.arrival, x = Math.floor(a.x) + 6, z = Math.floor(a.z) + 6, top = v.gen.column(x, z).top, sy = Math.floor((top - Y_MIN) / 16), cx = x >> 4, cz = z >> 4;
    const open1 = meshSection(v, cx, sy, cz).opaque!;
    expect(open1.sky.length * 3).toBe(open1.pos.length); expect(Math.min(...open1.sky)).toBeGreaterThanOrEqual(0); expect(Math.max(...open1.sky)).toBe(1);
    for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) for (let y = top - 4; y <= top + 3; y++) v.set(x + dx, y, z + dz, T.STONE); // bloco de pedra 5 × 5 × 8
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) for (let y = top - 3; y <= top + 1; y++) v.set(x + dx, y, z + dz, T.AIR); // sala 3 × 3 × 5 toda fechada
    const closed = meshSection(v, cx, sy, cz).opaque!;
    expect(Math.min(...closed.sky)).toBe(0); // as paredes da sala fechada veem células sem céu
    expect(Math.max(...closed.sky)).toBe(1); // o resto do terreno segue sob o céu aberto
  });
  it('depois que o céu foi calculado, uma edição que fecha ou abre luz refaz a malha só da seção afetada (revisão sobe)', async () => {
    const { s } = await open(), v = s.volume, a = v.gen.arrival, x = Math.floor(a.x) + 6, z = Math.floor(a.z) + 6, top = v.gen.column(x, z).top, cx = x >> 4, cz = z >> 4, sy = Math.floor((top - 3 - Y_MIN) / 16);
    for (let y = top; y >= top - 3; y--) v.set(x, y, z, T.AIR); // poço
    v.skyLight(x, top, z); // liga o céu
    const before = v.sectionRevision(cx, sy, cz);
    v.set(x, top + 1, z, T.STONE); // tampa
    expect(v.sectionRevision(cx, sy, cz)).toBeGreaterThan(before);
    expect(v.sectionRevision(cx + 3, sy, cz + 3)).toBe(0); // uma seção longe não se mexe
  });
});
