import { describe, expect, it } from 'vitest';
import { advanceDay, AFTERNOON, DAY_SECONDS, FIXED_HOURS, parseHora, phaseName, skyAt, validDay, type RGB } from './sky';
import { flush, headerOf, openSession } from './session';
import { MemoryTitanStorage } from './save';
import { TitanGenerator } from './generator';
import { TitanVolume } from './volume';
import { meshSection } from './mesher';
import { T } from './voxel';

const luma = (c: RGB): number => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
const hex = (c: RGB): string => '#' + c.map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('');

describe('relógio do dia', () => {
  it('um dia completo dura 8 minutos de jogo e a fração volta a 0 depois de 1', () => {
    expect(DAY_SECONDS).toBe(480);
    expect(advanceDay(0, 480)).toBeCloseTo(0, 9);
    expect(advanceDay(0.9, 48)).toBeCloseTo(0, 9);
    expect(advanceDay(0.25, 120)).toBeCloseTo(0.5, 9);
    let f = 0.3;
    for (let i = 0; i < 100000; i++) f = advanceDay(f, 0.05); // 5000 s
    expect(f).toBeGreaterThanOrEqual(0); expect(f).toBeLessThan(1);
  });

  it('começa à tarde: partida nova, hora ausente ou inválida', () => {
    expect(AFTERNOON).toBe(0.55);
    for (const bad of [undefined, null, NaN, -0.1, 1, 7, 'noite']) expect(validDay(bad)).toBe(AFTERNOON);
    expect(validDay(0.8)).toBe(0.8);
  });

  it('?hora= aceita manha, tarde e noite (com ou sem acento) e ignora o resto', () => {
    expect(parseHora('manha')).toBe(FIXED_HOURS.manha);
    expect(parseHora('Manhã')).toBe(FIXED_HOURS.manha);
    expect(parseHora('TARDE')).toBe(FIXED_HOURS.tarde);
    expect(parseHora('noite')).toBe(FIXED_HOURS.noite);
    for (const x of [null, '', 'meio-dia', '1', 'constructor', '__proto__']) expect(parseHora(x)).toBeNull();
  });
});

describe('céu', () => {
  it('a tarde é o visual de antes (cobre no alto, âmbar no horizonte, névoa âmbar, luz cheia)', () => {
    const s = skyAt(FIXED_HOURS.tarde);
    expect(hex(s.zenith)).toBe('#b96e33');
    expect(hex(s.mid)).toBe('#d99342');
    expect(hex(s.horizon)).toBe('#f2cc93');
    expect(hex(s.fog)).toBe('#d2a066');
    expect(s.ambient).toBe(1);
  });

  it('manhã tem horizonte pêssego; noite é carvão-violeta com cobre no horizonte e luz ambiente baixa', () => {
    const m = skyAt(FIXED_HOURS.manha), n = skyAt(FIXED_HOURS.noite), t = skyAt(FIXED_HOURS.tarde);
    expect(m.horizon[0]).toBeGreaterThan(m.horizon[2] + 0.2); // pêssego: vermelho >> azul
    expect(luma(n.zenith)).toBeLessThan(0.08);
    expect(n.horizon[0]).toBeGreaterThan(n.zenith[0] + 0.15); // resto de cobre no horizonte
    expect(n.horizon[0]).toBeGreaterThan(n.horizon[2]);
    expect(n.ambient).toBe(0.3);
    expect(luma(n.fog)).toBeLessThan(luma(t.fog) / 3);
    expect(m.ambient).toBeGreaterThan(n.ambient); expect(m.ambient).toBeLessThan(t.ambient + 1e-9);
  });

  it('as transições são suaves: nenhum salto entre amostras vizinhas, inclusive na virada da meia-noite', () => {
    let maxStep = 0, prev = skyAt(0);
    for (let i = 1; i <= 4800; i++) {
      const s = skyAt(i / 4800); // 0,1 s de jogo por amostra
      maxStep = Math.max(maxStep, Math.abs(s.ambient - prev.ambient), ...s.horizon.map((v, k) => Math.abs(v - prev.horizon[k])), ...s.zenith.map((v, k) => Math.abs(v - prev.zenith[k])));
      prev = s;
    }
    expect(maxStep).toBeLessThan(0.01);
    const a = skyAt(0.99999), b = skyAt(0);
    expect(Math.abs(a.ambient - b.ambient)).toBeLessThan(1e-3);
  });

  it('o sol só aparece como ponto quando está alto: à tarde sim, de manhã cedo e à noite não', () => {
    expect(skyAt(FIXED_HOURS.tarde).sun.alpha).toBe(1);
    expect(skyAt(FIXED_HOURS.noite).sun.alpha).toBe(0);
    expect(skyAt(0.1).sun.alpha).toBe(0);
    expect(skyAt(0.2).sun.alpha).toBe(0); // acabou de nascer: baixo
    expect(skyAt(0.9).sun.alpha).toBe(0);
    const d = skyAt(0.5).sun.dir;
    expect(Math.hypot(...d)).toBeCloseTo(1, 6);
    expect(d[1]).toBeGreaterThan(0.5); // alto
  });

  it('nomes dos períodos', () => {
    expect([0.05, 0.25, 0.55, 0.78, 0.9].map(phaseName)).toEqual(['noite', 'manhã', 'tarde', 'entardecer', 'noite']);
  });
});

