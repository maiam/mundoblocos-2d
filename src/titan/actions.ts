import { blockOfItem, dropCountOf, foodOf, isPick, Item, itemOfBlock } from './items';
import { NUT_REGROW_S, NUT_YIELD } from './nuts';
import { resolveSlabPlacement } from './slabs';
import { BRAZIER_CHARGES, brazierKey } from './braziers';
import { blockSpan, isBrazier, isCopperVein, isSolid, isVein, marcoId, marcoTurnFacing, panelIdFacing, T, workbenchId, workbenchTurnFacing, Y_MIN } from './voxel';
import { BODY_HALF, BODY_HEIGHT, canPlaceAt, newBody, type Hit } from './physics';
import type { TitanSession } from './session';
import { eat, revive } from './vitals';

/**
 * Ações do jogador no mundo (ADR 0040): quebrar, colocar e recolher à mão. Sem DOM. Cada ação valida espaço **antes** de mudar qualquer coisa
 * (tudo ou nada) e muda mundo e inventário juntos, para o save sempre gravar os dois no mesmo instante.
 */
export interface ActionResult { ok: boolean; msg?: string }
const FULL: ActionResult = { ok: false, msg: 'Mochila cheia' };
/** Fragmentos de cobre que um veio solta (provisório, ADR 0063). */
export const COPPER_YIELD = 2;

/** Recolhe um fragmento de superfície à mão: 1 lasca = 1 fragmento. Mochila cheia: a lasca fica no lugar. */
export function collectItem(s: TitanSession, id: string): ActionResult {
  if (id.startsWith('reed:')) return collectReed(s, id);
  if (id.startsWith('nut:')) return collectNut(s, id);
  const it = s.volume.gen.surfaceItems.find((i) => i.id === id) ?? s.volume.gen.dryReeds.find((i) => i.id === id) ?? s.volume.gen.plates.find((i) => i.id === id); // lasca legada (v1/v2), haste seca (v7) ou placa de carapaça (v8)
  if (!it || s.collected.has(id)) return { ok: false };
  const item: number = it.item; // 5 = fragmento de rocha, 6 = de gelo, 19 = haste seca, 25 = placa de carapaça (os ids de item do catálogo)
  if (!s.inventory.canAdd(item)) return FULL;
  s.inventory.add(item);
  s.collected.add(id);
  s.collectedRev++;
  return { ok: true };
}

/** Junco de vidro à mão (ADR 0045): 1 junco = 1 item; mochila cheia deixa a planta no lugar. A planta recolhida não volta (o id fica em `collected`, que já vai no save). */
function collectReed(s: TitanSession, id: string): ActionResult {
  const m = /^reed:(-?\d+),(-?\d+),(-?\d+)$/.exec(id);
  if (!m || s.items.at(Number(m[1]), Number(m[2]), Number(m[3])) !== id) return { ok: false };
  if (!s.inventory.canAdd(Item.GLASS_REED)) return FULL;
  s.inventory.add(Item.GLASS_REED);
  s.collected.add(id);
  s.collectedRev++;
  return { ok: true };
}

/**
 * Colhe uma planta de Noz de Duna (ADR 0060): rende `NUT_YIELD` nozes de uma vez e a planta passa a rebrotar (`regrow`, `NUT_REGROW_S` s de jogo ativo). Só colhe se as 4 couberem na mochila
 * (tudo ou nada); a planta colhida continua no mundo, sem frutos.
 */
function collectNut(s: TitanSession, id: string): ActionResult {
  if (s.regrow.has(id) || !/^nut:(-?\d+),(-?\d+),(-?\d+)$/.test(id)) return { ok: false };
  const m = /^nut:(-?\d+),(-?\d+),(-?\d+)$/.exec(id)!;
  if (s.items.at(Number(m[1]), Number(m[2]), Number(m[3])) !== id) return { ok: false };
  if (!s.inventory.canAdd(Item.NOZ, NUT_YIELD)) return FULL;
  s.inventory.add(Item.NOZ, NUT_YIELD);
  s.regrow.set(id, NUT_REGROW_S);
  s.collectedRev++;
  return { ok: true, msg: `${NUT_YIELD} nozes colhidas` };
}

