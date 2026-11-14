/**
 * Constantes globais do mundo. Fonte única para dimensões de bloco/chunk.
 * Vista superior inclinada (3/4): x → direita, y → para baixo na tela (= "sul" no mapa).
 */

/** Duração de um dia de jogo (s): dia e noite completos. */
export const DAY_LENGTH_S = 480;

/**
 * Subdivisão da grade (ADR 0032, F1 — protótipo): 1 = padrão; 2 = células de metade do lado, com o mundo do mesmo tamanho em
 * pixels. Só por `?grade=2` em desenvolvimento (Vite) e fora da sala/servidor (o bundle do servidor não tem `window`).
 */
/** Subdivisão padrão do jogo e do servidor (a F7 da ADR 0032 troca para 2 nos dois ao mesmo tempo). */
export const DEFAULT_SUBDIV = 2;

/** A página é a do Santuário Celestial (build fixo, subdomínio ou `?mundo=santuario`)? Cópia mínima de `resolveWorldId` (aquele módulo importa este). */
function sanctuaryPage(): boolean {
  const fixed = (import.meta as unknown as { env?: { VITE_WORLD?: string } }).env?.VITE_WORLD;
  if (fixed) return fixed === 'santuario';
  const parts = window.location.hostname.split('.');
  if (parts.length > 2 && parts[0].toLowerCase() === 'santuario') return true;
  return new URLSearchParams(window.location.search).get('mundo')?.toLowerCase() === 'santuario';
}

function gridSubdiv(): number {
  if (typeof window === 'undefined') {
    // servidor e testes (Node): `ORVALIS_SUBDIV=2 npm test` roda a suíte na outra grade, para achar o que ainda supõe 1 célula = 1 passo
    const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.ORVALIS_SUBDIV;
    return env === '1' ? 1 : env === '2' ? 2 : DEFAULT_SUBDIV;
  }
  // O Santuário Celestial é outro mundo, com a escala própria da ADR 0028: segue na grade 1 (a grade fina é do Mundo).
  if (sanctuaryPage()) return 1;
  const dev = !!(import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV;
  if (!dev) return DEFAULT_SUBDIV;
  const g = new URLSearchParams(window.location.search).get('grade');
  return g === '1' ? 1 : g === '2' ? 2 : DEFAULT_SUBDIV;
}
export const SUBDIV = gridSubdiv();

/** Tamanho de uma célula em pixels de mundo (zoom 1). */
export const TILE = 32;

/** Altura visível da face frontal de um cubo (efeito 3/4), em pixels de mundo. */
export const CUBE_FRONT = 18;

/** Limite original do Mundo principal e do servidor. */
export const MAX_STACK = 2;
/** Santuário pode construir até cinco níveis sem alterar o protocolo do Mundo principal. */
export const SANCTUARY_MAX_STACK = 5;

/** Quantos níveis o personagem consegue subir de uma vez. */
export const STEP_HEIGHT = 1;

/** Lado de um chunk em células (chunks 16×16, como no Minecraft). */
export const CHUNK_SIZE = 16;

/** Chunks extras carregados ao redor da área visível. */
export const LOAD_MARGIN = 1;

/** Chunks não modificados além desta margem são descarregados. */
export const UNLOAD_MARGIN = 3;

/** Máximo de chunks gerados por frame (evita travadas). */
export const MAX_CHUNK_GEN_PER_FRAME = 4;
