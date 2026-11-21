/**
 * Dormir na Cama de Junco (ADR 0093): linha do tempo pura do véu escuro, sem DOM. O véu escurece (`SLEEP_FADE_IN_MS`), o jogo avança a noite no instante `SLEEP_APPLY_MS`
 * (com a tela toda preta, para o céu não pular à vista) e o véu clareia devagar; o jogador só retoma o controle em `SLEEP_CONTROL_MS`.
 */
export const SLEEP_FADE_IN_MS = 700;
export const SLEEP_HOLD_MS = 350;
export const SLEEP_FADE_OUT_MS = 1500;
/** Instante (desde o início) em que a noite passa de fato. */
export const SLEEP_APPLY_MS = SLEEP_FADE_IN_MS;
/** Duração total do véu. */
export const SLEEP_TOTAL_MS = SLEEP_FADE_IN_MS + SLEEP_HOLD_MS + SLEEP_FADE_OUT_MS;
/** Quando o jogador volta a andar e agir (o véu ainda está clareando). */
export const SLEEP_CONTROL_MS = SLEEP_FADE_IN_MS + SLEEP_HOLD_MS + 600;

const smooth = (t: number): number => t * t * (3 - 2 * t);

/** Opacidade do véu (0–1) `ms` depois do início: sobe, segura e desce. */
export function sleepVeil(ms: number): number {
  if (ms <= 0) return 0;
  if (ms < SLEEP_FADE_IN_MS) return smooth(ms / SLEEP_FADE_IN_MS);
  if (ms < SLEEP_FADE_IN_MS + SLEEP_HOLD_MS) return 1;
  if (ms < SLEEP_TOTAL_MS) return 1 - smooth((ms - SLEEP_FADE_IN_MS - SLEEP_HOLD_MS) / SLEEP_FADE_OUT_MS);
  return 0;
}