/** Come uma unidade do item do espaço (ADR 0060): precisa ser comida e a fome não pode estar cheia. Muda fome e inventário juntos. */
export function eatFromSlot(s: TitanSession, slot: number): ActionResult {
  const stack = s.inventory.get(slot);
  const food = stack ? foodOf(stack.item) : null;
  if (!stack || !food) return { ok: false };
  if (!eat(s.vitals, food)) return { ok: false, msg: 'Sem fome agora' };
  s.inventory.consume(slot);
  return { ok: true };
}

/** Acende o braseiro apontado com a brasa do espaço (ADR 0065): `BRAZIER_CHARGES` preparações; braseiro aceso ou outro bloco não gasta a brasa. */
export function igniteBrazier(s: TitanSession, hit: Hit, slot: number): ActionResult {
  const id = s.volume.get(hit.x, hit.y, hit.z);
  if (id === T.BRAZIER_LIT) return { ok: false, msg: 'O braseiro já está aceso' };
  if (id !== T.BRAZIER) return { ok: false, msg: 'A brasa acende um Braseiro de Rocha' };
  if (!s.volume.set(hit.x, hit.y, hit.z, T.BRAZIER_LIT)) return { ok: false };
  s.inventory.consume(slot);
  s.braziers.set(brazierKey(hit.x, hit.y, hit.z), BRAZIER_CHARGES);
  s.metaRev++;
  return { ok: true, msg: `Braseiro aceso: ${BRAZIER_CHARGES} preparações` };
}

/** Gasta uma preparação do braseiro em `at`; ao zerar ele apaga. Devolve se apagou (carga sem registro = cheia: save que perdeu o campo). */
export function useBrazierCharge(s: TitanSession, x: number, y: number, z: number): { burnedOut: boolean } {
  const k = brazierKey(x, y, z), left = (s.braziers.get(k) ?? BRAZIER_CHARGES) - 1;
  s.metaRev++;
  if (left > 0) { s.braziers.set(k, left); return { burnedOut: false }; }
  s.braziers.delete(k);
  s.volume.set(x, y, z, T.BRAZIER);
  return { burnedOut: true };
}

/** Botão de quebrar/recolher no alvo: fragmento de superfície → coleta; bloco ou lanterna → volta como item, se couber. */
export function breakOrCollect(s: TitanSession, hit: Hit): ActionResult {
  if (hit.item) return collectItem(s, hit.item);
  const { x, y, z } = hit;
  if (!s.volume.breakable(x, y, z)) return { ok: false };
  if (isCopperVein(s.volume.get(x, y, z))) { // veio de cobre (ADR 0063): só com picareta na mão; solta fragmentos no chão, nunca o bloco
    if (!isPick(s.inventory.get(s.selected)?.item)) return { ok: false, msg: 'Só pó nos dedos. Falta uma picareta.' };
    const reed0 = s.items.at(x, y + 1, z);
    if (!s.volume.remove(x, y, z)) return { ok: false };
    dropShard(s, Item.COPPER_SHARD, x, y, z, COPPER_YIELD);
    releaseReed(s, reed0, x, y + 1, z);
    return { ok: true };
  }
  const reed = s.items.at(x, y + 1, z); // junco que se apoia neste bloco: sem o apoio ele cai como item
  if (s.volume.get(x, y, z) === T.EMBER) {
    // depósito de brasa: rende só a brasa, solta no chão (como a lasca do veio); o minério some e não se recria
    if (!s.volume.remove(x, y, z)) return { ok: false };
    dropShard(s, Item.EMBER, x, y, z);
    releaseReed(s, reed, x, y + 1, z);
    return { ok: true };
  }
  const item = itemOfBlock(s.volume.get(x, y, z));
  if (item === null) return { ok: false };
  const count = dropCountOf(s.volume.get(x, y, z)); // a laje dupla devolve 2 lajes
  if (!s.inventory.canAdd(item, count)) return FULL;
  const block = s.volume.get(x, y, z);
  if (!s.volume.remove(x, y, z)) return { ok: false };
  s.inventory.add(item, count);
  if (isBrazier(block) && s.braziers.delete(brazierKey(x, y, z))) s.metaRev++; // o braseiro aceso levado perde a carga
  // veio natural: além do bloco inteiro, solta uma lasca garantida onde estava. O veio some do mapa (a edição grava ar); recolocar rocha/gelo põe o bloco comum,
  // que não solta nada — a fonte não se recria. O id da lasca vem da célula do veio, então não há como soltar duas vezes.
  if (isVein(block)) dropShard(s, block === T.VEIN_ROCK ? 5 : 6, x, y, z);
  releaseReed(s, reed, x, y + 1, z);
  return { ok: true };
}

