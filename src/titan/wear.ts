import { isCollectBlock } from './voxel';
import { Item, toolOf } from './items';

/**
 * Durabilidade das ferramentas (ADR 0067), no modelo do Minecraft: cada ferramenta guarda um **contador inteiro de desgaste** (`Stack.wear`, de 0 até `maxDurability`) dentro do próprio espaço do inventário;
 * ao chegar ao máximo o item **quebra** (toca o estilhaço e some). Puro e determinístico (sem sorteio: Inquebrável, Remendo e Bigorna não existem no Titã). Sem DOM.
 */
/** Durabilidade máxima por item (provisório: rocha como a pedra do Minecraft, cobre entre a pedra e o ferro). */
export const MAX_DURABILITY: Readonly<Record<number, number>> = {
  [Item.STONE_PICK]: 131, [Item.STONE_DAGGER]: 131,
  [Item.COPPER_PICK]: 190, [Item.COPPER_DAGGER]: 190,
  // Orvalis (ADR 0112), como o Minecraft: madeira 59, pedra 131
  [Item.PICARETA_MADEIRA]: 59, [Item.MACHADO_MADEIRA]: 59, [Item.PA_MADEIRA]: 59, [Item.ENXADA_MADEIRA]: 59,
  [Item.VARA_PESCA]: 64, // Wiki (Java): 64 usos, 1 por captura (ADR 0133)
  [Item.PICARETA_PEDRA]: 131, [Item.MACHADO_PEDRA]: 131, [Item.PA_PEDRA]: 131, [Item.ENXADA_PEDRA]: 131,
  [Item.ESPADA_MADEIRA]: 59, [Item.ESPADA_PEDRA]: 131, // espadas do Orvalis (ADR 0145): como as outras ferramentas de madeira e pedra
};
export const maxDurability = (item: number): number | null => MAX_DURABILITY[item] ?? null;

export type WearAction = { type: 'break_block'; block: number } | { type: 'attack' } | { type: 'use' };

/**
 * Pontos de desgaste de uma ação (regra do Minecraft):
 * - **uso correto** (−1): picareta quebrando bloco; adaga ou espada (lâmina) golpeando um inimigo;
 * - **uso impróprio** (−2): adaga ou espada quebrando bloco; picareta golpeando um inimigo;
 * - blocos de recolhimento instantâneo (lanterna, Marco, Painel: "dureza 0") não gastam nada.
 */
export function wearCost(tool: number, action: WearAction): number {
  const t = toolOf(tool);
  if (!t) return 0;
  if (action.type === 'use') return 1; // arar com a enxada, abrir caminho com a pá (ADR 0112)
  if (action.type === 'break_block') return isCollectBlock(action.block) ? 0 : t.kind === 'dagger' || t.kind === 'sword' ? 2 : 1;
  return t.kind === 'dagger' || t.kind === 'sword' ? 1 : 2;
}

/** Fração de vida restante (1 = nova, 0 = quebrando), ou `null` se o item não se desgasta ou está intacto (a barra só aparece depois do primeiro desgaste). */
export function durabilityRatio(item: number, wear: number | undefined): number | null {
  const max = maxDurability(item);
  if (max === null || !wear || wear <= 0) return null;
  return Math.max(0, (max - wear) / max);
}

/** Cor da barra: matiz de verde (120°, cheia) a vermelho (0°, quase quebrando), como no Minecraft. */
export const durabilityHue = (ratio: number): number => Math.round(120 * Math.max(0, Math.min(1, ratio)));
