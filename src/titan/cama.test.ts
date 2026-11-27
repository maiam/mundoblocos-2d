import { describe, expect, it } from 'vitest';
import { bedSpawn, breakOrCollect, dieAndRespawn, placeFromSlot, useBed } from './actions';
import { Item, blockOfItem, itemOfBlock } from './items';
import { modelBox } from './models';
import { raycast } from './physics';
import { recipeById } from './recipes';
import { MemoryTitanStorage } from './save';
import { flush, openSession } from './session';
import { FIXED_HOURS, WAKE_TICKS, isNightTime, tickFrac } from './sky';
import { sweep } from './dropTestUtil';
import { BED_HEIGHT, bedFootId, bedHeadId, bedPartnerOffset, bedTurn, bedTurnFacing, blockSpan, blocksLight, isBed, isBedFoot, isBedHead, isFull, isModelBlock, isSolid, isTarget, modelOf, T, T_MAX } from './voxel';

/** Cama de Junco (ADR 0090): duas células, ponto de retorno e sono até o amanhecer. */
const open = async (st = new MemoryTitanStorage()) => ({ st, s: await openSession(st, 42, () => 1, undefined, 2) });
const Y = 150;
/** Piso de rocha 7 × 7 em Y e o centro dele; devolve a célula de apoio para colocar. */
const floor = (s: Awaited<ReturnType<typeof openSession>>, dx = 0) => {
  const a = s.volume.gen.arrival, x = Math.floor(a.x) + 6 + dx, z = Math.floor(a.z) + 6;
  for (let xx = x - 3; xx <= x + 3; xx++) for (let zz = z - 3; zz <= z + 3; zz++) { s.volume.set(xx, Y, zz, T.DARK_ROCK); for (let yy = Y + 1; yy < Y + 4; yy++) s.volume.set(xx, yy, zz, T.AIR); }
  return { x, z, hit: { x, y: Y, z, nx: 0, ny: 1, nz: 0 } };
};
const hold = (s: Awaited<ReturnType<typeof openSession>>): void => { s.inventory.add(Item.CAMA, 2); s.inventory.move([...Array(36).keys()].find((k) => s.inventory.get(k)?.item === Item.CAMA)!, 0); };
const away = (s: Awaited<ReturnType<typeof openSession>>, f: { x: number; z: number }) => { s.body.x = f.x + 20.5; s.body.z = f.z + 20.5; s.body.y = Y + 1; }; // o corpo fora do caminho

