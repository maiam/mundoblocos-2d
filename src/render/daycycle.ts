import { mix } from './color';

/** Ciclo dia/noite: tinta aplicada sobre o mundo. t: 0 = meia-noite, 0.5 = meio-dia. */
interface Key {
  t: number;
  tint: string;
  alpha: number;
}

const KEYS: Key[] = [
  { t: 0.0, tint: '#1a1850', alpha: 0.5 },
  { t: 0.2, tint: '#2a2470', alpha: 0.4 },
  { t: 0.27, tint: '#ff9a6a', alpha: 0.14 },
  { t: 0.36, tint: '#fff4d8', alpha: 0.0 },
  { t: 0.64, tint: '#fff4d8', alpha: 0.0 },
  { t: 0.74, tint: '#ff7a5a', alpha: 0.18 },
  { t: 0.82, tint: '#3a2a80', alpha: 0.36 },
  { t: 1.0, tint: '#1a1850', alpha: 0.5 },
];

export interface SkyState {
  tint: string;
  tintA: number;
  /** 0 de dia, 1 à meia-noite. */
  night: number;
}

export function skyAt(time: number): SkyState {
  const t = ((time % 1) + 1) % 1;
  let i = 0;
  while (i < KEYS.length - 2 && KEYS[i + 1].t < t) i++;
  const a = KEYS[i];
  const b = KEYS[i + 1];
  const k = (t - a.t) / (b.t - a.t);
  return {
    tint: mix(a.tint, b.tint, k),
    tintA: a.alpha + (b.alpha - a.alpha) * k,
    night: Math.max(0, Math.cos(t * Math.PI * 2)) ** 0.7,
  };
}