/** O bloco de baixo foi quebrado: o junco que estava em cima vira um item solto (a planta é recolhida, como se tivesse sido colhida). */
function releaseReed(s: TitanSession, id: string | null, x: number, y: number, z: number): void {
  if (!id || !id.startsWith('reed:') || s.collected.has(id)) return;
  s.collected.add(id);
  s.collectedRev++;
  dropShard(s, Item.GLASS_REED, x, y, z);
}

/** Pousa uma lasca perto do ponto de quebra: na célula do veio, descendo até o primeiro apoio sólido. */
function dropShard(s: TitanSession, item: number, x: number, y: number, z: number, count = 1): void {
  const id = `v:${x},${y},${z}`;
  if (s.drops.has(id)) return;
  s.drops.set(id, { id, item, ...(count > 1 ? { count } : {}), x, y: restY(s, x, y, z), z });
  s.dropsRev++;
}

/** Altura em que uma lasca solta repousa: desce enquanto não há sólido embaixo (nunca abaixo da rocha-mãe). */
function restY(s: TitanSession, x: number, y: number, z: number): number {
  let yy = y;
  while (yy > Y_MIN + 1 && !isSolid(s.volume.get(x, yy - 1, z))) yy--;
  return yy;
}

const PICKUP_RADIUS = 1.25;
/**
 * Coleta por proximidade (ADR 0044): toda lasca solta dentro de 1,25 m (horizontal) dos pés e a uma altura alcançável entra na mochila, uma a uma; se não couber,
 * fica no lugar e `full` avisa. Lascas sem apoio (o bloco de baixo foi quebrado) descem antes. Tudo muda inventário e lasca juntos (um único `dropsRev`).
 */
export function collectNearby(s: TitanSession, px: number, py: number, pz: number): { collected: number; full: boolean; moved: boolean } {
  let collected = 0, full = false, moved = false;
  for (const d of [...s.drops.values()]) {
    const ry = restY(s, d.x, d.y, d.z);
    if (ry !== d.y) { s.drops.set(d.id, { ...d, y: ry }); s.dropsRev++; moved = true; }
    const dd = s.drops.get(d.id)!;
    if (Math.hypot(dd.x + 0.5 - px, dd.z + 0.5 - pz) > PICKUP_RADIUS || py > dd.y + 1.5 || py + 1.8 < dd.y) continue;
    const item = dd.item, count = dd.count ?? 1; // o id do item é o próprio campo (5 = fragmento de rocha, 6 = de gelo, 11 = brasa; pilha de morte: qualquer item e `count`)
    if (!s.inventory.canAdd(item, count)) { full = true; continue; }
    s.inventory.add(item, count);
    s.drops.delete(dd.id);
    s.dropsRev++;
    collected++;
  }
  return { collected, full, moved };
}

