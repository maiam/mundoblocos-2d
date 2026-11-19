import { describe, expect, it } from 'vitest';
import { computeLight, LightEngine, LightStore, lightKey } from './light';
import { TitanGenerator } from './generator';
import { TitanVolume } from './volume';
import { mulberry32 } from '../world/random';
import { T } from './voxel';

describe('luz em 4 bits por célula', () => {
  it('guarda 0–15 por célula sem vazar para vizinhas, nas bordas de seção e em Y negativo', () => {
    const s = new LightStore();
    const cells: Array<[number, number, number]> = [[0, 0, 0], [15, 0, 0], [16, 0, 0], [-1, -64, -1], [15, 15, 15], [-17, 319, 31], [7, 63, 8]];
    cells.forEach(([x, y, z], i) => s.set(x, y, z, (i % 15) + 1));
    cells.forEach(([x, y, z], i) => expect(s.get(x, y, z)).toBe((i % 15) + 1));
    expect(s.get(1, 0, 0)).toBe(0);
    s.set(0, 0, 0, 0);
    expect(s.get(0, 0, 0)).toBe(0);
    expect(s.get(15, 0, 0)).not.toBe(0);
    expect(s.sectionCount).toBeGreaterThan(0);
  });
});

/** Mapa de luz de referência (cálculo completo) comparado ao incremental em toda a caixa em volta das lanternas. */
function sameAsFull(v: TitanVolume, centers: Array<[number, number, number]>, r = 16): string | null {
  const full = computeLight((x, y, z) => v.get(x, y, z), v.lanternCells());
  for (const [cx, cy, cz] of centers) for (let y = cy - r; y <= cy + r; y++) for (let z = cz - r; z <= cz + r; z++) for (let x = cx - r; x <= cx + r; x++) {
    const want = full.get(lightKey(x, y, z)) ?? 0, got = v.light(x, y, z);
    if (want !== got) return `(${x},${y},${z}) esperado ${want}, incremental ${got}`;
  }
  return null;
}

describe('luz incremental = cálculo completo', () => {
  it('depois de centenas de edições aleatórias (blocos e lanternas, perto e entre divisas), o mapa é idêntico ao recalculado do zero', () => {
    const g = new TitanGenerator(42), v = new TitanVolume(g);
    const a = g.arrival, bx = Math.floor(a.x), bz = Math.floor(a.z), y0 = 150; // ar livre acima do relevo
    const rnd = mulberry32(7);
    v.place(bx, y0, bz, T.LANTERN);
    v.light(bx, y0, bz); // liga o motor incremental (cálculo completo uma vez)
    const centers: Array<[number, number, number]> = [[bx, y0, bz]];
    for (let i = 0; i < 400; i++) {
      const x = bx - 10 + Math.floor(rnd() * 21), y = y0 - 6 + Math.floor(rnd() * 13), z = bz - 10 + Math.floor(rnd() * 21);
      const roll = rnd();
      if (roll < 0.45) v.place(x, y, z, T.SAND);
      else if (roll < 0.8) v.remove(x, y, z);
      else if (roll < 0.9) v.place(x, y, z, T.LANTERN);
      else v.remove(x, y, z);
      if (i % 40 === 39) { const bad = sameAsFull(v, [...centers, [bx, y0, bz]]); expect(bad, `após ${i + 1} edições`).toBeNull(); }
    }
    expect(sameAsFull(v, centers)).toBeNull();
    expect(v.lanternCells().length).toBeGreaterThan(1); // houve mais de uma lanterna: a remoção reaproveita a luz das outras
  });

  it('tirar uma lanterna perto de outra devolve a luz da outra às células que ficaram escuras', () => {
    const g = new TitanGenerator(42), v = new TitanVolume(g);
    const a = g.arrival, bx = Math.floor(a.x), bz = Math.floor(a.z), y = 150;
    v.place(bx, y, bz, T.LANTERN); v.place(bx + 6, y, bz, T.LANTERN);
    v.light(bx, y, bz);
    const before = v.light(bx + 3, y, bz);
    v.remove(bx, y, bz);
    expect(v.light(bx + 3, y, bz)).toBe(12); // só a lanterna de bx+6 (15 − 3) ilumina agora
    expect(before).toBe(12); // as duas davam 12 ali (15 − 3)
    expect(sameAsFull(v, [[bx, y, bz]])).toBeNull();
  });
});

