import { describe, expect, it } from 'vitest';
import { useBed } from './actions';
import { cropKey } from './crops';
import { T, bedFootId, bedHeadId } from './voxel';
import { flush, headerOf, isRaining, openSession, tickCrops, tickWeather } from './session';
import { MemoryTitanStorage } from './save';
import { ORVALIS_GENERATOR_VERSION, OrvalisGenerator } from './orvalis/generator';
import { orvalisGeneratorFor } from './orvalis/generator';
import { clearWeather, hasWeather, newWeather, RAIN_FADE_S, RAIN_OFF_S, RAIN_ON_S, RAIN_SKY_FACTOR, smoothRain, stepWeather, weatherFromData, weatherToData } from './weather';

describe('clima do Orvalis (ADR 0118, regra da Wiki)', () => {
  it('só o Orvalis tem clima; a Wiki dá 10–20 min de chuva e 10 min–2,5 h de céu limpo; chuva 12/15 da luz', () => {
    expect(hasWeather('orvalis')).toBe(true); expect(hasWeather('titan')).toBe(false);
    expect(RAIN_ON_S).toEqual([600, 1200]); expect(RAIN_OFF_S).toEqual([600, 9000]); expect(RAIN_SKY_FACTOR).toBeCloseTo(0.8, 9);
  });
  it('mundo novo começa limpo com tempo sorteado dentro da faixa; o cronômetro vira o marcador e sorteia a duração do novo estado', () => {
    expect(newWeather(() => 0)).toEqual({ raining: false, timer: 600 }); expect(newWeather(() => 1)).toEqual({ raining: false, timer: 9000 });
    const w = { raining: false, timer: 10 };
    expect(stepWeather(w, 9.9, () => 0)).toBe(false); expect(w.raining).toBe(false);
    expect(stepWeather(w, 0.2, () => 0.5)).toBe(true); expect(w).toEqual({ raining: true, timer: 900 }); // 600 + 0,5 × 600
    expect(stepWeather(w, 900, () => 1)).toBe(true); expect(w).toEqual({ raining: false, timer: 9000 });
  });
  it('dormir limpa a chuva e deixa o cronômetro', () => {
    const w = { raining: true, timer: 500 };
    expect(clearWeather(w)).toBe(true); expect(w).toEqual({ raining: false, timer: 500 }); expect(clearWeather(w)).toBe(false);
  });
  it('a intensidade sobe e desce em 10 s, sem passar de 0–1', () => {
    expect(RAIN_FADE_S).toBe(10);
    expect(smoothRain(0, true, 5)).toBe(0.5); expect(smoothRain(0.9, true, 5)).toBe(1); expect(smoothRain(0.5, false, 2)).toBeCloseTo(0.3, 9); expect(smoothRain(0.1, false, 5)).toBe(0);
  });
  it('ida e volta no save; dado ausente ou inválido vira clima novo (limpo)', () => {
    const w = { raining: true, timer: 123.456 };
    expect(weatherFromData(weatherToData(w), () => 0)).toEqual({ raining: true, timer: 123.5 });
    for (const bad of [undefined, null, 3, { raining: 'sim', timer: 5 }, { raining: true, timer: -1 }, { raining: true, timer: NaN }]) expect(weatherFromData(bad, () => 0)).toEqual({ raining: false, timer: 600 });
    expect(weatherFromData({ raining: true, timer: 99999 }, () => 0).timer).toBe(1200); // lixo longo demais é limitado à faixa
  });
});

