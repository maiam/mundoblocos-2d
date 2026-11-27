import { hoeResult, shovelResult } from './soil';
import { blockOfItem, dropCountOf, foodOf, isBucket, isHoe, isPick, isShovel, Item, ITEM_NAMES, itemOfBlock, maxStack } from './items';
import type { Drop } from './save';
import { newBobber, rollFish } from './fishing';
import { hash2 } from '../world/random';
import { NUT_REGROW_S, NUT_YIELD } from './nuts';
import { resolveSlabPlacement } from './slabs';
import { accepts, type FurnaceSlot, type FurnaceState, furnaceKey, newFurnace, rulesOf } from './furnace';
import { canSleep, tickFrac, WAKE_TICKS } from './sky';
import { clearWeather, hasWeather } from './weather';
import { carpentryId, carpentryTurnFacing, furnaceId, isFurnace, isLeaves, isWallTorch, wallTorchId, wallTorchTurn, blockBoxes, doorId, doorRight, doorToggled, doorTurn, isDoor, isDoorHingeRight, isDoorOpen, isDoorUpper, BED_HEIGHT, bedFootId, bedHeadId, bedPartnerOffset, bedTurn, bedTurnFacing, blockSpan, chestId, chestTurnFacing, isBed, isBedFoot, isBrazier, isChest, isFull, isLadder, isMat, isSlabBottom, stairId, chairId, ladderFacing, ladderId, ladderTurn, ladderTurnOf, isCopperVein, isAmberVein, isSolid, isVein, LAKE_LAST_Y, marcoId, marcoTurnFacing, panelIdFacing, T, workbenchId, workbenchTurnFacing, Y_MIN } from './voxel';
import { BODY_HALF, BODY_HEIGHT, canPlaceAt, newBody, type Hit } from './physics';
import type { TitanSession } from './session';
import { eat, revive } from './vitals';
import { wearCost, type WearAction } from './wear';
import { SLOTS } from './inventory';
import { applyDisplace, planDisplace, settleDrops, stepDrops } from './drops';
import { CHEST_SLOTS, type ChestState, chestPut, chestRoom, newChest } from './chest';
import { isStem, STEM_MAX_AGE, type Species, cropKey, gardenSpeciesOf, harvestOf, isRipe, parseCropId, plantableSoil, seedOf, soilKindFor, wildSeedAt } from './crops';

/**
 * Ações do jogador no mundo (ADR 0040): quebrar, colocar e recolher à mão. Sem DOM. Cada ação valida espaço **antes** de mudar qualquer coisa
 * (tudo ou nada) e muda mundo e inventário juntos, para o save sempre gravar os dois no mesmo instante.
 */
export interface ActionResult { ok: boolean; msg?: string; /** A ferramenta na mão quebrou nesta ação (toca o estilhaço; ADR 0067). */ broken?: boolean; /** Porta: ficou aberta (true) ou fechada (false) depois do uso (ADR 0102). */ open?: boolean }
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
  const kind = crop ? soilKindFor(crop.species, s.volume.get(crop.x, crop.y - 1, crop.z)) : null;
  if (!crop || !kind) return { ok: false };
  if (isStem(crop.species)) return { ok: false, msg: crop.dir === undefined ? (crop.age >= STEM_MAX_AGE ? 'O caule está maduro: o fruto vem logo' : 'Ainda está crescendo') : 'O fruto está ao lado: quebre-o' }; // o caule não se colhe (ADR 0128)
  if (!isRipe(crop.species, kind, crop.age)) return { ok: false, msg: 'Ainda está crescendo' };
  const h = harvestOf(crop.species, kind);
  const cell = (Math.imul(crop.x, 73856093) ^ Math.imul(crop.z, 83492791)) | 0, salt = crop.y + s.days * 1009 + Math.floor(s.time * 1000);
  const count = h.countMax ? h.count + Math.floor(hash2(s.seed, cell, salt + 77) * (h.countMax - h.count + 1)) : h.count; // cenoura e batata: 2–5 (Wiki, ADR 0129)
  if (!s.inventory.canAdd(h.item, count)) return FULL;
  s.inventory.add(h.item, count);
  crop.age = h.backTo;
  s.metaRev++;
  let extra = '';
  if (h.extra) { // além do produto, sementes sorteadas (beterraba: 1–4, Wiki); sem lugar na mochila, caem no chão
    const n = h.extra.min + Math.floor(hash2(s.seed, cell, salt) * (h.extra.max - h.extra.min + 1));
    if (s.inventory.canAdd(h.extra.item, n)) s.inventory.add(h.extra.item, n); else restDrop(s, `seed:${crop.x},${crop.y},${crop.z}:s${s.days}:${Math.floor(s.time * 1000)}`, h.extra.item, crop.x, crop.y, crop.z, n);
    extra = ` e ${n} ${n > 1 ? 'sementes' : 'semente'}`;
  }
  return { ok: true, msg: `${count} ${h.label}${extra}` };
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
  if (hit.ny !== 1 || !plantableSoil(species, s.volume.get(hit.x, hit.y, hit.z))) return { ok: false, msg: gardenSpeciesOf(seedOf(species)) ? 'Isto se planta no topo da terra arada' : 'A muda se planta no topo da areia' };
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

