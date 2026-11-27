import type { WorldId } from '../../world/profiles';
import type { ArtPack } from './types';

export type { ArtPack } from './types';

let current: ArtPack | null = null;

/**
 * Carrega o pacote de arte do mundo. Com `VITE_WORLD` fixo no build (artefatos), a condição vira constante e o
 * Rollup elimina o pacote do outro mundo; sem ele (dev / build genérico), os dois ficam disponíveis e o mundo
 * escolhido em tempo de execução decide.
 */
export async function loadArtPack(_world?: WorldId): Promise<ArtPack> {
  const mod = await import('./principal');
  current = mod.default;
  return current;
}

/** Pacote carregado (depois de `loadArtPack`). */
export function art(): ArtPack {
  if (!current) throw new Error('loadArtPack() precisa terminar antes de usar a arte');
  return current;
}
