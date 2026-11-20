/**
 * Titã — grade voxel (ADR 0039). Independente de `SUBDIV`, de `World` e da grade de chão/pilhas do Orvalis: aqui a unidade é 1 bloco = 1 m
 * e a ocupação é por `(x, y, z)`. Sem DOM e sem `Math.random()`: roda em Node (testes) e é determinística por seed + versão do gerador.
 */

/** Altura mínima/máxima (inclusivas) das células: 384 camadas, 24 seções de 16. Y é a base do voxel. */
export const Y_MIN = -64;
export const Y_MAX = 319;
export const SECTION = 16;
export const SECTIONS = (Y_MAX - Y_MIN + 1) / SECTION; // 24
/** Nível do lago: última célula líquida em Y = 63; a superfície fica em Y = 64. */
export const LAKE_LAST_Y = 63;
export const LAKE_SURFACE_Y = 64;

/** Região jogável em volta da origem, x/z em [min, max). Por versão do gerador (ADR 0062): v1–v5 = 4 × 4 chunks (64 × 64 blocos); v6 em diante = 8 × 8 chunks (128 × 128). */
export interface Region { readonly min: number; readonly max: number }
export const REGION_LEGACY: Region = { min: -32, max: 32 };
export const REGION_V6: Region = { min: -64, max: 64 };
export const regionFor = (generatorVersion: number): Region => (generatorVersion >= 6 ? REGION_V6 : REGION_LEGACY);
export const REGION_MIN = REGION_LEGACY.min;
export const REGION_MAX = REGION_LEGACY.max;

/** Ids de bloco (um byte; 0 = ar). */
export const T = { AIR: 0, SAND: 1, DAMP_SAND: 2, DARK_ROCK: 3, FROST: 4, LAKE: 5, BEDROCK: 6, LANTERN: 7, VEIN_ROCK: 8, VEIN_FROST: 9, WORKBENCH: 10, EMBER: 11, SLAB: 12, WORKBENCH_90: 13, WORKBENCH_180: 14, WORKBENCH_270: 15, SLAB_TOP: 16, SLAB_DOUBLE: 17, MARCO: 18, MARCO_90: 19, MARCO_180: 20, MARCO_270: 21, PAINEL: 22, PAINEL_Z: 23, VEIN_COPPER: 24, BRAZIER: 25, BRAZIER_LIT: 26, CARAPACE: 27 } as const;
/** Maior id de bloco (o carregamento do save descarta ids acima disto). */
export const T_MAX = T.CARAPACE;
export type TitanBlock = (typeof T)[keyof typeof T];

export const BLOCK_NAMES: Record<number, string> = { 1: 'Areia ocre', 2: 'Areia úmida', 3: 'Rocha escura', 4: 'Gelo fosco', 5: 'Lago escuro', 6: 'Rocha-mãe', 7: 'Lanterna da margem', 8: 'Rocha com veio', 9: 'Gelo com veio', 10: 'Mesa de Trabalho', 11: 'Brasa de âmbar', 12: 'Laje de rocha', 13: 'Mesa de Trabalho', 14: 'Mesa de Trabalho', 15: 'Mesa de Trabalho', 16: 'Laje de rocha', 17: 'Laje dupla de rocha', 18: 'Marco de Margem', 19: 'Marco de Margem', 20: 'Marco de Margem', 21: 'Marco de Margem', 22: 'Painel de Junco', 23: 'Painel de Junco', 24: 'Veio de Cobre de Duna', 25: 'Braseiro de Rocha', 26: 'Braseiro de Rocha (aceso)', 27: 'Revestimento de Carapaça' };

