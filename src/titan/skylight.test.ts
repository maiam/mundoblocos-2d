import { describe, expect, it } from 'vitest';
import { SKY_MAX, SkyLight, type SkyKind, type SkyWorld } from './skylight';

/** Mundo de brinquedo 24 × 24 × 40 (y de 0 a 39) para testar as regras do céu da Wiki. 0 = ar, 1 = filtro (folha/água), 2 = opaco. */
class Toy implements SkyWorld {
  readonly x0 = 0; readonly x1 = 24; readonly z0 = 0; readonly z1 = 24; readonly yMin = 0; readonly yMax = 39;
  private readonly g = new Uint8Array(24 * 24 * 40);
  private i(x: number, y: number, z: number): number { return (y * 24 + z) * 24 + x; }
  kind(x: number, y: number, z: number): SkyKind { return (this.g[this.i(x, y, z)] as SkyKind); }
  set(x: number, y: number, z: number, k: SkyKind): void { this.g[this.i(x, y, z)] = k; }
  /** Solo opaco até a altura `h` (inclusive) em todo o mundo. */
  floor(h: number): void { for (let z = 0; z < 24; z++) for (let x = 0; x < 24; x++) for (let y = 0; y <= h; y++) this.set(x, y, z, 2); }
  top = (x: number, z: number): number => { for (let y = 39; y >= 0; y--) if (this.kind(x, y, z) !== 0) return y; return 0; };
  engine(): SkyLight { const e = new SkyLight(this); e.compute(this.top); return e; }
}

describe('luz do céu: regras da Wiki', () => {
  it('céu aberto vale 15 e o solo opaco tem 0; fora da grade vale 15', () => {
    const w = new Toy(); w.floor(9); const e = w.engine();
    expect(e.at(5, 10, 5)).toBe(15); expect(e.at(5, 30, 5)).toBe(15); expect(e.at(5, 9, 5)).toBe(0); expect(e.at(-5, 3, 5)).toBe(SKY_MAX); expect(e.at(5, 100, 5)).toBe(SKY_MAX);
  });
  it('um poço e um túnel sob o morro: o 15 desce inteiro pelo poço e o túnel perde 1 por célula', () => {
    const w = new Toy(); w.floor(19);
    for (let y = 10; y <= 19; y++) w.set(0, y, 12, 0); // poço aberto ao céu em x = 0
    for (let x = 1; x < 24; x++) w.set(x, 10, 12, 0); // túnel em y = 10 ao longo de x
    const e = w.engine();
    expect([19, 15, 10].map((y) => e.at(0, y, 12))).toEqual([15, 15, 15]); // o poço
    expect([1, 2, 3, 8, 14, 15, 16].map((x) => e.at(x, 10, 12))).toEqual([14, 13, 12, 7, 1, 0, 0]); // o túnel
    expect(e.at(5, 10, 11)).toBe(0); // a rocha em volta
  });
  it('uma janela num cômodo fechado: entra 14 e esmaece; sem janela, escuro', () => {
    const w = new Toy(); w.floor(4);
    for (let x = 6; x <= 12; x++) for (let z = 6; z <= 12; z++) for (let y = 5; y <= 9; y++) w.set(x, y, z, (x === 6 || x === 12 || z === 6 || z === 12 || y === 9) ? 2 : 0); // cômodo 5 × 5 × 3 de paredes opacas
    expect(w.engine().at(9, 6, 9)).toBe(0); // fechado: a luz não entra
    w.set(6, 6, 9, 0); // janela na parede oeste (x = 6), em y = 6
    const e = w.engine();
    expect([e.at(6, 6, 9), e.at(7, 6, 9), e.at(8, 6, 9), e.at(9, 6, 9), e.at(11, 6, 9)]).toEqual([14, 13, 12, 11, 9]);
    expect(e.at(7, 5, 9)).toBe(12); expect(e.at(7, 7, 9)).toBe(12); // e para cima e para baixo também perde 1 por passo
  });
  it('um poço aberto no teto: o 15 desce inteiro pela coluna e abre no chão com 14, 13…', () => {
    const w = new Toy(); w.floor(4);
    for (let x = 6; x <= 12; x++) for (let z = 6; z <= 12; z++) for (let y = 5; y <= 9; y++) w.set(x, y, z, (x === 6 || x === 12 || z === 6 || z === 12 || y === 9) ? 2 : 0);
    w.set(9, 9, 9, 0); // furo no teto
    const e = w.engine();
    expect([e.at(9, 9, 9), e.at(9, 8, 9), e.at(9, 5, 9)]).toEqual([15, 15, 15]); expect(e.at(10, 5, 9)).toBe(14); expect(e.at(11, 5, 9)).toBe(13);
  });
  it('folhas e água filtram: 1 a mais por bloco, e a luz desce sem perder o resto (copa e lago largos: a luz lateral não ajuda o centro)', () => {
    const w = new Toy(); w.floor(4);
    for (let y = 18; y <= 20; y++) for (let x = 8; x <= 16; x++) for (let z = 8; z <= 16; z++) w.set(x, y, z, 1); // copa 9 × 9 de 3 camadas de folhas
    const e = w.engine();
    expect([21, 20, 19, 18, 17, 5].map((y) => e.at(12, y, 12))).toEqual([15, 14, 13, 12, 12, 12]);
    expect(e.at(6, 18, 12)).toBe(15); // fora da copa, céu aberto
    const v = new Toy(); v.floor(4); for (let y = 5; y <= 9; y++) for (let x = 8; x <= 16; x++) for (let z = 8; z <= 16; z++) v.set(x, y, z, 1); // lago 9 × 9 de 5 de fundo
    const f = v.engine(); expect([9, 8, 7, 6, 5].map((y) => f.at(12, y, 12))).toEqual([14, 13, 12, 11, 10]);
  });
  it('uma laje sobre o buraco do poço sombreia a coluna; sob o beiral a luz vem de lado', () => {
    const w = new Toy(); w.floor(4);
    for (let x = 8; x <= 14; x++) for (let z = 8; z <= 14; z++) w.set(x, 12, z, 2); // telhado solto a 8 blocos do chão
    const e = w.engine();
    expect(e.at(11, 5, 11)).toBe(15 - 4); // o centro, a 4 células da borda aberta (x = 7 ou 15): 14 − 3
    expect(e.at(7, 5, 11)).toBe(15); expect(e.at(8, 5, 11)).toBe(14); expect(e.at(9, 5, 11)).toBe(13);
    expect(e.at(11, 13, 11)).toBe(15); // acima do telhado
  });
});

