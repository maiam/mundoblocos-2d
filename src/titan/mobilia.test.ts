import { describe, expect, it } from 'vitest';
import { breakOrCollect, placeFromSlot } from './actions';
import { Item, blockOfItem, isItem, itemOfBlock } from './items';
import { newBody, raycast, stepBody, type Body } from './physics';
import { recipeById } from './recipes';
import { MemoryTitanStorage } from './save';
import { flush, openSession } from './session';
import { sweep } from './dropTestUtil';
import { T, T_MAX, blockBoxes, blockSpan, chairId, chairTurn, isChair, isFull, isModelBlock, isSolid, isStair, marcoTurnFacing, modelOf, stairId, stairTurn } from './voxel';

/** Degrau e Cadeira de Junco (ADR 0101): sólidos de várias caixas (colisão e mira por caixa) e modelos instanciados. */
const open = async () => openSession(new MemoryTitanStorage(), 42, () => 1, undefined, 2);
type S = Awaited<ReturnType<typeof openSession>>;
const Y = 150;
const floor = (s: S) => {
  const a = s.volume.gen.arrival, x = Math.floor(a.x) + 6, z = Math.floor(a.z) + 6;
  for (let dx = -4; dx <= 4; dx++) for (let dz = -4; dz <= 4; dz++) { s.volume.set(x + dx, Y - 1, z + dz, T.DARK_ROCK); for (let yy = Y; yy < Y + 5; yy++) s.volume.set(x + dx, yy, z + dz, T.AIR); }
  s.body.x = x + 20.5; s.body.z = z + 20.5; s.body.y = Y;
  return { x, z };
};
const hold = (s: S, item: number): void => { s.inventory.add(item, 5); const k = [...Array(36).keys()].find((i) => s.inventory.get(i)?.item === item)!; s.inventory.move(k, 0); s.selected = 0; };
const walk = (s: S, b: Body, dirX: number, dirZ: number, secs: number): number => { let top = b.y; for (let t = 0; t < secs; t += 0.025) { stepBody(s.volume, b, { dirX, dirZ, jump: false }, 0.025); top = Math.max(top, b.y); } return top; };

describe('degrau e cadeira: regras do bloco', () => {
  it('ids 50–53 e 54–57 com o giro no id, itens 39 e 40, receitas na Mesa, modelo instanciado', () => {
    expect(T_MAX).toBeGreaterThanOrEqual(T.REED_CHAIR_270);
    expect(isItem(Item.DEGRAU_JUNCO) && isItem(Item.CADEIRA_JUNCO) && isItem(Item.PORTA_JUNCO) && !isItem(70)).toBe(true);
    for (let t = 0; t < 4; t++) {
      const s = stairId(t), c = chairId(t);
      expect(isStair(s) && isChair(c) && stairTurn(s) === t && chairTurn(c) === t).toBe(true);
      expect(isSolid(s) && !isFull(s) && isSolid(c) && !isFull(c)).toBe(true);
      expect(modelOf(s)).toEqual({ kind: 'degrau', turn: t }); expect(modelOf(c)).toEqual({ kind: 'cadeira', turn: t });
      expect(isModelBlock(s) && isModelBlock(c)).toBe(true); expect(blockSpan(s)).toEqual([0, 1]);
      expect(itemOfBlock(s)).toBe(Item.DEGRAU_JUNCO); expect(itemOfBlock(c)).toBe(Item.CADEIRA_JUNCO);
    }
    expect(blockOfItem(Item.DEGRAU_JUNCO)).toBe(T.REED_STAIR); expect(blockOfItem(Item.CADEIRA_JUNCO)).toBe(T.REED_CHAIR);
    expect(recipeById('degrau-junco')).toMatchObject({ station: 'workbench', result: { item: Item.DEGRAU_JUNCO, count: 4 }, ingredients: [{ item: Item.BLOCO_JUNCO, count: 3 }] });
    expect(recipeById('cadeira-junco')).toMatchObject({ station: 'workbench', result: { item: Item.CADEIRA_JUNCO, count: 1 }, ingredients: [{ item: Item.DRY_REED, count: 3 }, { item: Item.ESTEIRA, count: 1 }] });
  });
  it('as caixas giram com o bloco: o patamar alto do degrau fica sempre no lado oposto à frente', () => {
    // frente em +Z (giro 0): o patamar de cima na metade de trás (−Z); frente +X (giro 1): metade −X; frente −Z (giro 2): +Z; frente −X (giro 3): +X
    const up = (t: number) => blockBoxes(stairId(t))![1];
    expect(up(0)).toEqual([0, 0.5, 0, 1, 1, 0.5]); expect(up(1)).toEqual([0, 0.5, 0, 0.5, 1, 1]);
    expect(up(2)).toEqual([0, 0.5, 0.5, 1, 1, 1]); expect(up(3)).toEqual([0.5, 0.5, 0, 1, 1, 1]);
    expect(blockBoxes(stairId(0))![0]).toEqual([0, 0, 0, 1, 0.5, 1]); // o patamar de baixo é a célula inteira
    const back = (t: number) => blockBoxes(chairId(t))![1]; // o encosto atrás do assento
    expect(back(0)[5]).toBeCloseTo(0.22); expect(back(1)[3]).toBeCloseTo(0.22); expect(back(2)[2]).toBeCloseTo(0.78); expect(back(3)[0]).toBeCloseTo(0.78);
    expect(blockBoxes(T.DARK_ROCK)).toBeNull();
  });
});

