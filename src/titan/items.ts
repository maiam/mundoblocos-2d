import { BLOCK_NAMES, doorFamily, doorId, isDoor, isTrapdoor, trapdoorId, fenceId, gateId, isFence, isGate, isCarpentry, isMarco, isPanel, isWoodSlab, isWoodStair, isWorkbench, T, woodOf, woodStairId } from './voxel';

/**
 * Itens do Titã (ADR 0040). O id é o índice do sprite no atlas da hotbar + 1 (`render/art/titan.ts`): a ordem do atlas não depende da ordem dos espaços da barra.
 * Os quatro primeiros coincidem com os ids de bloco `T.SAND … T.FROST`.
 */
export const Item = { SAND: 1, DAMP_SAND: 2, DARK_ROCK: 3, FROST: 4, ROCK_SHARD: 5, FROST_SHARD: 6, CAPSULE: 7, LANTERN: 8, WORKBENCH: 9, ICE_LENS: 10, EMBER: 11, GLASS_REED: 12, SLAB: 13, MARCO: 14, PAINEL: 15, NOZ: 16, COPPER_SHARD: 17, COPPER_INGOT: 18, DRY_REED: 19, STONE_PICK: 20, BRAZIER: 21, STONE_DAGGER: 22, COPPER_PICK: 23, COPPER_DAGGER: 24, PLATE: 25, CARAPACE: 26, RAW_MEAT: 27, COOKED_MEAT: 28, EMBER_BLOCK: 29, NOZ_TORRADA: 30, ESTEIRA: 31, ESCADA: 32, BAU: 33, CAMA: 34, BALDE: 35, BALDE_CHEIO: 36, BLOCO_JUNCO: 37, LAJE_JUNCO: 38, DEGRAU_JUNCO: 39, CADEIRA_JUNCO: 40, PORTA_JUNCO: 41, GRASS: 42, DIRT: 43, STONE: 44, BEACH: 45, LOG_OAK: 46, LEAVES_OAK: 47, LOG_CHERRY: 48, LEAVES_CHERRY: 49, LOG_BIRCH: 50, LEAVES_BIRCH: 51, TABUA_CARVALHO: 52, TABUA_CEREJEIRA: 53, TABUA_BETULA: 54, HASTE: 55, MESA_CARPINTARIA: 56, PEDRA_LISA: 57, TIJOLO_PEDRA: 58, LAJE_PEDRA: 59, DEGRAU_PEDRA: 60, MURETA_PEDRA: 61, TERRA_ARADA_SECA: 62, TERRA_ARADA_UMIDA: 63, CAMINHO_TERRA: 64, TERRA_INFERTIL: 65, BLOCO_ARGILA: 66, BLOCO_TIJOLOS: 67, BOLA_ARGILA: 68, TIJOLO: 69, PICARETA_MADEIRA: 70, PICARETA_PEDRA: 71, MACHADO_MADEIRA: 72, MACHADO_PEDRA: 73, PA_MADEIRA: 74, PA_PEDRA: 75, ENXADA_MADEIRA: 76, ENXADA_PEDRA: 77, SEMENTE_TRIGO: 78, TRIGO: 79, CENOURA: 80, BATATA: 81, TOMATE: 82, FORNALHA: 83, CARVAO_VEGETAL: 84, TOCHA: 85, CARVAO: 87, BLOCO_CARVAO: 88, COURO: 89, LA: 90, PENA: 91, PORCO_CRU: 92, PORCO_ASSADO: 93, BOVINA_CRUA: 94, BIFE: 95, CARNEIRO_CRU: 96, CARNEIRO_ASSADO: 97, FRANGO_CRU: 98, FRANGO_ASSADO: 99, BETERRABA: 100, SEMENTE_BETERRABA: 101, SEMENTE_ABOBORA: 102, SEMENTE_MELANCIA: 103, FATIA_MELANCIA: 104, BLOCO_ABOBORA: 105, VARA_PESCA: 106, BACALHAU_CRU: 107, SALMAO_CRU: 108, BAIACU: 109, PEIXE_TROPICAL: 110, BACALHAU_ASSADO: 111, SALMAO_ASSADO: 112, BOIA: 113, LINHA: 114, ERVA_MARINHA: 115, ALGA: 116, ALGA_SECA: 117, BLOCO_ALGA_SECA: 118, CORAL_VIVO: 123, CORAL_MORTO: 128, GORGONIA_VIVA: 133, GORGONIA_MORTA: 138, BLOCO_CORAL_VIVO: 143, BLOCO_CORAL_MORTO: 148, BOTE_CARVALHO: 153, BOTE_BETULA: 154, BOTE_CEREJEIRA: 155, LAJE_CARVALHO: 156, LAJE_CEREJEIRA: 157, LAJE_BETULA: 158, DEGRAU_CARVALHO: 159, DEGRAU_CEREJEIRA: 160, DEGRAU_BETULA: 161, CERCA_CARVALHO: 162, CERCA_CEREJEIRA: 163, CERCA_BETULA: 164, PORTAO_CARVALHO: 165, PORTAO_CEREJEIRA: 166, PORTAO_BETULA: 167, PORTA_CARVALHO: 168, PORTA_CEREJEIRA: 169, PORTA_BETULA: 170, ALCAPAO_CARVALHO: 171, ALCAPAO_CEREJEIRA: 172, ALCAPAO_BETULA: 173, ESPADA_MADEIRA: 174, ESPADA_PEDRA: 175, FOGUEIRA: 176, CLAVA_MADEIRA: 177 } as const;
export type ItemId = (typeof Item)[keyof typeof Item];

