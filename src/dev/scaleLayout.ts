import type { ActorKind } from '../game/entities';
import { Block, type BlockId } from '../world/blocks';

/**
 * Cena de escala (ADR 0022): o que aparece na fila de comparação. Dados puros (sem DOM), para o teste conferir que
 * tudo o que a cena pede existe no jogo. Posições em células, relativas ao canto da fila (cada ator com os pés no
 * centro da célula).
 */
export interface ScaleActor {
  kind: ActorKind;
  /** Nome curto escrito embaixo. */
  label: string;
  col: number;
  row: number;
}

export interface ScaleObject {
  block: BlockId;
  label: string;
  col: number;
  row: number;
  /** Lote (largura × profundidade) de objetos de várias células (`TOWN_PART` nas demais); 1×1 nos outros. */
  w?: number;
  d?: number;
}

/** Fileira 0: personagens prontos; fileira 2: animais adultos e filhotes; fileira 4: monstros. */
export const SCALE_ACTORS: readonly ScaleActor[] = [
  { kind: 'heroine', label: 'Heroína', col: 0, row: 0 },
  { kind: 'hero', label: 'Herói', col: 2, row: 0 },
  { kind: 'hood', label: 'Hood', col: 4, row: 0 },
  { kind: 'gino', label: 'Gino', col: 6, row: 0 },
  { kind: 'mila', label: 'Mila', col: 8, row: 0 },
  { kind: 'grewn', label: 'Grewn', col: 10, row: 0 },

  { kind: 'horse', label: 'Cavalo', col: 0, row: 2 },
  { kind: 'foal', label: 'Potro', col: 2, row: 2 },
  { kind: 'cow', label: 'Vaca', col: 4, row: 2 },
  { kind: 'calf', label: 'Bezerro', col: 6, row: 2 },
  { kind: 'sheep', label: 'Ovelha', col: 8, row: 2 },
  { kind: 'lamb', label: 'Cordeiro', col: 10, row: 2 },
  { kind: 'chicken', label: 'Galinha', col: 12, row: 2 },
  { kind: 'chick', label: 'Pintinho', col: 14, row: 2 },
  { kind: 'capybara', label: 'Capivara', col: 16, row: 2 },

  { kind: 'spider-small', label: 'Aranha P', col: 0, row: 4 },
  { kind: 'spider-big', label: 'Aranha G', col: 2, row: 4 },
  { kind: 'spider-boss', label: 'Rainha', col: 5, row: 4 },
  { kind: 'wolf-brown', label: 'Lobo M', col: 8, row: 4 },
  { kind: 'wolf-gray', label: 'Lobo C', col: 10, row: 4 },
  { kind: 'wolf-white', label: 'Lobo B', col: 12, row: 4 },
];

/** Fileira 6 em diante: objetos do mundo (colocados no mapa como no jogo). */
export const SCALE_OBJECTS: readonly ScaleObject[] = [
  { block: Block.CHEST, label: 'Baú', col: 0, row: 6 },
  { block: Block.BENCH, label: 'Banco 2×1', col: 2, row: 6, w: 2, d: 1 },
  { block: Block.BENCH_LONG, label: 'Banco 3×1', col: 5, row: 6, w: 3, d: 1 },
  { block: Block.STONE, label: 'Cubo', col: 9, row: 6 },
  { block: Block.OAK_TREE, label: 'Carvalho', col: 11, row: 6 },
  { block: Block.APPLE_TREE, label: 'Macieira', col: 13, row: 6 },
  // Casa térrea 5×5 (lote da cidade, `TOWN_SIZES`): a âncora é o canto inferior esquerdo; o desenho passa do lote.
  { block: Block.HOUSE, label: 'Casa 5×5', col: 16, row: 6, w: 5, d: 5 },
];

/** Pares adulto → filhote: a regra de escala "filhote ≈ 0,7× o adulto" (ADR 0022) é conferida no teste. */
export const BABY_PAIRS: ReadonlyArray<readonly [ActorKind, ActorKind]> = [
  ['sheep', 'lamb'], ['horse', 'foal'], ['cow', 'calf'], ['chicken', 'chick'],
];

/** Colunas × linhas ocupadas pela fila (com uma margem), para a cena limpar o mapa e centrar a câmera. */
export function scaleBounds(): { cols: number; rows: number } {
  let cols = 0;
  let rows = 0;
  for (const a of SCALE_ACTORS) { cols = Math.max(cols, a.col + 1); rows = Math.max(rows, a.row + 1); }
  for (const o of SCALE_OBJECTS) { cols = Math.max(cols, o.col + (o.w ?? 1)); rows = Math.max(rows, o.row + (o.d ?? 1)); }
  return { cols, rows };
}