/** A tocha em pé precisa do topo de um cubo (ou de uma laje superior) embaixo; a de parede, da lateral de um cubo inteiro. Folhas não servem (Wiki, ADR 0121). */
export const torchTopSupport = (id: number): boolean => isSolid(id) && !isLeaves(id) && blockSpan(id)[1] >= 1;
export const torchSideSupport = (id: number): boolean => isFull(id) && !isLeaves(id);

/** O bloco de um apoio foi quebrado: a tocha em pé logo acima e as de parede presas a ele caem como item solto (Wiki: a tocha solta-se quando o apoio some). */
function releaseTorches(s: TitanSession, x: number, y: number, z: number): void {
  const drop = (tx: number, ty: number, tz: number): void => { if (s.volume.remove(tx, ty, tz)) spillBlock(s, Item.TOCHA, 1, tx, ty, tz); };
  if (s.volume.get(x, y + 1, z) === T.TORCH) drop(x, y + 1, z);
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const id = s.volume.get(x + dx, y, z + dz);
    if (isWallTorch(id)) { const [fx, fz] = ladderFacing(wallTorchTurn(id)); if (fx === dx && fz === dz) drop(x + dx, y, z + dz); } // a chama aponta para longe do apoio
  }
}

/** O piso de uma esteira foi quebrado: a esteira sai do lugar e cai como item solto. */
function releaseMat(s: TitanSession, x: number, y: number, z: number): void {
  if (!isMat(s.volume.get(x, y, z)) || !s.volume.remove(x, y, z)) return;
  spillBlock(s, Item.ESTEIRA, 1, x, y, z);
}

/** Coloca a cama de Junco (ADR 0090): o pé na célula apontada e a cabeceira uma adiante, no sentido do olhar; as duas precisam estar livres e sobre piso firme. */
function placeBed(s: TitanSession, hit: Hit, slot: number): ActionResult {
  const x = hit.x + hit.nx, y = hit.y + hit.ny, z = hit.z + hit.nz, turn = bedTurnFacing(s.yaw), [fx, fz] = ladderFacing(turn), hx = x + fx, hz = z + fz;
  const occupied = s.items; // só as lascas legadas barram; o item solto é deslocado (ADR 0098)
  for (const [cx, cz] of [[x, z], [hx, hz]]) {
    if (!matSupported(s, cx, y, cz)) return { ok: false, msg: 'A cama precisa de piso firme nas duas células' };
    if (!canPlaceAt(s.volume, s.body, cx, y, cz, occupied, [0, BED_HEIGHT])) return { ok: false };
  }
  const plan = planDisplace(s, [[x, y, z], [hx, y, hz]]); // item solto nas células da cama vai para o lado (ADR 0098)
  if (!plan) return { ok: false, msg: 'Há um item no local e não há espaço ao lado para ele' };
  if (!s.volume.place(x, y, z, bedFootId(turn))) return { ok: false };
  if (!s.volume.place(hx, y, hz, bedHeadId(turn))) { s.volume.remove(x, y, z); return { ok: false }; }
  applyDisplace(s, plan);
  s.inventory.consume(slot);
  return { ok: true };
}

/** Quebrar qualquer metade tira a cama inteira e devolve uma cama como item solto. */
function breakBed(s: TitanSession, x: number, y: number, z: number): ActionResult {
  const id = s.volume.get(x, y, z);
  if (!isBed(id) || !s.volume.breakable(x, y, z)) return { ok: false };
  const [dx, dz] = bedPartnerOffset(id), px = x + dx, pz = z + dz;
  s.volume.remove(x, y, z);
  if (isBed(s.volume.get(px, y, pz)) && bedTurn(s.volume.get(px, y, pz)) === bedTurn(id)) s.volume.remove(px, y, pz);
  const fx = isBedFoot(id) ? x : px, fz = isBedFoot(id) ? z : pz;
  spillBlock(s, Item.CAMA, 1, fx, y, fz);
  return { ok: true };
}

/** Dobradiça automática (ADR 0102): padrão à esquerda; se a porta vizinha da esquerda (mesmo giro) tem a dobradiça à esquerda, a nova prende à direita e as duas abrem simétricas. */
export function doorHingeFor(v: TitanSession['volume'], x: number, y: number, z: number, turn: number): boolean {
  const [rx, rz] = doorRight(turn), left = v.get(x - rx, y, z - rz);
  return isDoor(left) && !isDoorUpper(left) && doorTurn(left) === turn && !isDoorHingeRight(left);
}

/** Porta de Junco (ADR 0102): ocupa a célula e a de cima; a frente fica voltada para quem a põe, a folha rente à borda dele; precisa de piso firme e das duas células livres. */
function placeDoor(s: TitanSession, hit: Hit, slot: number): ActionResult {
  const x = hit.x + hit.nx, y = hit.y + hit.ny, z = hit.z + hit.nz, turn = marcoTurnFacing(s.yaw);
  if (!matSupported(s, x, y, z)) return { ok: false, msg: 'A porta precisa de piso firme' };
  if (!canPlaceAt(s.volume, s.body, x, y, z, s.items, [0, 1])) return { ok: false };
  if (!canPlaceAt(s.volume, s.body, x, y + 1, z, s.items, [0, 1])) return { ok: false, msg: 'Falta espaço em cima para a porta' };
  const plan = planDisplace(s, [[x, y, z], [x, y + 1, z]]);
  if (!plan) return { ok: false, msg: 'Há um item no local e não há espaço ao lado para ele' };
  const hinge = doorHingeFor(s.volume, x, y, z, turn);
  if (!s.volume.place(x, y, z, doorId(turn, hinge, false, false))) return { ok: false };
  if (!s.volume.place(x, y + 1, z, doorId(turn, hinge, false, true))) { s.volume.remove(x, y, z); return { ok: false }; }
  applyDisplace(s, plan);
  s.inventory.consume(slot);
  return { ok: true };
}

