/**
 * Silhuetas do Junco de Vidro (ADR 0051): o atlas `titan-junco-variantes-16px.webp` tem 3 colunas de 16 × 16 px (broto baixo, haste bifurcada, tufo aberto).
 * A escolha é uma função pura da coluna/linha da célula: a mesma planta tem sempre a mesma silhueta, em qualquer sessão e em qualquer save. Sem DOM.
 */
export const REED_VARIANTS = 3;

export function reedVariant(x: number, z: number): number {
  const h = Math.sin(x * 4.1414 + z * 91.3458) * 24634.6345;
  return Math.min(REED_VARIANTS - 1, Math.floor((h - Math.floor(h)) * REED_VARIANTS));
}