describe('degrau e cadeira: física e mira por caixa', () => {
  it('sobe o degrau andando (patamar de baixo e depois o de cima) e fica em cima dele', async () => {
    const s = await open(); const { x, z } = floor(s);
    s.volume.set(x, Y, z, stairId(0)); // frente em +Z: sobe-se vindo de +Z
    const b = newBody(x + 0.5, Y, z + 2.5);
    expect(walk(s, b, 0, -1, 0.5)).toBeCloseTo(Y + 1, 1); // 0,5 s depois está em cima do patamar alto, ainda dentro da célula
    expect(b.onGround).toBe(true); expect(b.y).toBeCloseTo(Y + 1, 1);
  });
  it('o vão é livre: de pé na frente, sob o patamar de cima a cabeça bate no teto do degrau de 1 m só no lado alto', async () => {
    const s = await open(); const { x, z } = floor(s);
    s.volume.set(x, Y, z, stairId(0));
    const b = newBody(x + 0.5, Y + 1, z + 0.25); // em cima do patamar alto
    stepBody(s.volume, b, { dirX: 0, dirZ: 0, jump: false }, 0.05); expect(b.onGround).toBe(true); expect(b.y).toBeCloseTo(Y + 1, 2);
    const f = newBody(x + 0.5, Y + 0.5, z + 0.75); // em cima do patamar baixo, na frente
    stepBody(s.volume, f, { dirX: 0, dirZ: 0, jump: false }, 0.05); expect(f.onGround).toBe(true); expect(f.y).toBeCloseTo(Y + 0.5, 2);
  });
  it('a cadeira barra o corpo no assento (0,5) e no encosto, e o corpo sobe nela andando', async () => {
    const s = await open(); const { x, z } = floor(s);
    s.volume.set(x, Y, z, chairId(0));
    const b = newBody(x + 0.5, Y, z + 2.5);
    walk(s, b, 0, -1, 0.45); // anda contra o assento: o degrau automático de meia altura o põe em cima
    expect(b.y).toBeGreaterThanOrEqual(Y + 0.49);
    const t = newBody(x + 0.5, Y, z - 1.5); // por trás, contra o encosto de 1 m
    walk(s, t, 0, 1, 0.4); expect(t.z).toBeLessThan(z + 0.1); // barrado pelo encosto no lado de trás
  });
  it('o raio acerta o patamar certo do degrau, a parede do patamar alto e passa pelo vão', async () => {
    const s = await open(); const { x, z } = floor(s); s.volume.set(x, Y, z, stairId(0));
    const front = raycast(s.volume, x + 0.5, Y + 2, z + 0.75, 0, -1, 0, 6)!; // de cima na metade da frente
    expect([front.x, front.y, front.z, front.ny]).toEqual([x, Y, z, 1]); expect(front.box![4]).toBeCloseTo(Y + 0.5);
    const back = raycast(s.volume, x + 0.5, Y + 2, z + 0.25, 0, -1, 0, 6)!; // de cima na metade de trás
    expect(back.box![4]).toBeCloseTo(Y + 1);
    const wall = raycast(s.volume, x + 0.5, Y + 0.75, z + 3, 0, 0, -1, 6)!; // raio horizontal acima do patamar baixo: bate na face do patamar alto
    expect([wall.nx, wall.nz]).toEqual([0, 1]); expect(wall.box![2]).toBeCloseTo(z); expect(wall.box![5]).toBeCloseTo(z + 0.5);
    expect(raycast(s.volume, x + 0.5, Y + 0.9, z + 0.9, 1, 0, 0, 3)).toBeNull(); // no vão acima do patamar baixo, saindo para o lado: nada
  });
});

