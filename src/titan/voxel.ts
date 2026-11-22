/**
 * Titã — grade voxel (ADR 0039). Independente de `SUBDIV`, de `World` e da grade de chão/pilhas do Orvalis: aqui a unidade é 1 bloco = 1 m
 * e a ocupação é por `(x, y, z)`. Sem DOM e sem `Math.random()`: roda em Node (testes) e é determinística por seed + versão do gerador.
 */
import tilesCfg from './tiles.json';

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
export const T = { AIR: 0, SAND: 1, DAMP_SAND: 2, DARK_ROCK: 3, FROST: 4, LAKE: 5, BEDROCK: 6, LANTERN: 7, VEIN_ROCK: 8, VEIN_FROST: 9, WORKBENCH: 10, EMBER: 11, SLAB: 12, WORKBENCH_90: 13, WORKBENCH_180: 14, WORKBENCH_270: 15, SLAB_TOP: 16, SLAB_DOUBLE: 17, MARCO: 18, MARCO_90: 19, MARCO_180: 20, MARCO_270: 21, PAINEL: 22, PAINEL_Z: 23, VEIN_COPPER: 24, BRAZIER: 25, BRAZIER_LIT: 26, CARAPACE: 27, EMBER_VEIN: 28, EMBER_BLOCK: 29, MAT: 30, LADDER: 31, LADDER_90: 32, LADDER_180: 33, LADDER_270: 34, CHEST: 35, CHEST_90: 36, CHEST_180: 37, CHEST_270: 38, BED: 39, BED_90: 40, BED_180: 41, BED_270: 42, BED_HEAD: 43, BED_HEAD_90: 44, BED_HEAD_180: 45, BED_HEAD_270: 46, REED_BLOCK: 47, REED_SLAB: 48, REED_SLAB_TOP: 49, REED_STAIR: 50, REED_STAIR_90: 51, REED_STAIR_180: 52, REED_STAIR_270: 53, REED_CHAIR: 54, REED_CHAIR_90: 55, REED_CHAIR_180: 56, REED_CHAIR_270: 57, DOOR: 58, DOOR_LAST: 89 } as const;
/** Maior id de bloco (o carregamento do save descarta ids acima disto). */
export const T_MAX = T.DOOR_LAST;
export type TitanBlock = (typeof T)[keyof typeof T];

export const BLOCK_NAMES: Record<number, string> = { 1: 'Areia ocre', 2: 'Areia úmida', 3: 'Rocha escura', 4: 'Gelo fosco', 5: 'Lago escuro', 6: 'Rocha-mãe', 7: 'Lanterna da margem', 8: 'Rocha com veio', 9: 'Gelo com veio', 10: 'Mesa de Trabalho', 11: 'Brasa de âmbar', 12: 'Laje de rocha', 13: 'Mesa de Trabalho', 14: 'Mesa de Trabalho', 15: 'Mesa de Trabalho', 16: 'Laje de rocha', 17: 'Laje dupla de rocha', 18: 'Marco de Margem', 19: 'Marco de Margem', 20: 'Marco de Margem', 21: 'Marco de Margem', 22: 'Painel de Junco', 23: 'Painel de Junco', 24: 'Veio de Cobre de Duna', 25: 'Braseiro de Rocha', 26: 'Braseiro de Rocha (aceso)', 27: 'Revestimento de Carapaça', 28: 'Veio de Âmbar', 29: 'Bloco de Âmbar Compactado', 30: 'Esteira de Junco', 31: 'Escada de Junco', 32: 'Escada de Junco', 33: 'Escada de Junco', 34: 'Escada de Junco', 35: 'Baú de Rocha e Junco', 36: 'Baú de Rocha e Junco', 37: 'Baú de Rocha e Junco', 38: 'Baú de Rocha e Junco', 39: 'Cama de Junco', 40: 'Cama de Junco', 41: 'Cama de Junco', 42: 'Cama de Junco', 43: 'Cama de Junco', 44: 'Cama de Junco', 45: 'Cama de Junco', 46: 'Cama de Junco', 47: 'Bloco de Junco', 48: 'Laje de Junco', 49: 'Laje de Junco', 50: 'Degrau de Junco', 51: 'Degrau de Junco', 52: 'Degrau de Junco', 53: 'Degrau de Junco', 54: 'Cadeira de Junco', 55: 'Cadeira de Junco', 56: 'Cadeira de Junco', 57: 'Cadeira de Junco' };
for (let id = T.DOOR; id <= T.DOOR_LAST; id++) BLOCK_NAMES[id] = 'Porta de Junco';

