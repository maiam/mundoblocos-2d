import atlas from '../../assets/titan-atlas-16px.webp';

/**
 * Arte do Titã (ADR 0010/0039): o atlas de terreno da Margem Silenciosa (80 × 40 px, 4 × 2 tiles de 16 px com 2 px de borda duplicada).
 * Fica em WebP **sem perdas** (pixel art; `optimize-assets.py` só converte PNG, então este arquivo não passa pela compressão com perdas).
 * Só o Titã importa esta imagem; o mapa de tiles está em `titan/voxel.ts` (`tileFor`) e `titan/mesher.ts` (`tileUV`).
 */
export const titanAtlasUrl: string = atlas;
