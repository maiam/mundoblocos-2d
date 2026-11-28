import { describe, expect, it } from 'vitest';
import { breakOrCollect, placeFromSlot, useDoor } from '../actions';
import { sweep } from '../dropTestUtil';
import { blockOfItem, isItem, Item, ITEM_NAMES, itemOfBlock } from '../items';
import { collides } from '../physics';
import { recipeById } from '../recipes';
import { MemoryTitanStorage } from '../save';
import { openSession } from '../session';
import { blockBoxes, doorFamily, doorId, doorToggled, isDoor, isDoorOpen, isDoorUpper, isFull, isOpenable, isSolid, isTrapdoor, isTrapdoorOpen, isTrapdoorTop, modelOf, T, T_MAX, trapdoorId, trapdoorToggled, trapdoorTurn, TRAPDOOR_KINDS, WOOD_DOOR_KINDS, woodOf } from '../voxel';
import { ORVALIS_GENERATOR_VERSION, OrvalisGenerator, orvalisGeneratorFor } from './generator';

/** Porta e Alçapão de madeira (ADR 0141, W3). */
const open = () => openSession(new MemoryTitanStorage(), 42, () => 1, orvalisGeneratorFor, ORVALIS_GENERATOR_VERSION, (s, v) => new OrvalisGenerator(s, v));
const WOODS = [
  { w: 0, door: Item.PORTA_CARVALHO, trap: Item.ALCAPAO_CARVALHO, planks: Item.TABUA_CARVALHO, nome: 'Carvalho', id: 'carvalho' },
  { w: 1, door: Item.PORTA_CEREJEIRA, trap: Item.ALCAPAO_CEREJEIRA, planks: Item.TABUA_CEREJEIRA, nome: 'Cerejeira', id: 'cerejeira' },
  { w: 2, door: Item.PORTA_BETULA, trap: Item.ALCAPAO_BETULA, planks: Item.TABUA_BETULA, nome: 'Bétula', id: 'betula' },
];
const clear = (s: Awaited<ReturnType<typeof open>>) => {
  const a = s.volume.gen.arrival, x = Math.floor(a.x) + 3, y = a.y, z = Math.floor(a.z) + 3;
  for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) for (let dy = 0; dy <= 4; dy++) s.volume.set(x + dx, y + dy, z + dz, T.AIR);
  return { x, y, z };
};

