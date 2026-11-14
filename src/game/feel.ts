/**
 * Sensação de movimento do jogador (v0.93.69): constantes e a chave `?sensacao=0` (volta ao movimento seco de antes, para comparar).
 * Sem DOM. A inércia e o passo por distância são do `Player`; a antecipação da câmera e o balanço do corpo, do render/Game.
 */

/** Rapidez com que a entrada "enche" ao começar a andar (1/s; constante de tempo ≈ 1/ACCEL ≈ 55 ms). */
export const INPUT_ACCEL = 18;
/** Rapidez com que a entrada "esvazia" ao soltar (1/s; ≈ 40 ms): para quase na hora, sem cortar seco. */
export const INPUT_DECEL = 25;
/** Quanto a câmera se adianta na direção do movimento (px de mundo) e a rapidez com que acompanha (1/s). */
export const LOOKAHEAD_PX = 18;
export const LOOKAHEAD_RATE = 3.2;
/** Balanço do corpo ao andar (células de mundo de subida; radianos de inclinação lateral). */
export const BOB_CELLS = 0.012;
/** Inclinação lateral ao andar: 0 desde a v0.93.70 (inclinava o corpo e dava a impressão de chão inclinado). */
export const LEAN_RAD = 0;

export function feelOn(search: string = typeof window !== 'undefined' ? window.location.search : ''): boolean {
  return new URLSearchParams(search).get('sensacao') !== '0';
}
