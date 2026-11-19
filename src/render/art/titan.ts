import atlas from '../../assets/titan-atlas-16px.webp';

/**
 * Arte do Titã (ADR 0010/0039): o atlas de terreno da Margem Silenciosa (80 × 40 px, 4 × 2 tiles de 16 px com 2 px de borda duplicada).
 * Fica em WebP **sem perdas** (pixel art; `optimize-assets.py` só converte PNG, então este arquivo não passa pela compressão com perdas).
 * Só o Titã importa esta imagem; o mapa de tiles está em `titan/voxel.ts` (`tileFor`) e `titan/mesher.ts` (`tileUV`).
 */
export const titanAtlasUrl: string = atlas;

import hotbar from '../../assets/titan-hotbar-sprites-16px.webp';
/**
 * Atlas de itens da hotbar (64 × 32 px RGBA, grade 4 × 2 de sprites 16 × 16 sem espaçamento; WebP sem perdas): areia ocre, areia úmida, rocha escura,
 * gelo fosco, fragmento de rocha, fragmento de gelo, cápsula de luz e lanterna da margem — nessa ordem (índice = id do item − 1, `titan/items.ts`).
 */
export const titanHotbarUrl: string = hotbar;

import cracks from '../../assets/titan-cracks-16px.webp';
/**
 * Dez estágios de rachadura (160 × 16 px RGBA, 16 × 16 por estágio, lado a lado; WebP sem perdas) desenhados por `scripts/make-titan-cracks.py`: arte própria
 * do projeto para a quebra progressiva (ADR 0042). Usada como sobreposição reutilizável sobre o bloco em quebra, sem refazer a malha do chunk.
 */
export const titanCracksUrl: string = cracks;