describe('degrau e cadeira: colocar, quebrar e salvar', () => {
  it('coloca com a frente voltada para o jogador, quebra e devolve o item', async () => {
    const s = await open(); const { x, z } = floor(s); hold(s, Item.DEGRAU_JUNCO);
    s.yaw = 0; // olhando −Z: a frente do degrau fica em +Z, para o jogador (giro 0)
    expect(placeFromSlot(s, { x, y: Y - 1, z, nx: 0, ny: 1, nz: 0 }, 0).ok).toBe(true);
    expect(s.volume.get(x, Y, z)).toBe(stairId(marcoTurnFacing(0))); expect(s.volume.get(x, Y, z)).toBe(T.REED_STAIR);
    s.yaw = -Math.PI / 2; // olhando +X: a frente aponta para −X (giro 3)
    expect(placeFromSlot(s, { x: x + 1, y: Y - 1, z, nx: 0, ny: 1, nz: 0 }, 0).ok).toBe(true);
    expect(stairTurn(s.volume.get(x + 1, Y, z))).toBe(marcoTurnFacing(-Math.PI / 2));
    expect(s.volume.modelCells('degrau')).toHaveLength(2);
    expect(breakOrCollect(s, { x, y: Y, z, nx: 0, ny: 1, nz: 0 }).ok).toBe(true); sweep(s);
    expect(s.volume.get(x, Y, z)).toBe(T.AIR); expect(s.inventory.total(Item.DEGRAU_JUNCO)).toBe(4);
    expect(s.volume.modelCells('degrau')).toHaveLength(1);
  });
  it('a cadeira também: colocar, modelo, quebrar e salvar', async () => {
    const st = new MemoryTitanStorage(); const s = await openSession(st, 42, () => 1, undefined, 2); const { x, z } = floor(s); hold(s, Item.CADEIRA_JUNCO);
    s.yaw = Math.PI; expect(placeFromSlot(s, { x, y: Y - 1, z, nx: 0, ny: 1, nz: 0 }, 0).ok).toBe(true);
    const id = s.volume.get(x, Y, z); expect(isChair(id)).toBe(true); expect(s.volume.modelCells('cadeira')).toEqual([[x, Y, z, chairTurn(id)]]);
    await flush(st, s);
    const r = await openSession(st, null, () => 1);
    expect(r.volume.get(x, Y, z)).toBe(id); expect(r.volume.modelCells('cadeira')).toEqual([[x, Y, z, chairTurn(id)]]);
    expect(breakOrCollect(s, { x, y: Y, z, nx: 0, ny: 1, nz: 0 }).ok).toBe(true); sweep(s); expect(s.inventory.total(Item.CADEIRA_JUNCO)).toBe(5);
  });
});