/** Sólido = colide e esconde as faces vizinhas. Ar, líquido e a lanterna (objeto pequeno que emite luz) não. */
export const isSolid = (id: number): boolean => id !== T.AIR && id !== T.LAKE && id !== T.LANTERN && !isMarco(id) && id !== T.MAT && !isLadder(id);
/** Alvo da mira (e do "quebrar"): sólido, lanterna ou Marco de Margem. O líquido e o ar são atravessados. */
export const isTarget = (id: number): boolean => isSolid(id) || id === T.LANTERN || isMarco(id) || id === T.MAT || isLadder(id);
/** Bloco que bloqueia a luz de lanterna: sólido, menos o Painel de Junco (a trama tem vãos: a luz atravessa). */
export const blocksLight = (id: number): boolean => isSolid(id) && !isPanel(id);
/** Célula ocupada: não aceita colocar nada (sólido ou lanterna). Líquido e ar aceitam. */
export const isOccupied = isTarget;
/** Altura do bloco dentro da célula (0–1): 1 = cubo inteiro, 0,5 = laje (ADR 0046), 0 = não sólido. A física e a mira usam esta altura. */
export const blockHeight = (id: number): number => blockSpan(id)[1];
/** Laje (ADR 0046, 0056): inferior (`SLAB`, metade de baixo da célula) ou superior (`SLAB_TOP`, metade de cima); as duas juntas viram `SLAB_DOUBLE` (cubo inteiro). */
export const isSlab = (id: number): boolean => id === T.SLAB || id === T.SLAB_TOP || id === T.REED_SLAB || id === T.REED_SLAB_TOP; // a de rocha e a de junco (ADR 0100)
/** Laje inferior (metade de baixo da célula)? A superior é o par dela: `slabPartner`. */
export const isSlabBottom = (id: number): boolean => id === T.SLAB || id === T.REED_SLAB;
export const slabPartner = (id: number): number => (id === T.SLAB ? T.SLAB_TOP : id === T.SLAB_TOP ? T.SLAB : id === T.REED_SLAB ? T.REED_SLAB_TOP : T.REED_SLAB);
/** Faixa de altura que o bloco ocupa dentro da célula, `[baixo, topo]` em 0–1 (a laje superior ocupa [0,5, 1]; não sólido = [0, 0]). A física e a mira leem esta faixa. */
export function blockSpan(id: number): readonly [number, number] {
  if (isStair(id) || isChair(id) || isDoor(id)) return [0, 1]; // a caixa envolvente (a forma exata vem de `blockBoxes`)
  if (isBrazier(id)) return [0, BRAZIER_HEIGHT]; // o braseiro 3D barra o corpo na altura dele (0,774 m), na célula inteira (ADR 0092)
  if (isChest(id)) return [0, CHEST_HEIGHT]; // o baú barra o corpo na altura dele (0,73 m), na célula inteira
  if (isBed(id)) return [0, BED_HEIGHT]; // a cama barra o corpo na altura dela (0,45 m), nas duas células
  if (isPanel(id)) return [0, PANEL_HEIGHT]; // o painel barra o corpo na altura dele (0,944 m), na célula inteira
  if (isSlab(id)) return isSlabBottom(id) ? [0, 0.5] : [0.5, 1];
  return isSolid(id) ? [0, 1] : [0, 0];
}
/** Cubo inteiro: só ele esconde as faces vizinhas (a laje, inferior ou superior, deixa metade da célula aberta; a laje dupla é cubo). */
export const isFull = (id: number): boolean => isSolid(id) && !isSlab(id) && !isPanel(id) && !isChest(id) && !isBed(id) && !isBrazier(id) && !isStair(id) && !isChair(id) && !isDoor(id);
/** Veio natural (rocha ou gelo com marca visível): quebrar devolve o bloco e solta uma lasca (ADR 0044). */
export const isVein = (id: number): boolean => id === T.VEIN_ROCK || id === T.VEIN_FROST;
/** Veio de cobre (ADR 0063): só uma picareta o quebra; solta fragmentos de cobre, nunca o bloco. */
/** Braseiro de Rocha (ADR 0065): apagado (25) ou aceso (26, com carga de preparações em `session.braziers`). Cubo de rocha com uma cuba no topo; só o aceso serve de estação. */
// ---- Degrau e Cadeira de Junco (ADR 0101): sólidos de várias caixas ----
export const isStair = (id: number): boolean => id >= T.REED_STAIR && id <= T.REED_STAIR_270;
export const isChair = (id: number): boolean => id >= T.REED_CHAIR && id <= T.REED_CHAIR_270;
export const stairTurn = (id: number): number => (isStair(id) ? id - T.REED_STAIR : 0);
export const chairTurn = (id: number): number => (isChair(id) ? id - T.REED_CHAIR : 0);
export const stairId = (turn: number): number => T.REED_STAIR + (((turn % 4) + 4) % 4);
export const chairId = (turn: number): number => T.REED_CHAIR + (((turn % 4) + 4) % 4);
/** Caixa sólida dentro da célula, em coordenadas locais 0–1: `[x0, y0, z0, x1, y1, z1]`. */
export type CellBox = readonly [number, number, number, number, number, number];
/** Formas de base (frente em +Z, giro 0): o degrau tem o patamar de baixo na célula inteira e o de cima só na metade de trás; a cadeira, o assento maciço até 0,5 m e o encosto fino atrás. */
const STAIR_BASE: readonly CellBox[] = [[0, 0, 0, 1, 0.5, 1], [0, 0.5, 0, 1, 1, 0.5]];
const CHAIR_BASE: readonly CellBox[] = [[0.1, 0, 0.1, 0.9, 0.5, 0.9], [0.1, 0.5, 0.1, 0.9, 1, 0.22]];
/** Gira a caixa em torno do centro da célula, `turn` quartos de volta, no mesmo sentido do renderer (+Z → +X no giro 1). */
function rotateBox(b: CellBox, turn: number): CellBox {
  let [x0, y0, z0, x1, y1, z1] = b;
  for (let i = 0; i < ((turn % 4) + 4) % 4; i++) { // (cx, cz) → (cz, −cx)
    const nx0 = z0, nx1 = z1, nz0 = 1 - x1, nz1 = 1 - x0;
    x0 = Math.min(nx0, nx1); x1 = Math.max(nx0, nx1); z0 = nz0; z1 = nz1;
  }
  return [x0, y0, z0, x1, y1, z1];
}
// ---- Porta de Junco (ADR 0102): duas células (metade de baixo e de cima), com o estado inteiro no id ----
/** Espessura da folha (3/16 m). */
export const DOOR_THICK = 0.1875;
/** Id da porta = `DOOR + giro (0–3) + 4 × aberta + 8 × dobradiça à direita + 16 × metade de cima`; o giro é o da frente (+Z no giro 0, como `ladderFacing`) e a folha fechada fica rente à borda da frente. */
export const isDoor = (id: number): boolean => id >= T.DOOR && id <= T.DOOR_LAST;
export const isDoorUpper = (id: number): boolean => isDoor(id) && ((id - T.DOOR) & 16) !== 0;
export const doorTurn = (id: number): number => (isDoor(id) ? (id - T.DOOR) & 3 : 0);
export const isDoorOpen = (id: number): boolean => isDoor(id) && ((id - T.DOOR) & 4) !== 0;
/** Dobradiça à direita de quem olha a frente da porta? */
export const isDoorHingeRight = (id: number): boolean => isDoor(id) && ((id - T.DOOR) & 8) !== 0;
export const doorId = (turn: number, hingeRight: boolean, open: boolean, upper: boolean): number => T.DOOR + (((turn % 4) + 4) % 4) + (open ? 4 : 0) + (hingeRight ? 8 : 0) + (upper ? 16 : 0);
/** Mesma porta com a abertura trocada (a outra metade se troca à parte). */
export const doorToggled = (id: number): number => (isDoor(id) ? (isDoorOpen(id) ? id - 4 : id + 4) : id);
/** A direita de quem olha a frente da porta (o lado da dobradiça direita), `(dx, dz)`: giro 0 → +X. */
export const doorRight = (turn: number): readonly [number, number] => { const [fx, fz] = ladderFacing(turn); return [fz === 0 ? 0 : fz, fx === 0 ? 0 : -fx]; };
/** Caixa da folha na célula (giro 0): fechada, rente à borda +Z; aberta, rente à borda da dobradiça ocupando a profundidade inteira. */
function doorBox(hingeRight: boolean, open: boolean): CellBox {
  if (!open) return [0, 0, 1 - DOOR_THICK, 1, 1, 1];
  return hingeRight ? [1 - DOOR_THICK, 0, 0, 1, 1, 1] : [0, 0, 0, DOOR_THICK, 1, 1];
}
const BOXES = new Map<number, readonly CellBox[]>();
for (let t = 0; t < 4; t++) for (const hr of [false, true]) for (const op of [false, true]) for (const up of [false, true]) BOXES.set(doorId(t, hr, op, up), [rotateBox(doorBox(hr, op), t)]);
for (let t = 0; t < 4; t++) { BOXES.set(T.REED_STAIR + t, STAIR_BASE.map((b) => rotateBox(b, t))); BOXES.set(T.REED_CHAIR + t, CHAIR_BASE.map((b) => rotateBox(b, t))); }
/** Caixas sólidas do bloco (degrau e cadeira) ou null se ele é cubo, laje ou tem outra forma. A física e a mira leem estas caixas. */
export const blockBoxes = (id: number): readonly CellBox[] | null => BOXES.get(id) ?? null;
export const isBrazier = (id: number): boolean => id === T.BRAZIER || id === T.BRAZIER_LIT;
/** Altura do Braseiro de Rocha 3D (ADR 0092): 0,774 m, e 0,935 m de lado, centrado na célula. */
export const BRAZIER_HEIGHT = 0.774;
/** Luz de bloco que cada emissor irradia (0–15; perde 1 por célula, ADR 0040): a lanterna 15 e o Braseiro aceso 13 (ADR 0094). Emissor novo entra aqui, nunca `id === …` solto na luz. */
export const BRAZIER_LIGHT = 13;
export const lightLevelOf = (id: number): number => (id === T.LANTERN ? 15 : id === T.BRAZIER_LIT ? BRAZIER_LIGHT : 0);
export const isCopperVein = (id: number): boolean => id === T.VEIN_COPPER;
/** Veio de Âmbar (ADR 0073): só uma picareta o quebra; solta 1–2 Brasas de Âmbar, nunca o bloco. */
export const isAmberVein = (id: number): boolean => id === T.EMBER_VEIN;
/** Veio que só uma picareta quebra (cobre e âmbar). */
export const isPickVein = (id: number): boolean => id === T.VEIN_COPPER || id === T.EMBER_VEIN;

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
export const isCollectBlock = (id: number): boolean => id === T.LANTERN || isMarco(id) || isPanel(id) || id === T.MAT || isLadder(id);
/**
 * Esteira de Junco (ADR 0085): peça fina de piso, no modelo das placas de pressão do Minecraft **sem** as regras de pressão: 1/16 m de altura, sem colisão (anda-se por cima, como na
 * lanterna e no Marco), alvo da mira pela própria caixa, exige face superior sólida abaixo e, sem o apoio, vira item. Faz parte da malha do terreno (topo = trama, laterais = borda).
 */
