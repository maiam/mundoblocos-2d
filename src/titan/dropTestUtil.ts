import { collectNearby } from './actions';
import type { TitanSession } from './session';

/** Só para testes (ADR 0082): o bloco quebrado agora cai no chão; isto recolhe tudo o que há solto como se o jogador passasse por cada pilha (já sem o atraso de coleta). */
export function sweep(s: TitanSession): number {
  let n = 0;
  for (const d of [...s.drops.values()]) n += collectNearby(s, d.x + 0.5, d.y, d.z + 0.5, 1).collected;
  return n;
}

/** Como `sweep`, mas só os drops de bloco (`b:`): a lasca e o espólio ficam como estavam (testes de veios). */
export function sweepBlocks(s: TitanSession): number {
  const others = [...s.drops.values()].filter((d) => !d.id.startsWith('b:'));
  for (const d of others) s.drops.delete(d.id);
  const n = sweep(s);
  for (const d of others) s.drops.set(d.id, d);
  return n;
}
