import { describe, expect, it } from 'vitest';
import { breakOrCollect, placeFromSlot } from './actions';
import { Item, blockOfItem, itemOfBlock } from './items';
import { modelBox, LADDER_SIZE } from './models';
import { CLIMB_SLIDE, CLIMB_UP, ladderUnder, newBody, raycast, stepBody } from './physics';
import { recipeById } from './recipes';
import { MemoryTitanStorage } from './save';
import { flush, openSession } from './session';
import { sweep } from './dropTestUtil';
import { isCollectBlock, isFull, isLadder, isOccupied, isSolid, isTarget, ladderFacing, ladderId, ladderTurn, ladderTurnOf, blocksLight, modelOf, T, T_MAX } from './voxel';

/** Escada de Junco (ADR 0088): placa presa à lateral de um cubo inteiro, não sólida, que se sobe. */
const open = async (st = new MemoryTitanStorage()) => ({ st, s: await openSession(st, 42, () => 1, undefined, 2) });
const Y = 150;
/** Parede de rocha de 6 de altura em (x, z) e piso embaixo; devolve a célula da parede. */
const wall = (s: Awaited<ReturnType<typeof openSession>>, dx = 0) => {
  const a = s.volume.gen.arrival, x = Math.floor(a.x) + 6 + dx, z = Math.floor(a.z) + 6;
  for (let y = Y; y < Y + 6; y++) s.volume.set(x, y, z, T.DARK_ROCK);
  for (let xx = x - 2; xx <= x + 2; xx++) for (let zz = z - 2; zz <= z + 2; zz++) if (s.volume.get(xx, Y, zz) === T.AIR) s.volume.set(xx, Y, zz, T.DARK_ROCK);
  return { x, z };
};
const hold = (s: Awaited<ReturnType<typeof openSession>>) => { s.inventory.add(Item.ESCADA, 6); s.inventory.move([...Array(36).keys()].find((i) => s.inventory.get(i)?.item === Item.ESCADA)!, 0); };

describe('escada de junco: ids e regras do bloco', () => {
  it('4 giros no id, não sólida, alvo da mira, ocupa a célula, não bloqueia luz e recolhe rápido', () => {
    expect(T_MAX).toBe(T.LADDER_270);
    for (const [t, id] of [T.LADDER, T.LADDER_90, T.LADDER_180, T.LADDER_270].entries()) {
      expect(isLadder(id)).toBe(true); expect(ladderTurn(id)).toBe(t); expect(ladderId(t)).toBe(id);
      expect(isSolid(id)).toBe(false); expect(isFull(id)).toBe(false); expect(isTarget(id)).toBe(true); expect(isOccupied(id)).toBe(true); expect(blocksLight(id)).toBe(false); expect(isCollectBlock(id)).toBe(true);
      expect(modelOf(id)).toEqual({ kind: 'escada', turn: t }); expect(itemOfBlock(id)).toBe(Item.ESCADA);
    }
    expect(blockOfItem(Item.ESCADA)).toBe(T.LADDER);
  });
  it('a frente de cada giro e o giro de cada normal', () => {
    expect([0, 1, 2, 3].map(ladderFacing)).toEqual([[0, 1], [1, 0], [0, -1], [-1, 0]]);
    for (let t = 0; t < 4; t++) { const [fx, fz] = ladderFacing(t); expect(ladderTurnOf(fx, fz)).toBe(t); }
  });
  it('receita: 4 Hastes Secas na Mesa → 3 escadas', () => {
    expect(recipeById('escada')).toMatchObject({ station: 'workbench', group: 'construcao', result: { item: Item.ESCADA, count: 3 }, ingredients: [{ item: Item.DRY_REED, count: 4 }] });
  });
  it('a caixa da mira é a placa fina encostada na borda do apoio, nos 4 giros', () => {
    const d = LADDER_SIZE.d;
    expect(modelBox(T.LADDER, 10, 5, 10)).toEqual([10 + 0.5 - LADDER_SIZE.w / 2, 5, 10, 10 + 0.5 + LADDER_SIZE.w / 2, 6, 10 + d]); // frente +Z: apoio em z
    const b2 = modelBox(T.LADDER_180, 10, 5, 10); expect(b2[2]).toBeCloseTo(10 + 1 - d, 10); expect(b2[5]).toBe(11);
    const b1 = modelBox(T.LADDER_90, 10, 5, 10); expect(b1[0]).toBe(10); expect(b1[3]).toBeCloseTo(10 + d, 10);
    const b3 = modelBox(T.LADDER_270, 10, 5, 10); expect(b3[0]).toBeCloseTo(10 + 1 - d, 10); expect(b3[3]).toBe(11);
  });
});

