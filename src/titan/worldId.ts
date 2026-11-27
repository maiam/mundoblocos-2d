/**
 * Escolha do mundo (ADR 0115): o **Orvalis 3D** é o padrão e o **Titã só abre por `?mundo=titan`** (nunca por subdomínio). Puro, sem DOM.
 * `fixed` = mundo fixo no build (`VITE_WORLD`, artefato próprio).
 */
export type WorldId = 'orvalis3d' | 'titan';
export const WORLD_IDS: readonly WorldId[] = ['orvalis3d', 'titan'];
export function resolveWorldId(search: string, fixed?: string): WorldId {
  if (fixed && (WORLD_IDS as readonly string[]).includes(fixed)) return fixed as WorldId;
  const param = new URLSearchParams(search).get('mundo')?.toLowerCase();
  return param === 'titan' ? 'titan' : 'orvalis3d';
}