describe('porta e alçapão de madeira (ADR 0141)', () => {
  it('ids 280–423, itens 168–173, nomes e receitas da Wiki (porta 6 tábuas → 3; alçapão 6 → 2)', () => {
    expect(T_MAX).toBeGreaterThanOrEqual(423); expect(T.DOOR_WOOD).toBe(280); expect(T.TRAPDOOR).toBe(376);
    for (const k of WOODS) {
      expect(isItem(k.door) && isItem(k.trap)).toBe(true);
      expect(ITEM_NAMES[k.door]).toBe(`Porta de ${k.nome}`); expect(ITEM_NAMES[k.trap]).toBe(`Alçapão de ${k.nome}`);
      expect(recipeById(`porta-${k.id}`)).toMatchObject({ world: 'orvalis', station: 'workbench', result: { item: k.door, count: 3 }, ingredients: [{ item: k.planks, count: 6 }] });
      expect(recipeById(`alcapao-${k.id}`)).toMatchObject({ world: 'orvalis', station: 'workbench', result: { item: k.trap, count: 2 }, ingredients: [{ item: k.planks, count: 6 }] });
      expect(blockOfItem(k.door)).toBe(doorId(0, false, false, false, 1 + k.w)); expect(blockOfItem(k.trap)).toBe(trapdoorId(k.w, 0, false, false));
      for (let t = 0; t < 4; t++) for (const hr of [false, true]) for (const op of [false, true]) for (const up of [false, true]) {
        const id = doorId(t, hr, op, up, 1 + k.w);
        expect(isDoor(id) && doorFamily(id) === 1 + k.w && woodOf(id) === k.w && isDoorOpen(id) === op && isDoorUpper(id) === up).toBe(true);
        expect(itemOfBlock(id)).toBe(k.door); expect(isOpenable(id) && isSolid(id) && !isFull(id)).toBe(true); expect(blockBoxes(id)!.length).toBe(1);
        expect(doorToggled(doorToggled(id))).toBe(id);
        if (!up) expect(modelOf(id)).toEqual({ kind: WOOD_DOOR_KINDS[k.w], turn: t + (op ? 4 : 0) + (hr ? 8 : 0) }); else expect(modelOf(id)).toBeNull();
      }
      for (let t = 0; t < 4; t++) for (const op of [false, true]) for (const top of [false, true]) {
        const id = trapdoorId(k.w, t, op, top);
        expect(isTrapdoor(id) && woodOf(id) === k.w && trapdoorTurn(id) === t && isTrapdoorOpen(id) === op && isTrapdoorTop(id) === top).toBe(true);
        expect(itemOfBlock(id)).toBe(k.trap); expect(isOpenable(id) && isSolid(id) && !isFull(id)).toBe(true);
        expect(modelOf(id)).toEqual({ kind: TRAPDOOR_KINDS[k.w * 3 + (op ? 2 : top ? 1 : 0)], turn: t }); expect(trapdoorToggled(trapdoorToggled(id))).toBe(id);
      }
    }
    expect(doorFamily(T.DOOR)).toBe(0); expect(itemOfBlock(T.DOOR)).toBe(Item.PORTA_JUNCO); expect(isItem(177)).toBe(false); // a porta de junco segue igual
  });

  it('alçapão: caixa fina embaixo, em cima ou de pé (aberto); o giro roda a placa aberta', () => {
    const h = (id: number) => blockBoxes(id)![0];
    expect(h(trapdoorId(0, 0, false, false))).toEqual([0, 0, 0, 1, 0.1875, 1]);
    expect(h(trapdoorId(0, 0, false, true))).toEqual([0, 0.8125, 0, 1, 1, 1]);
    expect(h(trapdoorId(0, 0, true, false))).toEqual([0, 0, 0, 1, 1, 0.1875]);
    const rot = h(trapdoorId(0, 1, true, false)); expect(rot[3] - rot[0]).toBeCloseTo(0.1875); expect(rot[5] - rot[2]).toBe(1); // virou para outro eixo
  });

  it('no jogo: a porta ocupa duas células, abre as duas metades, e quebrar devolve a porta de madeira (nunca a de junco)', async () => {
    const s = await open(), { x, y, z } = clear(s), v = s.volume;
    const slot = (item: number) => [...Array(36).keys()].find((i) => s.inventory.get(i)?.item === item)!;
    for (const k of WOODS) {
      const px = x - 2 + k.w * 2;
      s.inventory.add(k.door, 1); v.set(px, y - 1, z, T.STONE);
      expect(placeFromSlot(s, { x: px, y: y - 1, z, nx: 0, ny: 1, nz: 0 }, slot(k.door)).ok).toBe(true);
      const lo = v.get(px, y, z), hi = v.get(px, y + 1, z);
      expect(isDoor(lo) && isDoor(hi) && !isDoorUpper(lo) && isDoorUpper(hi) && doorFamily(lo) === 1 + k.w && doorFamily(hi) === 1 + k.w).toBe(true);
      s.body.x = px + 0.5; s.body.z = z + 3; s.body.y = y;
      expect(useDoor(s, px, y, z)).toMatchObject({ ok: true, open: true });
      expect(isDoorOpen(v.get(px, y, z)) && isDoorOpen(v.get(px, y + 1, z))).toBe(true);
      expect(useDoor(s, px, y + 1, z)).toMatchObject({ ok: true, open: false }); // tocar na metade de cima também vale
      expect(breakOrCollect(s, { x: px, y: y + 1, z, nx: 0, ny: 0, nz: 1 }).ok).toBe(true);
      expect(v.get(px, y, z)).toBe(T.AIR); expect(v.get(px, y + 1, z)).toBe(T.AIR);
      sweep(s); expect(s.inventory.total(k.door)).toBe(1); expect(s.inventory.total(Item.PORTA_JUNCO)).toBe(0);
    }
  });

  it('no jogo: o alçapão escolhe a metade pela face clicada, abre e fecha, e não prende o corpo', async () => {
    const s = await open(), { x, y, z } = clear(s), v = s.volume;
    s.inventory.add(Item.ALCAPAO_BETULA, 4);
    const slot = () => [...Array(36).keys()].find((i) => s.inventory.get(i)?.item === Item.ALCAPAO_BETULA)!;
    v.set(x, y - 1, z, T.STONE);
    expect(placeFromSlot(s, { x, y: y - 1, z, nx: 0, ny: 1, nz: 0 }, slot()).ok).toBe(true); // topo de um bloco: metade de baixo
    expect(isTrapdoorTop(v.get(x, y, z))).toBe(false);
    v.set(x + 2, y, z, T.STONE);
    expect(placeFromSlot(s, { x: x + 2, y, z, nx: 0, ny: -1, nz: 0 }, slot()).ok).toBe(true); // face de baixo de um bloco: metade de cima
    expect(isTrapdoorTop(v.get(x + 2, y - 1, z))).toBe(true);
    expect(placeFromSlot(s, { x: x + 2, y, z, nx: -1, ny: 0, nz: 0, hy: 0.8 }, slot()).ok).toBe(true); // lateral, metade de cima
    expect(isTrapdoorTop(v.get(x + 1, y, z))).toBe(true);
    s.body.x = x + 0.5 + 3; s.body.z = z + 0.5; s.body.y = y + 5;
    expect(useDoor(s, x, y, z)).toMatchObject({ ok: true, open: true });
    expect(isTrapdoorOpen(v.get(x, y, z))).toBe(true);
    const pb = blockBoxes(v.get(x, y, z))![0], cx = x + (pb[0] + pb[3]) / 2, cz = z + (pb[2] + pb[5]) / 2;
    expect(collides(v, cx, y, cz)).toBe(true); // aberto, de pé na borda: bloqueia
    expect(useDoor(s, x, y, z)).toMatchObject({ ok: true, open: false });
    expect(collides(v, x + 0.5, y + 0.5, z + 0.5)).toBe(false); // fechado embaixo: de pé acima dele
    expect(collides(v, x + 0.5, y, z + 0.5)).toBe(true);
    s.body.x = cx; s.body.z = cz; s.body.y = y; // fechado → aberto com o corpo exatamente onde a placa vai ficar
    expect(useDoor(s, x, y, z)).toMatchObject({ ok: false, msg: 'Tem alguém no caminho' });
  });
});
