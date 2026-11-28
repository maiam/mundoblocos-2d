import { describe, expect, it } from 'vitest';
import { MemoryTitanStorage } from '../save';
import { openSession } from '../session';
import { meshSection } from '../mesher';
import { isDoor, isDoorHingeRight, isDoorUpper, isLog, isPlanks, isTrapdoor, isTrapdoorOpen, isWoodStair, modelOf, T } from '../voxel';
import { COSTA_PLAN } from './costaData';
import { COSTA_BUILDINGS, windowOffsets, FLOOR_Y, type Building } from './casas';
import { CostaGenerator, COSTA_GENERATOR_VERSION, orvalisGeneratorFor } from './generator';

const BUILDS: Building[] = COSTA_PLAN.bases.map((b, i) => ({ ...COSTA_BUILDINGS[i], caixa: b.caixa }));
const gen = new CostaGenerator(128064);
const cells = (b: Building, pred: (id: number) => boolean): Array<[number, number, number]> => {
  const out: Array<[number, number, number]> = [];
  const [x0, z0, x1, z1] = b.caixa;
  for (let y = FLOOR_Y + 1; y <= FLOOR_Y + 12; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) if (pred(gen.blockAt(x, y, z))) out.push([x, y, z]);
  return out;
};

describe('Casas e Celeiro da Aldeia da Costa (ADR 0149)', () => {
  it('a v102 tem as construções; a v101 segue sem elas', () => {
    expect(COSTA_GENERATOR_VERSION).toBe(102);
    const old = new CostaGenerator(128064, 101);
    for (const b of BUILDS) { const [x0, z0] = b.caixa; expect(gen.blockAt(x0, 71, z0)).toBe(T.LOG_OAK); expect(old.blockAt(x0, 71, z0)).toBe(T.AIR); }
    expect(orvalisGeneratorFor(128064, 101)).not.toBeNull();
  });

  it('toras nos cantos, tábuas nas paredes, interior vazio sobre o piso', () => {
    for (const b of BUILDS) {
      const [x0, z0, x1, z1] = b.caixa;
      for (let y = 71; y <= 70 + b.wall; y++) for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) expect(isLog(gen.blockAt(x, y, z))).toBe(true);
      expect(gen.blockAt((x0 + x1) >> 1, 71, (z0 + z1) >> 1)).toBe(T.AIR);
      expect(gen.blockAt((x0 + x1) >> 1, 70 + b.wall + 1, (z0 + z1) >> 1)).toBe(T.AIR); // sob a cumeeira o vão é aberto
      expect(gen.column((x0 + x1) >> 1, (z0 + z1) >> 1).surface).toBe(T.PLANKS_OAK); // o piso é o da base
    }
  });

  it('porta de carvalho de duas células na entrada (dupla no Celeiro, com as dobradiças nas pontas) e o lado de fora livre', () => {
    const doors = BUILDS.map((b) => cells(b, (id) => isDoor(id) && !isDoorUpper(id)));
    expect(doors.map((d) => d.length)).toEqual([1, 1, 1, 2]);
    for (const [i, b] of BUILDS.entries()) for (const [x, y, z] of doors[i]) {
      expect(isDoorUpper(gen.blockAt(x, y + 1, z))).toBe(true);
      expect(gen.blockAt(x, y + 2, z)).toBe(T.PLANKS_OAK); // verga
      const [ox, oz] = b.door === 'N' ? [0, -1] : b.door === 'S' ? [0, 1] : b.door === 'L' ? [1, 0] : [-1, 0];
      expect(gen.blockAt(x + ox, y, z + oz)).toBe(T.AIR); expect(gen.blockAt(x + ox, y + 1, z + oz)).toBe(T.AIR); // sai para o chão
      expect(gen.column(x + ox, z + oz).top).toBe(FLOOR_Y);
    }
    const [a, c] = doors[3];
    expect(isDoorHingeRight(gen.blockAt(...a))).not.toBe(isDoorHingeRight(gen.blockAt(...c)));
    expect(doors[0][0][2]).toBe(COSTA_PLAN.bases[0].caixa[1]); // Casa 1: entrada na parede norte
  });

  it('alçapões de carvalho em pé nas janelas, nunca na linha da porta', () => {
    for (const b of BUILDS) {
      const traps = cells(b, (id) => isTrapdoor(id));
      expect(traps.length).toBeGreaterThan(0);
      for (const [x, y, z] of traps) { expect(y).toBe(72); expect(isTrapdoorOpen(gen.blockAt(x, y, z))).toBe(true); expect(gen.blockAt(x, 71, z)).not.toBe(T.AIR); }
    }
    expect(windowOffsets(9)).toEqual([2, 6]); expect(windowOffsets(7)).toEqual([1, 5]); expect(windowOffsets(5)).toEqual([2]);
    expect(cells(BUILDS[3], isTrapdoor).every(([x]) => x === 21 || x === 27)).toBe(true); // o Celeiro só tem janelas nas laterais
  });

  it('telhado de degraus com cumeeira de tábuas e oitão fechado', () => {
    for (const b of BUILDS) {
      const stairs = cells(b, isWoodStair), top = Math.max(...stairs.map((s) => s[1]));
      const span = b.ridge === 'x' ? b.caixa[3] - b.caixa[1] + 1 : b.caixa[2] - b.caixa[0] + 1, kmax = (span - 1) / 2;
      expect(top).toBe(FLOOR_Y + b.wall + kmax); // a fiada de cima dos degraus é a de baixo da cumeeira
      const planksAbove = cells(b, (id) => isPlanks(id)).filter((c) => c[1] === FLOOR_Y + b.wall + 1 + kmax);
      expect(planksAbove.length).toBe(b.ridge === 'x' ? b.caixa[2] - b.caixa[0] + 1 : b.caixa[3] - b.caixa[1] + 1); // cumeeira de ponta a ponta
      expect(stairs.length).toBeGreaterThan(20);
    }
    // oitão fechado: o meio da fiada de baixo no fim da cumeeira é tábua
    const c3 = BUILDS[2].caixa; expect(gen.blockAt(15, 71 + 3, c3[1])).toBe(T.PLANKS_OAK);
  });

  it('o telhado cobre toda a planta: nenhuma coluna da base fica sem bloco entre a primeira fiada do telhado e a cumeeira', () => {
    for (const b of BUILDS) {
      const [x0, z0, x1, z1] = b.caixa, holes: string[] = [];
      for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) { let any = false; for (let y = FLOOR_Y + b.wall + 1; y <= FLOOR_Y + b.wall + 5; y++) if (gen.blockAt(x, y, z) !== T.AIR) any = true; if (!any) holes.push(`${x},${z}`); }
      expect(holes).toEqual([]);
    }
  });

  it('malhar as seções registra portas, degraus e alçapões como instâncias de modelo (não ficam invisíveis)', async () => {
    const s = await openSession(new MemoryTitanStorage(), 128064, () => 1, orvalisGeneratorFor, COSTA_GENERATOR_VERSION, (sd) => new CostaGenerator(sd));
    for (let cx = -1; cx <= 2; cx++) for (let cz = 0; cz <= 2; cz++) for (let sy = 7; sy <= 8; sy++) meshSection(s.volume, cx, sy, cz);
    let n = 0;
    for (const b of BUILDS) for (const [x, y, z] of cells(b, (id) => modelOf(id) !== null)) { n++; expect(s.volume.get(x, y, z)).toBe(gen.blockAt(x, y, z)); }
    expect(n).toBeGreaterThan(100);
  });
});