export const ITEM_NAMES: Record<number, string> = {
  1: 'Areia ocre', 2: 'Areia úmida', 3: 'Rocha escura', 4: 'Gelo fosco',
  5: 'Fragmento de rocha', 6: 'Fragmento de gelo', 7: 'Cápsula de luz', 8: 'Lanterna da margem', 9: 'Mesa de Trabalho', 10: 'Lente de Gelo', 11: 'Brasa de âmbar', 12: 'Junco de vidro', 13: 'Laje de rocha', 14: 'Marco de Margem', 15: 'Painel de Junco', 16: 'Noz de Duna', 17: 'Fragmento de Cobre de Duna', 18: 'Lingote de Cobre de Duna', 19: 'Haste Seca de Junco', 20: 'Picareta de Rocha', 21: 'Braseiro de Rocha', 22: 'Adaga de Rocha', 23: 'Picareta de Cobre', 24: 'Adaga de Cobre', 25: 'Placa de Carapaça', 26: 'Revestimento de Carapaça', 27: 'Carne Crua de Farejador', 28: 'Carne Assada de Farejador', 29: 'Bloco de Âmbar Compactado', 30: 'Noz Torrada', 31: 'Esteira de Junco', 32: 'Escada de Junco', 33: 'Baú de Rocha e Junco', 34: 'Cama de Junco', 35: 'Balde de Cobre', 36: 'Balde de Cobre (cheio)', 37: 'Bloco de Junco', 38: 'Laje de Junco', 39: 'Degrau de Junco', 40: 'Cadeira de Junco', 41: 'Porta de Junco',
};
/** Itens-bloco do Orvalis em voxel (ADR 0105, ids 42–51): o item é o próprio bloco (mesma ordem de `T.GRASS … T.LEAVES_BIRCH`). */
/** Corais (ADR 0136): o item `123 + n` é o bloco do mesmo `n` (coral 0–9, gorgônia 10–19, bloco 20–29; vivos 0–4 e mortos 5–9 de cada tipo); os nomes vêm de `BLOCK_NAMES`. */
const CORAL_ITEM_BLOCKS: Readonly<Record<number, number>> = Object.fromEntries(Array.from({ length: 30 }, (_, i) => [123 + i, [T.CORAL, T.CORAL_FAN, T.CORAL_BLOCK][Math.floor(i / 10)] + (i % 10)]));
export const ORVALIS_ITEM_BLOCKS: Readonly<Record<number, number>> = { ...CORAL_ITEM_BLOCKS, [Item.GRASS]: T.GRASS, [Item.DIRT]: T.DIRT, [Item.STONE]: T.STONE, [Item.BEACH]: T.BEACH, [Item.LOG_OAK]: T.LOG_OAK, [Item.LEAVES_OAK]: T.LEAVES_OAK, [Item.LOG_CHERRY]: T.LOG_CHERRY, [Item.LEAVES_CHERRY]: T.LEAVES_CHERRY, [Item.LOG_BIRCH]: T.LOG_BIRCH, [Item.LEAVES_BIRCH]: T.LEAVES_BIRCH, [Item.TABUA_CARVALHO]: T.PLANKS_OAK, [Item.TABUA_CEREJEIRA]: T.PLANKS_CHERRY, [Item.TABUA_BETULA]: T.PLANKS_BIRCH, [Item.MESA_CARPINTARIA]: T.CARPENTRY, [Item.PEDRA_LISA]: T.STONE_SMOOTH, [Item.TIJOLO_PEDRA]: T.STONE_BRICK, [Item.LAJE_PEDRA]: T.STONE_SLAB, [Item.TERRA_ARADA_SECA]: T.FARMLAND_DRY, [Item.TERRA_ARADA_UMIDA]: T.FARMLAND_WET, [Item.CAMINHO_TERRA]: T.PATH, [Item.TERRA_INFERTIL]: T.DIRT_INFERTILE, [Item.BLOCO_ARGILA]: T.CLAY_BLOCK, [Item.BLOCO_TIJOLOS]: T.BRICK_BLOCK, [Item.FORNALHA]: T.FURNACE, [Item.TOCHA]: T.TORCH, [Item.FOGUEIRA]: T.CAMPFIRE, [Item.BLOCO_CARVAO]: T.COAL_BLOCK, [Item.BLOCO_ABOBORA]: T.PUMPKIN, [Item.ERVA_MARINHA]: T.SEAGRASS, [Item.LAJE_CARVALHO]: T.SLAB_OAK, [Item.LAJE_CEREJEIRA]: T.SLAB_CHERRY, [Item.LAJE_BETULA]: T.SLAB_BIRCH, [Item.ALGA]: T.KELP, [Item.BLOCO_ALGA_SECA]: T.DRIED_KELP_BLOCK };
const ORVALIS_BLOCK_ITEMS: Readonly<Record<number, number>> = { ...Object.fromEntries(Object.entries(ORVALIS_ITEM_BLOCKS).map(([item, block]) => [block, Number(item)])), ...Object.fromEntries(Array.from({ length: 8 }, (_, t) => [T.FURNACE + t, Item.FORNALHA])), ...Object.fromEntries(Array.from({ length: 5 }, (_, t) => [T.TORCH + t, Item.TOCHA])), [T.COAL_ORE]: Item.CARVAO, [T.MELON]: Item.FATIA_MELANCIA, [T.SEAGRASS_TALL]: Item.ERVA_MARINHA, [T.SEAGRASS_TALL_TOP]: Item.ERVA_MARINHA, [T.KELP_TOP]: Item.ALGA }; // a melancia solta fatias (3–7, ADR 0128), nunca o bloco; a abóbora volta como Bloco de Abóbora // o minério solta Carvão (nunca o bloco, sem toque de seda, ADR 0122) // a fornalha acesa e os giros devolvem a mesma Fornalha; a tocha de parede, a mesma Tocha // a fornalha acesa e os giros devolvem a mesma Fornalha
for (const [item, block] of Object.entries(ORVALIS_ITEM_BLOCKS)) ITEM_NAMES[Number(item)] = BLOCK_NAMES[block];
Object.assign(ITEM_NAMES, { 70: 'Picareta de Madeira', 71: 'Picareta de Pedra', 72: 'Machado de Madeira', 73: 'Machado de Pedra', 74: 'Pá de Madeira', 75: 'Pá de Pedra', 76: 'Enxada de Madeira', 77: 'Enxada de Pedra' }); // ferramentas do Orvalis (ADR 0112)
Object.assign(ITEM_NAMES, { 78: 'Semente de Trigo', 79: 'Trigo', 80: 'Cenoura', 81: 'Batata', 82: 'Tomate' }); // horta (ADR 0113)
Object.assign(ITEM_NAMES, { 89: 'Couro', 90: 'Lã', 91: 'Pena', 92: 'Carne de Porco Crua', 93: 'Carne de Porco Assada', 94: 'Carne Bovina Crua', 95: 'Bife', 96: 'Carneiro Cru', 97: 'Carneiro Assado', 98: 'Frango Cru', 99: 'Frango Assado', 100: 'Beterraba', 101: 'Semente de Beterraba', 102: 'Semente de Abóbora', 103: 'Semente de Melancia', 104: 'Fatia de Melancia', 105: 'Bloco de Abóbora', 106: 'Vara de Pesca', 107: 'Bacalhau Cru', 108: 'Salmão Cru', 109: 'Baiacu', 110: 'Peixe Tropical', 111: 'Bacalhau Assado', 112: 'Salmão Assado', 114: 'Linha', 115: 'Erva Marinha', 116: 'Alga', 117: 'Alga Seca', 118: 'Bloco de Alga Seca' }); // flora marinha (ADR 0135); 119–122 = só texturas da flora no atlas, não são itens // pesca (ADR 0133); 113 = só a textura da boia, não é item // espólio da fauna de fazenda (ADR 0124; ícones provisórios, exceto couro e lã)
ITEM_NAMES[Item.CARVAO_VEGETAL] = 'Carvão Vegetal'; ITEM_NAMES[Item.CARVAO] = 'Carvão'; // item sem bloco (ADR 0122) // item sem bloco (ADR 0120; ícone provisório)
ITEM_NAMES[Item.BOLA_ARGILA] = 'Bola de Argila'; ITEM_NAMES[Item.TIJOLO] = 'Tijolo'; // itens sem bloco (ADR 0111)
ITEM_NAMES[Item.MURETA_PEDRA] = 'Mureta de Pedra'; // a conexão vem dos vizinhos (ADR 0110)
Object.assign(ITEM_NAMES, { 153: 'Bote de Carvalho', 154: 'Bote de Bétula', 155: 'Bote de Cerejeira' }); // botes (ADR 0137): item sem bloco
Object.assign(ITEM_NAMES, { 168: 'Porta de Carvalho', 169: 'Porta de Cerejeira', 170: 'Porta de Bétula', 171: 'Alçapão de Carvalho', 172: 'Alçapão de Cerejeira', 173: 'Alçapão de Bétula' , 174: 'Espada de Madeira', 175: 'Espada de Pedra', 176: 'Fogueira', 177: 'Clava de Madeira'}); // sem entrada em ORVALIS_ITEM_BLOCKS (ADR 0141)
Object.assign(ITEM_NAMES, { 162: 'Cerca de Carvalho', 163: 'Cerca de Cerejeira', 164: 'Cerca de Bétula', 165: 'Portão de Carvalho', 166: 'Portão de Cerejeira', 167: 'Portão de Bétula' }); // sem entrada em ORVALIS_ITEM_BLOCKS (ADR 0140)
Object.assign(ITEM_NAMES, { 159: 'Degrau de Carvalho', 160: 'Degrau de Cerejeira', 161: 'Degrau de Bétula' }); // sem entrada em ORVALIS_ITEM_BLOCKS: o giro vem do olhar (ADR 0139)
ITEM_NAMES[Item.DEGRAU_PEDRA] = 'Degrau de Pedra'; // sem entrada em ORVALIS_ITEM_BLOCKS: o giro vem do olhar (ADR 0109)
ITEM_NAMES[Item.HASTE] = 'Haste de Madeira'; // item sem bloco (ADR 0107)
/** Pilhas: blocos, fragmentos, lente e brasa até 64; cápsula (legada, id reservado), lanterna e mesa até 1 (a mesa 1 por espaço: é uma peça grande). */
export const maxStack = (item: number): number => (item === Item.CAPSULE || item === Item.LANTERN || item === Item.WORKBENCH || isBucket(item) || isTool(item) ? 1 : 64);
export const isItem = (n: unknown): n is ItemId => Number.isInteger(n) && (n as number) >= 1 && ((n as number) <= 118 || ((n as number) >= 123 && (n as number) <= 177)) && n !== 86 && n !== 113; // 86 é só a textura da Tocha de parede no atlas (ADR 0121)
/** Balde de Cobre (ADR 0091): vazio recolhe uma célula do lago, cheio a despeja. Pergunte aqui, nunca compare ids soltos. */
/** Itens que fazem a mira acertar o líquido: o balde (ADR 0091) e a vara de pesca (ADR 0133). */
export const isBoatItem = (item: number | undefined | null): boolean => item === Item.BOTE_CARVALHO || item === Item.BOTE_BETULA || item === Item.BOTE_CEREJEIRA;
export const aimsLiquid = (item: number | undefined | null): boolean => isBucket(item) || item === Item.VARA_PESCA || isBoatItem(item); // balde, vara e bote: a mira acerta o líquido (ADR 0091, 0133, 0137)
export const isBucket = (item: number | undefined | null): boolean => item === Item.BALDE || item === Item.BALDE_CHEIO;

