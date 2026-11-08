import { Block, type BlockId } from '../world/blocks';

/**
 * Transições horizontais entre chãos (Padrão V2, ADR 0023): o material que "avança" invade a borda do vizinho por uma
 * máscara de alfa reutilizável (`assets-src/materiais/_mascaras`, `scripts/build-materials.py`). A máscara é uma FORMA e
 * pode girar para qualquer direção; a textura que aparece por ela é o topo do material que avança e nunca gira.
 *
 * Regras de produção (dados do catálogo, não da cor): só o chão plano, na mesma altura, e só entre os chãos listados;
 * água, buraco, pedra e piso da cidade ficam fora (têm borda própria). Hoje só a Grama avança, sobre Terra, Caminho e
 * Areia. Determinístico: depende só dos vizinhos (sem aleatório), então o mesmo mapa sempre sai igual.
 */
export const TRANSITION_RULES: ReadonlyArray<{ over: BlockId; onto: readonly BlockId[] }> = [
  { over: Block.GRASS, onto: [Block.DIRT, Block.PATH, Block.SAND] },
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