describe('escada de junco na sessão', () => {
  it('prende-se à lateral de um cubo inteiro, com a frente para fora; não no topo, no ar nem em laje', async () => {
    const { s } = await open(); const w = wall(s); hold(s);
    const hit = { x: w.x, y: Y + 1, z: w.z, nx: 1, ny: 0, nz: 0 }; // lateral +X da parede
    expect(placeFromSlot(s, hit, 0).ok).toBe(true);
    expect(s.volume.get(w.x + 1, Y + 1, w.z)).toBe(T.LADDER_90); // frente +X
    expect(s.inventory.total(Item.ESCADA)).toBe(5);
    expect(placeFromSlot(s, { x: w.x, y: Y + 2, z: w.z, nx: 0, ny: 1, nz: 0 }, 0)).toMatchObject({ ok: false, msg: 'A escada se prende à lateral de um bloco' });
    s.volume.set(w.x, Y + 3, w.z, T.SLAB);
    expect(placeFromSlot(s, { x: w.x, y: Y + 3, z: w.z, nx: 0, ny: 0, nz: -1 }, 0)).toMatchObject({ ok: false, msg: 'A escada precisa de um bloco inteiro atrás' });
    expect(placeFromSlot(s, hit, 0).ok).toBe(false); // a célula já tem escada
  });
  it('as quatro faces dão os quatro giros', async () => {
    const { s } = await open(); const w = wall(s, 10); hold(s);
    for (const [nx, nz, id] of [[0, 1, T.LADDER], [1, 0, T.LADDER_90], [0, -1, T.LADDER_180], [-1, 0, T.LADDER_270]] as const) {
      expect(placeFromSlot(s, { x: w.x, y: Y + 1, z: w.z, nx, ny: 0, nz }, 0).ok).toBe(true);
      expect(s.volume.get(w.x + nx, Y + 1, w.z + nz)).toBe(id);
    }
  });
  it('a mira acerta a placa fina e o raio passa por onde não há escada', async () => {
    const { s } = await open(); const w = wall(s); hold(s); placeFromSlot(s, { x: w.x, y: Y + 1, z: w.z, nx: 1, ny: 0, nz: 0 }, 0);
    const h = raycast(s.volume, w.x + 4, Y + 1.5, w.z + 0.5, -1, 0, 0, 6, s.items);
    expect(h).toMatchObject({ x: w.x + 1, y: Y + 1, z: w.z, nx: 1 });
    expect(raycast(s.volume, w.x + 4, Y + 1.5, w.z + 0.95, -1, 0, 0, 6, s.items)).toMatchObject({ x: w.x, y: Y + 1, z: w.z }); // fora da largura da placa: acerta a parede
  });
  it('quebrar o bloco de apoio derruba as escadas presas a ele', async () => {
    const { s } = await open(); const w = wall(s); hold(s);
    placeFromSlot(s, { x: w.x, y: Y + 1, z: w.z, nx: 1, ny: 0, nz: 0 }, 0); placeFromSlot(s, { x: w.x, y: Y + 1, z: w.z, nx: 0, ny: 0, nz: 1 }, 0);
    expect(breakOrCollect(s, { x: w.x, y: Y + 1, z: w.z, nx: 0, ny: 1, nz: 0 }).ok).toBe(true);
    expect(s.volume.get(w.x + 1, Y + 1, w.z)).toBe(T.AIR); expect(s.volume.get(w.x, Y + 1, w.z + 1)).toBe(T.AIR);
    sweep(s); expect(s.inventory.total(Item.ESCADA)).toBe(6);
  });
  it('quebrar a escada devolve o item; persiste ao reabrir', async () => {
    const { st, s } = await open(); const w = wall(s); hold(s);
    placeFromSlot(s, { x: w.x, y: Y + 1, z: w.z, nx: 1, ny: 0, nz: 0 }, 0);
    await flush(st, s);
    const r = await openSession(st, null, () => 1);
    expect(r.volume.get(w.x + 1, Y + 1, w.z)).toBe(T.LADDER_90);
    expect(r.volume.modelCells('escada')).toEqual([[w.x + 1, Y + 1, w.z, 1]]);
    const h = raycast(r.volume, w.x + 4, Y + 1.5, w.z + 0.5, -1, 0, 0, 6, r.items)!;
    expect(breakOrCollect(r, h).ok).toBe(true); sweep(r);
    expect(r.volume.get(w.x + 1, Y + 1, w.z)).toBe(T.AIR); expect(r.inventory.total(Item.ESCADA)).toBe(6);
  });
});

