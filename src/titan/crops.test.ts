import { describe, expect, it } from 'vitest';
import { CROP_MIN_LIGHT, crowded, growChance, growthPoints, harvestOf, isRipe, maxAge, parseCropId, randomTick, soilKind, spriteFrame, type Crop, type CropContext, type CropKind } from './crops';
import { Item } from './items';
import { T } from './voxel';

const ctx = (kind: CropKind | null, over: Partial<CropContext> = {}): CropContext => ({ soilAt: () => kind, sameAt: () => false, light: 15, ...over });

describe('cultivo do junco (ADR 0083): regras puras', () => {
  it('a areia decide o cultivo e as fases', () => {
    expect(soilKind(T.DAMP_SAND)).toBe('umido'); expect(soilKind(T.SAND)).toBe('seco'); expect(soilKind(T.DARK_ROCK)).toBeNull();
    expect(maxAge('umido')).toBe(2); expect(maxAge('seco')).toBe(1);
    expect(isRipe('umido', 1)).toBe(false); expect(isRipe('umido', 2)).toBe(true); expect(isRipe('seco', 1)).toBe(true);
    expect([0, 1, 2].map((a) => spriteFrame('umido', a))).toEqual([0, 1, 2]);
    expect([0, 1].map((a) => spriteFrame('seco', a))).toEqual([0, 3]);
  });
  it('a colheita: úmido rende 2 mudas e recua a "crescendo"; seco rende 2 hastes secas e recua a muda', () => {
    expect(harvestOf('umido')).toMatchObject({ item: Item.GLASS_REED, count: 2, backTo: 1 });
    expect(harvestOf('seco')).toMatchObject({ item: Item.DRY_REED, count: 2, backTo: 0 });
  });
  it('pontos de fertilidade: úmida cercada = 10; seca cercada = 4; isolada = 4 ou 2', () => {
    expect(growthPoints(() => 'umido')).toBe(10);
    expect(growthPoints(() => 'seco')).toBe(4);
    expect(growthPoints((dx, dz) => (!dx && !dz ? 'umido' : null))).toBe(4);
    expect(growthPoints((dx, dz) => (!dx && !dz ? 'seco' : null))).toBe(2);
    expect(growthPoints(() => null)).toBe(0);
  });
  it('chance por sorteio: 1/(⌊25/pontos⌋+1)', () => {
    expect(growChance(10)).toBeCloseTo(1 / 3, 10); expect(growChance(4)).toBeCloseTo(1 / 7, 10); expect(growChance(2)).toBeCloseTo(1 / 13, 10); expect(growChance(0)).toBe(0);
  });
  it('aglomeração: diagonal ou os dois eixos; só um eixo não conta', () => {
    const at = (...cells: Array<[number, number]>) => (dx: number, dz: number): boolean => cells.some(([a, b]) => a === dx && b === dz);
    expect(crowded(at([1, 1]))).toBe(true);
    expect(crowded(at([0, 1], [1, 0]))).toBe(true);
    expect(crowded(at([0, 1], [0, -1]))).toBe(false);
    expect(crowded(at([1, 0]))).toBe(false);
  });
  it('random tick: sobe uma fase com sorteio baixo, não cresce no escuro nem passa da fase adulta', () => {
    const c: Crop = { x: 0, y: 0, z: 0, age: 0 };
    expect(randomTick(c, ctx('umido'), () => 0)).toBe(true); expect(c.age).toBe(1);
    expect(randomTick(c, ctx('umido'), () => 0.99)).toBe(false); expect(c.age).toBe(1); // sorteio alto
    expect(randomTick(c, ctx('umido', { light: CROP_MIN_LIGHT - 1 }), () => 0)).toBe(false); // no escuro
    expect(randomTick(c, ctx('umido', { light: CROP_MIN_LIGHT }), () => 0)).toBe(true); expect(c.age).toBe(2);
    expect(randomTick(c, ctx('umido'), () => 0)).toBe(false); // já adulta
    expect(randomTick({ x: 0, y: 0, z: 0, age: 0 }, ctx(null), () => 0)).toBe(false); // sem areia
  });
  it('aglomerada cresce mais devagar: a chance cai pela metade dos pontos', () => {
    const rng = (): number => 0.2; // 0,2 < 1/3 (10 pontos) mas não < 1/4 (5 pontos: ⌊25/5⌋+1 = 6 → 1/6)
    expect(randomTick({ x: 0, y: 0, z: 0, age: 0 }, ctx('umido'), rng)).toBe(true);
    expect(randomTick({ x: 0, y: 0, z: 0, age: 0 }, ctx('umido', { sameAt: (dx, dz) => dx === 1 && dz === 1 }), rng)).toBe(false);
  });
  it('id de planta', () => { expect(parseCropId('crop:3,-4,5')).toEqual([3, -4, 5]); expect(parseCropId('reed:1,2,3')).toBeNull(); });
});
