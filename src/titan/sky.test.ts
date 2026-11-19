import { describe, expect, it } from 'vitest';
import { advanceDay, AFTERNOON, DAY_SECONDS, DAY_TICKS, FIXED_HOURS, parseHora, PHASE_TICKS, phaseName, skyAt, tickFrac, TICKS_PER_SECOND, validDay, type RGB } from './sky';
import { flush, headerOf, openSession } from './session';
import { MemoryTitanStorage } from './save';
import { TitanGenerator } from './generator';
import { TitanVolume } from './volume';
import { meshSection } from './mesher';
import { T } from './voxel';

const luma = (c: RGB): number => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
const hex = (c: RGB): string => '#' + c.map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('');

describe('relógio do dia (ritmo do Minecraft)', () => {
  it('um dia completo dura 20 minutos: 24 000 ticks a 20 ticks por segundo', () => {
    expect(DAY_TICKS).toBe(24000);
    expect(TICKS_PER_SECOND).toBe(20);
    expect(DAY_SECONDS).toBe(1200);
    expect(advanceDay(0, 1200)).toBeCloseTo(0, 9);
    expect(advanceDay(0.9, 120)).toBeCloseTo(0, 9);
    expect(advanceDay(0.25, 300)).toBeCloseTo(0.5, 9);
    let f = 0.3;
    for (let i = 0; i < 100000; i++) f = advanceDay(f, 0.05); // 5 000 s
    expect(f).toBeGreaterThanOrEqual(0); expect(f).toBeLessThan(1);
  });

  it('as fases têm as proporções do Minecraft: dia 10 min, pôr do sol 1 min 30 s, noite 7 min, nascer do sol 1 min 30 s', () => {
    const sec = (ticks: number): number => ticks / TICKS_PER_SECOND;
    expect(PHASE_TICKS).toEqual({ sunsetStart: 12000, nightStart: 13800, sunriseStart: 22200 });
    expect(sec(PHASE_TICKS.sunsetStart)).toBe(600);
    expect(sec(PHASE_TICKS.nightStart - PHASE_TICKS.sunsetStart)).toBe(90);
    expect(sec(PHASE_TICKS.sunriseStart - PHASE_TICKS.nightStart)).toBe(420);
    expect(sec(DAY_TICKS - PHASE_TICKS.sunriseStart)).toBe(90);
    expect(tickFrac(12000)).toBe(0.5);
    // as fronteiras dão os nomes certos
    const at = (ticks: number): string => phaseName(tickFrac(ticks));
    expect([at(0), at(1000), at(9000), at(11999), at(12000), at(13799), at(13800), at(18000), at(22199), at(22200), at(23999)])
      .toEqual(['manhã', 'manhã', 'tarde', 'tarde', 'pôr do sol', 'pôr do sol', 'noite', 'noite', 'noite', 'nascer do sol', 'nascer do sol']);
  });

  it('começa à tarde (tick 9 000, a 2 min 30 s do pôr do sol): partida nova, hora ausente ou inválida', () => {
    expect(AFTERNOON).toBe(0.375);
    expect(phaseName(AFTERNOON)).toBe('tarde');
    expect((tickFrac(PHASE_TICKS.sunsetStart) - AFTERNOON) * DAY_SECONDS).toBe(150);
    for (const bad of [undefined, null, NaN, -0.1, 1, 7, 'noite']) expect(validDay(bad)).toBe(AFTERNOON);
    expect(validDay(0.8)).toBe(0.8);
  });

  it('?hora= aceita manha, tarde e noite (com ou sem acento) e ignora o resto', () => {
    expect(parseHora('manha')).toBe(FIXED_HOURS.manha);
    expect(parseHora('Manhã')).toBe(FIXED_HOURS.manha);
    expect(parseHora('TARDE')).toBe(FIXED_HOURS.tarde);
    expect(parseHora('noite')).toBe(FIXED_HOURS.noite);
    expect(phaseName(FIXED_HOURS.manha)).toBe('manhã');
    expect(phaseName(FIXED_HOURS.tarde)).toBe('tarde');
    expect(phaseName(FIXED_HOURS.noite)).toBe('noite');
    for (const x of [null, '', 'meio-dia', '1', 'constructor', '__proto__']) expect(parseHora(x)).toBeNull();
  });
});

describe('céu', () => {
  it('a tarde é o visual de antes (cobre no alto, âmbar no horizonte, névoa âmbar, luz cheia) e dura até o começo do pôr do sol', () => {
    for (const ticks of [6000, 9000, 11999]) expect(skyAt(tickFrac(ticks)).ambient).toBe(1);
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
      const s = skyAt(i / 4800); // 0,25 s de jogo por amostra
      maxStep = Math.max(maxStep, Math.abs(s.ambient - prev.ambient), ...s.horizon.map((v, k) => Math.abs(v - prev.horizon[k])), ...s.zenith.map((v, k) => Math.abs(v - prev.zenith[k])));
      prev = s;
    }
    expect(maxStep).toBeLessThan(0.01);
    const a = skyAt(0.99999), b = skyAt(0);
    expect(Math.abs(a.ambient - b.ambient)).toBeLessThan(1e-3);
  });

  it('o pôr do sol escurece o céu gradualmente em 1 min 30 s e a noite fica estável até o nascer do sol', () => {
    const t = (ticks: number) => skyAt(tickFrac(ticks));
    expect(t(12000).ambient).toBe(1);
    expect(t(12900).ambient).toBeGreaterThan(0.3); expect(t(12900).ambient).toBeLessThan(1);
    expect(t(13800).ambient).toBeCloseTo(0.3, 9);
    for (const ticks of [13800, 18000, 22199]) expect(t(ticks).ambient).toBeCloseTo(0.3, 9);
    expect(t(23000).ambient).toBeGreaterThan(0.3); // nascer do sol: o céu clareia
    expect(t(24000 - 1).ambient).toBeLessThan(t(0).ambient);
  });

  it('o sol só aparece como ponto quando está alto: a pino sim; no horizonte, de tarde baixa e à noite não', () => {
    expect(skyAt(tickFrac(6000)).sun.alpha).toBe(1); // a pino
    expect(skyAt(FIXED_HOURS.tarde).sun.alpha).toBeGreaterThan(0.5);
    expect(skyAt(FIXED_HOURS.noite).sun.alpha).toBe(0);
    expect(skyAt(tickFrac(0)).sun.alpha).toBe(0); // acabou de nascer: no horizonte
    expect(skyAt(tickFrac(11000)).sun.alpha).toBe(0); // se pondo: baixo
    expect(skyAt(tickFrac(15000)).sun.alpha).toBe(0);
    const d = skyAt(tickFrac(6000)).sun.dir;
    expect(Math.hypot(...d)).toBeCloseTo(1, 6);
    expect(d[1]).toBeGreaterThan(0.5); // alto
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
    expect(parseHora('noite')).toBe(FIXED_HOURS.noite);
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
    expect(Math.max(...lit.glow)).toBeGreaterThan(0.5); // o calor da lanterna é emissão própria, independente do dia
  });
});
