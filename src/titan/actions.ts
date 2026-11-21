import { blockOfItem, dropCountOf, foodOf, isPick, Item, ITEM_NAMES, itemOfBlock, maxStack } from './items';
import { hash2 } from '../world/random';
import { NUT_REGROW_S, NUT_YIELD } from './nuts';
import { resolveSlabPlacement } from './slabs';
import { accepts, type FurnaceSlot, type FurnaceState, furnaceKey, newFurnace } from './furnace';
import { blockSpan, isBrazier, isFull, isLadder, isMat, ladderFacing, ladderId, ladderTurn, ladderTurnOf, isCopperVein, isAmberVein, isSolid, isVein, marcoId, marcoTurnFacing, panelIdFacing, T, workbenchId, workbenchTurnFacing, Y_MIN } from './voxel';
import { BODY_HALF, BODY_HEIGHT, canPlaceAt, newBody, type Hit } from './physics';
import type { TitanSession } from './session';
import { eat, revive } from './vitals';
import { wearCost, type WearAction } from './wear';
import { type Species, cropKey, harvestOf, isRipe, parseCropId, plantableSoil, seedOf, soilKind } from './crops';

/**
 * Ações do jogador no mundo (ADR 0040): quebrar, colocar e recolher à mão. Sem DOM. Cada ação valida espaço **antes** de mudar qualquer coisa
 * (tudo ou nada) e muda mundo e inventário juntos, para o save sempre gravar os dois no mesmo instante.
 */
export interface ActionResult { ok: boolean; msg?: string; /** A ferramenta na mão quebrou nesta ação (toca o estilhaço; ADR 0067). */ broken?: boolean }
const FULL: ActionResult = { ok: false, msg: 'Mochila cheia' };
/** Fragmentos de cobre que um veio solta (provisório, ADR 0063). */
export const COPPER_YIELD = 2;
/** Brasas de um Veio de Âmbar (ADR 0073): 1 ou 2, decidido pela célula (o mesmo número sempre). */
export const amberYield = (x: number, y: number, z: number): 1 | 2 => (hash2(0xa3b2, x * 31 + z, y) < 0.5 ? 1 : 2);

/** Recolhe um fragmento de superfície à mão: 1 lasca = 1 fragmento. Mochila cheia: a lasca fica no lugar. */
export function collectItem(s: TitanSession, id: string): ActionResult {
  if (id.startsWith('reed:')) return collectReed(s, id);
  if (id.startsWith('nut:')) return collectNut(s, id);
  if (id.startsWith('crop:')) return collectCrop(s, id);
  const it = s.volume.gen.surfaceItems.find((i) => i.id === id) ?? s.volume.gen.dryReeds.find((i) => i.id === id) ?? s.volume.gen.plates.find((i) => i.id === id); // lasca legada (v1/v2), haste seca (v7) ou placa de carapaça (v8)
  if (!it || s.collected.has(id)) return { ok: false };
  const item: number = it.item; // 5 = fragmento de rocha, 6 = de gelo, 19 = haste seca, 25 = placa de carapaça (os ids de item do catálogo)
  if (!s.inventory.canAdd(item)) return FULL;
  s.inventory.add(item);
  s.collected.add(id);
  s.collectedRev++;
  return { ok: true };
}

/**
 * Colhe uma planta cultivada adulta (ADR 0083): o junco úmido rende 2 mudas e volta à fase "crescendo"; o ressecado rende 2 hastes secas e volta a muda. A planta nunca é arrancada.
 * Tudo ou nada: sem espaço na mochila, nada muda. Planta ainda crescendo: só avisa.
 */
function collectCrop(s: TitanSession, id: string): ActionResult {
  const p = parseCropId(id), crop = p ? s.crops.get(cropKey(p[0], p[1], p[2])) : undefined;
  const kind = crop ? soilKind(s.volume.get(crop.x, crop.y - 1, crop.z)) : null;
  if (!crop || !kind) return { ok: false };
  if (!isRipe(crop.species, kind, crop.age)) return { ok: false, msg: 'Ainda está crescendo' };
  const h = harvestOf(crop.species, kind);
  if (!s.inventory.canAdd(h.item, h.count)) return FULL;
  s.inventory.add(h.item, h.count);
  crop.age = h.backTo;
  s.metaRev++;
  return { ok: true, msg: `${h.count} ${h.label}` };
}

