import { Block, type BlockId } from '../world/blocks';

/**
 * Transições horizontais entre chãos (Padrão V2, ADR 0023): o material que "avança" invade a borda do vizinho por uma
 * forma derivada da PINTURA do par (`assets-src/materiais/_mascaras/<forma>.png`, `scripts/import-transition.py`; formas
 * com `.overlay.png` trazem também a faixa pintada — espuma, água rasa). A forma pode girar para qualquer direção; a
 * textura que aparece por ela é o topo do material que avança e nunca gira.
 *
 * Regras de produção (dados do catálogo, não da cor): só o chão plano, na mesma altura, e só entre os pares listados; cada
 * par traz a sua forma. A Água também avança (o ladrilho dela, não um bloco); buraco, pedra e piso da cidade ficam fora
 * (têm borda própria). Falta arte (ainda): Terra Arada com água/grama/areia. Determinístico: depende só dos vizinhos.
 */
export interface TransitionRule {
  over: BlockId;
  onto: BlockId;
  /** Nome da forma no atlas de máscaras (`manifest.masks.shapes`). */
  shape: string;
}

export const TRANSITION_RULES: ReadonlyArray<TransitionRule> = [
  { over: Block.GRASS, onto: Block.DIRT, shape: 'grama-terra' },
  { over: Block.GRASS, onto: Block.PATH, shape: 'grama-caminho' },
  { over: Block.GRASS, onto: Block.SAND, shape: 'grama-areia' },
  { over: Block.SAND, onto: Block.DIRT, shape: 'areia-terra' },
  { over: Block.WATER, onto: Block.SAND, shape: 'agua-areia' },
  { over: Block.WATER, onto: Block.DIRT, shape: 'agua-terra' },
  { over: Block.WATER, onto: Block.PATH, shape: 'agua-caminho' },
  { over: Block.WATER, onto: Block.GRASS, shape: 'agua-grama' },
];

/** Ordem das peças de uma forma no atlas de máscaras: quatro bordas e quatro cantos (só vizinho diagonal). */
export const TRANSITION_PIECES = ['N', 'E', 'S', 'W', 'NE', 'SE', 'SW', 'NW'] as const;

/**
 * Quais peças desenhar numa célula, dado onde há vizinho que avança (`has(dx, dy)` com dy para baixo). Cada vizinho de
 * lado traz a sua borda; um vizinho diagonal só traz um canto quando nenhum dos dois vizinhos de lado ao redor dele já
 * cobre aquele canto (senão as bordas já se encontram). Combinações (até 2^8) saem da composição, sem arte por caso.
 */
export function transitionPieces(has: (dx: number, dy: number) => boolean): number[] {
  const n = has(0, -1);
  const e = has(1, 0);
  const s = has(0, 1);
  const w = has(-1, 0);
  const out: number[] = [];
  if (n) out.push(0);
  if (e) out.push(1);
  if (s) out.push(2);
  if (w) out.push(3);
  if (has(1, -1) && !n && !e) out.push(4);
  if (has(1, 1) && !s && !e) out.push(5);
  if (has(-1, 1) && !s && !w) out.push(6);
  if (has(-1, -1) && !n && !w) out.push(7);
  return out;
}