export const MAT_HEIGHT = 0.0625;
export const isMat = (id: number): boolean => id === T.MAT;
/** Modelo 3D (instâncias do renderer) deste bloco, ou `null`. `turn` = giro em quartos de volta ao redor de Y. */
/**
 * Escada de Junco (ADR 0088): 4 ids com o giro no id (31–34); a **frente** da escada aponta para onde se sobe e a **face de apoio** fica na borda da célula do lado oposto. Giro `t` (quartos de volta ao
 * redor de Y, como o Marco): 0 frente +Z, 1 frente +X, 2 frente −Z, 3 frente −X. Não é sólida (sobe-se por ela), é alvo da mira pela placa fina e exige um cubo inteiro atrás.
 */
export const isLadder = (id: number): boolean => id >= T.LADDER && id <= T.LADDER_270;
export const ladderTurn = (id: number): number => (isLadder(id) ? id - T.LADDER : 0);
export const ladderId = (turn: number): number => T.LADDER + (((turn % 4) + 4) % 4);
/** Direção horizontal da frente da escada de giro `turn`, [x, z]. */
export const ladderFacing = (turn: number): readonly [number, number] => [[0, 1], [1, 0], [0, -1], [-1, 0]][((turn % 4) + 4) % 4] as [number, number];
/** Giro da escada que fica de frente para a normal horizontal (nx, nz) da face onde foi presa; 0 se a normal não for horizontal. */
export const ladderTurnOf = (nx: number, nz: number): number => (nz > 0 ? 0 : nx > 0 ? 1 : nz < 0 ? 2 : nx < 0 ? 3 : 0);

