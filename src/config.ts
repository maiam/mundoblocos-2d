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

function gridSubdiv(): number {
  if (typeof window === 'undefined') {
    // servidor e testes (Node): `ORVALIS_SUBDIV=2 npm test` roda a suíte na outra grade, para achar o que ainda supõe 1 célula = 1 passo
    const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.ORVALIS_SUBDIV;
    return env === '1' ? 1 : env === '2' ? 2 : DEFAULT_SUBDIV;
  }
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

/**
 * Blocos de 1/4 (ADR 0033, v0.93.75): no Mundo principal todo bloco de construção tem **altura de 1/4 de célula** (face 16 × 4, topo
 * 16 × 16) e empilha até `CUBE_LEVELS` = 4 (= 1 célula, a altura do cubo antigo). Um nível de pilha = 1 bloco. O Santuário Celestial
 * (mundo à parte) segue com cubos cheios (1 nível por cubo).
 */
export const CUBE_LEVELS = 4;
/** Limite de níveis (blocos de 1/4) por célula no Mundo principal e no servidor. */
export const MAX_STACK = CUBE_LEVELS;
/** Santuário pode construir até cinco níveis sem alterar o protocolo do Mundo principal. */
export const SANCTUARY_MAX_STACK = 5;

/** Quantos cubos cheios o personagem consegue subir de uma vez (no Mundo: `World.stepLevels` converte para 3 blocos de 1/4). */
export const STEP_HEIGHT = 1;

/** Lado de um chunk em células (chunks 16×16, como no Minecraft). */
export const CHUNK_SIZE = 16;

/** Chunks extras carregados ao redor da área visível. */
export const LOAD_MARGIN = 1;

/** Chunks não modificados além desta margem são descarregados. */
export const UNLOAD_MARGIN = 3;

/** Máximo de chunks gerados por frame (evita travadas). */
export const MAX_CHUNK_GEN_PER_FRAME = 4;