/** Sólido = colide e esconde as faces vizinhas. Ar, líquido e a lanterna (objeto pequeno que emite luz) não. */
export const isSolid = (id: number): boolean => id !== T.AIR && id !== T.LAKE && id !== T.LANTERN && !isMarco(id);
/** Alvo da mira (e do "quebrar"): sólido, lanterna ou Marco de Margem. O líquido e o ar são atravessados. */
export const isTarget = (id: number): boolean => isSolid(id) || id === T.LANTERN || isMarco(id);
/** Bloco que bloqueia a luz de lanterna: sólido, menos o Painel de Junco (a trama tem vãos: a luz atravessa). */
export const blocksLight = (id: number): boolean => isSolid(id) && !isPanel(id);
/** Célula ocupada: não aceita colocar nada (sólido ou lanterna). Líquido e ar aceitam. */
export const isOccupied = isTarget;
/** Altura do bloco dentro da célula (0–1): 1 = cubo inteiro, 0,5 = laje (ADR 0046), 0 = não sólido. A física e a mira usam esta altura. */
export const blockHeight = (id: number): number => blockSpan(id)[1];
/** Laje (ADR 0046, 0056): inferior (`SLAB`, metade de baixo da célula) ou superior (`SLAB_TOP`, metade de cima); as duas juntas viram `SLAB_DOUBLE` (cubo inteiro). */
export const isSlab = (id: number): boolean => id === T.SLAB || id === T.SLAB_TOP;
/** Faixa de altura que o bloco ocupa dentro da célula, `[baixo, topo]` em 0–1 (a laje superior ocupa [0,5, 1]; não sólido = [0, 0]). A física e a mira leem esta faixa. */
export function blockSpan(id: number): readonly [number, number] {
  if (isPanel(id)) return [0, PANEL_HEIGHT]; // o painel barra o corpo na altura dele (0,944 m), na célula inteira
  if (id === T.SLAB) return [0, 0.5];
  if (id === T.SLAB_TOP) return [0.5, 1];
  return isSolid(id) ? [0, 1] : [0, 0];
}
/** Cubo inteiro: só ele esconde as faces vizinhas (a laje, inferior ou superior, deixa metade da célula aberta; a laje dupla é cubo). */
export const isFull = (id: number): boolean => isSolid(id) && !isSlab(id) && !isPanel(id);
/** Veio natural (rocha ou gelo com marca visível): quebrar devolve o bloco e solta uma lasca (ADR 0044). */
export const isVein = (id: number): boolean => id === T.VEIN_ROCK || id === T.VEIN_FROST;
/** Veio de cobre (ADR 0063): só uma picareta o quebra; solta fragmentos de cobre, nunca o bloco. */
/** Braseiro de Rocha (ADR 0065): apagado (25) ou aceso (26, com carga de preparações em `session.braziers`). Cubo de rocha com uma cuba no topo; só o aceso serve de estação. */
export const isBrazier = (id: number): boolean => id === T.BRAZIER || id === T.BRAZIER_LIT;
export const isCopperVein = (id: number): boolean => id === T.VEIN_COPPER;

/**
 * Mesa de Trabalho com quatro orientações (ADR 0052): o id 10 é a original (frente = o nicho voltado para −Z, norte) e 13–15 a giram 90°, 180° e 270° (anti-horário visto de cima). O giro vale **no id**,
 * então salva, quebra e carrega sem estado extra; todo código que pergunta "é uma mesa?" usa `isWorkbench`.
 */
const WORKBENCH_IDS = [T.WORKBENCH, T.WORKBENCH_90, T.WORKBENCH_180, T.WORKBENCH_270] as const;
export const isWorkbench = (id: number): boolean => id === T.WORKBENCH || (id >= T.WORKBENCH_90 && id <= T.WORKBENCH_270);
/** Giro da mesa em quartos de volta (0–3) a partir do id; 0 para qualquer outro bloco. */
export const workbenchTurn = (id: number): number => (id === T.WORKBENCH ? 0 : id >= T.WORKBENCH_90 && id <= T.WORKBENCH_270 ? id - T.WORKBENCH_90 + 1 : 0);
export const workbenchId = (turn: number): number => WORKBENCH_IDS[((turn % 4) + 4) % 4];
/**
 * Giro (0–3) que deixa a frente da mesa voltada **para o jogador**: a direção de olhar (yaw 0 = −Z) arredondada ao eixo mais próximo, invertida. Olhando ao norte a frente fica ao sul,
 * olhando a leste fica a oeste, e assim por diante.
 */
export const workbenchTurnFacing = (yaw: number): number => ((Math.round((yaw + Math.PI) / (Math.PI / 2)) % 4) + 4) % 4;

/**
 * Marco de Margem e Painel de Junco (ADR 0058): modelos 3D de arte própria (como a mesa), com o giro no id. **Marco** (18–21 = giro 0–3, a frente fica voltada para quem o coloca): peça pequena,
 * atravessável (como a lanterna), alvo da mira pela caixa do modelo. **Painel** (22 = encaixe ao longo de X, 23 = ao longo de Z): sólido na célula inteira até 0,944 m, com vãos que deixam a luz passar.
 */