/** Bloco que o item coloca (blocos e lanterna); fragmentos e cápsula não se colocam. */
export function blockOfItem(item: number): number | null {
  if (item >= Item.SAND && item <= Item.FROST) return item; // mesmos ids
  if (ORVALIS_ITEM_BLOCKS[item]) return ORVALIS_ITEM_BLOCKS[item]; // Orvalis em voxel (ADR 0105)
  if (item === Item.MURETA_PEDRA) return T.STONE_WALL; // `set` liga aos vizinhos
  if (item === Item.DEGRAU_PEDRA) return T.STONE_STAIR; // o giro vem do olhar de quem coloca (`placeFromSlot`, ADR 0109)
  if (item >= Item.PORTA_CARVALHO && item <= Item.PORTA_BETULA) return doorId(0, false, false, false, 1 + item - Item.PORTA_CARVALHO); // duas células; giro e dobradiça vêm do olhar (`placeDoor`, ADR 0141)
  if (item >= Item.ALCAPAO_CARVALHO && item <= Item.ALCAPAO_BETULA) return trapdoorId(item - Item.ALCAPAO_CARVALHO, 0, false, false); // giro, metade e abertura vêm do olhar e da face (`placeFromSlot`)
  if (item >= Item.CERCA_CARVALHO && item <= Item.CERCA_BETULA) return fenceId(item - Item.CERCA_CARVALHO, 0); // `set` liga aos vizinhos (ADR 0140)
  if (item >= Item.PORTAO_CARVALHO && item <= Item.PORTAO_BETULA) return gateId(item - Item.PORTAO_CARVALHO, 0, false); // o giro vem do olhar (`placeFromSlot`)
  if (item >= Item.DEGRAU_CARVALHO && item <= Item.DEGRAU_BETULA) return woodStairId(item - Item.DEGRAU_CARVALHO, 0); // o giro vem do olhar de quem coloca (`placeFromSlot`, ADR 0139)
  if (item === Item.LANTERN) return T.LANTERN;
  if (item === Item.WORKBENCH) return T.WORKBENCH;
  if (item === Item.SLAB) return T.SLAB;
  if (item === Item.BLOCO_JUNCO) return T.REED_BLOCK; // família do Junco (ADR 0100)
  if (item === Item.LAJE_JUNCO) return T.REED_SLAB;
  if (item === Item.DEGRAU_JUNCO) return T.REED_STAIR; // o giro vem do olhar de quem coloca (`placeFromSlot`)
  if (item === Item.CADEIRA_JUNCO) return T.REED_CHAIR;
  if (item === Item.PORTA_JUNCO) return T.DOOR; // duas células; giro e dobradiça vêm do olhar e dos vizinhos (`placeDoor`, ADR 0102)
  if (item === Item.MARCO) return T.MARCO; // o giro vem do olhar de quem coloca (`placeFromSlot`)
  if (item === Item.PAINEL) return T.PAINEL; // o eixo vem do olhar de quem coloca
  if (item === Item.CARAPACE) return T.CARAPACE;
  if (item === Item.EMBER_BLOCK) return T.EMBER_BLOCK;
  if (item === Item.CAMA) return T.BED; // o giro vem do olhar e a cabeceira é a outra célula (`placeFromSlot`)
  if (item === Item.BAU) return T.CHEST; // o giro vem do olhar de quem coloca (`placeFromSlot`)
  if (item === Item.ESCADA) return T.LADDER; // o giro vem da face onde se prende (`placeFromSlot`)
  if (item === Item.ESTEIRA) return T.MAT; // peça fina de piso (ADR 0085): precisa de apoio sólido em baixo
  if (item === Item.BRAZIER) return T.BRAZIER; // sempre apagado: a Brasa de Âmbar o acende (ADR 0065)
  return null;
}
/** Item que um bloco devolve ao ser quebrado (null = não se quebra: rocha-mãe, líquido). */
export function itemOfBlock(block: number): ItemId | null {
  if (block >= T.SAND && block <= T.FROST) return block as ItemId;
  if (block === T.FARMLAND_DRY || block === T.FARMLAND_WET || block === T.PATH) return Item.DIRT; // como no Minecraft, a terra arada e o caminho devolvem terra (ADR 0112)
  if (ORVALIS_BLOCK_ITEMS[block]) return ORVALIS_BLOCK_ITEMS[block] as ItemId; // Orvalis em voxel (ADR 0105)
  if (isDoor(block) && doorFamily(block) > 0) return (Item.PORTA_CARVALHO + doorFamily(block) - 1) as ItemId; // as duas metades, qualquer estado (ADR 0141)
  if (isTrapdoor(block)) return (Item.ALCAPAO_CARVALHO + woodOf(block)) as ItemId;
  if (isFence(block)) return (Item.CERCA_CARVALHO + woodOf(block)) as ItemId; // qualquer máscara devolve 1 cerca (ADR 0140)
  if (isGate(block)) return (Item.PORTAO_CARVALHO + woodOf(block)) as ItemId; // aberto ou fechado
  if (isWoodSlab(block)) return (Item.LAJE_CARVALHO + woodOf(block)) as ItemId; // as duas metades (inferior e superior) devolvem a mesma laje (ADR 0139)
  if (isWoodStair(block)) return (Item.DEGRAU_CARVALHO + woodOf(block)) as ItemId;
  if (block === T.STONE_SLAB_TOP) return Item.LAJE_PEDRA; // a superior devolve a mesma laje (a fusão é a Pedra Lisa: 1 bloco = 2 lajes, ADR 0108)
  if (block >= T.STONE_STAIR && block <= T.STONE_STAIR_270) return Item.DEGRAU_PEDRA;
  if (block >= T.STONE_WALL && block <= T.STONE_WALL_LAST) return Item.MURETA_PEDRA;
  if (isCarpentry(block)) return Item.MESA_CARPINTARIA; // as 4 orientações da mesa devolvem 1 mesa (ADR 0107)
  if (block === T.VEIN_ROCK) return Item.DARK_ROCK; // o veio devolve o bloco inteiro (a lasca vem à parte, em `actions.ts`)
  if (block === T.VEIN_FROST) return Item.FROST;
  if (block === T.LANTERN) return Item.LANTERN;
  if (isWorkbench(block)) return Item.WORKBENCH;
  if (isMarco(block)) return Item.MARCO;
  if (isPanel(block)) return Item.PAINEL;
  if (block === T.CARAPACE) return Item.CARAPACE;
  if (block === T.EMBER_BLOCK) return Item.EMBER_BLOCK;
  if (block === T.MAT) return Item.ESTEIRA;
  if (block >= T.LADDER && block <= T.LADDER_270) return Item.ESCADA;
  if (block >= T.CHEST && block <= T.CHEST_270) return Item.BAU;
  if (block >= T.BED && block <= T.BED_HEAD_270) return Item.CAMA; // os dois lados (a quebra tira a cama inteira e devolve uma)
  if (block === T.BRAZIER || block === T.BRAZIER_LIT) return Item.BRAZIER; // o aceso volta apagado (a carga se perde)
  if (block >= T.REED_STAIR && block <= T.REED_STAIR_270) return Item.DEGRAU_JUNCO;
  if (block >= T.REED_CHAIR && block <= T.REED_CHAIR_270) return Item.CADEIRA_JUNCO;
  if (block >= T.DOOR && block <= T.DOOR_LAST) return Item.PORTA_JUNCO; // as duas metades (a quebra tira a porta inteira e devolve uma)
  if (block === T.REED_BLOCK) return Item.BLOCO_JUNCO; // a fusão de duas lajes de junco é o próprio bloco: devolve 1 bloco
  if (block === T.REED_SLAB || block === T.REED_SLAB_TOP) return Item.LAJE_JUNCO;
  if (block === T.SLAB || block === T.SLAB_TOP || block === T.SLAB_DOUBLE) return Item.SLAB; // a laje dupla devolve 2 (`dropCountOf`)
  return null;
}
/** Quantas unidades do item o bloco devolve ao ser quebrado: a laje dupla devolve 2 lajes (não vira bloco maciço). */
export const dropCountOf = (block: number): number => (block === T.SLAB_DOUBLE ? 2 : 1);

