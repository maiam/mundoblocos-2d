import { Block, type BlockId, isStackBlock } from './blocks';

/**
 * Blocos de 1/4 de célula (ADR 0033, v0.93.75). No Mundo principal todo bloco de construção tem **altura de 1/4** (face 16 × 4, topo
 * 16 × 16) e empilha até 4 (= 1 célula, a altura do cubo antigo): um nível da pilha é um bloco. Funções puras, sem DOM.
 */

/**
 * O bloco do nível `level` (0–3) de uma célula que o gerador (ou um arquivo no formato antigo, de 2 níveis) descreve com `obj` no nível 0
 * e `upper` no nível 1. **Preserva a altura**: 1 cubo antigo = 4 blocos do mesmo tipo; 2 cubos antigos (que passam do limite de 4) =
 * 2 blocos de cada um (1 célula de altura no total). Objetos que não são bloco de construção (árvores, casas, plantas, cacto) não mudam.
 */
export function quarterLevel(obj: BlockId, upper: BlockId, level: number): BlockId {
  if (!isStackBlock(obj)) return level === 0 ? obj : level === 1 ? upper : Block.AIR;
  if (level < 0 || level >= 4) return Block.AIR;
  if (!isStackBlock(upper)) return obj; // 1 cubo antigo → 4 blocos
  return level < 2 ? obj : upper; // 2 cubos antigos → 2 + 2
}

/** Quantos blocos de 1/4 a pilha de uma célula antiga tem (0 se não há bloco de construção no nível 0). */
export function quarterCount(obj: BlockId): number {
  return isStackBlock(obj) ? 4 : 0;
}