/** Coloca o item do espaço `slot` da hotbar na célula adjacente à face apontada. Gasta 1; fragmentos e cápsula não se colocam. */
export function placeFromSlot(s: TitanSession, hit: Hit, slot: number): ActionResult {
  const stack = s.inventory.get(slot);
  if (!stack) return { ok: false };
  if (stack.item === Item.EMBER) return igniteBrazier(s, hit, slot); // a Brasa de Âmbar acende o braseiro apontado
  if (foodOf(stack.item)) return eatFromSlot(s, slot); // comida na mão: o toque come (não se coloca)
  let block = blockOfItem(stack.item);
  if (block === null) return { ok: false, msg: 'Este item não se coloca' };
  if (block === T.WORKBENCH) block = workbenchId(workbenchTurnFacing(s.yaw)); // a frente da mesa fica voltada para o jogador (ADR 0052)
  else if (block === T.MARCO) block = marcoId(marcoTurnFacing(s.yaw)); // idem o Marco de Margem (ADR 0058)
  else if (block === T.PAINEL) block = panelIdFacing(s.yaw); // o painel corre de través ao olhar
  if (block === T.SLAB) { // laje (ADR 0056): inferior, superior ou fusão em laje dupla conforme a face e a altura clicadas
    const r = resolveSlabPlacement(s.volume.get(hit.x, hit.y, hit.z), hit.ny, hit.hy);
    if (r.merge) {
      // funde na célula apontada: a metade que falta não pode invadir o corpo do jogador
      const target = s.volume.get(hit.x, hit.y, hit.z);
      const added: readonly [number, number] = target === T.SLAB ? [0.5, 1] : [0, 0.5];
      const b = s.body;
      const overlap = hit.x + 1 > b.x - BODY_HALF && hit.x < b.x + BODY_HALF && hit.z + 1 > b.z - BODY_HALF && hit.z < b.z + BODY_HALF && hit.y + added[1] > b.y + 1e-4 && hit.y + added[0] < b.y + BODY_HEIGHT;
      if (overlap || !s.volume.editable(hit.x, hit.y, hit.z) || !s.volume.set(hit.x, hit.y, hit.z, r.block)) return { ok: false };
      s.inventory.consume(slot);
      return { ok: true };
    }
    block = r.block;
  }
  const x = hit.x + hit.nx, y = hit.y + hit.ny, z = hit.z + hit.nz;
  const occupied = { at: (cx: number, cy: number, cz: number): string | null => s.items.at(cx, cy, cz) ?? [...s.drops.values()].find((d) => d.x === cx && d.y === cy && d.z === cz)?.id ?? null };
  if (!canPlaceAt(s.volume, s.body, x, y, z, occupied, blockSpan(block)) || !s.volume.place(x, y, z, block)) return { ok: false };
  s.inventory.consume(slot);
  return { ok: true };
}

/**
 * Morte (ADR 0059): todos os itens (hotbar, mochila e grades) caem numa pilha por espaço **onde o jogador morreu** (descem até o primeiro apoio; no lago ficam no fundo) e o jogador renasce
 * na chegada com vida, fome e ar cheios. As pilhas se recolhem por proximidade como as lascas e vão no save (`header.drops`). Devolve quantas pilhas caíram.
 */
export function dieAndRespawn(s: TitanSession): number {
  const x = Math.floor(s.body.x), y = Math.max(Y_MIN + 2, Math.floor(s.body.y)), z = Math.floor(s.body.z);
  const stacks = s.inventory.takeAll();
  const ry = restY(s, x, y, z);
  stacks.forEach((st, n) => {
    const id = `d:${x},${ry},${z}:${n}`;
    s.drops.set(id, { id, item: st.item, ...(st.count > 1 ? { count: st.count } : {}), x, y: ry, z });
  });
  if (stacks.length) s.dropsRev++;
  s.selected = Math.min(s.selected, 8);
  const a = s.volume.gen.arrival;
  s.body = newBody(a.x, a.y, a.z);
  s.yaw = a.yaw; s.pitch = -0.12;
  revive(s.vitals);
  return stacks.length;
}