/**
 * Baú de Rocha e Junco (ADR 0089): modelo 3D instanciado com o giro no id (35–38, como a Mesa); a frente (+Z do modelo, onde fica o fecho) fica voltada para o jogador. Sólido até 0,73 m na célula
 * inteira (não é cubo: as faces vizinhas aparecem), opaco à luz. O conteúdo (18 espaços) é estado da sessão (`session.chests`), não do bloco.
 */
export const CHEST_HEIGHT = 0.7305;
export const isChest = (id: number): boolean => id >= T.CHEST && id <= T.CHEST_270;
export const chestTurn = (id: number): number => (isChest(id) ? id - T.CHEST : 0);
export const chestId = (turn: number): number => T.CHEST + (((turn % 4) + 4) % 4);
/** Giro (0–3) que deixa a frente do baú voltada para o jogador: o yaw arredondado ao eixo mais próximo (o mesmo do Marco). */
export const chestTurnFacing = (yaw: number): number => ((Math.round(yaw / (Math.PI / 2)) % 4) + 4) % 4;

/**
 * Cama de Junco (ADR 0090): ocupa **duas células**, cada uma com o seu id e o giro nele. O **pé** (39–42) guarda a instância do modelo 3D, que cobre as duas; a **cabeceira** (43–46) fica uma célula adiante na
 * direção do giro (`ladderFacing`) e só barra o corpo e a mira. Giro `t`: a cabeceira está em +Z (0), +X (1), −Z (2) ou −X (3) a partir do pé. Sólida até 0,45 m, não é cubo, bloqueia a luz.
 * Quebrar qualquer metade tira as duas e devolve uma cama.
 */
