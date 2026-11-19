import { blockOfItem, Item, itemOfBlock } from './items';
import { canPlaceAt, type Hit } from './physics';
import type { TitanSession } from './session';

/**
 * Ações do jogador no mundo (ADR 0040): quebrar, colocar e recolher à mão. Sem DOM. Cada ação valida espaço **antes** de mudar qualquer coisa
 * (tudo ou nada) e muda mundo e inventário juntos, para o save sempre gravar os dois no mesmo instante.
 */
export interface ActionResult { ok: boolean; msg?: string }
const FULL: ActionResult = { ok: false, msg: 'Mochila cheia' };

/** Recolhe um fragmento de superfície à mão: 1 lasca = 1 fragmento. Mochila cheia: a lasca fica no lugar. */
export function collectItem(s: TitanSession, id: string): ActionResult {
  const it = s.volume.gen.surfaceItems.find((i) => i.id === id);
  if (!it || s.collected.has(id)) return { ok: false };
  const item = it.item === 5 ? Item.ROCK_SHARD : Item.FROST_SHARD;
  if (!s.inventory.canAdd(item)) return FULL;
  s.inventory.add(item);
  s.collected.add(id);
  s.collectedRev++;
  return { ok: true };
}

/** Botão de quebrar/recolher no alvo: fragmento de superfície → coleta; bloco ou lanterna → volta como item, se couber. */
export function breakOrCollect(s: TitanSession, hit: Hit): ActionResult {
  if (hit.item) return collectItem(s, hit.item);
  const { x, y, z } = hit;
  if (!s.volume.breakable(x, y, z)) return { ok: false };
  const item = itemOfBlock(s.volume.get(x, y, z));
  if (item === null) return { ok: false };
  if (!s.inventory.canAdd(item)) return FULL;
  if (!s.volume.remove(x, y, z)) return { ok: false };
  s.inventory.add(item);
  return { ok: true };
}

/** Coloca o item do espaço `slot` da hotbar na célula adjacente à face apontada. Gasta 1; fragmentos e cápsula não se colocam. */
export function placeFromSlot(s: TitanSession, hit: Hit, slot: number): ActionResult {
  const stack = s.inventory.get(slot);
  if (!stack) return { ok: false };
  const block = blockOfItem(stack.item);
  if (block === null) return { ok: false, msg: 'Este item não se coloca' };
  const x = hit.x + hit.nx, y = hit.y + hit.ny, z = hit.z + hit.nz;
  if (!canPlaceAt(s.volume, s.body, x, y, z, s.items) || !s.volume.place(x, y, z, block)) return { ok: false };
  s.inventory.consume(slot);
  return { ok: true };
}
