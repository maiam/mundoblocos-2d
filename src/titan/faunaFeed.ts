import { feedFauna } from './fauna';
import { FAUNA_KINDS } from './fauna';
import type { TitanSession } from './session';

/**
 * Alimentar a fauna de fazenda (ADR 0125): o toque curto num animal com a comida da espécie na mão **alimenta** em vez de golpear. Só gasta 1 unidade se a comida tem efeito (amor ou crescimento);
 * adulto em amor ou descansando não aceita e não gasta. Sem DOM.
 */
export interface FeedAction { ok: boolean; consumed: boolean; msg?: string }
export function feedFaunaFromSlot(s: TitanSession, index: number): FeedAction {
  const f = s.fauna[index], stack = s.inventory.get(s.selected);
  if (!f || !stack) return { ok: false, consumed: false };
  const r = feedFauna(f, stack.item);
  const name = FAUNA_KINDS[f.kind].name;
  if (!r.ok) return { ok: false, consumed: false, msg: r.reason === 'love' ? `${name} já está em amor` : r.reason === 'rest' ? `${name} ainda descansa` : undefined };
  s.inventory.consume(s.selected);
  return { ok: true, consumed: true, msg: r.effect === 'love' ? `${name} com vontade de cruzar` : `${name} (filhote) cresce mais rápido` };
}
