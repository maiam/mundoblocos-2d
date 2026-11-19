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

import lanternAtlas from '../../assets/titan-lantern-atlas.webp';
import lanternModel from '../../assets/titan-lantern.json';
/**
 * Lanterna da Margem em 3D (ADR 0043; pacote de arte em `assets-src/titan/lanterna`, convertido por `scripts/extract-titan-lantern.py`): atlas 32 × 32 (WebP sem perdas)
 * e geometria em dois lotes — `structure` (Pedra, Cobre, Grade) e `core` (Âmbar, o único emissivo) — 312 triângulos ao todo.
 */
export const titanLanternAtlasUrl: string = lanternAtlas;
export interface LanternBatch { pos: number[]; nrm: number[]; uv: number[]; idx: number[] }
export const titanLanternModel = lanternModel as { size: number[]; structure: LanternBatch; core: LanternBatch };

import workbenchAtlas from '../../assets/titan-workbench-atlas.webp';
import workbenchModel from '../../assets/titan-workbench.json';
import reedSprite from '../../assets/titan-junco-variantes-16px.webp';
/**
 * Mesa de Trabalho em 3D (ADR 0045; pacote em `assets-src/titan/fabricacao`, convertido por `scripts/extract-titan-workbench.py`): atlas 60 × 40 (WebP sem perdas) e a geometria
 * (8 cuboides, 96 triângulos, 1 × 1 × 1, pivô no centro da base). E o **junco de vidro** (16 × 16 RGBA, decoração em faixas cruzadas com balanço, sem colisão).
 * O atlas de itens (`titanHotbarUrl`, agora 64 × 48) traz mesa, lente de gelo e brasa de âmbar nos índices 8–10.
 */
export const titanWorkbenchAtlasUrl: string = workbenchAtlas;
export const titanWorkbenchModel = workbenchModel as { size: number[]; pos: number[]; nrm: number[]; uv: number[]; idx: number[] };
/** Junco de Vidro em campo: atlas de 48 × 16 px com as 3 silhuetas (broto baixo, haste bifurcada, tufo aberto), 16 × 16 cada. */
export const titanReedUrl: string = reedSprite;

import basalt from '../../assets/titan-basalt-32px.webp';
/**
 * Ladrilho de basalto da interface (ADR 0049): 32 × 32 px sem emenda (carvão e violeta escuro, relevo discreto), gerado por `scripts/make-titan-basalt.py` (WebP sem perdas).
 * Vira o fundo e a moldura dos painéis da bolsa, do livro de receitas e da bancada, repetido com filtro de pixel (a interface o usa por uma variável CSS).
 */
export const titanBasaltUrl: string = basalt;
