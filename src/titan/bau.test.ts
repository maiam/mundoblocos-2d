import { describe, expect, it } from 'vitest';
import { breakOrCollect, chestAt, chestMoveIn, chestTakeOut, placeFromSlot } from './actions';
import { CHEST_SLOTS, chestFromData, chestPut, chestRoom, chestToData, newChest } from './chest';
import { Item, blockOfItem, itemOfBlock, maxStack } from './items';
import { CHEST_SIZE, modelBox } from './models';
import { raycast } from './physics';
import { recipeById } from './recipes';
import { MemoryTitanStorage } from './save';
import { flush, openSession } from './session';
import { sweep } from './dropTestUtil';
import { CHEST_HEIGHT, blockSpan, blocksLight, chestId, chestTurn, chestTurnFacing, isChest, isFull, isSolid, isTarget, modelOf, T, T_MAX } from './voxel';

/** Baú de Rocha e Junco (ADR 0089): 18 espaços guardados no bloco, tudo ou nada, cospe o conteúdo ao quebrar e persiste. */
const open = async (st = new MemoryTitanStorage()) => ({ st, s: await openSession(st, 42, () => 1, undefined, 2) });
const Y = 150;
const pad = (s: Awaited<ReturnType<typeof openSession>>, dx = 0) => { const a = s.volume.gen.arrival, x = Math.floor(a.x) + 6 + dx, z = Math.floor(a.z) + 6; s.volume.set(x, Y, z, T.DARK_ROCK); return { x, z, hit: { x, y: Y, z, nx: 0, ny: 1, nz: 0 } }; };
const hold = (s: Awaited<ReturnType<typeof openSession>>, item: number, n = 1): number => { s.inventory.add(item, n); const i = [...Array(36).keys()].find((k) => s.inventory.get(k)?.item === item)!; return i; };

describe('baú: regras puras dos 18 espaços', () => {
  it('pôr é tudo ou nada: completa pilhas e depois usa espaços vazios', () => {
    const c = newChest();
    expect(c).toHaveLength(CHEST_SLOTS); expect(chestRoom(c, Item.SAND)).toBe(CHEST_SLOTS * maxStack(Item.SAND));
    expect(chestPut(c, { item: Item.SAND, count: 60 })).toBe(true);
    expect(chestPut(c, { item: Item.SAND, count: 10 })).toBe(true); // 4 completam a primeira pilha, 6 vão para a segunda
    expect(c[0]).toEqual({ item: Item.SAND, count: 64 }); expect(c[1]).toEqual({ item: Item.SAND, count: 6 });
    expect(chestPut(c, { item: Item.SAND, count: CHEST_SLOTS * 64 })).toBe(false); expect(c[1]!.count).toBe(6); // sem espaço: nada muda
  });
  it('a ferramenta desgastada leva o desgaste e não se funde', () => {
    const c = newChest();
    expect(chestPut(c, { item: Item.STONE_PICK, count: 1, wear: 5 })).toBe(true); expect(c[0]).toEqual({ item: Item.STONE_PICK, count: 1, wear: 5 });
  });
  it('save: ida e volta, e o lido é validado (item, contagem, desgaste, 18 espaços)', () => {
    const c = newChest(); chestPut(c, { item: Item.NOZ, count: 7 }); chestPut(c, { item: Item.STONE_PICK, count: 1, wear: 3 });
    expect(chestFromData(chestToData(c))).toEqual(c);
    const sujo = chestFromData([[999, 1], [Item.SAND, 0], [Item.SAND, 65], [Item.SAND, 2, 5], 'x', [Item.NOZ, 3], ...new Array(30).fill([Item.SAND, 1])]);
    expect(sujo).toHaveLength(CHEST_SLOTS); expect(sujo[0]).toBeNull(); expect(sujo[1]).toBeNull(); expect(sujo[2]).toBeNull();
    expect(sujo[3]).toEqual({ item: Item.SAND, count: 2 }); expect(sujo[4]).toBeNull(); expect(sujo[5]).toEqual({ item: Item.NOZ, count: 3 }); // desgaste só vale em ferramenta
    expect(chestFromData(null)).toEqual(newChest());
  });
});

