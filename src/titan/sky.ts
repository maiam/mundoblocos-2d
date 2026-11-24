/**
 * Relógio e céu do Titã (ADR 0041), com o ritmo do Minecraft: dia completo de **20 minutos** (24 000 ticks a 20 ticks por segundo = 1 200 s), dividido
 * nas mesmas proporções — dia 10 min (ticks 0–12 000), pôr do sol 1 min 30 s (12 000–13 800), noite 7 min (13 800–22 200) e nascer do sol 1 min 30 s
 * (22 200–24 000). As cores seguem o tríptico da direção de arte: manhã pêssego → tarde cobre e âmbar → noite carvão-violeta com cobre no horizonte.
 * Puro (sem DOM): `skyAt` devolve cores 0–1, a luz ambiente e o sol para o renderer aplicar **sem refazer malha** (a luz ambiente é um uniform do
 * shader; a luz da lanterna vai separada nos vértices).
 * ADR 0048: a luz do céu é **direcional** (bruma e halo nascem do lado do Sol, o poente guarda a última claridade), a noite é mais escura e fria, ganha poucas
 * estrelas perto do zênite e, raramente, um trecho dos anéis de Saturno através da bruma (`saturnVisibility`).
 */
export const DAY_TICKS = 24000;
export const TICKS_PER_SECOND = 20;
export const DAY_SECONDS = DAY_TICKS / TICKS_PER_SECOND; // 1 200
/** Fronteiras das fases, em ticks (a hora 0 é o início do dia, com o sol já no horizonte a leste). */
export const PHASE_TICKS = { sunsetStart: 12000, nightStart: 13800, sunriseStart: 22200 } as const;
/** Fração do dia (0–1) de um tick. */
export const tickFrac = (ticks: number): number => ticks / DAY_TICKS;
/** Fração do dia (0–1) em que partidas novas, e saves antigos sem hora, começam: a tarde (tick 9 000), a 2 min 30 s do pôr do sol. */
export const AFTERNOON = tickFrac(9000);
/** Dormir na cama (ADR 0090): só da noite em diante (`PHASE_TICKS.nightStart`) e acorda logo depois do nascer do sol. */
export const WAKE_TICKS = 600;
export const isNightTime = (frac: number): boolean => frac * DAY_TICKS >= PHASE_TICKS.nightStart;
/** `?hora=` fixa a visualização nestas frações do dia (teste; não é gravada): manhã (tick 720), tarde (9 000), crepúsculo (12 900, o pôr do sol já avançado) e a meia-noite (18 000). */
export const FIXED_HOURS: Readonly<Record<string, number>> = { manha: tickFrac(720), tarde: tickFrac(9000), crepusculo: tickFrac(12900), noite: tickFrac(18000) };