describe('escalar', () => {
  /** Parede em x, escada de frente +X em (x + 1, Y + 1 … Y + 5): o corpo fica na célula da escada. */
  const climbSetup = async () => {
    const { s } = await open(); const w = wall(s);
    for (let y = Y + 1; y < Y + 6; y++) s.volume.set(w.x + 1, y, w.z, T.LADDER_90);
    const b = newBody(w.x + 1.5, Y + 1, w.z + 0.5);
    return { s, w, b };
  };
  it('empurrar para a parede ou pular sobe; sem comando escorrega devagar; sem gravidade nem dano de queda', async () => {
    const { s, b } = await climbSetup();
    expect(ladderUnder(s.volume, b)).toEqual([1, 0]);
    stepBody(s.volume, b, { dirX: -1, dirZ: 0, jump: false }, 0.25); // empurra para a parede (−X); um passo vale no máximo 0,25 s
    expect(b.onLadder).toBe(true); expect(b.y).toBeCloseTo(Y + 1 + CLIMB_UP * 0.25, 1); expect(b.vy).toBeCloseTo(CLIMB_UP, 6);
    const alto = b.y;
    stepBody(s.volume, b, { dirX: 0, dirZ: 0, jump: true }, 0.25); expect(b.y).toBeGreaterThan(alto); // pular também sobe
    const y1 = b.y; stepBody(s.volume, b, { dirX: 0, dirZ: 0, jump: false }, 0.25);
    expect(b.vy).toBeCloseTo(-CLIMB_SLIDE, 6); expect(y1 - b.y).toBeCloseTo(CLIMB_SLIDE * 0.25, 1); // soltar escorrega a 1,2 m/s
  });
  it('fora da escada a gravidade volta', async () => {
    const { s, w } = await climbSetup();
    const b = newBody(w.x + 3.5, Y + 4, w.z + 0.5);
    stepBody(s.volume, b, { dirX: 0, dirZ: 0, jump: false }, 0.25);
    expect(b.onLadder).toBe(false); expect(b.vy).toBeLessThan(-1);
  });
  it('ao chegar ao topo da parede o corpo para de subir quando a escada acaba', async () => {
    const { s, b } = await climbSetup();
    for (let i = 0; i < 40; i++) stepBody(s.volume, b, { dirX: -1, dirZ: 0, jump: false }, 0.1);
    expect(b.y).toBeLessThan(Y + 1 + 5 + 1); // a escada vai até Y + 5 (cinco segmentos): o corpo não passa muito do topo
    expect(b.y).toBeGreaterThan(Y + 3);
  });
});