describe('baú: ids e regras do bloco', () => {
  it('4 giros no id, sólido até 0,73 m, não é cubo, bloqueia luz, alvo da mira e modelo 3D', () => {
    expect(T_MAX).toBeGreaterThanOrEqual(T.CHEST_270); // a cama (ADR 0090) veio depois
    for (const [t, id] of [T.CHEST, T.CHEST_90, T.CHEST_180, T.CHEST_270].entries()) {
      expect(isChest(id)).toBe(true); expect(chestTurn(id)).toBe(t); expect(chestId(t)).toBe(id);
      expect(isSolid(id)).toBe(true); expect(isFull(id)).toBe(false); expect(blockSpan(id)).toEqual([0, CHEST_HEIGHT]); expect(blocksLight(id)).toBe(true); expect(isTarget(id)).toBe(true);
      expect(modelOf(id)).toEqual({ kind: 'bau', turn: t }); expect(itemOfBlock(id)).toBe(Item.BAU);
    }
    expect(blockOfItem(Item.BAU)).toBe(T.CHEST);
    expect([0, Math.PI / 2, Math.PI, -Math.PI / 2].map(chestTurnFacing)).toEqual([0, 1, 2, 3]);
  });
  it('receita: 4 Rochas Escuras + 1 Esteira na Mesa → 1 baú', () => {
    expect(recipeById('bau')).toMatchObject({ station: 'workbench', group: 'construcao', result: { item: Item.BAU, count: 1 }, ingredients: [{ item: Item.DARK_ROCK, count: 4 }, { item: Item.ESTEIRA, count: 1 }] });
  });
  it('a caixa da mira acompanha o giro (a largura vira profundidade nos ímpares)', () => {
    const b0 = modelBox(T.CHEST, 10, 5, 10), b1 = modelBox(T.CHEST_90, 10, 5, 10);
    expect(b0[3] - b0[0]).toBeCloseTo(CHEST_SIZE.w, 6); expect(b0[5] - b0[2]).toBeCloseTo(CHEST_SIZE.d, 6); expect(b0[4] - b0[1]).toBeCloseTo(CHEST_HEIGHT, 6);
    expect(b1[3] - b1[0]).toBeCloseTo(CHEST_SIZE.d, 6); expect(b1[5] - b1[2]).toBeCloseTo(CHEST_SIZE.w, 6);
  });
});