/** A célula de cima do bloco apontado está livre para uma planta (ar, sem item, planta ou pilha solta)? */
function plantSpotFree(s: TitanSession, hit: Hit): boolean {
  const x = hit.x, y = hit.y + 1, z = hit.z;
  const busy = s.items.at(x, y, z) || [...s.drops.values()].some((d) => d.x === x && d.y === y && d.z === z);
  return s.volume.get(x, y, z) === T.AIR && !busy && !s.crops.has(cropKey(x, y, z));
}

/** A Noz na mão se planta aqui? Só no topo da areia ocre com a célula de cima livre; senão o toque come (ADR 0083). */
export const canPlantNut = (s: TitanSession, hit: Hit): boolean => hit.ny === 1 && !hit.item && plantableSoil('noz', s.volume.get(hit.x, hit.y, hit.z)) && plantSpotFree(s, hit);

/** Planta a muda (junco de vidro: úmida dá junco de vidro, ocre dá ressecado) ou a Noz (só na ocre) no topo de uma areia. Gasta 1; a célula de cima precisa estar livre. */
function plantCrop(s: TitanSession, hit: Hit, slot: number, species: Species): ActionResult {
  if (hit.ny !== 1 || !plantableSoil(species, s.volume.get(hit.x, hit.y, hit.z))) return { ok: false, msg: 'A muda se planta no topo da areia' };
  if (!plantSpotFree(s, hit)) return { ok: false };
  const x = hit.x, y = hit.y + 1, z = hit.z;
  s.crops.set(cropKey(x, y, z), { x, y, z, age: 0, species });
  s.inventory.consume(slot);
  s.metaRev++;
  return { ok: true };
}

/** A célula tem piso firme para uma esteira? O bloco de baixo precisa ocupar a célula até o topo (cubo inteiro, laje superior ou dupla). */
export const matSupported = (s: TitanSession, x: number, y: number, z: number): boolean => isSolid(s.volume.get(x, y - 1, z)) && blockSpan(s.volume.get(x, y - 1, z))[1] >= 1;

/** O bloco de apoio de uma escada foi quebrado: cada escada presa à face dele (a frente aponta para fora da célula) cai como item solto. */
function releaseLadders(s: TitanSession, x: number, y: number, z: number): void {
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const id = s.volume.get(x + dx, y, z + dz), [fx, fz] = isLadder(id) ? ladderFacing(ladderTurn(id)) : [0, 0];
    if (isLadder(id) && fx === dx && fz === dz && s.volume.remove(x + dx, y, z + dz)) spillBlock(s, Item.ESCADA, 1, x + dx, y, z + dz);
  }
}

/** O piso de uma esteira foi quebrado: a esteira sai do lugar e cai como item solto. */
function releaseMat(s: TitanSession, x: number, y: number, z: number): void {
  if (!isMat(s.volume.get(x, y, z)) || !s.volume.remove(x, y, z)) return;
  spillBlock(s, Item.ESTEIRA, 1, x, y, z);
}