describe('clima na sessão (Orvalis × Titã)', () => {
  const orv = (st: MemoryTitanStorage, seed: number | null = 42) => openSession(st, seed, () => 1, orvalisGeneratorFor, ORVALIS_GENERATOR_VERSION, (sd, v) => new OrvalisGenerator(sd, v));
  const open = (world: 'orvalis3d' | 'titan') => (world === 'titan' ? openSession(new MemoryTitanStorage(), 42, () => 1) : orv(new MemoryTitanStorage()));
  it('no Titã nunca chove e nada vai ao save; no Orvalis o clima vai no cabeçalho e volta ao reabrir', async () => {
    const t = await open('titan'); t.weather.raining = true;
    expect(isRaining(t)).toBe(false); expect(tickWeather(t, 1e6, () => 0.5)).toBe(false); expect(headerOf(t).weather).toBeUndefined();
    const st = new MemoryTitanStorage(), o = await orv(st);
    o.weather = { raining: true, timer: 321 }; expect(isRaining(o)).toBe(true);
    await flush(st, o);
    const again = await orv(st, null);
    expect(again.weather).toEqual({ raining: true, timer: 321 }); expect(headerOf(again).weather).toEqual({ raining: true, timer: 321 });
  });
  it('o relógio do clima corre no Orvalis e vira a chuva', async () => {
    const o = await open('orvalis3d'); o.weather = { raining: false, timer: 5 };
    expect(tickWeather(o, 4, () => 0.5)).toBe(false); expect(tickWeather(o, 2, () => 0.5)).toBe(true); expect(isRaining(o)).toBe(true);
  });
  const Y = 150;
  const field = (sx: Awaited<ReturnType<typeof orv>>) => {
    const a = sx.volume.gen.arrival, x = Math.floor(a.x) + 6, z = Math.floor(a.z) + 6;
    for (let yy = Y + 1; yy < Y + 6; yy++) sx.volume.set(x, yy, z, T.AIR);
    sx.volume.set(x, Y, z, T.FARMLAND_DRY);
    return { x, z };
  };
  it('a chuva hidrata a terra arada a céu aberto (e só ela), sem água por perto; ao parar, seca de novo', async () => {
    const o = await orv(new MemoryTitanStorage()), f = field(o);
    o.crops.set(cropKey(f.x, Y + 1, f.z), { x: f.x, y: Y + 1, z: f.z, species: 'trigo', age: 0 });
    tickCrops(o, 1000, () => 0.999, { x: f.x, z: f.z }); expect(o.volume.get(f.x, Y, f.z)).toBe(T.FARMLAND_DRY); // sem chuva e sem água: seca
    o.weather = { raining: true, timer: 100 };
    tickCrops(o, 1000, () => 0.999, { x: f.x, z: f.z }); expect(o.volume.get(f.x, Y, f.z)).toBe(T.FARMLAND_WET);
    o.weather.raining = false;
    tickCrops(o, 1000, () => 0.999, { x: f.x, z: f.z }); expect(o.volume.get(f.x, Y, f.z)).toBe(T.FARMLAND_DRY);
  });
  it('sob um teto a chuva não hidrata', async () => {
    const o = await orv(new MemoryTitanStorage()), f = field(o);
    o.crops.set(cropKey(f.x, Y + 1, f.z), { x: f.x, y: Y + 1, z: f.z, species: 'trigo', age: 0 });
    o.volume.set(f.x, Y + 4, f.z, T.DARK_ROCK); o.weather = { raining: true, timer: 100 };
    tickCrops(o, 1000, () => 0.999, { x: f.x, z: f.z }); expect(o.volume.get(f.x, Y, f.z)).toBe(T.FARMLAND_DRY);
  });
  it('dormir na chuva (a partir do pôr do sol) limpa o tempo e leva ao amanhecer, sem mexer no cronômetro; de dia só marca o ponto de retorno', async () => {
    const o = await orv(new MemoryTitanStorage()), a = o.volume.gen.arrival, x = Math.floor(a.x) + 6, z = Math.floor(a.z) + 6;
    o.volume.set(x, Y + 1, z, bedFootId(0)); o.volume.set(x, Y + 1, z + 1, bedHeadId(0));
    o.weather = { raining: true, timer: 400 }; o.time = 12100 / 24000; // pôr do sol: só com chuva dá para dormir
    expect(useBed(o, x, Y + 1, z).msg).toContain('dormiu'); expect(o.weather).toEqual({ raining: false, timer: 400 }); expect(o.time).toBeCloseTo(600 / 24000, 9); expect(o.days).toBe(1); // virou o dia
    o.time = 12100 / 24000; o.weather = { raining: false, timer: 400 };
    expect(useBed(o, x, Y + 1, z).msg).toContain('Só se dorme à noite'); expect(o.time).toBe(12100 / 24000); // tempo limpo: ainda não
    o.time = 0.9; expect(useBed(o, x, Y + 1, z).msg).toContain('dormiu');
  });
});
