/**
 * Biomas do Titã (ADR 0074). Hoje só a **Margem Silenciosa**: o descritor guarda os números que dependem do bioma (e não o gerador, no meio do código). Outro bioma futuro entra com outro
 * descritor e uma `biomeAt` que escolhe entre eles. Puro.
 */
export interface Biome {
  id: string;
  name: string;
  /** Proporção de plantas de Noz de Duna sobre a areia **seca** elegível do bioma (faixa plana de costa, alcançável a pé). */
  nutRate: number;
  /** Distância mínima entre plantas sorteadas (blocos). */
  nutSpacing: number;
  /** Farejadores pequenos por planta de noz (nascem junto da planta). */
  pequenoPerPlant: number;
  /** Um Farejador grande a cada tanto de plantas (o da toca, mais os outros). */
  plantsPerGrande: number;
}

export const MARGEM_SILENCIOSA: Biome = { id: 'margem', name: 'Margem Silenciosa', nutRate: 0.01, nutSpacing: 4, pequenoPerPlant: 1, plantsPerGrande: 5 };

/** Bioma de uma coluna: por enquanto o mundo todo é a Margem Silenciosa. */
export const biomeAt = (_x: number, _z: number): Biome => MARGEM_SILENCIOSA;