/** O apoio de uma planta cultivada foi quebrado: ela some e devolve a muda como item solto. */
function releaseCrop(s: TitanSession, x: number, y: number, z: number): void {
  const crop = s.crops.get(cropKey(x, y, z));
  if (!crop) return;
  s.crops.delete(cropKey(x, y, z));
  s.metaRev++;
  dropShard(s, seedOf(crop.species), x, y, z);
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

/**
 * Braseiro como bloco com estado (ADR 0068): o estado (`session.furnaces`) nasce na primeira vez que se abre ou se mexe no braseiro. Mover entre mochila e espaços é **tudo ou nada**
 * e atualiza as duas pontas juntas.
 */
export function furnaceAt(s: TitanSession, x: number, y: number, z: number): FurnaceState | null {
  const id = s.volume.get(x, y, z);
  if (id !== T.BRAZIER && id !== T.BRAZIER_LIT) return null;
  const k = furnaceKey(x, y, z);
  let f = s.furnaces.get(k);
  if (!f) { f = newFurnace(); s.furnaces.set(k, f); s.metaRev++; }
  return f;
}

/** Leva a pilha do espaço da mochila para a entrada ou o combustível: só item que serve; espaço vazio recebe tudo, o mesmo item soma até o limite, outro item não troca. */
export function furnaceMoveIn(s: TitanSession, x: number, y: number, z: number, slot: 'input' | 'fuel', invSlot: number): ActionResult {
  const f = furnaceAt(s, x, y, z), st = s.inventory.get(invSlot);
  if (!f || !st) return { ok: false };
  if (!accepts(slot, st.item)) return { ok: false, msg: slot === 'fuel' ? 'Isso não queima' : 'O braseiro não cozinha isso' };
  const cur = f[slot];
  if (cur && cur.item !== st.item) return { ok: false, msg: 'O espaço já tem outro item' };
  const room = maxStack(st.item) - (cur?.count ?? 0), n = Math.min(room, st.count);
  if (n <= 0) return { ok: false, msg: 'O espaço está cheio' };
  f[slot] = { item: st.item, count: (cur?.count ?? 0) + n };
  for (let i = 0; i < n; i++) s.inventory.consume(invSlot);
  s.metaRev++;
  return { ok: true };
}

/** Tira a pilha de um espaço do braseiro para a mochila (tudo ou nada: sem espaço para ela, nada muda). */
export function furnaceTakeOut(s: TitanSession, x: number, y: number, z: number, slot: FurnaceSlot): ActionResult {
  const f = furnaceAt(s, x, y, z), st = f?.[slot];
  if (!f || !st) return { ok: false };
  if (!s.inventory.canAdd(st.item, st.count)) return FULL;
  s.inventory.add(st.item, st.count);
  f[slot] = null;
  s.metaRev++;
  return { ok: true };
}

/** Quebrar o braseiro **cospe o conteúdo** no chão (entrada, combustível e saída) e apaga o estado. */
function spillFurnace(s: TitanSession, x: number, y: number, z: number): void {
  const k = furnaceKey(x, y, z), f = s.furnaces.get(k);
  if (!f) return;
  const ry = restY(s, x, y, z);
  (['input', 'fuel', 'output'] as const).forEach((slot, n) => {
    const st = f[slot];
    if (!st) return;
    const id = `f:${x},${y},${z}:${n}`;
    s.drops.set(id, { id, item: st.item, ...(st.count > 1 ? { count: st.count } : {}), x, y: ry, z });
    s.dropsRev++;
  });
  s.furnaces.delete(k); s.metaRev++;
}

/** Botão de quebrar/recolher no alvo: fragmento de superfície → coleta; bloco ou lanterna → volta como item, se couber. */
/**
 * Desgasta a ferramenta do espaço escolhido pela ação feita (ADR 0067). Sem ferramenta na mão ou ação sem custo: nada. Quebrou → o espaço fica vazio e o resultado diz isso.
 * O combate chama com `{ type: 'attack' }`.
 */
export function wearHeldTool(s: TitanSession, action: WearAction): { broken: boolean; name?: string } {
  const held = s.inventory.get(s.selected);
  if (!held) return { broken: false };
  const cost = wearCost(held.item, action);
  const r = cost > 0 ? s.inventory.damage(s.selected, cost) : null;
  return r?.broken ? { broken: true, name: ITEM_NAMES[held.item] } : { broken: false };
}

/** Botão de quebrar/recolher no alvo: quebrar bloco **desgasta** a ferramenta na mão (picareta −1, adaga −2; recolhimento instantâneo não gasta). */
export function breakOrCollect(s: TitanSession, hit: Hit): ActionResult {
  if (hit.item) return collectItem(s, hit.item);
  const block = s.volume.get(hit.x, hit.y, hit.z);
  const r = breakOrCollectBlock(s, hit);
  if (!r.ok) return r;
  const w = wearHeldTool(s, { type: 'break_block', block });
  return w.broken ? { ...r, broken: true, msg: `${w.name} quebrou` } : r;
}

function breakOrCollectBlock(s: TitanSession, hit: Hit): ActionResult {
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
  if (isAmberVein(s.volume.get(x, y, z))) { // veio de âmbar (ADR 0073): só com picareta; solta 1–2 brasas (pelo hash da célula, sempre o mesmo número)
    if (!isPick(s.inventory.get(s.selected)?.item)) return { ok: false, msg: 'Só pó nos dedos. Falta uma picareta.' };
    const reed0 = s.items.at(x, y + 1, z);
    if (!s.volume.remove(x, y, z)) return { ok: false };
    dropShard(s, Item.EMBER, x, y, z, amberYield(x, y, z));
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
  const block = s.volume.get(x, y, z);
  const direct = item === Item.LANTERN; // a lanterna é o item-chave: vai direto para a mochila e, se não couber, fica no lugar (nunca cai em precipício ou água)
  if (direct && !s.inventory.canAdd(item, count)) return FULL;
  if (!s.volume.remove(x, y, z)) return { ok: false };
  if (direct) s.inventory.add(item, count);
  else spillBlock(s, item, count, x, y, z); // ADR 0082: o bloco comum cai no chão e é recolhido por proximidade
  if (isBrazier(block)) spillFurnace(s, x, y, z); // o conteúdo do braseiro cai no chão
  // veio natural: além do bloco inteiro, solta uma lasca garantida onde estava. O veio some do mapa (a edição grava ar); recolocar rocha/gelo põe o bloco comum,
  // que não solta nada — a fonte não se recria. O id da lasca vem da célula do veio, então não há como soltar duas vezes.
  if (isVein(block)) dropShard(s, block === T.VEIN_ROCK ? 5 : 6, x, y, z);
  releaseReed(s, reed, x, y + 1, z);
  releaseCrop(s, x, y + 1, z);
  releaseMat(s, x, y + 1, z);
  releaseLadders(s, x, y, z);
  return { ok: true };
}

/** O bloco de baixo foi quebrado: o junco que estava em cima vira um item solto (a planta é recolhida, como se tivesse sido colhida). */
function releaseReed(s: TitanSession, id: string | null, x: number, y: number, z: number): void {
  if (!id || !id.startsWith('reed:') || s.collected.has(id)) return;
  s.collected.add(id);
  s.collectedRev++;
  dropShard(s, Item.GLASS_REED, x, y, z);
}

/** Pousa uma pilha solta com id próprio na célula de `(x, y, z)` (desce até o apoio): espólio de animal abatido (ADR 0069). */
export function restDrop(s: TitanSession, id: string, item: number, x: number, y: number, z: number, count: number): void {
  if (count < 1 || s.drops.has(id)) return;
  const cx = Math.floor(x), cy = Math.floor(y), cz = Math.floor(z);
  s.drops.set(id, { id, item, ...(count > 1 ? { count } : {}), x: cx, y: restY(s, cx, cy, cz), z: cz });
  s.dropsRev++;
}

/** Pousa uma lasca perto do ponto de quebra: na célula do veio, descendo até o primeiro apoio sólido. */
function dropShard(s: TitanSession, item: number, x: number, y: number, z: number, count = 1): void {
  const id = `v:${x},${y},${z}`;
  if (s.drops.has(id)) return;
  s.drops.set(id, { id, item, ...(count > 1 ? { count } : {}), x, y: restY(s, x, y, z), z });
  s.dropsRev++;
}

/** Atraso de coleta de um item recém-solto (ADR 0082) e tempo de vida de um drop de bloco, em segundos de jogo ativo. */
export const PICKUP_DELAY_S = 0.45;
export const DROP_LIFE_S = 300;

/** O bloco quebrado cai como item solto no centro da célula (ADR 0082): id `b:x,y,z:n` único, atraso de coleta e relógio de vida só de execução (`session.dropFx`). */
function spillBlock(s: TitanSession, item: number, count: number, x: number, y: number, z: number): void {
  let n = 0;
  while (s.drops.has(`b:${x},${y},${z}:${n}`)) n++;
  const id = `b:${x},${y},${z}:${n}`;
  s.drops.set(id, { id, item, ...(count > 1 ? { count } : {}), x, y: restY(s, x, y, z), z });
  s.dropFx.set(id, { delay: PICKUP_DELAY_S, age: 0 });
  s.dropsRev++;
}

/** Altura em que uma lasca solta repousa: desce enquanto não há sólido embaixo (nunca abaixo da rocha-mãe). */
function restY(s: TitanSession, x: number, y: number, z: number): number {
  let yy = y;
  while (yy > Y_MIN + 1 && !isSolid(s.volume.get(x, yy - 1, z))) yy--;
  return yy;
}

const PICKUP_RADIUS = 1.45;
/**
 * Coleta por proximidade (ADR 0044): toda lasca solta dentro de 1,25 m (horizontal) dos pés e a uma altura alcançável entra na mochila, uma a uma; se não couber,
 * fica no lugar e `full` avisa. Lascas sem apoio (o bloco de baixo foi quebrado) descem antes. Tudo muda inventário e lasca juntos (um único `dropsRev`).
 */
export function collectNearby(s: TitanSession, px: number, py: number, pz: number, dt = 0): { collected: number; full: boolean; moved: boolean } {
  let collected = 0, full = false, moved = false;
  for (const d of [...s.drops.values()]) {
    let fx = s.dropFx.get(d.id);
    if (!fx && d.id.startsWith('b:')) { fx = { delay: 0, age: 0 }; s.dropFx.set(d.id, fx); } // drop de bloco vindo do save: sem atraso, vida de 5 min a contar daqui
    if (fx) { // só drops recém-soltos têm relógio: atraso de coleta e, nos de bloco (`b:`), sumiço depois de 5 min
      fx.delay = Math.max(0, fx.delay - dt); fx.age += dt;
      if (d.id.startsWith('b:') && fx.age >= DROP_LIFE_S) { s.drops.delete(d.id); s.dropFx.delete(d.id); s.dropsRev++; moved = true; continue; }
      if (fx.delay > 0) continue;
    }
    const ry = restY(s, d.x, d.y, d.z);
    if (ry !== d.y) { s.drops.set(d.id, { ...d, y: ry }); s.dropsRev++; moved = true; }
    const dd = s.drops.get(d.id)!;
    if (Math.hypot(dd.x + 0.5 - px, dd.z + 0.5 - pz) > PICKUP_RADIUS || py > dd.y + 1.5 || py + 1.8 < dd.y) continue;
    const item = dd.item, count = dd.count ?? 1; // o id do item é o próprio campo (5 = fragmento de rocha, 6 = de gelo, 11 = brasa; pilha de morte: qualquer item e `count`)
    if (!s.inventory.canAdd(item, count)) { full = true; continue; }
    s.inventory.add(item, count, dd.wear ?? 0);
    s.drops.delete(dd.id);
    s.dropFx.delete(dd.id);
    s.dropsRev++;
    collected++;
  }
  return { collected, full, moved };
}

/** Coloca o item do espaço `slot` da hotbar na célula adjacente à face apontada. Gasta 1; fragmentos e cápsula não se colocam. */
export function placeFromSlot(s: TitanSession, hit: Hit, slot: number): ActionResult {
  const stack = s.inventory.get(slot);
  if (!stack) return { ok: false };
  if (stack.item === Item.NOZ && canPlantNut(s, hit)) return plantCrop(s, hit, slot, 'noz'); // a noz se planta no topo da areia ocre (ADR 0083)
  if (foodOf(stack.item)) return eatFromSlot(s, slot); // comida na mão: o toque come (não se coloca)
  if (stack.item === Item.GLASS_REED) return plantCrop(s, hit, slot, 'junco'); // a muda se planta (ADR 0083)
  let block = blockOfItem(stack.item);
  if (block === null) return { ok: false, msg: 'Este item não se coloca' };
  if (block === T.LADDER) { // escada (ADR 0088): prende-se à lateral de um cubo inteiro e a frente aponta para fora dele
    if (hit.ny !== 0 || hit.item) return { ok: false, msg: 'A escada se prende à lateral de um bloco' };
    if (!isFull(s.volume.get(hit.x, hit.y, hit.z))) return { ok: false, msg: 'A escada precisa de um bloco inteiro atrás' };
    block = ladderId(ladderTurnOf(hit.nx, hit.nz));
  } else if (block === T.WORKBENCH) block = workbenchId(workbenchTurnFacing(s.yaw)); // a frente da mesa fica voltada para o jogador (ADR 0052)
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
  if (block === T.MAT && !matSupported(s, x, y, z)) return { ok: false, msg: 'A esteira precisa de piso firme' }; // ADR 0085: face superior sólida embaixo
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
    s.drops.set(id, { id, item: st.item, ...(st.count > 1 ? { count: st.count } : {}), ...(st.wear ? { wear: st.wear } : {}), x, y: ry, z }); // a ferramenta desgastada leva o desgaste
  });
  if (stacks.length) s.dropsRev++;
  s.selected = Math.min(s.selected, 8);
  const a = s.volume.gen.arrival;
  s.body = newBody(a.x, a.y, a.z);
  s.yaw = a.yaw; s.pitch = -0.12;
  revive(s.vitals);
  return stacks.length;
}