/** Quebrar qualquer metade tira a porta inteira e devolve uma porta como item solto. */
function breakDoor(s: TitanSession, x: number, y: number, z: number): ActionResult {
  const id = s.volume.get(x, y, z);
  if (!isDoor(id) || !s.volume.breakable(x, y, z)) return { ok: false };
  const ly = isDoorUpper(id) ? y - 1 : y;
  for (const yy of [ly, ly + 1]) if (isDoor(s.volume.get(x, yy, z))) s.volume.remove(x, yy, z);
  spillBlock(s, Item.PORTA_JUNCO, 1, x, ly, z);
  return { ok: true };
}

/**
 * Abrir ou fechar a porta (ADR 0102): troca as duas metades de uma vez; uma porta dupla (a vizinha do lado livre, mesmo giro e dobradiça oposta) acompanha. Fechar não vale com o corpo
 * dentro da faixa da folha (o jogador não fica preso na porta).
 */
export function useDoor(s: TitanSession, x: number, y: number, z: number): ActionResult {
  const id = s.volume.get(x, y, z);
  if (!isDoor(id)) return { ok: false };
  const ly = isDoorUpper(id) ? y - 1 : y, lo = s.volume.get(x, ly, z);
  if (!isDoor(lo) || isDoorUpper(lo) || !isDoor(s.volume.get(x, ly + 1, z))) return { ok: false };
  const closing = isDoorOpen(lo);
  if (closing) { // a folha fechada ocupa a faixa rente à borda: o corpo não pode estar nela
    const cb = blockBoxes(doorToggled(lo))?.[0], b = s.body;
    if (cb && b.x + BODY_HALF > x + cb[0] && b.x - BODY_HALF < x + cb[3] && b.z + BODY_HALF > z + cb[2] && b.z - BODY_HALF < z + cb[5] && b.y < ly + 2 && b.y + BODY_HEIGHT > ly) return { ok: false, msg: 'Tem alguém no caminho da porta' };
  }
  const flip = (cx: number, cz: number): void => { for (const yy of [ly, ly + 1]) { const d = s.volume.get(cx, yy, cz); if (isDoor(d) && isDoorOpen(d) === closing) s.volume.set(cx, yy, cz, doorToggled(d)); } };
  flip(x, z);
  const [rx, rz] = doorRight(doorTurn(lo)), sgn = isDoorHingeRight(lo) ? -1 : 1, px = x + sgn * rx, pz = z + sgn * rz, pd = s.volume.get(px, ly, pz);
  if (isDoor(pd) && !isDoorUpper(pd) && doorTurn(pd) === doorTurn(lo) && isDoorHingeRight(pd) !== isDoorHingeRight(lo)) flip(px, pz);
  return { ok: true, open: !closing };
}

/**
 * Usar a cama (ADR 0090): guarda o **ponto de retorno** (o pé da cama) e, **à noite**, dorme até o amanhecer (o relógio do dia pula para logo depois do nascer do sol; passar da meia-noite soma um dia).
 * De dia só marca o ponto de retorno.
 */
export function useBed(s: TitanSession, x: number, y: number, z: number, sleep = true): ActionResult {
  const id = s.volume.get(x, y, z);
  if (!isBed(id)) return { ok: false };
  const [dx, dz] = bedPartnerOffset(id), footX = isBedFoot(id) ? x : x + dx, footZ = isBedFoot(id) ? z : z + dz;
  s.spawn = { x: footX, y, z: footZ };
  s.metaRev++;
  if (!canSleep(s.time, s.weather.raining && hasWeather(s.volume.gen.world))) return { ok: true, msg: 'Ponto de retorno marcado. Só se dorme à noite.' };
  if (!sleep) return { ok: true, msg: 'Ponto de retorno marcado.' }; // na sala a noite só passa com todos na cama (ADR 0104): quem deita só marca o ponto
  const wake = tickFrac(WAKE_TICKS);
  if (s.time > wake) s.days++;
  s.time = wake;
  clearWeather(s.weather); // dormir limpa o tempo, sem mexer no cronômetro (Wiki)
  return { ok: true, msg: 'Você dormiu até o amanhecer. Ponto de retorno marcado.' };
}