/** Lê `?hora=manha|tarde|crepusculo|noite`; qualquer outra coisa (ou ausente) = relógio normal (null). */
export function parseHora(v: string | null): number | null {
  const key = (v ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  return Object.prototype.hasOwnProperty.call(FIXED_HOURS, key) ? FIXED_HOURS[key] : null;
}

/** Avança a fração do dia em `dtSeconds` de jogo ativo (volta a 0 depois de 1). */
export function advanceDay(frac: number, dtSeconds: number): number {
  const f = (frac + dtSeconds / DAY_SECONDS) % 1;
  return f < 0 ? f + 1 : f;
}

/** Fração válida (finita, 0 ≤ f < 1) ou a tarde. */
export function validDay(f: unknown): number { return typeof f === 'number' && Number.isFinite(f) && f >= 0 && f < 1 ? f : AFTERNOON; }

export type RGB = readonly [number, number, number];
const hex = (n: number): RGB => [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];

interface Look { t: number; zenith: RGB; mid: RGB; horizon: RGB; fog: RGB; ambient: number; tint: RGB }
/**
 * Momentos do dia, em ordem circular. Entre dois momentos com a mesma aparência ela se mantém (platô): a tarde segura do tick 6 000 ao 12 000 (início do pôr do
 * sol), a noite do 13 800 ao 22 200 (início do nascer do sol) e a manhã vai do nascer do sol (tick 24 000 = 0) até o tick 6 000.
 */
const MANHA = { zenith: hex(0xb07a52), mid: hex(0xd9965c), horizon: hex(0xf4c09a), fog: hex(0xe0b088), ambient: 0.85, tint: [1, 0.97, 0.92] as RGB }; // horizonte pêssego, céu ocre, brilho difuso baixo
const TARDE = { zenith: hex(0xb96e33), mid: hex(0xd99342), horizon: hex(0xf2cc93), fog: hex(0xd2a066), ambient: 1, tint: [1, 1, 1] as RGB }; // cobre no alto, âmbar no horizonte (o visual das entregas anteriores)
// noite (ADR 0048): mais escura que antes (ambient 0,3 → 0,22) e **fria** (`tint` azulado): a costa fica legível em tons frios e a lanterna domina perto do jogador; o cobre do horizonte vem da claridade do poente (`glowK`), não da paleta
const NOITE = { zenith: hex(0x05040a), mid: hex(0x0b0812), horizon: hex(0x241418), fog: hex(0x110b10), ambient: 0.22, tint: [0.84, 0.95, 1.22] as RGB };
// Orvalis (ADR 0105): céu azul de dia, quente só na manhã e no poente; a noite é a mesma (luz fria e baixa)
const MANHA_O = { zenith: hex(0x6fa4e6), mid: hex(0x9cc8f0), horizon: hex(0xf6d9b8), fog: hex(0xbcd6ee), ambient: 0.85, tint: [1, 0.98, 0.94] as RGB };
const TARDE_O = { zenith: hex(0x4f95e8), mid: hex(0x86bff2), horizon: hex(0xcfe6f7), fog: hex(0xb4d4f0), ambient: 1, tint: [1, 1, 1] as RGB };
const NOITE_O = { zenith: hex(0x050818), mid: hex(0x0a1030), horizon: hex(0x182446), fog: hex(0x0c1428), ambient: 0.22, tint: [0.84, 0.95, 1.22] as RGB };
export type SkyPalette = 'titan' | 'orvalis';
const looksOf = (m: typeof MANHA, t: typeof TARDE, n: typeof NOITE): readonly Look[] => [
  { t: 0, ...m },
  { t: tickFrac(6000), ...t },
  { t: tickFrac(PHASE_TICKS.sunsetStart), ...t },
  { t: tickFrac(PHASE_TICKS.nightStart), ...n },
  { t: tickFrac(PHASE_TICKS.sunriseStart), ...n },
];
const LOOKS_BY: Record<SkyPalette, readonly Look[]> = { titan: looksOf(MANHA, TARDE, NOITE), orvalis: looksOf(MANHA_O, TARDE_O, NOITE_O) };

const mix = (a: RGB, b: RGB, k: number): RGB => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const ease = (k: number): number => k * k * (3 - 2 * k);

export interface Sky {
  zenith: RGB; mid: RGB; horizon: RGB; fog: RGB;
  /** Luz do dia (0,3 à noite … 1 à tarde): multiplica a luz das faces; a lanterna não depende dela. */
  ambient: number;
  /** Direção do sol (unitária) e opacidade do ponto (0 = escondido; só aparece com o sol alto). */
  sun: { dir: [number, number, number]; alpha: number };
  /** Cor da luz ambiente (multiplica `ambient`): quente de dia, fria de noite. */
  tint: RGB;
  /** Bruma direcional (ADR 0048): de onde vem a claridade (leste ao nascer, o Sol de dia, oeste ao pôr), a cor e a força (0–1) do halo largo e suave. */
  glowDir: [number, number, number]; glow: RGB; glowK: number;
  /** Lado oposto ao Sol: multiplicador de cor mais frio (ocre frio) e a força (0–1). */
  cool: RGB; coolK: number;
  /** Faixas finas de bruma baixa (0–1) e estrelas (0 de dia … 1 de madrugada, só perto do zênite). */
  haze: number; stars: number;
}

const unit = (x: number, y: number, z: number): [number, number, number] => { const m = Math.hypot(x, y, z); return [x / m, y / m, z / m]; };
const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));
/** Mistura em [0, 1] com suavização (0 antes de `a`, 1 depois de `b`). */
const smooth = (a: number, b: number, v: number): number => ease(clamp01((v - a) / (b - a)));
const PEACH = hex(0xf09a68), AMBER = hex(0xe08a3c), COPPER = hex(0xc2622a);
const COOL: RGB = [0.86, 0.93, 1.06];
/** Onde o dia, em ticks, está: usado pelas curvas da claridade direcional. */
const SUNSET = PHASE_TICKS.sunsetStart, NIGHT = PHASE_TICKS.nightStart, SUNRISE = PHASE_TICKS.sunriseStart;

