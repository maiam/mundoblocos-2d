/**
 * Silhuetas do Junco de Vidro (ADR 0051): o atlas `titan-junco-variantes-32px.webp` tem 4 colunas de 32 × 32 px (3 silhuetas + 1 vazia) (broto baixo, haste bifurcada, tufo aberto).
 * A escolha é uma função pura da coluna/linha da célula: a mesma planta tem sempre a mesma silhueta, em qualquer sessão e em qualquer save. Sem DOM.
 */
export const REED_VARIANTS = 3;
/** Colunas do atlas (ADR 0053): 3 silhuetas + 1 célula vazia; o UV de cada silhueta é `coluna / REED_COLUMNS`. */
export const REED_COLUMNS = 4;

export function reedVariant(x: number, z: number): number {
  const h = Math.sin(x * 4.1414 + z * 91.3458) * 24634.6345;
  return Math.min(REED_VARIANTS - 1, Math.floor((h - Math.floor(h)) * REED_VARIANTS));
}
