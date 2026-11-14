/**
 * Qual renderer o Mundo principal usa (ADR 0031, M6 — a virada). Funções puras: a decisão é só da URL e do aparelho; quem
 * carrega o módulo é o `main.ts`.
 *
 * - **3D (2.5D em WebGL) é o padrão** quando há WebGL.
 * - `?render=2d` volta ao Canvas 2D (reserva até o M7) com a física antiga; sem WebGL cai sozinho no 2D.
 * - `?render=3d` força o 3D (mesmo efeito do padrão; útil em links de teste).
 * - Com o 3D, o jogador **não sobe em cubos sozinho** (sem degrau); `?fisica=degrau` volta à regra antiga mesmo no 3D.
 */
export type WorldRenderer = '2d' | '3d';

export function chooseWorldRenderer(search: string, webgl: boolean): WorldRenderer {
  if (new URLSearchParams(search).get('render') === '2d') return '2d';
  return webgl ? '3d' : '2d';
}

/** Física sem degrau para o jogador: só com o renderer 3D e sem `?fisica=degrau`. */
export function useSolidPhysics(search: string, renderer: WorldRenderer): boolean {
  return renderer === '3d' && new URLSearchParams(search).get('fisica') !== 'degrau';
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
