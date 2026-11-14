/**
 * Luz dos atores no 3D (v0.93.64): de onde vem o sol (ou a lua) e quão forte, pela hora do dia (`skyAt`: 0 = meia-noite, 0,5 =
 * meio-dia). Funções PURAS. O desenho é do `ActorBillboards` (sombreado por quadro com normais falsas) e da sombra projetada no chão.
 * Eixos do mundo na tela: x = leste (direita), y = para cima, z = para a câmera (sul).
 */

export interface ActorLight {
  /** Direção PARA a luz (unitária). */
  dir: [number, number, number];
  /** Cor da luz direta (0–1). */
  color: [number, number, number];
  /** Cor da luz ambiente (céu), 0–1. */
  ambient: [number, number, number];
  /** Quanto o sombreado vale (0 = nada, 1 = tudo): fraco dentro do covil e de cômodos, para não escurecer onde já é escuro. */
  strength: number;
  /** Sombra no chão: direção (x, z) para onde ela cai, comprimento relativo (1 = o círculo de sempre) e opacidade. */
  shadow: { dx: number; dz: number; len: number; opacity: number };
}

export type LightPlace = 'world' | 'dungeon' | 'interior';

const norm = (v: [number, number, number]): [number, number, number] => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};
const mix3 = (a: [number, number, number], b: [number, number, number], k: number): [number, number, number] =>
  [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];

const DAY_SUN: [number, number, number] = [1, 0.97, 0.9];
const DUSK_SUN: [number, number, number] = [1, 0.66, 0.4];
const MOON: [number, number, number] = [0.55, 0.65, 1];
const DAY_AMBIENT: [number, number, number] = [0.74, 0.8, 0.95];
const NIGHT_AMBIENT: [number, number, number] = [0.42, 0.46, 0.7];

export function actorLightAt(time: number, place: LightPlace = 'world'): ActorLight {
  if (place !== 'world') {
    // Covil e cômodos: luz de cima e de frente, bem fraca (a escuridão deles já vem das outras camadas).
    return {
      dir: norm([0.2, 0.9, 0.5]), color: [1, 0.92, 0.8], ambient: [0.8, 0.8, 0.85],
      strength: place === 'dungeon' ? 0.35 : 0.3, shadow: { dx: 0, dz: 0.4, len: 0.9, opacity: 0.2 },
    };
  }
  const t = ((time % 1) + 1) % 1;
  // Dia: o sol nasce a leste (t = 0,25), culmina ao meio-dia e se põe a oeste (t = 0,75). θ: 0 → π.
  const day = t >= 0.25 && t <= 0.75;
  const theta = day ? ((t - 0.25) / 0.5) * Math.PI : 0;
  const elev = day ? Math.sin(theta) : 0; // 0..1
  // Lua à noite: mesma trajetória, deslocada meio dia (mais fraca).
  const tm = (t + 0.5) % 1;
  const moonTheta = tm >= 0.25 && tm <= 0.75 ? ((tm - 0.25) / 0.5) * Math.PI : 0;
  const moonElev = !day ? Math.sin(moonTheta) : 0;
  const east = day ? Math.cos(theta) : Math.cos(moonTheta);
  const up = Math.max(day ? elev : moonElev, 0.08); // nunca rasante demais: a face da frente sempre pega alguma luz
  const dir = norm([east * 0.85, up * 0.9 + 0.15, 0.5]);
  const warm = day ? 1 - Math.min(1, elev * 1.6) : 0; // 1 no nascer/pôr do sol
  const color = day ? mix3(DAY_SUN, DUSK_SUN, warm) : MOON;
  const night = day ? 0 : 1;
  const ambient = mix3(DAY_AMBIENT, NIGHT_AMBIENT, night);
  // A sombra cai para o lado oposto ao sol; comprida com o sol baixo, curta ao meio-dia.
  const sunH = day ? elev : moonElev * 0.6;
  const len = Math.min(2.6, 0.55 + 0.55 / Math.max(sunH, 0.22));
  const sx = -dir[0], sz = -dir[2];
  const sl = Math.hypot(sx, sz) || 1;
  return {
    dir, color: night ? [color[0] * 0.55, color[1] * 0.55, color[2] * 0.55] : color, ambient, strength: day ? 1 : 0.7,
    shadow: { dx: sx / sl, dz: sz / sl, len, opacity: day ? 0.24 : 0.12 },
  };
}