/** Aparência do céu na fração `frac` (0–1) do dia: interpolação suave e contínua, inclusive na virada da meia-noite. */
export function skyAt(frac: number, palette: SkyPalette = 'titan'): Sky {
  const LOOKS = LOOKS_BY[palette];
  const f = ((frac % 1) + 1) % 1;
  // acha o par de momentos que cerca f (o último liga ao primeiro do dia seguinte)
  let i = LOOKS.length - 1;
  for (let k = 0; k < LOOKS.length; k++) if (f >= LOOKS[k].t) i = k;
  const a = LOOKS[i], b = LOOKS[(i + 1) % LOOKS.length];
  const span = ((b.t - a.t) + 1) % 1 || 1;
  const k = ease((((f - a.t) + 1) % 1) / span);
  // sol: está no horizonte a leste no tick 0, passa a pino no 6 000 e se põe a oeste no 12 000 (começo do pôr do sol)
  const u = f / tickFrac(PHASE_TICKS.sunsetStart);
  const up = u >= 0 && u <= 1;
  const elev = up ? Math.sin(Math.PI * u) : -0.2;
  const az = Math.PI * Math.min(1, Math.max(0, u));
  const d: [number, number, number] = [Math.cos(az), Math.max(elev, -0.2) + 0.05, -0.35];
  const m = Math.hypot(d[0], d[1], d[2]);
  // claridade direcional: nasce a leste, acompanha o Sol de dia e guarda o poente (oeste) ao pôr do sol; some devagar na noite e volta a leste antes do nascer
  const T = f * DAY_TICKS;
  let glowK: number, glowDir: [number, number, number], glow: RGB;
  if (T < SUNSET) { glowK = 0.55 + 0.45 * (1 - elev); glowDir = unit(d[0] / m, d[1] / m, d[2] / m); glow = mix(PEACH, AMBER, smooth(0, 3000, T)); }
  else if (T < NIGHT) { glowK = 1 - 0.7 * smooth(SUNSET, NIGHT, T); glowDir = unit(-1, -0.05, -0.35); glow = mix(AMBER, COPPER, smooth(SUNSET, NIGHT, T)); }
  else if (T < SUNRISE) { glowK = 0.3 - 0.26 * smooth(NIGHT, 16500, T); glowDir = unit(-1, -0.05, -0.35); glow = COPPER; }
  else { glowK = 0.04 + 0.96 * smooth(SUNRISE, DAY_TICKS, T); glowDir = unit(1, -0.05, -0.35); glow = mix(COPPER, PEACH, smooth(SUNRISE, DAY_TICKS, T)); }
  const dayK = T < SUNSET ? 1 : T < NIGHT ? 1 - smooth(SUNSET, NIGHT, T) * 0.7 : T < SUNRISE ? 0.3 - 0.2 * smooth(NIGHT, 16500, T) : 0.1 + 0.9 * smooth(SUNRISE, DAY_TICKS, T);
  const stars = T < NIGHT ? 0 : T < 15600 ? smooth(NIGHT, 15600, T) : T < 21000 ? 1 : T < 22600 ? 1 - smooth(21000, 22600, T) : 0;
  return {
    tint: mix(a.tint, b.tint, k), glowDir, glow, glowK, cool: COOL, coolK: 0.65 * dayK, haze: 0.45 + 0.55 * dayK, stars,
    zenith: mix(a.zenith, b.zenith, k), mid: mix(a.mid, b.mid, k), horizon: mix(a.horizon, b.horizon, k), fog: mix(a.fog, b.fog, k),
    ambient: a.ambient + (b.ambient - a.ambient) * k,
    sun: { dir: [d[0] / m, d[1] / m, d[2] / m], alpha: up ? Math.min(1, Math.max(0, (elev - 0.55) / 0.2)) : 0 },
  };
}