/** Onde renascer: ao lado da cama do ponto de retorno (uma célula livre e firme em volta das duas), olhando para ela; `null` se não há ponto, a cama sumiu ou não há lugar (volta à chegada). */
export function bedSpawn(s: TitanSession): { x: number; y: number; z: number; yaw: number } | null {
  const p = s.spawn;
  if (!p || !isBedFoot(s.volume.get(p.x, p.y, p.z))) return null;
  const [fx, fz] = ladderFacing(bedTurn(s.volume.get(p.x, p.y, p.z))), cells = [[p.x, p.z], [p.x + fx, p.z + fz]];
  const isBedCell = (cx: number, cz: number): boolean => cells.some(([a, b]) => a === cx && b === cz);
  for (const [cx, cz] of cells) for (const [dx, dz] of [[fz, fx], [-fz, -fx], [-fx, -fz], [fx, fz]]) { // primeiro os lados da cama, depois as pontas
    const nx = cx + dx, nz = cz + dz;
    if (isBedCell(nx, nz) || s.volume.get(nx, p.y, nz) !== T.AIR || s.volume.get(nx, p.y + 1, nz) !== T.AIR || !matSupported(s, nx, p.y, nz)) continue;
    return { x: nx + 0.5, y: p.y, z: nz + 0.5, yaw: Math.atan2(-(cx - nx), -(cz - nz)) };
  }
  return null;
}

/** O apoio de uma planta cultivada foi quebrado: ela some e devolve a muda como item solto. */
function releaseCrop(s: TitanSession, x: number, y: number, z: number): void {
  const crop = s.crops.get(cropKey(x, y, z));
  if (!crop) return;
  s.crops.delete(cropKey(x, y, z));
  s.metaRev++;
  const n = isStem(crop.species) ? Math.floor(hash2(s.seed, (Math.imul(x, 73856093) ^ Math.imul(z, 83492791)) | 0, y + s.days * 1009 + Math.floor(s.time * 1000)) * 4) : 1; // caule quebrado: 0–3 sementes (Wiki, ADR 0128); as outras plantas devolvem a muda
  if (n > 0) dropShard(s, seedOf(crop.species), x, y, z, n);
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
  if (!rulesOf(id)) return null; // Braseiro (Titã) ou Fornalha (Orvalis, ADR 0120): o mesmo estado, regras do bloco
  const k = furnaceKey(x, y, z);
  let f = s.furnaces.get(k);
  if (!f) { f = newFurnace(); s.furnaces.set(k, f); s.metaRev++; }
  return f;
}