export const BED_HEIGHT = 0.4527;
export const isBedFoot = (id: number): boolean => id >= T.BED && id <= T.BED_270;
export const isBedHead = (id: number): boolean => id >= T.BED_HEAD && id <= T.BED_HEAD_270;
export const isBed = (id: number): boolean => id >= T.BED && id <= T.BED_HEAD_270;
export const bedTurn = (id: number): number => (isBedFoot(id) ? id - T.BED : isBedHead(id) ? id - T.BED_HEAD : 0);
export const bedFootId = (turn: number): number => T.BED + (((turn % 4) + 4) % 4);
export const bedHeadId = (turn: number): number => T.BED_HEAD + (((turn % 4) + 4) % 4);
/** Giro que estende a cama para **longe** do jogador (a cabeceira no sentido do olhar): o olhar (−sen yaw, −cos yaw) é a frente do giro `yaw / 90° + 2`. */
export const bedTurnFacing = (yaw: number): number => ((Math.round(yaw / (Math.PI / 2)) + 2) % 4 + 4) % 4;
/** A outra metade da cama: a cabeceira do pé (uma célula adiante no giro) ou o pé da cabeceira (uma atrás). `[dx, dz]` a somar à célula. */
export function bedPartnerOffset(id: number): readonly [number, number] {
  const [fx, fz] = ladderFacing(bedTurn(id));
  return isBedFoot(id) ? [fx, fz] : [fx === 0 ? 0 : -fx, fz === 0 ? 0 : -fz]; // sem −0
}

export type ModelKindName = 'workbench' | 'marco' | 'painel' | 'escada' | 'bau' | 'cama' | 'braseiro' | 'braseiroAceso' | 'degrau' | 'cadeira' | 'porta';
export function modelOf(id: number): { kind: ModelKindName; turn: number } | null {
  if (isWorkbench(id)) return { kind: 'workbench', turn: workbenchTurn(id) };
  if (isMarco(id)) return { kind: 'marco', turn: marcoTurn(id) };
  if (isPanel(id)) return { kind: 'painel', turn: id === T.PAINEL ? 0 : 1 };
  if (isLadder(id)) return { kind: 'escada', turn: ladderTurn(id) };
  if (isChest(id)) return { kind: 'bau', turn: chestTurn(id) };
  if (isBedFoot(id)) return { kind: 'cama', turn: bedTurn(id) };
  if (isStair(id)) return { kind: 'degrau', turn: stairTurn(id) };
  if (isChair(id)) return { kind: 'cadeira', turn: chairTurn(id) };
  if (isDoor(id) && !isDoorUpper(id)) return { kind: 'porta', turn: (id - T.DOOR) & 15 }; // só a metade de baixo tem instância; o `turn` leva giro, abertura e dobradiça
  if (id === T.BRAZIER) return { kind: 'braseiro', turn: 0 }; // apagado e aceso são dois ids e dois modelos (ADR 0092)
  if (id === T.BRAZIER_LIT) return { kind: 'braseiroAceso', turn: 0 };
  return null;
}
/** Bloco que sai da malha do terreno por ser modelo 3D (lanterna e os modelos acima). */
export const isModelBlock = (id: number): boolean => id === T.LANTERN || modelOf(id) !== null || isBedHead(id) || isDoorUpper(id); // a cabeceira da cama não tem instância (o modelo do pé cobre as duas células), mas também não entra na malha do terreno