/** Nome do período (só para mostrar na tela): as quatro fases do Minecraft, com o dia dividido em manhã e tarde. */
export function phaseName(frac: number): string {
  const t = Math.round((((frac % 1) + 1) % 1) * DAY_TICKS * 1e6) / 1e6; // arredonda o ruído de ponto flutuante nas fronteiras exatas
  if (t >= PHASE_TICKS.sunriseStart) return 'nascer do sol';
  if (t >= PHASE_TICKS.nightStart) return 'noite';
  if (t >= PHASE_TICKS.sunsetStart) return 'pôr do sol';
  return t < 4000 ? 'manhã' : 'tarde';
}

/**
 * Cor da bruma baixa (o horizonte) olhando na direção horizontal (`dx`, `dz`) — a mesma conta que o shader do céu faz na altura 0. A névoa do terreno usa esta cor, então a costa
 * distante some na cor do céu **daquele lado** (mais clara e quente na direção do Sol, mais fria e escura no lado oposto).
 */
export function horizonAt(sky: Sky, dx: number, dz: number): RGB {
  const m = Math.hypot(dx, dz) || 1;
  const gd = (dx / m) * sky.glowDir[0] + (dz / m) * sky.glowDir[2]; // projeção horizontal, sem a altura (olhando para o horizonte)
  const gh = Math.max(0, gd) / (Math.hypot(sky.glowDir[0], sky.glowDir[2]) || 1);
  const cool = clamp01(sky.coolK * (1 - gh) * 0.5);
  const base = mix(sky.fog, [sky.fog[0] * sky.cool[0], sky.fog[1] * sky.cool[1], sky.fog[2] * sky.cool[2]], cool);
  const w = sky.glowK * (0.2 * gh * gh * gh + 0.35 * gh * gh * gh * gh * gh * gh);
  return [Math.min(1, base[0] + sky.glow[0] * w), Math.min(1, base[1] + sky.glow[1] * w), Math.min(1, base[2] + sky.glow[2] * w)];
}

// ---- Saturno (raro) ----
/** Fração dos dias em que Saturno aparece (~1 em cada 8) e meia-largura, em fração do dia, da janela em que fica à vista (~14 s de jogo para cada lado do pico). */
export const SATURN_DAY_CHANCE = 0.12;
const SATURN_WINDOW = 0.0035;
const h32 = (a: number, b: number): number => { let h = Math.imul((a | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul((b | 0) + 0x7f4a7c15, 0xc2b2ae35); h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; h = Math.imul(h, 0x297a2d39); h ^= h >>> 15; return (h >>> 0) / 4294967296; };
/**
 * Quanto de Saturno aparece (0–1) no dia número `day` da partida `seed`, na fração `frac`: em ~12% dos dias há **uma janela curta** em plena luz do dia (a bruma o encobre o resto do tempo);
 * o pico fica numa hora do dia que varia de dia para dia. Determinístico (testes e reabrir o jogo dão o mesmo), puro e sem Math.random.
 */
export function saturnVisibility(day: number, frac: number, seed: number): number {
  if (h32(seed, day) >= SATURN_DAY_CHANCE) return 0;
  const peak = 0.1 + 0.34 * h32(seed ^ 0x5a17, day + 7); // sempre de dia (ticks 2 400–10 560)
  const dist = Math.abs(((frac - peak + 1.5) % 1) - 0.5);
  return Math.exp(-((dist / SATURN_WINDOW) ** 2));
}
