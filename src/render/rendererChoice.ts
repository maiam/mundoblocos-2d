/**
 * Opções do renderer do Mundo, lidas da URL (ADR 0031). O Canvas 2D de reserva foi removido na v0.93.105: o 3D (2.5D em WebGL) é o único.
 * O jogador **não sobe em cubos sozinho** (sem degrau); `?fisica=degrau` volta à regra antiga.
 */
export function useSolidPhysics(search: string): boolean {
  return new URLSearchParams(search).get('fisica') !== 'degrau';
}

/** Sombra projetada pelo sol nos atores (comprida, girada): só com `?sombra=sol`; o padrão é o círculo suave sob os pés. */
export function sunShadowOn(search: string = typeof window !== 'undefined' ? window.location.search : ''): boolean {
  return new URLSearchParams(search).get('sombra') === 'sol';
}

/** Sombreado do corpo pelo sol/lua (relevo por pixel): desligado por padrão desde a v0.93.71 (decisão do dono do produto); `?sombreado=1` liga. A luz da fogueira nos atores não depende dele. */
export function sunShadingOn(search: string = typeof window !== 'undefined' ? window.location.search : ''): boolean {
  return new URLSearchParams(search).get('sombreado') === '1';
}

/** Sombreado dos atores com a luz do sol/lua (v0.93.64): ligado, a não ser com `?sombreado=0` (para comparar com os atores chapados; `?luz=` é a escuridão do Santuário). */
export function actorLightOn(search: string = typeof window !== 'undefined' ? window.location.search : ''): boolean {
  return new URLSearchParams(search).get('sombreado') !== '0';
}