/** Comida (ADR 0060): fome recuperada (pontos de 0 a 20) e saturação somada (como no Minecraft: `fome + saturação` limitada à fome). Provisório, pede teste em jogo. */
export const FOOD: Readonly<Record<number, { hunger: number; saturation: number }>> = { [Item.NOZ]: { hunger: 4, saturation: 2.4 }, [Item.NOZ_TORRADA]: { hunger: 7, saturation: 5.6 }, [Item.RAW_MEAT]: { hunger: 2, saturation: 1.2 }, [Item.COOKED_MEAT]: { hunger: 8, saturation: 12.8 }, [Item.CENOURA]: { hunger: 3, saturation: 3.6 }, [Item.BATATA]: { hunger: 1, saturation: 0.6 }, [Item.TOMATE]: { hunger: 2, saturation: 2.4 },
  [Item.PORCO_CRU]: { hunger: 3, saturation: 1.8 }, [Item.PORCO_ASSADO]: { hunger: 8, saturation: 12.8 }, [Item.BOVINA_CRUA]: { hunger: 3, saturation: 1.8 }, [Item.BIFE]: { hunger: 8, saturation: 12.8 }, [Item.CARNEIRO_CRU]: { hunger: 2, saturation: 1.2 }, [Item.CARNEIRO_ASSADO]: { hunger: 6, saturation: 9.6 }, [Item.FRANGO_CRU]: { hunger: 2, saturation: 1.2 }, [Item.FRANGO_ASSADO]: { hunger: 6, saturation: 7.2 }, [Item.BETERRABA]: { hunger: 1, saturation: 1.2 }, [Item.FATIA_MELANCIA]: { hunger: 2, saturation: 1.2 },
  [Item.BACALHAU_CRU]: { hunger: 2, saturation: 0.4 }, [Item.SALMAO_CRU]: { hunger: 2, saturation: 0.4 }, [Item.BACALHAU_ASSADO]: { hunger: 5, saturation: 6 }, [Item.SALMAO_ASSADO]: { hunger: 6, saturation: 9.6 }, [Item.PEIXE_TROPICAL]: { hunger: 1, saturation: 0.2 }, [Item.ALGA_SECA]: { hunger: 1, saturation: 0.6 } }; // peixes da Wiki (ADR 0133); o baiacu não se come (sem efeitos de status) // carnes da fauna (ADR 0124): valores da Minecraft Wiki; a intoxicação do frango cru fica de fora // horta do Orvalis (ADR 0113): cenoura e batata como no Minecraft; o tomate é nosso (provisório)
