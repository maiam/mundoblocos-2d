import { Block, type BlockId } from './blocks';

/**
 * Lajes (piloto, v0.93.72): blocos que, em vez de cubo cheio, são uma placa baixa — topo 16 × 16 px e face 16 × 4 px (1/4 de célula,
 * `SLAB_HEIGHT`). Só valem no piloto `?tabua=laje` (Mundo principal, 3D, jogo offline): a laje é andável (lógica no nível do chão) e o
 * corpo sobe `SLAB_HEIGHT` por cima dela (só visual). O dado guardado (saves, sala) continua sendo o cubo comum: tirar o parâmetro
 * devolve tudo como era. Sem DOM.
 */
export const SLAB_HEIGHT = 0.25;

/** Blocos que viram laje no piloto: hoje só a Tábua de Carvalho. */
export function slabIdsFromSearch(search: string): readonly BlockId[] {
  return new URLSearchParams(search).get('tabua') === 'laje' ? [Block.OAK_PLANKS] : [];
}