describe('cama: ids e regras do bloco', () => {
  it('pé e cabeceira com o giro no id, sólidos até 0,45 m, não cubo; só o pé tem instância', () => {
    expect(T_MAX).toBeGreaterThanOrEqual(T.BED_HEAD_270); // a família do Junco (ADR 0100) veio depois
    for (let t = 0; t < 4; t++) {
      const foot = bedFootId(t), head = bedHeadId(t);
      expect(isBedFoot(foot)).toBe(true); expect(isBedHead(head)).toBe(true); expect(isBed(foot) && isBed(head)).toBe(true); expect(bedTurn(foot)).toBe(t); expect(bedTurn(head)).toBe(t);
      for (const id of [foot, head]) { expect(isSolid(id)).toBe(true); expect(isFull(id)).toBe(false); expect(blockSpan(id)).toEqual([0, BED_HEIGHT]); expect(blocksLight(id)).toBe(false); expect(isTarget(id)).toBe(true); expect(isModelBlock(id)).toBe(true); expect(itemOfBlock(id)).toBe(Item.CAMA); }
      expect(modelOf(foot)).toEqual({ kind: 'cama', turn: t }); expect(modelOf(head)).toBeNull();
    }
    expect(blockOfItem(Item.CAMA)).toBe(T.BED);
  });
  it('a cabeceira fica uma célula adiante do pé no giro, e uma atrás para o outro lado', () => {
    expect([0, 1, 2, 3].map((t) => bedPartnerOffset(bedFootId(t)))).toEqual([[0, 1], [1, 0], [0, -1], [-1, 0]]);
    expect([0, 1, 2, 3].map((t) => bedPartnerOffset(bedHeadId(t)))).toEqual([[0, -1], [-1, 0], [0, 1], [1, 0]]);
  });
  it('a cabeceira vai para longe do jogador (no sentido do olhar)', () => {
    expect(bedTurnFacing(0)).toBe(2); // olhando −Z, a cabeceira em −Z
    expect(bedTurnFacing(Math.PI / 2)).toBe(3); // olhando −X
    expect(bedTurnFacing(Math.PI)).toBe(0); // olhando +Z
    expect(bedTurnFacing(-Math.PI / 2)).toBe(1); // olhando +X
  });
  it('receita: 3 Rochas Escuras + 2 Esteiras na Mesa → 1 cama', () => {
    expect(recipeById('cama')).toMatchObject({ station: 'workbench', group: 'construcao', result: { item: Item.CAMA, count: 1 }, ingredients: [{ item: Item.DARK_ROCK, count: 3 }, { item: Item.ESTEIRA, count: 2 }] });
  });
  it('a caixa da mira de cada metade é a célula inteira até a altura da cama', () => {
    const b = modelBox(T.BED_HEAD_180, 4, 7, 9);
    expect(b).toEqual([4, 7, 9, 5, 7 + BED_HEIGHT, 10]);
  });
  it('de noite é a partir do fim do pôr do sol; de manhã e à tarde não', () => {
    expect(isNightTime(FIXED_HOURS.noite)).toBe(true); expect(isNightTime(FIXED_HOURS.tarde)).toBe(false); expect(isNightTime(FIXED_HOURS.manha)).toBe(false); expect(isNightTime(FIXED_HOURS.crepusculo)).toBe(false);
  });
});

