import atlas from '../../assets/titan-atlas-16px.webp';
import atlas8 from '../../assets/titan-atlas-8px.webp';

/**
 * Arte do Titã (ADR 0010/0039): o atlas de terreno dos mundos voxel em **16 px por face** (ADR 0106; 160 × 160 px, 8 colunas com 2 px de borda duplicada), regra do Minecraft; a arte-fonte pode ser maior (`scripts/make-titan-atlas32.py`).
 * A vista isométrica usa a variante de **8 px** (`titanAtlas8Url`, 80 × 80, mesma proporção de borda: os mesmos UVs).
 * Fica em WebP **sem perdas** (pixel art; `optimize-assets.py` só converte PNG, então este arquivo não passa pela compressão com perdas).
 * Só o Titã importa esta imagem; o mapa de tiles está em `titan/voxel.ts` (`tileFor`) e `titan/mesher.ts` (`tileUV`).
 */
export const titanAtlasUrl: string = atlas;
export const titanAtlas8Url: string = atlas8;

import hotbar from '../../assets/titan-itens-32px.webp';
/**
 * Atlas de itens (ADR 0053; 128 × 128 px RGBA, grade 4 × 4 de células de **32 × 32**, sem espaçamento; WebP sem perdas; gerado por `scripts/make-titan-arte32.py`): índice = id do item − 1
 * (`titan/items.ts`). Fragmentos de rocha e gelo e a lanterna têm arte de 32 px; os demais itens são a arte de 16 px ampliada 2× (vizinho mais próximo) até haver arte nova.
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
import reedSprite from '../../assets/titan-junco-variantes-32px.webp';
import cultivoSprite from '../../assets/titan-cultivo-32px.webp';
import lakeAtlas from '../../assets/titan-lago-16px.webp';
import lakeAtlas8 from '../../assets/titan-lago-8px.webp';
import marcoModel from '../../assets/titan-marco.json';
import escadaModel from '../../assets/titan-escada.json';
import camaModel from '../../assets/titan-cama.json';
import camaAtlas from '../../assets/titan-cama-atlas.webp';
import braseiroModel from '../../assets/titan-braseiro.json';
import braseiroAcesoModel from '../../assets/titan-braseiro-aceso.json';
import braseiroAtlas from '../../assets/titan-braseiro-atlas.webp';
import degrauModel from '../../assets/titan-degrau.json';
import degrauPedraModel from '../../assets/titan-degrau-pedra.json';
import degrauPedraTex from '../../assets/titan-degrau-pedra.webp';
import cadeiraModel from '../../assets/titan-cadeira.json';
import juncoTile from '../../assets/titan-junco-tile.webp';
import portaTex from '../../assets/titan-porta.webp';
import bauModel from '../../assets/titan-bau.json';
import bauAtlas from '../../assets/titan-bau-atlas.webp';
import bauTampaModel from '../../assets/titan-bau-tampa.json';
import escadaAtlas from '../../assets/titan-escada-atlas.webp';
import painelModel from '../../assets/titan-painel.json';
import margemAtlas from '../../assets/titan-margem-atlas.webp';
import nozPlantaModel from '../../assets/titan-noz-planta.json';
import nozFrutosModel from '../../assets/titan-noz-frutos.json';
import nozAtlas from '../../assets/titan-noz-atlas.webp';
import farejadorModel from '../../assets/titan-farejador.json';
import farejadorRigUrl from '../../assets/titan-farejador-rig.glb?url';
import farejadorAtlas from '../../assets/titan-farejador-atlas.webp';
import hudAtlas from '../../assets/titan-hud-32px.webp';
import orvalisWater from '../../assets/orvalis-agua-16px.webp';
import orvalisWater8 from '../../assets/orvalis-agua-8px.webp';
/** Água do Orvalis em voxel (ADR 0105): o mesmo formato do Lago Escuro (4 células de 16 px; 8 px na isométrica), feita dos Materiais V2 por `scripts/make-orvalis-voxel-arte.py`. */
export const orvalisWaterUrl: string = orvalisWater;
export const orvalisWater8Url: string = orvalisWater8;
/**
 * Mesa de Trabalho em 3D (ADR 0045; pacote em `assets-src/titan/fabricacao`, convertido por `scripts/extract-titan-workbench.py`): atlas 60 × 40 (WebP sem perdas) e a geometria
 * (8 cuboides, 96 triângulos, 1 × 1 × 1, pivô no centro da base). E o **junco de vidro** (16 × 16 RGBA, decoração em faixas cruzadas com balanço, sem colisão).
 * O atlas de itens (`titanHotbarUrl`, agora 64 × 48) traz mesa, lente de gelo e brasa de âmbar nos índices 8–10.
 */
export const titanWorkbenchAtlasUrl: string = workbenchAtlas;
export const titanWorkbenchModel = workbenchModel as { size: number[]; pos: number[]; nrm: number[]; uv: number[]; idx: number[] };
/** Junco de Vidro em campo (ADR 0053): atlas de 128 × 32 px, 4 colunas de 32 × 32 — as 3 silhuetas (broto baixo, haste bifurcada, tufo aberto) e uma célula vazia. */
export const titanReedUrl: string = reedSprite;
/** Cultivo do Junco de Vidro (ADR 0083): atlas de 128 × 32 px, 4 colunas (muda, crescendo, adulto de duas mudas, ressecado). */
export const titanCultivoUrl: string = cultivoSprite;

