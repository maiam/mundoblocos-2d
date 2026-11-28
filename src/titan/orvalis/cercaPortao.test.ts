import { describe, expect, it } from 'vitest';
import { placeFromSlot, useDoor } from '../actions';
import { blockOfItem, isItem, Item, ITEM_NAMES, itemOfBlock } from '../items';
import { collides, newBody } from '../physics';
import { recipeById } from '../recipes';
import { MemoryTitanStorage } from '../save';
import { openSession } from '../session';
import { surfaceOf } from '../sounds';
import { blockBoxes, blockSpan, fenceId, fenceMask, gateId, gateToggled, gateTurn, isFence, isFull, isGate, isGateOpen, isOccupied, isSolid, isTarget, modelOf, T, T_MAX, WALL_E, WALL_N, WALL_S, ladderFacing, woodOf, FENCE_KINDS, GATE_KINDS } from '../voxel';
import { fenceModelData, gateModelData } from '../../render/cercaModel';
import { ORVALIS_GENERATOR_VERSION, OrvalisGenerator, orvalisGeneratorFor } from './generator';

/** Cerca e Portão de madeira (ADR 0140, W2). */
const open = () => openSession(new MemoryTitanStorage(), 42, () => 1, orvalisGeneratorFor, ORVALIS_GENERATOR_VERSION, (s, v) => new OrvalisGenerator(s, v));
const WOODS = [
  { w: 0, fence: Item.CERCA_CARVALHO, gate: Item.PORTAO_CARVALHO, planks: Item.TABUA_CARVALHO, nome: 'Carvalho', id: 'carvalho' },
  { w: 1, fence: Item.CERCA_CEREJEIRA, gate: Item.PORTAO_CEREJEIRA, planks: Item.TABUA_CEREJEIRA, nome: 'Cerejeira', id: 'cerejeira' },
  { w: 2, fence: Item.CERCA_BETULA, gate: Item.PORTAO_BETULA, planks: Item.TABUA_BETULA, nome: 'Bétula', id: 'betula' },
];

