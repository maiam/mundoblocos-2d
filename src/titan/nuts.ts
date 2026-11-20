/**
 * Noz de Duna (ADR 0060): planta baixa de areia seca que dá 4 nozes de uma vez e **rebrota** depois de um tempo. O gerador v5 decide onde há plantas; aqui ficam só os números e o id
 * estável de cada planta (a célula de ar onde ela cresce). O estado "colhida, rebrotando" é o tempo que falta, em segundos de jogo ativo (`TitanSession.regrow`). Sem DOM.
 */
/** Nozes por colheita (as quatro do modelo). */
export const NUT_YIELD = 4;
/** Segundos de jogo ativo até a planta colhida voltar a dar frutos (provisório, pede teste). */
export const NUT_REGROW_S = 300;

export const nutId = (x: number, y: number, z: number): string => `nut:${x},${y},${z}`;
const NUT_RE = /^nut:(-?\d+),(-?\d+),(-?\d+)$/;
/** Célula da planta pelo id, ou null se o id não for de planta. */
export function parseNutId(id: string): { x: number; y: number; z: number } | null {
  const m = NUT_RE.exec(id);
  return m ? { x: Number(m[1]), y: Number(m[2]), z: Number(m[3]) } : null;
}
/** Giro da planta (0–1 volta), fixo pela posição: a mesma planta aparece sempre do mesmo jeito. */
export function nutTurn(x: number, z: number): number {
  const h = Math.sin(x * 7.3131 + z * 53.1237) * 31415.9265;
  return h - Math.floor(h);
}
