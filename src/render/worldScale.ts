/**
 * Escala do mundo (ADR 0028, aprovada em 12/11/2026): relações medidas numa cena do Core Keeper, em CÉLULAS NA TELA com a
 * vista oblíqua de K = 1 (um metro de altura = uma célula na tela). Não é "1 m": o que vale são as relações.
 *
 * Só o render 3D do Santuário usa isto por enquanto; o Mundo 2D adota a escala na migração do render (ADR 0026, Fase 4).
 */
export const WORLD_SCALE = {
  /** Frente do cubo (um nível de bloco). */
  cube: 1.0,
  /** Frente da parede (ADR 0027): ≈ a altura do personagem. */
  wall: 1.2,
  /** Altura do personagem. */
  character: 1.2,
  /** Altura do personagem na escala antiga (`CHARACTER_H` / `TILE`), em que os planos de sprite foram desenhados. */
  legacyCharacter: 2.2,
} as const;

/** Fator a aplicar aos planos de personagem desenhados para a escala antiga. */
export const CHARACTER_SCALE_FACTOR = WORLD_SCALE.character / WORLD_SCALE.legacyCharacter;

/** Células visíveis na vertical na vista nova (o Core Keeper mostra ~17; no celular em paisagem 14 já deixa o personagem legível). */
export const SANCTUARY_CELLS_TALL = 14;