describe('cama na sessão', () => {
  it('coloca as duas células no sentido do olhar, com piso firme, e só o pé tem instância', async () => {
    const { s } = await open(); const f = floor(s); hold(s); away(s, f); s.yaw = 0; // olha −Z: a cabeceira em −Z
    expect(placeFromSlot(s, f.hit, 0).ok).toBe(true);
    expect(s.volume.get(f.x, Y + 1, f.z)).toBe(T.BED_180); expect(s.volume.get(f.x, Y + 1, f.z - 1)).toBe(T.BED_HEAD_180);
    expect(s.inventory.total(Item.CAMA)).toBe(1);
    expect(s.volume.modelCells('cama')).toEqual([[f.x, Y + 1, f.z, 2]]);
    expect(raycast(s.volume, f.x + 0.5, Y + 3, f.z - 0.5, 0, -1, 0, 6, s.items)).toMatchObject({ x: f.x, y: Y + 1, z: f.z - 1 }); // a mira acerta a cabeceira
    expect(s.volume.bodySpan(f.x, Y + 1, f.z - 1)).toEqual([0, BED_HEIGHT]);
  });
  it('recusa sem piso firme numa das células ou com a cabeceira ocupada', async () => {
    const { s } = await open(); const f = floor(s); hold(s); away(s, f); s.yaw = 0;
    s.volume.remove(f.x, Y, f.z - 1); // sem piso sob a cabeceira
    expect(placeFromSlot(s, f.hit, 0)).toMatchObject({ ok: false, msg: 'A cama precisa de piso firme nas duas células' });
    s.volume.set(f.x, Y, f.z - 1, T.DARK_ROCK); s.volume.set(f.x, Y + 1, f.z - 1, T.DARK_ROCK); // cabeceira ocupada
    expect(placeFromSlot(s, f.hit, 0).ok).toBe(false);
    expect(s.volume.get(f.x, Y + 1, f.z)).toBe(T.AIR); expect(s.inventory.total(Item.CAMA)).toBe(2); // nada ficou pela metade
  });
  it('quebrar qualquer metade tira a cama inteira e devolve uma; sem o piso ela cai', async () => {
    const { s } = await open(); const f = floor(s); hold(s); away(s, f); s.yaw = 0;
    placeFromSlot(s, f.hit, 0);
    const head = raycast(s.volume, f.x + 0.5, Y + 3, f.z - 0.5, 0, -1, 0, 6, s.items)!;
    expect(breakOrCollect(s, head).ok).toBe(true); sweep(s);
    expect(s.volume.get(f.x, Y + 1, f.z)).toBe(T.AIR); expect(s.volume.get(f.x, Y + 1, f.z - 1)).toBe(T.AIR); expect(s.inventory.total(Item.CAMA)).toBe(2);
    hold(s); placeFromSlot(s, f.hit, 0);
    expect(breakOrCollect(s, { x: f.x, y: Y, z: f.z - 1, nx: 0, ny: 1, nz: 0 }).ok).toBe(true); // o piso sob a cabeceira
    expect(s.volume.get(f.x, Y + 1, f.z)).toBe(T.AIR); expect(s.volume.get(f.x, Y + 1, f.z - 1)).toBe(T.AIR);
    sweep(s); expect(s.inventory.total(Item.CAMA)).toBe(4); // as duas do início (2 − 1 + 1) e as outras duas (2 − 1 + 1)
  });
  it('usar de dia só marca o ponto de retorno; de noite dorme até o amanhecer e soma um dia', async () => {
    const { s } = await open(); const f = floor(s); hold(s); away(s, f); s.yaw = 0; placeFromSlot(s, f.hit, 0);
    s.time = FIXED_HOURS.tarde; const d0 = s.days;
    expect(useBed(s, f.x, Y + 1, f.z - 1)).toMatchObject({ ok: true, msg: 'Ponto de retorno marcado. Só se dorme à noite.' }); // pela cabeceira
    expect(s.spawn).toEqual({ x: f.x, y: Y + 1, z: f.z }); expect(s.time).toBe(FIXED_HOURS.tarde); expect(s.days).toBe(d0);
    s.time = FIXED_HOURS.noite;
    expect(useBed(s, f.x, Y + 1, f.z)).toMatchObject({ ok: true, msg: 'Você dormiu até o amanhecer. Ponto de retorno marcado.' });
    expect(s.time).toBeCloseTo(tickFrac(WAKE_TICKS), 10); expect(s.days).toBe(d0 + 1);
    expect(useBed(s, f.x + 5, Y + 1, f.z).ok).toBe(false); // não é cama
  });
  it('ao morrer renasce ao lado da cama; sem a cama volta à chegada', async () => {
    const { s } = await open(); const f = floor(s); hold(s); away(s, f); s.yaw = 0; placeFromSlot(s, f.hit, 0);
    useBed(s, f.x, Y + 1, f.z);
    const b = bedSpawn(s)!;
    expect(b).not.toBeNull(); expect(b.y).toBe(Y + 1);
    expect([[f.x, f.z], [f.x, f.z - 1]].some(([cx, cz]) => Math.abs(b.x - (cx + 0.5)) + Math.abs(b.z - (cz + 0.5)) <= 1.01)).toBe(true); // colado numa das células
    dieAndRespawn(s);
    expect(s.body.y).toBe(Y + 1); expect(Math.floor(s.body.x)).toBe(Math.floor(b.x));
    breakOrCollect(s, { x: f.x, y: Y + 1, z: f.z, nx: 0, ny: 1, nz: 0 });
    expect(bedSpawn(s)).toBeNull();
    const a = s.volume.gen.arrival; dieAndRespawn(s);
    expect(s.body.x).toBe(a.x); expect(s.body.z).toBe(a.z);
  });
  it('persiste o ponto de retorno e descarta o que não aponta para uma cama', async () => {
    const { st, s } = await open(); const f = floor(s); hold(s); away(s, f); s.yaw = 0; placeFromSlot(s, f.hit, 0);
    useBed(s, f.x, Y + 1, f.z);
    await flush(st, s);
    const r = await openSession(st, null, () => 1);
    expect(r.spawn).toEqual({ x: f.x, y: Y + 1, z: f.z });
    expect(r.volume.modelCells('cama')).toEqual([[f.x, Y + 1, f.z, 2]]);
    const h = st.games.get(42)!; h.spawn = { x: f.x + 9, y: Y + 1, z: f.z };
    expect((await openSession(st, null, () => 1)).spawn).toBeNull();
  });
});
