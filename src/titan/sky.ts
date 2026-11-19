/**
 * Relógio e céu do Titã (ADR 0041), com o ritmo do Minecraft: dia completo de **20 minutos** (24 000 ticks a 20 ticks por segundo = 1 200 s), dividido
 * nas mesmas proporções — dia 10 min (ticks 0–12 000), pôr do sol 1 min 30 s (12 000–13 800), noite 7 min (13 800–22 200) e nascer do sol 1 min 30 s
 * (22 200–24 000). As cores seguem o tríptico da direção de arte: manhã pêssego → tarde cobre e âmbar → noite carvão-violeta com cobre no horizonte.
 * Puro (sem DOM): `skyAt` devolve cores 0–1, a luz ambiente e o sol para o renderer aplicar **sem refazer malha** (a luz ambiente é um uniform do
 * shader; a luz da lanterna vai separada nos vértices).
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
/** `?hora=` fixa a visualização nestas frações do dia (teste; não é gravada): manhã (tick 720), tarde (9 000) e a meia-noite (18 000). */
export const FIXED_HOURS: Readonly<Record<string, number>> = { manha: tickFrac(720), tarde: tickFrac(9000), noite: tickFrac(18000) };

/** Lê `?hora=manha|tarde|noite`; qualquer outra coisa (ou ausente) = relógio normal (null). */
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

interface Look { t: number; zenith: RGB; mid: RGB; horizon: RGB; fog: RGB; ambient: number }
/**
 * Momentos do dia, em ordem circular. Entre dois momentos com a mesma aparência ela se mantém (platô): a tarde segura do tick 6 000 ao 12 000 (início do pôr do
 * sol), a noite do 13 800 ao 22 200 (início do nascer do sol) e a manhã vai do nascer do sol (tick 24 000 = 0) até o tick 6 000.
 */
const MANHA = { zenith: hex(0xb07a52), mid: hex(0xd9965c), horizon: hex(0xf4c09a), fog: hex(0xe0b088), ambient: 0.85 }; // horizonte pêssego, céu ocre, brilho difuso baixo
const TARDE = { zenith: hex(0xb96e33), mid: hex(0xd99342), horizon: hex(0xf2cc93), fog: hex(0xd2a066), ambient: 1 }; // cobre no alto, âmbar no horizonte (o visual das entregas anteriores)
const NOITE = { zenith: hex(0x0c0812), mid: hex(0x1a1220), horizon: hex(0x5c3420), fog: hex(0x24161c), ambient: 0.3 }; // carvão-violeta com resto de cobre no horizonte (luz ~4/15, como no Minecraft)
const LOOKS: readonly Look[] = [
  { t: 0, ...MANHA },
  { t: tickFrac(6000), ...TARDE },
  { t: tickFrac(PHASE_TICKS.sunsetStart), ...TARDE },
  { t: tickFrac(PHASE_TICKS.nightStart), ...NOITE },
  { t: tickFrac(PHASE_TICKS.sunriseStart), ...NOITE },
];

const mix = (a: RGB, b: RGB, k: number): RGB => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const ease = (k: number): number => k * k * (3 - 2 * k);

export interface Sky {
  zenith: RGB; mid: RGB; horizon: RGB; fog: RGB;
  /** Luz do dia (0,3 à noite … 1 à tarde): multiplica a luz das faces; a lanterna não depende dela. */
  ambient: number;
  /** Direção do sol (unitária) e opacidade do ponto (0 = escondido; só aparece com o sol alto). */
  sun: { dir: [number, number, number]; alpha: number };
}

/** Aparência do céu na fração `frac` (0–1) do dia: interpolação suave e contínua, inclusive na virada da meia-noite. */
export function skyAt(frac: number): Sky {
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
  return {
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
