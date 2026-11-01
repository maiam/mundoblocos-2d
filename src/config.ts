/**
 * Constantes globais do mundo. Fonte única para dimensões de bloco/chunk.
 * Coordenadas: x cresce para a direita, y cresce para BAIXO (convenção de canvas).
 */

/** Tamanho de um bloco em pixels no zoom 1. */
export const TILE = 32;

/** Lado de um chunk em blocos (chunks são 16×16, como as seções do Minecraft). */
export const CHUNK_SIZE = 16;

/** Nível do mar (em blocos). Colunas cujo terreno fica abaixo disso viram lagos. */
export const SEA_LEVEL = 4;

/** Linha da rocha-mãe (indestrutível). Abaixo dela só existe rocha-mãe. */
export const BEDROCK_Y = 120;

/** Acima desta linha o mundo é sempre ar (otimização de geração). */
export const SKY_LIMIT_Y = -64;

/** Chunks extras carregados ao redor da área visível. */
export const LOAD_MARGIN = 1;

/** Chunks não modificados além desta margem são descarregados. */
export const UNLOAD_MARGIN = 3;

/** Máximo de chunks gerados por frame (evita travadas). */
export const MAX_CHUNK_GEN_PER_FRAME = 4;