const MARCO_IDS = [T.MARCO, T.MARCO_90, T.MARCO_180, T.MARCO_270] as const;
export const isMarco = (id: number): boolean => id >= T.MARCO && id <= T.MARCO_270;
export const marcoTurn = (id: number): number => (isMarco(id) ? id - T.MARCO : 0);
export const marcoId = (turn: number): number => MARCO_IDS[((turn % 4) + 4) % 4];
/** Giro (0–3) que deixa a frente do Marco (+Z do modelo) voltada para o jogador: o yaw arredondado ao eixo mais próximo. */
export const marcoTurnFacing = (yaw: number): number => ((Math.round(yaw / (Math.PI / 2)) % 4) + 4) % 4;
export const isPanel = (id: number): boolean => id === T.PAINEL || id === T.PAINEL_Z;
export const PANEL_HEIGHT = 0.944;
/** Id do painel que fica de frente para o jogador: olhando ao longo de Z (norte/sul) o painel corre ao longo de X; olhando ao longo de X, ao longo de Z. */
export const panelIdFacing = (yaw: number): number => (Math.abs(Math.cos(yaw)) >= Math.abs(Math.sin(yaw)) ? T.PAINEL : T.PAINEL_Z);
/** Peça recolhida com um toque longo curto (0,35 s, com anel e sem rachaduras): a lanterna e as peças pequenas da margem (Marco e Painel). */
export const isCollectBlock = (id: number): boolean => id === T.LANTERN || isMarco(id) || isPanel(id);
/** Modelo 3D (instâncias do renderer) deste bloco, ou `null`. `turn` = giro em quartos de volta ao redor de Y. */
export function modelOf(id: number): { kind: 'workbench' | 'marco' | 'painel'; turn: number } | null {
  if (isWorkbench(id)) return { kind: 'workbench', turn: workbenchTurn(id) };
  if (isMarco(id)) return { kind: 'marco', turn: marcoTurn(id) };
  if (isPanel(id)) return { kind: 'painel', turn: id === T.PAINEL ? 0 : 1 };
  return null;
}
/** Bloco que sai da malha do terreno por ser modelo 3D (lanterna e os modelos acima). */
export const isModelBlock = (id: number): boolean => id === T.LANTERN || modelOf(id) !== null;

export type Face = 'top' | 'side' | 'bottom';

/** Índice do tile no atlas 4 × 2 (col = i % 4, linha = i / 4 | 0): ver `render/art/titan.ts` e a direção de arte. */
export function tileFor(id: number, face: Face): number {
  switch (id) {
    case T.CARAPACE: return 15; // fileiras de placas sobrepostas, em todas as faces
    case T.BRAZIER: return face === 'top' ? 13 : 12; // cuba apagada no topo, rocha violeta nas laterais
    case T.BRAZIER_LIT: return face === 'top' ? 14 : 12; // cuba com a brasa acesa
    case T.SAND: return face === 'top' ? 0 : 1;
    case T.DAMP_SAND: return face === 'top' ? 2 : 3;
    case T.DARK_ROCK:
    case T.SLAB: case T.SLAB_TOP: case T.SLAB_DOUBLE: // a laje reaproveita a rocha escura: topo de 16 × 16 e lateral com 8 px de altura (ADR 0046)
    case T.BEDROCK: return 4;
    case T.FROST: return 5;
    case T.LAKE: return 6; // quadro 1 (o quadro 2 = 7 é alternado no render)
    case T.VEIN_ROCK: return 8; // veios naturais (gerador v3): linha 3 do atlas, mesma arte nas 6 faces
    case T.VEIN_FROST: return 9;
    case T.VEIN_COPPER: return 11; // veio de cobre de Duna (gerador v6): rocha violeta com veios cor de cobre, mesma arte nas 6 faces
    case T.EMBER: return 10; // depósito de brasa de âmbar (gerador v4): rocha com cristal; a mesa (10) é o modelo 3D do renderer, não usa o atlas
    default: return 4;
  }
}

export const inRegion = (x: number, z: number, r: Region = REGION_LEGACY): boolean => x >= r.min && x < r.max && z >= r.min && z < r.max;

// ---- Endereçamento (docs Titã 05, §2) ----
export const chunkOf = (v: number): number => Math.floor(v / 16);
export const localOf = (v: number): number => v - chunkOf(v) * 16;
export const sectionOf = (y: number): number => Math.floor((y - Y_MIN) / SECTION);
export const localY = (y: number): number => (y - Y_MIN) - sectionOf(y) * SECTION;
/** Índice de uma célula dentro da coluna do chunk (0..98303): camada de Y desde o fundo, depois z e x locais. */
export const columnIndex = (lx: number, y: number, lz: number): number => ((y - Y_MIN) * 16 + lz) * 16 + lx;
export const unpackIndex = (i: number): { lx: number; y: number; lz: number } => ({ lx: i & 15, lz: (i >> 4) & 15, y: (i >> 8) + Y_MIN });
export const chunkKey = (cx: number, cz: number): string => `${cx},${cz}`;