/** Leva a pilha do espaço da mochila para a entrada ou o combustível: só item que serve; espaço vazio recebe tudo, o mesmo item soma até o limite, outro item não troca. */
export function furnaceMoveIn(s: TitanSession, x: number, y: number, z: number, slot: 'input' | 'fuel', invSlot: number): ActionResult {
  const f = furnaceAt(s, x, y, z), st = s.inventory.get(invSlot);
  if (!f || !st) return { ok: false };
  const rules = rulesOf(s.volume.get(x, y, z))!;
  if (!accepts(slot, st.item, rules.station)) return { ok: false, msg: slot === 'fuel' ? 'Isso não queima' : rules.station === 'furnace' ? 'A fornalha não cozinha isso' : 'O braseiro não cozinha isso' };
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

/**
 * Baú de Rocha e Junco (ADR 0089): o conteúdo (18 espaços) é estado da sessão, criado na primeira vez que se abre. Guardar e retirar são **tudo ou nada** e mudam mochila e baú juntos.
 */
export function chestAt(s: TitanSession, x: number, y: number, z: number): ChestState | null {
  if (!isChest(s.volume.get(x, y, z))) return null;
  const k = furnaceKey(x, y, z);
  let c = s.chests.get(k);
  if (!c) { c = newChest(); s.chests.set(k, c); }
  return c;
}

/** Guarda a pilha inteira do espaço `invSlot` (hotbar ou mochila) no baú. Sem espaço para ela inteira, nada muda. */
export function chestMoveIn(s: TitanSession, x: number, y: number, z: number, invSlot: number): ActionResult {
  const c = chestAt(s, x, y, z), st = s.inventory.get(invSlot);
  if (!c || !st || invSlot >= SLOTS) return { ok: false };
  if (chestRoom(c, st.item) < st.count) return { ok: false, msg: 'Baú cheio' };
  const taken = s.inventory.take(invSlot)!;
  chestPut(c, taken);
  s.metaRev++;
  return { ok: true };
}

/** Tira a pilha do espaço `slot` do baú para a mochila (tudo ou nada: sem espaço para ela, fica). */
export function chestTakeOut(s: TitanSession, x: number, y: number, z: number, slot: number): ActionResult {
  const c = chestAt(s, x, y, z), st = c && Number.isInteger(slot) && slot >= 0 && slot < CHEST_SLOTS ? c[slot] : null;
  if (!c || !st) return { ok: false };
  if (!s.inventory.canAdd(st.item, st.count)) return FULL;
  s.inventory.add(st.item, st.count, st.wear ?? 0);
  c[slot] = null;
  s.metaRev++;
  return { ok: true };
}

/** Quebrar o baú **cospe o conteúdo** no chão (uma pilha por espaço ocupado) e apaga o estado. */
function spillChest(s: TitanSession, x: number, y: number, z: number): void {
  const k = furnaceKey(x, y, z), c = s.chests.get(k);
  if (!c) return;
  const ry = y; // o conteúdo cai por gravidade (ADR 0098)
  c.forEach((st, n) => {
    if (!st) return;
    const id = `k:${x},${y},${z}:${n}`;
    s.drops.set(id, { id, item: st.item, ...(st.count > 1 ? { count: st.count } : {}), ...(st.wear ? { wear: st.wear } : {}), x, y: ry, z });
    s.dropsRev++;
  });
  s.chests.delete(k); s.metaRev++;
}

/** Quebrar o braseiro **cospe o conteúdo** no chão (entrada, combustível e saída) e apaga o estado. */
function spillFurnace(s: TitanSession, x: number, y: number, z: number): void {
  const k = furnaceKey(x, y, z), f = s.furnaces.get(k);
  if (!f) return;
  const ry = y;
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
  if (isBed(s.volume.get(x, y, z))) return breakBed(s, x, y, z); // as duas metades saem juntas (ADR 0090)
  if (isDoor(s.volume.get(x, y, z))) return breakDoor(s, x, y, z); // idem a porta (ADR 0102)
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
  const count = s.volume.get(x, y, z) === T.MELON ? 3 + Math.floor(hash2(s.seed, (Math.imul(x, 73856093) ^ Math.imul(z, 83492791)) | 0, y) * 5) : dropCountOf(s.volume.get(x, y, z)); // a laje dupla devolve 2 lajes; a melancia, 3–7 fatias (Wiki, ADR 0128; pelo hash da célula, sempre o mesmo número)
  const block = s.volume.get(x, y, z);
  const direct = item === Item.LANTERN; // a lanterna é o item-chave: vai direto para a mochila e, se não couber, fica no lugar (nunca cai em precipício ou água)
  if (direct && !s.inventory.canAdd(item, count)) return FULL;
  if (!s.volume.remove(x, y, z)) return { ok: false };
  if (direct) s.inventory.add(item, count);
  else if (block === T.COAL_ORE && !isPick(s.inventory.get(s.selected)?.item)) { /* Wiki: o minério de carvão só dropa com picareta (qualquer uma, ADR 0122) */ }
  else spillBlock(s, item, count, x, y, z); // ADR 0082: o bloco comum cai no chão e é recolhido por proximidade
  if (block === T.GRASS) { const seed = wildSeedAt(x, y, z); if (seed !== null) spillBlock(s, seed, 1, x, y, z); } // semente silvestre da grama (ADR 0113)
  if (isBrazier(block) || isFurnace(block)) spillFurnace(s, x, y, z); // o conteúdo do braseiro ou da fornalha cai no chão
  if (isChest(block)) spillChest(s, x, y, z); // e o do baú (ADR 0089)
  // veio natural: além do bloco inteiro, solta uma lasca garantida onde estava. O veio some do mapa (a edição grava ar); recolocar rocha/gelo põe o bloco comum,
  // que não solta nada — a fonte não se recria. O id da lasca vem da célula do veio, então não há como soltar duas vezes.
  if (isVein(block)) dropShard(s, block === T.VEIN_ROCK ? 5 : 6, x, y, z);
  releaseReed(s, reed, x, y + 1, z);
  releaseCrop(s, x, y + 1, z);
  releaseMat(s, x, y + 1, z);
  releaseLadders(s, x, y, z);
  releaseTorches(s, x, y, z);
  if (isBed(s.volume.get(x, y + 1, z))) breakBed(s, x, y + 1, z); // o piso da cama sumiu
  if (isDoor(s.volume.get(x, y + 1, z))) breakDoor(s, x, y + 1, z); // e o da porta (a metade de baixo está logo acima)
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
  s.drops.set(id, { id, item, ...(count > 1 ? { count } : {}), x: cx, y: cy, z: cz }  /* cai por gravidade (ADR 0098) */);
  s.dropsRev++;
}

/** Pousa uma lasca perto do ponto de quebra: na célula do veio, descendo até o primeiro apoio sólido. */
function dropShard(s: TitanSession, item: number, x: number, y: number, z: number, count = 1): void {
  const id = `v:${x},${y},${z}`;
  if (s.drops.has(id)) return;
  s.drops.set(id, { id, item, ...(count > 1 ? { count } : {}), x, y, z }); // cai por gravidade (ADR 0098)
  s.dropsRev++;
}

/** Atraso de coleta de um item recém-solto (ADR 0082) e tempo de vida de um drop de bloco, em segundos de jogo ativo. */
export const PICKUP_DELAY_S = 0.5; // 10 ticks da Wiki (ADR 0131)
export const DROP_LIFE_S = 300;

/** O bloco quebrado cai como item solto no centro da célula (ADR 0082): id `b:x,y,z:n` único, atraso de coleta e relógio de vida só de execução (`session.dropFx`). */
function spillBlock(s: TitanSession, item: number, count: number, x: number, y: number, z: number): void {
  let n = 0;
  while (s.drops.has(`b:${x},${y},${z}:${n}`)) n++;
  const id = `b:${x},${y},${z}:${n}`;
  s.drops.set(id, { id, item, ...(count > 1 ? { count } : {}), x, y, z }); // cai por gravidade (ADR 0098)
  s.dropFx.set(id, { delay: PICKUP_DELAY_S, age: 0 });
  s.dropsRev++;
}

/**
 * Fusão (ADR 0131, adaptação da caixa 0,5 × 0,25 × 0,5 da Wiki ao um-item-por-célula): dois itens **iguais**, sem desgaste, **repousando na mesma célula** e da mesma classe de sumiço viram uma entrada só,
 * se a soma couber na pilha máxima. Fica o de menos idade (mais tempo restante, como a Wiki) e o maior atraso de coleta. Devolve se algo se fundiu.
 */
export function mergeDrops(s: TitanSession): boolean {
  const cells = new Map<string, Drop[]>();
  for (const d of s.drops.values()) {
    if (d.wear || s.dropFx.get(d.id)?.fy !== undefined) continue;
    const k = `${d.x},${d.y},${d.z},${d.item},${everLasts(d.id) ? 1 : 0}`, l = cells.get(k);
    if (l) l.push(d); else cells.set(k, [d]);
  }
  let merged = false;
  for (const l of cells.values()) {
    if (l.length < 2) continue;
    const cap = maxStack(l[0].item), age = (d: Drop): number => s.dropFx.get(d.id)?.age ?? 0;
    l.sort((a, b) => age(a) - age(b) || (a.id < b.id ? -1 : 1));
    let keep = l[0];
    for (let i = 1; i < l.length; i++) {
      const o = l[i], sum = (keep.count ?? 1) + (o.count ?? 1);
      if (sum > cap) { keep = o; continue; }
      const kf = s.dropFx.get(keep.id), of = s.dropFx.get(o.id);
      if (kf && of) kf.delay = Math.max(kf.delay, of.delay);
      keep = { ...keep, count: sum };
      s.drops.set(keep.id, keep);
      s.drops.delete(o.id); s.dropFx.delete(o.id); s.dropsRev++; merged = true;
    }
  }
  return merged;
}
const PICKUP_RADIUS = 1.425; // alcance da Wiki (página de discussão; ADR 0131)
/** A pilha solta ao morrer (`d:`) é a exceção do sumiço de 5 min (ADR 0131): sem aviso de local nem perigos, sumir seria punitivo demais. */
const everLasts = (id: string): boolean => id.startsWith('d:');
/**
 * Coleta por proximidade (ADR 0044): toda lasca solta dentro de 1,25 m (horizontal) dos pés e a uma altura alcançável entra na mochila, uma a uma; se não couber,
 * fica no lugar e `full` avisa. Lascas sem apoio (o bloco de baixo foi quebrado) descem antes. Tudo muda inventário e lasca juntos (um único `dropsRev`).
 */
export function collectNearby(s: TitanSession, px: number, py: number, pz: number, dt = 0): { collected: number; full: boolean; moved: boolean } {
  let collected = 0, full = false, moved = dt > 0 ? stepDrops(s, dt) : settleDrops(s); // gravidade (ADR 0098); sem dt (testes), pousa na hora
  if (mergeDrops(s)) moved = true; // fusão de itens iguais na mesma célula (ADR 0131)
  for (const d of [...s.drops.values()]) {
    let fx = s.dropFx.get(d.id);
    if (!fx && !everLasts(d.id)) { fx = { delay: 0, age: 0 }; s.dropFx.set(d.id, fx); } // item vindo do save: sem atraso, vida de 5 min a contar daqui (a Wiki pausa o relógio fora do jogo)
    if (fx) { // todo item solto (menos a pilha da morte) tem relógio: atraso de coleta e sumiço depois de 5 min (ADR 0131)
      fx.delay = Math.max(0, fx.delay - dt); fx.age += dt;
      if (!everLasts(d.id) && fx.age >= DROP_LIFE_S) { s.drops.delete(d.id); s.dropFx.delete(d.id); s.dropsRev++; moved = true; continue; }
      if (fx.delay > 0) continue;
    }
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
/**
 * Balde de Cobre (ADR 0091): vazio, o toque numa célula do lago (mira com `liquid`) a recolhe, **só a de cima da coluna** (sem buraco de ar no meio da água) — a célula vira ar e o balde vem cheio;
 * cheio, o toque numa face despeja o líquido na célula vizinha, que precisa estar livre e **abaixo da superfície** (Y ≤ `LAKE_LAST_Y`): o líquido só existe na altura do lago. O líquido não escorre
 * (nenhuma simulação de fluxo): o que se despeja fica onde caiu e o que se recolhe deixa uma cavidade. Recolocar sólido sobre o líquido o desloca, como no lago original.
 */
function useBucket(s: TitanSession, hit: Hit, slot: number): ActionResult {
  const stack = s.inventory.get(slot);
  if (!stack) return { ok: false };
  const v = s.volume;
  if (stack.item === Item.BALDE) {
    if (v.get(hit.x, hit.y, hit.z) !== T.LAKE) return { ok: false, msg: 'Aponte o balde para o lago' };
    if (v.get(hit.x, hit.y + 1, hit.z) === T.LAKE) return { ok: false, msg: 'O balde só recolhe a superfície do lago' };
    if (!v.set(hit.x, hit.y, hit.z, T.AIR)) return { ok: false };
    s.inventory.replace(slot, Item.BALDE_CHEIO);
    return { ok: true, msg: 'Balde cheio' };
  }
  const x = hit.x + hit.nx, y = hit.y + hit.ny, z = hit.z + hit.nz;
  if (hit.item || !v.editable(x, y, z) || v.get(x, y, z) !== T.AIR) return { ok: false, msg: 'Aqui não dá para despejar' };
  if (y > LAKE_LAST_Y) return { ok: false, msg: 'O líquido só se despeja em cavidade abaixo da superfície do lago' };
  const occupied = s.items.at(x, y, z) ?? [...s.drops.values()].find((d) => d.x === x && d.y === y && d.z === z)?.id ?? null;
  if (occupied || !v.set(x, y, z, T.LAKE)) return { ok: false, msg: 'Aqui não dá para despejar' };
  s.inventory.replace(slot, Item.BALDE);
  return { ok: true, msg: 'Líquido despejado' };
}

/**
 * Vara de pesca (ADR 0133): sem linha, o toque na água lança a boia na superfície; com a linha lançada, o toque recolhe — se o peixe fisgou (`phase` = `bite`) ele vem para a mochila (ou cai ao lado da boia se não
 * couber) e a vara gasta 1 uso; antes da fisgada só recolhe a linha, sem gasto (Wiki).
 */
export function reelIn(s: TitanSession, slot: number, rng: () => number = Math.random): ActionResult {
  const f = s.fishing;
  s.fishing = null;
  s.dropsRev++; // a boia some do desenho
  if (!f || f.phase !== 'bite') return { ok: true, msg: 'Linha recolhida' };
  const fish = rollFish(rng);
  if (s.inventory.canAdd(fish, 1)) s.inventory.add(fish, 1);
  else { let n = 0; while (s.drops.has(`f:${f.x},${f.y},${f.z}:${n}`)) n++; restDrop(s, `f:${f.x},${f.y},${f.z}:${n}`, fish, f.x, f.y, f.z, 1); }
  const w = s.inventory.damage(slot, 1);
  return w?.broken ? { ok: true, broken: true, msg: `Pescou: ${ITEM_NAMES[fish]} · a vara quebrou` } : { ok: true, msg: `Pescou: ${ITEM_NAMES[fish]}` };
}
function useRod(s: TitanSession, hit: Hit, slot: number, rng: () => number = Math.random): ActionResult {
  if (s.fishing) return reelIn(s, slot, rng);
  const v = s.volume;
  if (hit.item || v.get(hit.x, hit.y, hit.z) !== T.LAKE) return { ok: false, msg: 'Lance a vara na água' };
  let y = hit.y;
  while (v.get(hit.x, y + 1, hit.z) === T.LAKE) y++; // a boia fica na superfície da coluna
  if (v.get(hit.x, y + 1, hit.z) !== T.AIR) return { ok: false, msg: 'Falta espaço livre sobre a água' };
  s.fishing = newBobber(hit.x, y + 1, hit.z, rng);
  s.dropsRev++; // a boia aparece no desenho
  return { ok: true, msg: 'Vara lançada' };
}

/** Enxada e pá no toque sobre a face de cima do solo (ADR 0112): a enxada ara (terra, grama, caminho; úmida se há água ao alcance) e a pá abre caminho na grama e na terra; gasta 1 de durabilidade. */
function useSoilTool(s: TitanSession, hit: Hit, hoe: boolean): ActionResult {
  const { x, y, z } = hit;
  if (hit.item || hit.ny !== 1 || !s.volume.editable(x, y, z)) return { ok: false, msg: hoe ? 'A enxada ara a face de cima da terra' : 'A pá abre caminho na face de cima da grama' };
  const block = s.volume.get(x, y, z), to = hoe ? hoeResult(s.volume, block, x, y, z) : shovelResult(block);
  if (to === null) return { ok: false, msg: hoe ? 'Aqui não dá para arar' : 'Aqui não dá para abrir caminho' };
  if (s.volume.get(x, y + 1, z) !== T.AIR) return { ok: false, msg: 'Falta espaço livre em cima' };
  if (!s.volume.set(x, y, z, to)) return { ok: false };
  const w = wearHeldTool(s, { type: 'use' });
  return w.broken ? { ok: true, broken: true, msg: `${w.name} quebrou` } : { ok: true };
}

export function placeFromSlot(s: TitanSession, hit: Hit, slot: number): ActionResult {
  const stack = s.inventory.get(slot);
  if (!stack) return { ok: false };
  if (isHoe(stack.item) || isShovel(stack.item)) return useSoilTool(s, hit, isHoe(stack.item)); // arar e abrir caminho (ADR 0112)
  if (stack.item === Item.VARA_PESCA) return useRod(s, hit, slot); // lançar e recolher a linha (ADR 0133)
  if (isBucket(stack.item)) return useBucket(s, hit, slot); // o balde recolhe e despeja líquido (ADR 0091)
  if (stack.item === Item.NOZ && canPlantNut(s, hit)) return plantCrop(s, hit, slot, 'noz'); // a noz se planta no topo da areia ocre (ADR 0083)
  const garden = gardenSpeciesOf(stack.item); // a horta (ADR 0113): semente de trigo, cenoura, batata e tomate se plantam no topo da terra arada; cenoura, batata e tomate, onde não dá para plantar, se comem
  if (garden && hit.ny === 1 && !hit.item && plantableSoil(garden, s.volume.get(hit.x, hit.y, hit.z)) && plantSpotFree(s, hit)) return plantCrop(s, hit, slot, garden);
  if (garden && !foodOf(stack.item)) return { ok: false, msg: 'A semente se planta no topo da terra arada' };
  if (foodOf(stack.item)) return eatFromSlot(s, slot); // comida na mão: o toque come (não se coloca)
  if (stack.item === Item.GLASS_REED) return plantCrop(s, hit, slot, 'junco'); // a muda se planta (ADR 0083)
  let block = blockOfItem(stack.item);
  if (block === null) return { ok: false, msg: 'Este item não se coloca' };
  if (block === T.DOOR) return placeDoor(s, hit, slot); // a porta ocupa duas células na vertical (ADR 0102)
  if (block === T.BED) return placeBed(s, hit, slot); // a cama ocupa duas células (ADR 0090)
  if (block === T.LADDER) { // escada (ADR 0088): prende-se à lateral de um cubo inteiro e a frente aponta para fora dele
    if (hit.ny !== 0 || hit.item) return { ok: false, msg: 'A escada se prende à lateral de um bloco' };
    if (!isFull(s.volume.get(hit.x, hit.y, hit.z))) return { ok: false, msg: 'A escada precisa de um bloco inteiro atrás' };
    block = ladderId(ladderTurnOf(hit.nx, hit.nz));
  } else if (block === T.TORCH) { // Tocha (ADR 0121): em pé sobre o topo de um cubo ou presa à lateral de um cubo inteiro; de baixo e sobre folhas, não
    const base = s.volume.get(hit.x, hit.y, hit.z);
    if (hit.item || hit.ny < 0) return { ok: false, msg: 'A tocha não se prende por baixo' };
    if (hit.ny > 0) { if (!torchTopSupport(base)) return { ok: false, msg: 'A tocha precisa de um apoio firme' }; }
    else if (!torchSideSupport(base)) return { ok: false, msg: 'A tocha precisa de um bloco inteiro para se prender' };
    else block = wallTorchId(ladderTurnOf(hit.nx, hit.nz));
  } else if (block === T.WORKBENCH) block = workbenchId(workbenchTurnFacing(s.yaw)); // a frente da mesa fica voltada para o jogador (ADR 0052)
  else if (block === T.MARCO) block = marcoId(marcoTurnFacing(s.yaw)); // idem o Marco de Margem (ADR 0058)
  else if (block === T.PAINEL) block = panelIdFacing(s.yaw); // o painel corre de través ao olhar
  else if (block === T.REED_STAIR) block = stairId(marcoTurnFacing(s.yaw)); // a frente (o lado baixo) fica voltada para o jogador: giro 0 = frente em +Z (ADR 0101)
  else if (block === T.STONE_STAIR) block = stairId(marcoTurnFacing(s.yaw), true); // Degrau de Pedra: mesma regra do de junco (ADR 0109)
  else if (block === T.REED_CHAIR) block = chairId(marcoTurnFacing(s.yaw));
  else if (block === T.FURNACE) block = furnaceId(carpentryTurnFacing(s.yaw), false); // a frente da Fornalha fica voltada para o jogador, sempre apagada (ADR 0120)
  else if (block === T.CARPENTRY) block = carpentryId(carpentryTurnFacing(s.yaw)); // a frente da Mesa de Carpintaria fica voltada para o jogador (ADR 0107)
  else if (block === T.CHEST) block = chestId(chestTurnFacing(s.yaw)); // a frente do baú (o fecho) fica voltada para o jogador (ADR 0089)
  if (isSlabBottom(block)) { // laje (ADR 0056; a de junco, ADR 0100; a de pedra, ADR 0108): inferior, superior ou fusão em laje dupla conforme a face e a altura clicadas
    const r = resolveSlabPlacement(s.volume.get(hit.x, hit.y, hit.z), hit.ny, hit.hy, block);
    if (r.merge) {
      // funde na célula apontada: a metade que falta não pode invadir o corpo do jogador
      const target = s.volume.get(hit.x, hit.y, hit.z);
      const added: readonly [number, number] = isSlabBottom(target) ? [0.5, 1] : [0, 0.5];
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
  const occupied = s.items; // só as lascas legadas barram; o item solto é deslocado (ADR 0098)
  if (!canPlaceAt(s.volume, s.body, x, y, z, occupied, blockSpan(block))) return { ok: false };
  const plan = planDisplace(s, [[x, y, z]]); // item solto na célula vai para uma vizinha livre e cai de lá (ADR 0098)
  if (!plan) return { ok: false, msg: 'Há um item no local e não há espaço ao lado para ele' };
  if (!s.volume.place(x, y, z, block)) return { ok: false };
  applyDisplace(s, plan);
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
  const ry = y; // a pilha da morte cai por gravidade; na água, afunda (ADR 0098)
  stacks.forEach((st, n) => {
    const id = `d:${x},${ry},${z}:${n}`;
    s.drops.set(id, { id, item: st.item, ...(st.count > 1 ? { count: st.count } : {}), ...(st.wear ? { wear: st.wear } : {}), x, y: ry, z }); // a ferramenta desgastada leva o desgaste
  });
  if (stacks.length) s.dropsRev++;
  s.selected = Math.min(s.selected, 8);
  const a = bedSpawn(s) ?? s.volume.gen.arrival; // a cama do ponto de retorno, se ainda houver lugar ao lado dela (ADR 0090)
  s.body = newBody(a.x, a.y, a.z);
  s.yaw = a.yaw; s.pitch = -0.12;
  revive(s.vitals);
  return stacks.length;
}

