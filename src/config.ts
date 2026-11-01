/**
 * Constantes globais do mundo. Fonte única para dimensões de bloco/chunk.
 * Vista superior inclinada (3/4): x → direita, y → para baixo na tela (= "sul" no mapa).
 */

/** Tamanho de uma célula em pixels de mundo (zoom 1). */
export const TILE = 32;

/** Altura visível da face frontal de um cubo (efeito 3/4), em pixels de mundo. */
export const CUBE_FRONT = 18;

/** Lado de um chunk em células (chunks 16×16, como no Minecraft). */
export const CHUNK_SIZE = 16;

/** Chunks extras carregados ao redor da área visível. */
export const LOAD_MARGIN = 1;

/** Chunks não modificados além desta margem são descarregados. */
export const UNLOAD_MARGIN = 3;

/** Máximo de chunks gerados por frame (evita travadas). */
export const MAX_CHUNK_GEN_PER_FRAME = 4;
