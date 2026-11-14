import { SUBDIV } from '../config';
import { hash2 } from '../world/random';

/**
 * Peixes de ambiente (v0.93.92, arte do dono do produto): cardumes pequenos que nadam na água aberta perto da câmera. Só visual, no aparelho
 * (cada um vê os seus; sem protocolo nem servidor). Este arquivo é a simulação PURA (sem three nem DOM); o desenho é `three/waterFish.ts`.
 * Posições em células do mundo (x, z). O sorteio vem de hashes do contador (sem `Math.random`): a mesma sequência a cada execução.
 */
export interface Fish {
  x: number;
  z: number;
  /** Direção de nado (radianos, `atan2(-dz, dx)`: 0 = leste, π/2 = norte). */
  heading: number;
  /** Para onde está virando (radianos). */
  target: number;
  /** Velocidade atual (células/s). */
  speed: number;
  species: number;
  /** Segundos de vida restantes (some ao acabar) e idade (para o fade-in). */
  life: number;
  age: number;
  /** Foge do jogador por mais este tempo (s). */
  flee: number;
}

export const FISH_SPECIES = ['carp', 'silver', 'perch', 'gold'] as const;
/** Peso de cada espécie ao nascer (a carpa é a mais comum, o dourado o mais raro) e escala do desenho (comprimento relativo). */
export const FISH_WEIGHT = [0.38, 0.28, 0.22, 0.12] as const;
export const FISH_SCALE = [1.1, 0.95, 0.9, 1.0] as const;
/** Quantos peixes ao mesmo tempo, o tamanho do cardume e o alcance (células) do susto do jogador. */
export const FISH_MAX = 18;
export const FISH_SCHOOL = 3;
export const FISH_SCARE = 3.2;
const CRUISE = 0.7 * SUBDIV * 0.5; // células/s: nado calmo
const BOLT = 2.4 * SUBDIV * 0.5; // célula/s ao fugir
const TURN_RATE = 2.2; // rad/s

/** Menor diferença de ângulo (−π, π]. */
export function angleDiff(a: number, b: number): number {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d <= -Math.PI) d += Math.PI * 2;
  return d;
}

export function pickSpecies(r: number): number {
  let acc = 0;
  for (let i = 0; i < FISH_WEIGHT.length; i++) { acc += FISH_WEIGHT[i]; if (r < acc) return i; }
  return 0;
}

/** Cria um peixe em (x, z). `r1..r3` ∈ [0, 1) vêm do chamador (hash). */
export function newFish(x: number, z: number, species: number, r1: number, r2: number, r3: number): Fish {
  const h = r1 * Math.PI * 2;
  return { x, z, heading: h, target: h, speed: CRUISE * (0.8 + 0.4 * r2), species, life: 25 + 25 * r3, age: 0, flee: 0 };
}

/**
 * Avança um peixe `dt` s: segue a direção alvo, vira antes de chegar na margem (olha 1,2 célula à frente), foge do jogador que chega a
 * `FISH_SCARE` e, de vez em quando, escolhe outro rumo (`wander`, ∈ [0, 1) do chamador). Devolve false quando o peixe deve sumir.
 */
export function stepFish(f: Fish, dt: number, water: (x: number, z: number) => boolean, player: { x: number; z: number } | null, wander: number): boolean {
  f.age += dt;
  f.life -= dt;
  if (f.flee > 0) f.flee -= dt;
  if (player) {
    const dx = f.x - player.x, dz = f.z - player.z;
    if (dx * dx + dz * dz < FISH_SCARE * FISH_SCARE) { f.flee = 1.4; f.target = Math.atan2(-dz, dx); }
  }
  if (f.flee <= 0 && wander < dt * 0.35) f.target = f.heading + (wander / (dt * 0.35) - 0.5) * 2.4; // novo rumo a cada ~3 s, até ±70°
  // margem à frente: tenta virar para o lado com água
  const look = 1.2;
  const ahead = (a: number) => water(f.x + Math.cos(a) * look, f.z - Math.sin(a) * look);
  if (!ahead(f.heading)) {
    for (const off of [0.6, -0.6, 1.2, -1.2, 2, -2, Math.PI]) {
      if (ahead(f.heading + off)) { f.target = f.heading + off; break; }
    }
  }
  const d = angleDiff(f.heading, f.target);
  f.heading += Math.sign(d) * Math.min(Math.abs(d), TURN_RATE * (f.flee > 0 ? 2 : 1) * dt);
  const want = f.flee > 0 ? BOLT : CRUISE;
  f.speed += (want - f.speed) * Math.min(1, dt * 3);
  const nx = f.x + Math.cos(f.heading) * f.speed * dt, nz = f.z - Math.sin(f.heading) * f.speed * dt;
  if (water(nx, nz)) { f.x = nx; f.z = nz; } else f.target = f.heading + Math.PI; // encostou: dá meia-volta
  return f.life > 0;
}

/** Opacidade 0..1: entra e sai devagar (fade-in de 0,8 s, fade-out nos últimos 1,5 s). */
export function fishAlpha(f: Fish): number {
  return Math.max(0, Math.min(1, f.age / 0.8, f.life / 1.5));
}

/** Rotação em volta de Y (radianos) para o desenho (cabeça voltada para o nordeste) apontar para `heading`. */
export function fishYaw(heading: number): number {
  return heading - Math.PI / 4;
}

/**
 * Ponto de nascimento perto de (cx, cz) (a câmera): sorteia uma célula num anel de `r0`–`r1` células e devolve se ela e a vizinhança 3 × 3
 * são água. `n` é o contador do sorteio (hash determinístico).
 */
export function spawnPoint(seed: number, n: number, cx: number, cz: number, r0: number, r1: number, water: (x: number, z: number) => boolean): [number, number] | null {
  const a = hash2(seed, n, 11) * Math.PI * 2;
  const r = r0 + hash2(seed, n, 12) * (r1 - r0);
  const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) if (!water(x + dx, z + dz)) return null;
  return [x, z];
}