describe('baú na sessão', () => {
  it('coloca com a frente para o jogador, é alvo da mira e barra o corpo', async () => {
    const { s } = await open(); const f = pad(s); const slot = hold(s, Item.BAU); s.inventory.move(slot, 0); s.yaw = Math.PI / 2;
    expect(placeFromSlot(s, f.hit, 0).ok).toBe(true);
    expect(s.volume.get(f.x, Y + 1, f.z)).toBe(T.CHEST_90);
    expect(s.volume.modelCells('bau')).toEqual([[f.x, Y + 1, f.z, 1]]);
    expect(raycast(s.volume, f.x + 0.5, Y + 3, f.z + 0.5, 0, -1, 0, 6, s.items)).toMatchObject({ x: f.x, y: Y + 1, z: f.z, ny: 1 });
    expect(s.volume.bodySpan(f.x, Y + 1, f.z)).toEqual([0, CHEST_HEIGHT]);
  });
  it('guardar e retirar: tudo ou nada, mochila e baú mudam juntos', async () => {
    const { s } = await open(); const f = pad(s); const slot = hold(s, Item.BAU); s.inventory.move(slot, 0); placeFromSlot(s, f.hit, 0);
    const x = f.x, y = Y + 1, z = f.z;
    expect(chestAt(s, f.x, Y, f.z)).toBeNull(); // não é baú
    const ns = hold(s, Item.NOZ, 5);
    expect(chestMoveIn(s, x, y, z, ns).ok).toBe(true);
    expect(s.inventory.total(Item.NOZ)).toBe(0); expect(chestAt(s, x, y, z)![0]).toEqual({ item: Item.NOZ, count: 5 });
    expect(chestMoveIn(s, x, y, z, ns).ok).toBe(false); // espaço vazio da mochila: nada a guardar
    expect(chestTakeOut(s, x, y, z, 3).ok).toBe(false); // espaço vazio do baú
    expect(chestTakeOut(s, x, y, z, 0).ok).toBe(true); expect(s.inventory.total(Item.NOZ)).toBe(5); expect(chestAt(s, x, y, z)![0]).toBeNull();
  });
  it('baú cheio não aceita; mochila cheia não deixa tirar', async () => {
    const { s } = await open(); const f = pad(s); const slot = hold(s, Item.BAU); s.inventory.move(slot, 0); placeFromSlot(s, f.hit, 0);
    const x = f.x, y = Y + 1, z = f.z, c = chestAt(s, x, y, z)!;
    for (let i = 0; i < CHEST_SLOTS; i++) c[i] = { item: Item.SAND, count: 64 };
    const ns = hold(s, Item.NOZ, 2);
    expect(chestMoveIn(s, x, y, z, ns)).toEqual({ ok: false, msg: 'Baú cheio' }); expect(s.inventory.total(Item.NOZ)).toBe(2);
    let n = 0; while (s.inventory.canAdd(Item.SAND) && n++ < 5000) s.inventory.add(Item.SAND, 1);
    expect(chestTakeOut(s, x, y, z, 0)).toEqual({ ok: false, msg: 'Mochila cheia' }); expect(c[0]).toEqual({ item: Item.SAND, count: 64 });
  });
  it('quebrar o baú cospe o conteúdo e devolve o baú; o estado some', async () => {
    const { s } = await open(); const f = pad(s); const slot = hold(s, Item.BAU); s.inventory.move(slot, 0); placeFromSlot(s, f.hit, 0);
    const x = f.x, y = Y + 1, z = f.z; chestPut(chestAt(s, x, y, z)!, { item: Item.EMBER, count: 4 }); chestPut(chestAt(s, x, y, z)!, { item: Item.STONE_PICK, count: 1, wear: 7 });
    const h = raycast(s.volume, x + 0.5, Y + 3, z + 0.5, 0, -1, 0, 6, s.items)!;
    expect(breakOrCollect(s, h).ok).toBe(true);
    expect(s.volume.get(x, y, z)).toBe(T.AIR); expect(s.chests.size).toBe(0);
    expect([...s.drops.values()].filter((d) => d.id.startsWith('k:')).map((d) => [d.item, d.count ?? 1, d.wear ?? 0])).toEqual([[Item.EMBER, 4, 0], [Item.STONE_PICK, 1, 7]]);
    sweep(s);
    expect(s.inventory.total(Item.EMBER)).toBe(4); expect(s.inventory.total(Item.BAU)).toBe(1);
  });
  it('persiste o conteúdo ao reabrir; baú vazio não grava estado e baú que sumiu é descartado', async () => {
    const { st, s } = await open(); const f = pad(s); const slot = hold(s, Item.BAU); s.inventory.move(slot, 0); placeFromSlot(s, f.hit, 0);
    const x = f.x, y = Y + 1, z = f.z;
    chestPut(chestAt(s, x, y, z)!, { item: Item.NOZ, count: 9 }); s.metaRev++;
    await flush(st, s);
    const r = await openSession(st, null, () => 1);
    expect(chestAt(r, x, y, z)![0]).toEqual({ item: Item.NOZ, count: 9 });
    const h = st.games.get(42)!;
    h.chests = { ...(h.chests ?? {}), [`${x + 7},${y},${z}`]: [[Item.NOZ, 1]] }; // sem baú nessa célula
    const r2 = await openSession(st, null, () => 1);
    expect([...r2.chests.keys()]).toEqual([`${x},${y},${z}`]);
  });
});
