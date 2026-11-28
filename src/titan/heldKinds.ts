import { blockOfItem, isTool } from './items';
import { isFull, isGlass, modelOf, T, tileFor } from './voxel';

/**
 * Categorias de exibição na mão (ADR 0087), no modelo do Minecraft: **mão vazia** (o braço), **bloco** (cubo 3D com as texturas do terreno), **item plano** (o sprite extrudado: comida,
 * fragmentos, lingote, esteira, lanterna, mesa…), **ferramenta** (sprite extrudado com o pivô no cabo) e **modelo** (o item tem GLB próprio: Adaga e Picareta de Rocha, ADRs 0071 e 0078).
 * Pergunte sempre por aqui; nunca compare ids de item soltos no renderer. Puro (sem DOM nem THREE).
 */
export type HeldCategory = 'hand' | 'block' | 'flat' | 'tool' | 'model';

/** O bloco do item é um cubo inteiro que a mão pode mostrar com as texturas do terreno? (Laje, lanterna, Marco, Painel, Mesa, esteira e vidro não são: viram item plano.) */
export function heldBlockOf(item: number): number | null {
  const b = blockOfItem(item);
  return b !== null && b !== T.LANTERN && isFull(b) && !isGlass(b) && modelOf(b) === null ? b : null; // o vidro é translúcido: o cubo da mão (opaco) o desenharia preto, então vira item plano (ADR 0150)
}

/** Categoria do item na mão; `hasModel` = há GLB próprio para ele (a lista fica no renderer, que carrega os arquivos). `null` = mão vazia. */
export function heldCategory(item: number | null, hasModel: boolean): HeldCategory {
  if (item === null) return 'hand';
  if (hasModel) return 'model';
  if (isTool(item)) return 'tool';
  return heldBlockOf(item) !== null ? 'block' : 'flat';
}

/** Tiles do atlas de terreno [topo, lateral, base] do bloco que o item coloca, ou null se não for um cubo. */
export function heldBlockTiles(item: number): readonly [number, number, number] | null {
  const b = heldBlockOf(item);
  return b === null ? null : [tileFor(b, 'top'), tileFor(b, 'side'), tileFor(b, 'bottom')];
}