describe('hora no save e luz sem remalhar', () => {
  it('a hora vai no save e volta ao reabrir; save antigo sem hora e partida nova começam à tarde', async () => {
    const st = new MemoryTitanStorage();
    const s = await openSession(st, 42, () => 1);
    expect(s.time).toBe(AFTERNOON);
    s.time = 0.8125;
    await flush(st, s);
    expect((await openSession(st, null, () => 1)).time).toBeCloseTo(0.8125, 9);
    delete st.games.get(42)!.time; // save da entrega anterior
    expect((await openSession(st, null, () => 1)).time).toBe(AFTERNOON);
    st.games.get(42)!.time = 3; // lixo
    expect((await openSession(st, null, () => 1)).time).toBe(AFTERNOON);
  });

  it('a hora forçada de teste não entra no save: o cabeçalho leva sempre a hora corrida do jogo', async () => {
    const s = await openSession(new MemoryTitanStorage(), 42, () => 1);
    s.time = 0.4;
    // `?hora=` só muda o que o renderer mostra (`view.setSky(forcedHour ?? session.time)`): a sessão não é tocada
    expect(parseHora('noite')).toBe(0.85);
    expect(headerOf(s).time).toBe(0.4);
  });

  it('a malha não depende da hora: o sombreado fica em `col` sem luz ambiente e a lanterna em `glow`, então mudar a hora refaz zero seções', () => {
    const g = new TitanGenerator(42), v = new TitanVolume(g);
    const a = g.arrival, bx = Math.floor(a.x), bz = Math.floor(a.z);
    v.place(bx, 150, bz, T.SAND);
    const before = meshSection(v, Math.floor(bx / 16), 13, Math.floor(bz / 16)).opaque!;
    v.takeTouched(); v.takeLightTouched();
    for (const h of [0.25, 0.55, 0.85, 0]) skyAt(h); // percorrer o dia não toca o volume
    expect(v.takeTouched()).toEqual([]);
    expect(v.takeLightTouched()).toEqual([]);
    const after = meshSection(v, Math.floor(bx / 16), 13, Math.floor(bz / 16)).opaque!;
    expect([...after.col]).toEqual([...before.col]);
    expect(Math.max(...before.col)).toBeLessThanOrEqual(1); // sem luz ambiente embutida (era ×0,3 à noite)
    expect(Math.max(...before.glow)).toBe(0); // sem lanterna perto: nenhum brilho
    v.place(bx + 1, 150, bz, T.LANTERN);
    const lit = meshSection(v, Math.floor(bx / 16), 13, Math.floor(bz / 16)).opaque!;
    expect(Math.max(...lit.glow)).toBeGreaterThan(1); // a lanterna é emissão própria, independente do dia
  });
});