export type Face = 'top' | 'side' | 'bottom';

/** Os tiles do atlas de terreno (32 px por face, ADR 0079), na ordem do `tiles.json` (a mesma que o script do atlas lê). */
const TILE_NAMES: readonly string[] = tilesCfg.tiles;
const TILE_INDEX = new Map(TILE_NAMES.map((n, i) => [n, i]));
/** Índice de um tile pelo nome (`'03-rocha-escura/topo'`); falha cedo se o nome não existe. */
export function tileIndex(name: string): number {
  const i = TILE_INDEX.get(name);
  if (i === undefined) throw new Error(`tile desconhecido: ${name}`);
  return i;
}
const faces3 = (prefix: string): readonly [number, number, number] => [tileIndex(`${prefix}/topo`), tileIndex(`${prefix}/lateral`), tileIndex(`${prefix}/base`)];
const ROCK = faces3('03-rocha-escura');
/** Tiles [topo, lateral, base] de cada bloco do terreno. O resto (e a laje dupla, da família da rocha escura) cai na rocha escura. */
const BLOCK_TILES: Record<number, readonly [number, number, number]> = {
  [T.SAND]: faces3('01-areia-ocre'), [T.DAMP_SAND]: faces3('02-areia-umida'), [T.DARK_ROCK]: ROCK, [T.FROST]: faces3('04-gelo-fosco'), [T.BEDROCK]: faces3('05-rocha-mae'),
  [T.LAKE]: ROCK, // o líquido tem atlas próprio (ADR 0057); este tile só preenche o índice
  [T.VEIN_ROCK]: faces3('06-rocha-com-veio'), [T.VEIN_FROST]: faces3('07-gelo-com-veio'), [T.VEIN_COPPER]: faces3('08-veio-de-cobre-de-duna'), [T.EMBER]: faces3('09-deposito-de-brasa'),
  [T.SLAB]: [tileIndex('11-laje-de-rocha/topo'), tileIndex('11-laje-de-rocha/lateral'), tileIndex('11-laje-de-rocha/topo')], // a lateral tem 32 × 16 e usa a metade de cima do tile
  [T.MAT]: [tileIndex('20-esteira-de-junco/topo'), tileIndex('20-esteira-de-junco/lateral'), tileIndex('20-esteira-de-junco/lateral')],
  [T.CARAPACE]: faces3('12-revestimento-de-carapaca'), [T.EMBER_VEIN]: faces3('18-veio-de-ambar'), [T.EMBER_BLOCK]: faces3('19-bloco-de-ambar-compactado'),
  [T.BRAZIER]: [tileIndex('17-braseiro-de-rocha/topo-apagado'), tileIndex('17-braseiro-de-rocha/lateral-comum'), tileIndex('17-braseiro-de-rocha/lateral-comum')],
  [T.BRAZIER_LIT]: [tileIndex('17-braseiro-de-rocha/topo-aceso'), tileIndex('17-braseiro-de-rocha/lateral-comum'), tileIndex('17-braseiro-de-rocha/lateral-comum')],
};
BLOCK_TILES[T.SLAB_TOP] = BLOCK_TILES[T.SLAB];
// Família do Junco (ADR 0100): o bloco usa a trama nas seis faces; a laje, o topo de 32 × 32 e a lateral de 32 × 16 (metade de cima do tile)
BLOCK_TILES[T.REED_BLOCK] = faces3('21-bloco-de-junco');
BLOCK_TILES[T.REED_SLAB] = [tileIndex('22-laje-de-junco/topo'), tileIndex('22-laje-de-junco/lateral'), tileIndex('22-laje-de-junco/topo')];
BLOCK_TILES[T.REED_SLAB_TOP] = BLOCK_TILES[T.REED_SLAB];

/** Índice do tile da face de um bloco no atlas de terreno de 32 px (ADR 0079): topo, lateral e base são texturas próprias; a mesa, a lanterna, o Marco e o Painel são modelos 3D e não usam o atlas. */
export function tileFor(id: number, face: Face): number {
  const t = BLOCK_TILES[id] ?? ROCK;
  return face === 'top' ? t[0] : face === 'bottom' ? t[2] : t[1];
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
