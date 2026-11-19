/**
 * Relógio e céu do Titã (ADR 0041): dia completo de 8 minutos; manhã pêssego → tarde cobre e âmbar → noite carvão-violeta com cobre no horizonte
 * (tríptico da direção de arte). Puro (sem DOM): `skyAt` devolve cores 0–1, a luz ambiente e o sol para o renderer aplicar **sem refazer malha**
 * (a luz ambiente é um uniform do shader; a luz da lanterna vai separada nos vértices).
 */
export const DAY_SECONDS = 480;
/** Fração do dia (0–1) em que partidas novas, e saves antigos sem hora, começam: a tarde de antes. */
export const AFTERNOON = 0.55;
/** `?hora=` fixa a visualização nestas frações do dia (teste; não é gravada). */
export const FIXED_HOURS: Readonly<Record<string, number>> = { manha: 0.25, tarde: 0.55, noite: 0.85 };

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
/** Três momentos do dia, em ordem circular (noite volta à manhã passando pela meia-noite). */
const LOOKS: readonly Look[] = [
  // manhã: horizonte pêssego, céu ocre, brilho difuso baixo
  { t: 0.25, zenith: hex(0xb07a52), mid: hex(0xd9965c), horizon: hex(0xf4c09a), fog: hex(0xe0b088), ambient: 0.85 },
  // tarde: cobre no alto, âmbar no horizonte (o visual das entregas anteriores)
  { t: 0.55, zenith: hex(0xb96e33), mid: hex(0xd99342), horizon: hex(0xf2cc93), fog: hex(0xd2a066), ambient: 1 },
  // noite: carvão-violeta com um resto de cobre no horizonte
  { t: 0.85, zenith: hex(0x0c0812), mid: hex(0x1a1220), horizon: hex(0x5c3420), fog: hex(0x24161c), ambient: 0.3 },
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
  // sol: nasce a leste em 0,15, passa alto perto da tarde e se põe a oeste em 0,80
  const u = (f - 0.15) / 0.65;
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

/** Nome do período (só para mostrar na tela). */
export function phaseName(frac: number): string {
  const f = ((frac % 1) + 1) % 1;
  if (f < 0.12 || f >= 0.85) return 'noite';
  if (f < 0.4) return 'manhã';
  if (f < 0.75) return 'tarde';
  return 'entardecer';
}