describe('luz do céu: refazer a vizinhança é igual a refazer tudo', () => {
  it('200 edições aleatórias (opaco, folha, ar) deixam o motor idêntico ao cálculo inteiro', () => {
    const w = new Toy(); w.floor(3);
    let seed = 12345; const rnd = (): number => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    for (let k = 0; k < 150; k++) w.set(Math.floor(rnd() * 24), 4 + Math.floor(rnd() * 10), Math.floor(rnd() * 24), rnd() < 0.7 ? 2 : 1); // relevo inicial bagunçado
    const inc = w.engine();
    for (let step = 0; step < 200; step++) {
      const x = Math.floor(rnd() * 24), y = 1 + Math.floor(rnd() * 20), z = Math.floor(rnd() * 24), k = (rnd() < 0.5 ? 2 : rnd() < 0.5 ? 1 : 0) as SkyKind;
      if (w.kind(x, y, z) === k) continue;
      w.set(x, y, z, k); inc.update(x, y, z);
      if (step % 20 === 0 || step === 199) {
        const full = w.engine();
        for (let zz = 0; zz < 24; zz++) for (let xx = 0; xx < 24; xx++) for (let yy = 0; yy < 40; yy++) if (inc.at(xx, yy, zz) !== full.at(xx, yy, zz)) throw new Error(`passo ${step}: (${xx},${yy},${zz}) incremental ${inc.at(xx, yy, zz)} ≠ inteiro ${full.at(xx, yy, zz)}`);
      }
    }
    expect(true).toBe(true);
  });
});
