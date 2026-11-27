import type { VoxelWorld } from './terrain';

/**
 * Clima do Orvalis em voxel (ADR 0118, auditoria #31), na regra do Minecraft Java: um marcador de chuva com cronômetro que liga e desliga sozinho.
 * Chuva ligada dura 12 000–24 000 ticks (10–20 min); desligada, 12 000–180 000 ticks (10 min–2,5 h). O mundo novo começa **limpo**. Dormir volta ao limpo sem mexer no cronômetro.
 * Sem trovão e sem neve por ora. Puro e sem DOM; o sorteio (`rng`) entra de fora. Só existe no Orvalis (`hasWeather`): o Titã não tem clima.
 */
export interface Weather { raining: boolean; /** Segundos de jogo até o marcador virar. */ timer: number }

const TICKS_PER_SECOND = 20;
export const RAIN_ON_S: readonly [number, number] = [12000 / TICKS_PER_SECOND, 24000 / TICKS_PER_SECOND];
export const RAIN_OFF_S: readonly [number, number] = [12000 / TICKS_PER_SECOND, 180000 / TICKS_PER_SECOND];
/** Segundos para o céu escurecer (ou clarear) por inteiro quando a chuva liga (ou desliga): só visual. */
export const RAIN_FADE_S = 10;
/** Luz do céu em pleno dia com chuva, sobre 15 (Wiki: 12): multiplica o `ambient` na intensidade cheia. */
export const RAIN_SKY_FACTOR = 12 / 15;

/** Só o Orvalis tem clima (decisão do dono do produto). */
export const hasWeather = (world: VoxelWorld): boolean => world === 'orvalis';

const roll = (range: readonly [number, number], rng: () => number): number => range[0] + rng() * (range[1] - range[0]);

/** Clima de um mundo novo: limpo, com um tempo sorteado até a primeira chuva. */
export const newWeather = (rng: () => number): Weather => ({ raining: false, timer: roll(RAIN_OFF_S, rng) });

/** Passa `dt` segundos de jogo ativo; devolve se o marcador virou (o desenho e o save precisam saber). */
export function stepWeather(w: Weather, dt: number, rng: () => number): boolean {
  w.timer -= dt;
  if (w.timer > 0) return false;
  w.raining = !w.raining;
  w.timer = roll(w.raining ? RAIN_ON_S : RAIN_OFF_S, rng);
  return true;
}

/** Dormir (ADR 0090): o clima volta ao limpo, mas o cronômetro segue (regra da Wiki). Devolve se mudou. */
export function clearWeather(w: Weather): boolean {
  const was = w.raining;
  w.raining = false;
  return was;
}

/** Intensidade da chuva para o desenho (0–1): sobe ou desce em `RAIN_FADE_S` segundos até o alvo. */
export function smoothRain(level: number, raining: boolean, dt: number): number {
  const step = dt / RAIN_FADE_S;
  return raining ? Math.min(1, level + step) : Math.max(0, level - step);
}

export interface WeatherData { raining: boolean; timer: number }
export const weatherToData = (w: Weather): WeatherData => ({ raining: w.raining, timer: Math.round(w.timer * 10) / 10 });
/** Lê o clima gravado; ausente ou inválido = um clima novo (limpo). */
export function weatherFromData(d: unknown, rng: () => number): Weather {
  const o = d as Partial<WeatherData> | null | undefined;
  if (o && typeof o.raining === 'boolean' && typeof o.timer === 'number' && Number.isFinite(o.timer) && o.timer > 0) return { raining: o.raining, timer: Math.min(o.timer, (o.raining ? RAIN_ON_S : RAIN_OFF_S)[1]) };
  return newWeather(rng);
}