describe('cerca e portão de madeira (ADR 0140)', () => {
  it('ids 208–279, itens 162–167, nomes e receitas da Wiki (cerca 4 tábuas + 2 hastes → 3; portão 2 + 4 → 1)', () => {
    expect(T_MAX).toBeGreaterThanOrEqual(279); expect(T.FENCE_OAK).toBe(208); expect(T.GATE_OAK).toBe(256);
    for (const k of WOODS) {
      expect(isItem(k.fence) && isItem(k.gate)).toBe(true);
      expect(ITEM_NAMES[k.fence]).toBe(`Cerca de ${k.nome}`); expect(ITEM_NAMES[k.gate]).toBe(`Portão de ${k.nome}`);
      expect(recipeById(`cerca-${k.id}`)).toMatchObject({ world: 'orvalis', station: 'workbench', result: { item: k.fence, count: 3 }, ingredients: [{ item: k.planks, count: 4 }, { item: Item.HASTE, count: 2 }] });
      expect(recipeById(`portao-${k.id}`)).toMatchObject({ world: 'orvalis', station: 'workbench', result: { item: k.gate, count: 1 }, ingredients: [{ item: k.planks, count: 2 }, { item: Item.HASTE, count: 4 }] });
      expect(blockOfItem(k.fence)).toBe(fenceId(k.w, 0)); expect(blockOfItem(k.gate)).toBe(gateId(k.w, 0, false));
      for (let m = 0; m < 16; m++) { const id = fenceId(k.w, m); expect(isFence(id) && woodOf(id) === k.w && fenceMask(id) === m).toBe(true); expect(itemOfBlock(id)).toBe(k.fence); expect(modelOf(id)).toEqual({ kind: FENCE_KINDS[k.w * 16 + m], turn: 0 }); expect(surfaceOf(id)).toBe('rock'); }
      for (let t = 0; t < 4; t++) for (const op of [false, true]) { const id = gateId(k.w, t, op); expect(isGate(id) && woodOf(id) === k.w && gateTurn(id) === t && isGateOpen(id) === op).toBe(true); expect(itemOfBlock(id)).toBe(k.gate); expect(modelOf(id)).toEqual({ kind: GATE_KINDS[k.w * 2 + (op ? 1 : 0)], turn: t }); expect(gateToggled(gateToggled(id))).toBe(id); }
    }
    expect(isItem(177)).toBe(false);
  });

  it('forma: cerca e portão fechado são sólidos não cúbicos; o portão aberto é só alvo da mira; modelos têm geometria', () => {
    const f = fenceId(0, WALL_N | WALL_S), g = gateId(1, 0, false), go = gateId(1, 0, true);
    expect(isSolid(f) && !isFull(f) && isTarget(f) && isOccupied(f)).toBe(true);
    expect(blockSpan(f)).toEqual([0, 1]); expect(blockBoxes(f)!.length).toBe(3); expect(blockBoxes(fenceId(0, 0))!.length).toBe(1);
    expect(isSolid(g) && !isFull(g)).toBe(true); expect(blockBoxes(g)!.length).toBe(1);
    expect(isSolid(go)).toBe(false); expect(isTarget(go) && isOccupied(go)).toBe(true); expect(blockBoxes(go)!.length).toBe(2);
    for (let w = 0; w < 3; w++) { expect(fenceModelData(w, 15).idx.length).toBeGreaterThan(fenceModelData(w, 0).idx.length); expect(gateModelData(w, true).idx.length).toBeGreaterThan(0); expect(gateModelData(w, false).uv.every((u) => u >= 0 && u <= 1)).toBe(true); }
  });

  it('a cerca se liga aos vizinhos (cubo inteiro, outra cerca de qualquer madeira, portão pelo eixo) e refaz a máscara ao mudar; folhas não', async () => {
    const s = await open(), a = s.volume.gen.arrival, v = s.volume, x = Math.floor(a.x) + 2, y = a.y, z = Math.floor(a.z) + 2;
    for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) { v.set(x + dx, y, z + dz, T.AIR); v.set(x + dx, y + 1, z + dz, T.AIR); }
    v.set(x, y, z, T.FENCE_OAK);
    expect(v.get(x, y, z)).toBe(fenceId(0, 0));
    v.set(x + 1, y, z, T.PLANKS_BIRCH); expect(fenceMask(v.get(x, y, z))).toBe(WALL_E); // cubo inteiro
    v.set(x, y, z - 1, fenceId(2, 0)); expect(fenceMask(v.get(x, y, z))).toBe(WALL_E | WALL_N); // outra madeira também liga
    expect(fenceMask(v.get(x, y, z - 1))).toBe(WALL_S); // e a outra se atualiza sozinha
    v.set(x - 1, y, z, T.LEAVES_OAK); expect(fenceMask(v.get(x, y, z))).toBe(WALL_E | WALL_N); // folhas não ligam
    v.set(x, y, z + 1, gateId(0, 0, false)); // giro par: o painel corre em X, então não liga pelo sul
    expect(fenceMask(v.get(x, y, z))).toBe(WALL_E | WALL_N);
    v.set(x, y, z + 1, gateId(0, 1, false)); // giro ímpar: corre em Z, liga
    expect(fenceMask(v.get(x, y, z))).toBe(WALL_E | WALL_N | WALL_S);
    v.set(x + 1, y, z, T.AIR); expect(fenceMask(v.get(x, y, z))).toBe(WALL_N | WALL_S); // tirou o vizinho: desliga
  });

  it('colisão a 1,5 m: não se passa por cima da cerca nem do portão fechado; aberto passa; a mira continua em 1 m', async () => {
    const s = await open(), a = s.volume.gen.arrival, v = s.volume, x = Math.floor(a.x) + 2, y = a.y, z = Math.floor(a.z) + 2;
    for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) for (let dy = 0; dy <= 3; dy++) v.set(x + dx, y + dy, z + dz, T.AIR);
    v.set(x, y, z, T.FENCE_OAK); v.set(x + 2, y, z, gateId(0, 0, false)); v.set(x - 2, y, z, gateId(0, 0, true));
    const cx = x + 0.5, cz = z + 0.5;
    expect(collides(v, cx, y, cz)).toBe(true);
    expect(collides(v, cx, y + 1.2, cz)).toBe(true); // um pulo de 1,2 m ainda bate na cerca (1,5 m)
    expect(collides(v, cx, y + 1.5, cz)).toBe(false); // acima de 1,5 m passa
    expect(collides(v, x + 2.5, y + 1.2, cz)).toBe(true); expect(collides(v, x + 2.5, y + 1.5, cz)).toBe(false); // portão fechado
    expect(collides(v, x - 1.5, y, cz)).toBe(false); // portão aberto não colide
    expect(Math.max(...blockBoxes(fenceId(0, 0))!.map((b) => b[4]))).toBe(1); // a caixa da mira tem 1 m
    const b = newBody(cx, y + 1.6, cz); b.vy = 0;
    expect(collides(v, b.x, b.y, b.z)).toBe(false);
  });

  it('no jogo: o portão sai de través ao olhar, abre para longe de quem o usa, fecha, e não abre com algo no vão', async () => {
    const s = await open(), a = s.volume.gen.arrival, v = s.volume, x = Math.floor(a.x) + 3, y = a.y, z = Math.floor(a.z) + 3;
    for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) for (let dy = 0; dy <= 3; dy++) v.set(x + dx, y + dy, z + dz, T.AIR);
    s.inventory.add(Item.PORTAO_CARVALHO, 2); s.inventory.add(Item.CERCA_BETULA, 1);
    const slot = (item: number) => [...Array(36).keys()].find((i) => s.inventory.get(i)?.item === item)!;
    s.yaw = 0; // olhando para um lado qualquer; só confirmamos que o painel nasce fechado e com o giro certo
    expect(placeFromSlot(s, { x, y: y - 1, z, nx: 0, ny: 1, nz: 0 }, slot(Item.PORTAO_CARVALHO)).ok).toBe(true);
    const closed = v.get(x, y, z);
    expect(isGate(closed) && !isGateOpen(closed)).toBe(true);
    const turn = gateTurn(closed), [fx, fz] = ladderFacing(turn);
    const stand = (side: number) => { s.body.x = x + 0.5 + fx * 2.5 * side; s.body.z = z + 0.5 + fz * 2.5 * side; s.body.y = y; };
    stand(1); // do lado do giro: o portão abre para o lado contrário
    expect(useDoor(s, x, y, z)).toMatchObject({ ok: true, open: true });
    expect(gateTurn(v.get(x, y, z))).toBe((turn + 2) % 4);
    expect(useDoor(s, x, y, z)).toMatchObject({ ok: true, open: false });
    expect(v.get(x, y, z)).toBe(gateId(0, (turn + 2) % 4, false));
    stand(-1); // do outro lado: abre para o lado do giro atual
    const t2 = gateTurn(v.get(x, y, z)), [gx, gz] = ladderFacing(t2);
    s.body.x = x + 0.5 - gx * 2.5; s.body.z = z + 0.5 - gz * 2.5;
    expect(useDoor(s, x, y, z)).toMatchObject({ ok: true, open: true });
    expect(gateTurn(v.get(x, y, z))).toBe(t2);
    expect(useDoor(s, x, y, z).open).toBe(false);
    v.set(x + gx, y, z + gz, T.STONE_SMOOTH); // algo sólido no vão (o lado para onde abriria)
    expect(useDoor(s, x, y, z)).toMatchObject({ ok: false }); expect(isGateOpen(v.get(x, y, z))).toBe(false);
    s.body.x = x + 0.5; s.body.z = z + 0.5; v.set(x + gx, y, z + gz, T.AIR); // corpo no painel: abre, mas fechar com alguém dentro não
    s.body.x = x + 0.5 + gx * 2.5; s.body.z = z + 0.5 + gz * 2.5;
    expect(useDoor(s, x, y, z).ok).toBe(true);
    s.body.x = x + 0.5; s.body.z = z + 0.5;
    expect(useDoor(s, x, y, z)).toMatchObject({ ok: false, msg: 'Tem alguém no caminho' });
  });
});