export const foodOf = (item: number): { hunger: number; saturation: number } | null => FOOD[item] ?? null;

/**
 * Ferramentas (ADR 0063): o item na mão muda o que se quebra e a velocidade. `pick` = picareta (quebra veio de cobre e rocha mais depressa). Provisório: sem durabilidade.
 * Ferramenta nova entra aqui (nunca `item === …` solto no jogo).
 */
export type Tier = 'wood' | 'rock' | 'copper';
export type ToolKind = 'pick' | 'dagger' | 'axe' | 'shovel' | 'hoe' | 'sword' | 'club';
export const TOOLS: Readonly<Record<number, { kind: ToolKind; tier: Tier }>> = {
  [Item.STONE_PICK]: { kind: 'pick', tier: 'rock' }, [Item.COPPER_PICK]: { kind: 'pick', tier: 'copper' },
  [Item.STONE_DAGGER]: { kind: 'dagger', tier: 'rock' }, [Item.COPPER_DAGGER]: { kind: 'dagger', tier: 'copper' },
  // Orvalis em voxel (ADR 0112): madeira e pedra (a pedra usa o nível `rock`, o mesmo da picareta de rocha do Titã)
  [Item.PICARETA_MADEIRA]: { kind: 'pick', tier: 'wood' }, [Item.PICARETA_PEDRA]: { kind: 'pick', tier: 'rock' },
  [Item.MACHADO_MADEIRA]: { kind: 'axe', tier: 'wood' }, [Item.MACHADO_PEDRA]: { kind: 'axe', tier: 'rock' },
  [Item.PA_MADEIRA]: { kind: 'shovel', tier: 'wood' }, [Item.PA_PEDRA]: { kind: 'shovel', tier: 'rock' },
  [Item.ENXADA_MADEIRA]: { kind: 'hoe', tier: 'wood' }, [Item.ENXADA_PEDRA]: { kind: 'hoe', tier: 'rock' },
  [Item.CLAVA_MADEIRA]: { kind: 'club', tier: 'wood' }, // clava de madeira (ADR 0148)
  [Item.ESPADA_MADEIRA]: { kind: 'sword', tier: 'wood' }, [Item.ESPADA_PEDRA]: { kind: 'sword', tier: 'rock' }, // espadas do Orvalis (ADR 0145)
};
export const toolOf = (item: number | undefined | null): (typeof TOOLS)[number] | null => (item ? TOOLS[item] ?? null : null);
export const isTool = (item: number): boolean => item in TOOLS;
export const isPick = (item: number | undefined | null): boolean => toolOf(item)?.kind === 'pick';
/** Nível da picareta na mão (`null` = não é picareta). */
export const pickTier = (item: number | undefined | null): Tier | null => { const t = toolOf(item); return t?.kind === 'pick' ? t.tier : null; };
/** Machado, pá e enxada (ADR 0112): pergunte aqui, nunca ids soltos. */
export const isAxe = (item: number | undefined | null): boolean => toolOf(item)?.kind === 'axe';
export const isShovel = (item: number | undefined | null): boolean => toolOf(item)?.kind === 'shovel';
export const isHoe = (item: number | undefined | null): boolean => toolOf(item)?.kind === 'hoe';
export const isDagger = (item: number | undefined | null): boolean => toolOf(item)?.kind === 'dagger';
/** Espada do Orvalis (ADR 0145). Arma de lâmina: gasta como a adaga (golpe −1, bloco −2). */
/** Clava de Madeira do Orvalis (ADR 0148): arma pesada; gasta como a espada (golpe −1, bloco −2). */
export const isClub = (item: number | undefined | null): boolean => toolOf(item)?.kind === 'club';
export const isSword = (item: number | undefined | null): boolean => toolOf(item)?.kind === 'sword';
