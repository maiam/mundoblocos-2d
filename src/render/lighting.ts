import { Block, type BlockId, blockDef } from '../world/blocks';

/**
 * Iluminação 2.5D (ADR 0029, referência Core Keeper): funções PURAS (sem DOM nem Three) para escolher e calcular as luzes.
 * O render desenha uma camada de escuridão sobre a cena com "buracos" de luz (`sanctuaryLighting.ts`); aqui ficam as regras:
 * que blocos emitem luz, com que raio e cor, o decaimento e quais luzes entram no quadro (teto `MAX_LIGHTS`).
 */

/** Teto de luzes por quadro (o shader percorre um vetor fixo; celular fraco precisa de teto). */
export const MAX_LIGHTS = 12;

/** Brilho ambiente: 0 = escuridão total fora das luzes; 1 = sem escuridão (iluminação desligada). */
export const AMBIENT_PRESETS = { noite: 0.18, penumbra: 0.5 } as const;

/** Lê `?luz=`: `noite`, `penumbra` ou um número 0–1. `null` = iluminação desligada (ausente, inválido, `off` ou ≥ 1). */
export function parseAmbient(text: string | null | undefined): number | null {
  if (!text) return null;
  const t = text.trim().toLowerCase();
  if (t === 'noite' || t === 'penumbra') return AMBIENT_PRESETS[t];
  const n = Number(t.replace(',', '.'));
  if (!Number.isFinite(n) || n >= 1) return null;
  return Math.min(1, Math.max(0, n));
}

export interface LightSource {
  /** Posição no mundo (células): x leste, z sul; `height` = altura da chama/cristal (células). */
  x: number;
  z: number;
  height: number;
  /** Raio de alcance em células. */
  radius: number;
  /** Cor da luz (0–1). */
  color: [number, number, number];
  /** 0 = estável; > 0 = oscila (fogo). */
  flicker: number;
}

/** Decaimento suave: 1 no centro, 0 no raio (smoothstep sobre 1 − d/r). */
export function lightFalloff(distance: number, radius: number): number {
  if (radius <= 0) return 0;
  const t = Math.min(1, Math.max(0, 1 - distance / radius));
  return t * t * (3 - 2 * t);
}

/** Intensidade máxima das luzes num ponto (0..1) — a mesma conta que o shader faz por pixel. */
export function lightIntensityAt(lights: readonly LightSource[], x: number, z: number): number {
  let best = 0;
  for (const l of lights) best = Math.max(best, lightFalloff(Math.hypot(x - l.x, z - l.z), l.radius));
  return best;
}

/** A luz do jogador (a Deusa): quente, de raio largo — é ela que faz a "neblina escura" em volta. */
export const PLAYER_LIGHT: Pick<LightSource, 'height' | 'radius' | 'color' | 'flicker'> = {
  height: 0.7, radius: 6.5, color: [1, 0.88, 0.66], flicker: 0,
};

/** Luz de cada bloco que brilha (`glow` em `blocks.ts`); `null` se o bloco não emite luz. */
export function glowLightFor(id: BlockId): Pick<LightSource, 'radius' | 'color' | 'flicker'> | null {
  if (!blockDef(id).glow) return null;
  switch (id) {
    case Block.CAMPFIRE: return { radius: 5.5, color: [1, 0.62, 0.28], flicker: 0.12 };
    case Block.CAULDRON:
    case Block.OVEN: return { radius: 3.5, color: [1, 0.55, 0.25], flicker: 0.1 };
    default: return { radius: 3.5, color: [1, 0.85, 0.6], flicker: 0 };
  }
}

/** Oscilação do fogo: 1 ± `flicker`, determinística pelo tempo e pela posição (sem `Math.random`). */
export function flickerFactor(flicker: number, elapsed: number, seed: number): number {
  if (flicker <= 0) return 1;
  return 1 + flicker * (0.6 * Math.sin(elapsed * 9 + seed * 1.7) + 0.4 * Math.sin(elapsed * 23 + seed * 3.1));
}

/**
 * Escolhe até `max` luzes para o quadro: as que alcançam a área visível, das mais próximas do foco para as mais distantes.
 * `reach` = meia diagonal da tela em células (uma luz fora disso, descontado o raio, não aparece).
 */
export function pickLights(candidates: readonly LightSource[], focus: { x: number; z: number }, reach: number, max = MAX_LIGHTS): LightSource[] {
  return candidates
    .map((l) => ({ l, d: Math.hypot(l.x - focus.x, l.z - focus.z) }))
    .filter(({ l, d }) => d - l.radius <= reach)
    .sort((a, b) => a.d - b.d)
    .slice(0, max)
    .map(({ l }) => l);
}
