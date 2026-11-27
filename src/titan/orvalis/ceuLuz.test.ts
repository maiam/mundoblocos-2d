import { describe, expect, it } from 'vitest';
import { MemoryTitanStorage } from '../save';
import { openSession } from '../session';
import { T } from '../voxel';
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