describe('invalidação cirúrgica (o ganho de desempenho)', () => {
  const setup = () => {
    const g = new TitanGenerator(42), v = new TitanVolume(g);
    const a = g.arrival, bx = Math.floor(a.x), bz = Math.floor(a.z), y = 150;
    v.place(bx, y, bz, T.LANTERN);
    v.light(bx, y, bz); // motor ligado
    v.takeTouched(); v.takeLightTouched();
    return { v, bx, bz, y };
  };
  const refeitas = (v: TitanVolume): number => new Set([...v.takeTouched(), ...v.takeLightTouched()]).size;

  it('editar perto da lanterna refaz poucas seções, não as 27–37 da caixa de ±15 blocos', () => {
    const { v, bx, bz, y } = setup();
    v.place(bx + 1, y, bz, T.DARK_ROCK); // bloco junto da lanterna: projeta sombra
    expect(refeitas(v)).toBeLessThanOrEqual(8);
    v.remove(bx + 1, y, bz);
    expect(refeitas(v)).toBeLessThanOrEqual(8);
  });

  it('editar fora do alcance da luz só refaz a seção editada (a luz não mudou em lugar nenhum)', () => {
    const { v, bx, bz, y } = setup();
    v.place(bx + 20, y, bz, T.SAND); // além dos 15 blocos de alcance
    expect(v.takeLightTouched()).toEqual([]);
    expect(v.takeTouched().length).toBeGreaterThanOrEqual(1);
  });

  it('colocar um bloco numa célula sem luz (atrás de parede já escura) não suja nenhuma seção de luz', () => {
    const { v, bx, bz, y } = setup();
    v.place(bx, y + 17, bz, T.SAND); // acima do alcance vertical
    expect(v.takeLightTouched()).toEqual([]);
  });

  it('a seção editada vem de takeTouched (imediata) e as só-luz de takeLightTouched (com orçamento), sem repetir', () => {
    const { v, bx, bz, y } = setup();
    v.place(bx + 1, y, bz, T.DARK_ROCK);
    const urgent = v.takeTouched(), light = v.takeLightTouched();
    expect(urgent.length).toBeGreaterThanOrEqual(1);
    for (const k of light) expect(urgent).not.toContain(k);
    expect(v.takeLightTouched()).toEqual([]); // esvaziou
  });

  it('célula de luz alterada na borda de seção marca também a seção vizinha', () => {
    const g = new TitanGenerator(42), v = new TitanVolume(g);
    const y = 150, ex = 14; // lanterna em x = 14: o alcance passa da divisa x = 15|16
    v.place(ex, y, 0, T.LANTERN); v.light(ex, y, 0); v.takeTouched(); v.takeLightTouched();
    v.place(ex + 1, y, 0, T.DARK_ROCK); // bloqueia: a luz em x = 15 muda
    const all = new Set([...v.takeTouched(), ...v.takeLightTouched()]);
    expect([...all].some((k) => k.startsWith('1,'))).toBe(true); // chunk 1 (x ≥ 16) também refaz a face que lê x = 15
  });

  it('o motor ligado do zero não avisa mudanças (nada foi desenhado ainda)', () => {
    const changes: number[] = [];
    const e = new LightEngine(() => false, () => changes.push(1));
    e.rebuild([[0, 70, 0]]);
    expect(changes).toHaveLength(0);
    expect(e.get(0, 70, 0)).toBe(15);
    e.sourceAdded(5, 70, 0);
    expect(changes.length).toBeGreaterThan(0);
  });
});