import basalt from '../../assets/titan-basalt-32px.webp';
/**
 * Ladrilho de basalto da interface (ADR 0049): 32 × 32 px sem emenda (carvão e violeta escuro, relevo discreto), gerado por `scripts/make-titan-basalt.py` (WebP sem perdas).
 * Vira o fundo e a moldura dos painéis da bolsa, do livro de receitas e da bancada, repetido com filtro de pixel (a interface o usa por uma variável CSS).
 */
export const titanBasaltUrl: string = basalt;
/** Lago Escuro V2 (ADR 0057): atlas de 128 × 32 px (topo 1, topo 2, lateral exposta e a mesma lateral), células de 32 × 32 px; filtro Nearest, sem mipmaps. */
export const titanLakeUrl: string = lakeAtlas;
export const titanLake8Url: string = lakeAtlas8;
/**
 * Marco de Margem (148 triângulos) e Painel de Junco (832), ADR 0058: geometria única por modelo (`scripts/extract-titan-margem.py`, UV com origem no canto superior esquerdo como no glTF) e o atlas
 * compartilhado de 144 × 72 px (basalto e junco). Pivô no centro da base; o Painel corre ao longo de X.
 */
export const titanMarcoModel = marcoModel as ModelData;
export const titanPainelModel = painelModel as ModelData;
export const titanMargemAtlasUrl: string = margemAtlas;
/** Escada de Junco (ADR 0088): 1.398 triângulos reduzidos do GLB de jogo (`scripts/extract-titan-escada.py`) e a cor-base de 256 px. */
export const titanEscadaModel = escadaModel as ModelData;
export const titanEscadaAtlasUrl: string = escadaAtlas;
/** Baú de Rocha e Junco (ADR 0089): 1.800 triângulos reduzidos do GLB de jogo (`scripts/extract-titan-bau.py`) e a cor-base de 256 px. */
export const titanBauModel = bauModel as ModelData;
export const titanBauAtlasUrl: string = bauAtlas;
/** Tampa do baú (ADR 0093): 1.700 triângulos com os vértices relativos à dobradiça; `pivot` = a dobradiça no espaço do baú. O corpo (acima) são só 124 triângulos. */
export const titanBauTampaModel = bauTampaModel as ModelData & { pivot: [number, number, number] };
/** Cama de Junco (ADR 0090): 2.200 triângulos reduzidos do GLB de jogo (`scripts/extract-titan-cama.py`), cobrem as duas células (pé na origem, cabeceira em +z), e a cor-base de 256 px. */
export const titanCamaModel = camaModel as ModelData;
export const titanCamaAtlasUrl: string = camaAtlas;
/** Braseiro de Rocha 3D (ADR 0092): apagado e aceso (1.068 e 1.194 triângulos, `scripts/extract-titan-braseiro.py`) e um atlas de 256 × 320 px (basalto + amostras lisas das brasas). */
export const titanBraseiroModel = braseiroModel as ModelData;
export const titanBraseiroAcesoModel = braseiroAcesoModel as ModelData;
export const titanBraseiroAtlasUrl: string = braseiroAtlas;
/** Degrau e Cadeira de Junco (ADR 0101): caixas com UV em metros sobre a trama de 64 px (1 m) repetida. */
export const titanDegrauModel = degrauModel as ModelData;
/** Degrau de Pedra (ADR 0109): as mesmas caixas, UV sobre a tira de 3 tiles de 16 px do pacote. */
export const titanDegrauPedraModel = degrauPedraModel as ModelData;
export const titanDegrauPedraUrl: string = degrauPedraTex;
export const titanCadeiraModel = cadeiraModel as ModelData;
export const titanJuncoTileUrl: string = juncoTile;
/** Folha da Porta de Junco (ADR 0102): 64 × 128 px, de frente, dobradiças à esquerda. */
export const titanPortaUrl: string = portaTex;
/** Planta da Noz de Duna (3.008 triângulos, ADR 0060; `scripts/extract-titan-noz.py`): a planta sem frutos (2.160) e as 4 nozes (848), um atlas de 144 × 36 px. Pivô ao nível do solo. */
export const titanNozPlantaModel = nozPlantaModel as ModelData;
export const titanNozFrutosModel = nozFrutosModel as ModelData;
export const titanNozAtlasUrl: string = nozAtlas;
/** Farejador de Duna (3.538 triângulos, ADR 0061; `scripts/extract-titan-farejador.py`): 7 partes (tronco, cabeça, cauda, 4 patas), cada uma com `pivot` e geometria relativa ao pivô; atlas de 224 × 36 px. Voltado para −X. */
export interface PartData extends ModelData { pivot: number[] }
export const titanFarejadorModel = farejadorModel as { size: number[]; parts: Record<'tronco' | 'cabeca' | 'cauda' | 'pata_dd' | 'pata_de' | 'pata_td' | 'pata_te', PartData> };
export const titanFarejadorAtlasUrl: string = farejadorAtlas;
/** Farejador de Duna com rig (ADR 0064): GLB leve de uma malha skinada (carrega em segundo plano; até chegar, o jogo usa as 7 partes acima). */
export const titanFarejadorRigUrl: string = farejadorRigUrl;
export interface ModelData { size: number[]; pos: number[]; nrm: number[]; uv: number[]; idx: number[] }
/** HUD de ar, vida e fome (ADR 0059): atlas de 96 × 96 px, 3 linhas (ar, vida, fome) × 3 colunas (cheio, parcial, vazio) de 32 × 32 px. */
export const titanHudUrl: string = hudAtlas;

