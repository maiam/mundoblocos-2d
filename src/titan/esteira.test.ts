import { describe, expect, it } from 'vitest';
import { breakOrCollect, matSupported, placeFromSlot } from './actions';
import { Item, blockOfItem, itemOfBlock } from './items';
import { meshSection } from './mesher';
import { raycast } from './physics';
import { recipeById } from './recipes';
import { MemoryTitanStorage } from './save';
import { flush, openSession } from './session';
import { surfaceOf } from './sounds';
import { blockHeight, blockSpan, blocksLight, isCollectBlock, isFull, isMat, isOccupied, isSolid, isTarget, MAT_HEIGHT, T, tileFor } from './voxel';
import { sweep } from './dropTestUtil';

/** Esteira de Junco (ADR 0085): peça fina de piso, sem colisão, com apoio, no modelo das placas de pressão sem a pressão. */
const open = async (st = new MemoryTitanStorage()) => ({ st, s: await openSession(st, 42, () => 1, undefined, 2) });
const Y = 150;
const pad = (s: Awaited<ReturnType<typeof openSession>>, dx = 0) => { const a = s.volume.gen.arrival, x = Math.floor(a.x) + 6 + dx, z = Math.floor(a.z) + 6; s.volume.set(x, Y, z, T.DARK_ROCK); return { x, z, hit: { x, y: Y, z, nx: 0, ny: 1, nz: 0 } }; };
const hold = (s: Awaited<ReturnType<typeof openSession>>) => { s.inventory.add(Item.ESTEIRA, 3); s.inventory.move([...Array(36).keys()].find((i) => s.inventory.get(i)?.item === Item.ESTEIRA)!, 0); };

describe('esteira de junco: propriedades do bloco', () => {
  it('fina, sem colisão, mas alvo da mira e ocupa a célula', () => {
    expect(isMat(T.MAT)).toBe(true); expect(MAT_HEIGHT).toBe(0.0625);
    expect(isSolid(T.MAT)).toBe(false); expect(blockSpan(T.MAT)).toEqual([0, 0]); expect(blockHeight(T.MAT)).toBe(0); expect(isFull(T.MAT)).toBe(false);
    expect(isTarget(T.MAT)).toBe(true); expect(isOccupied(T.MAT)).toBe(true); expect(blocksLight(T.MAT)).toBe(false); expect(isCollectBlock(T.MAT)).toBe(true);
    expect(blockOfItem(Item.ESTEIRA)).toBe(T.MAT); expect(itemOfBlock(T.MAT)).toBe(Item.ESTEIRA); expect(surfaceOf(T.MAT)).toBe('sand');
    expect(tileFor(T.MAT, 'top')).not.toBe(tileFor(T.MAT, 'side'));
  });
  it('receita: 3 Hastes Secas na Mesa → 1 esteira', () => {
    expect(recipeById('esteira')).toMatchObject({ station: 'workbench', group: 'construcao', result: { item: Item.ESTEIRA, count: 1 }, ingredients: [{ item: Item.DRY_REED, count: 3 }] });
  });
});

describe('esteira de junco na sessão', () => {
  it('coloca sobre piso firme e não sobre o ar nem na lateral', async () => {
    const { s } = await open(); const f = pad(s); hold(s);
    expect(matSupported(s, f.x, Y + 1, f.z)).toBe(true);
    expect(placeFromSlot(s, f.hit, 0).ok).toBe(true);
    expect(s.volume.get(f.x, Y + 1, f.z)).toBe(T.MAT);
    expect(s.inventory.total(Item.ESTEIRA)).toBe(2);
    expect(placeFromSlot(s, f.hit, 0).ok).toBe(false); // a célula já está ocupada
    expect(placeFromSlot(s, { ...f.hit, nx: 1, ny: 0 }, 0)).toMatchObject({ ok: false, msg: 'A esteira precisa de piso firme' }); // ao lado: sem piso embaixo
  });
  it('laje inferior não é piso firme; laje superior e cubo são', async () => {
    const { s } = await open(); const f = pad(s);
    s.volume.set(f.x, Y, f.z, T.SLAB); expect(matSupported(s, f.x, Y + 1, f.z)).toBe(false);
    s.volume.set(f.x, Y, f.z, T.SLAB_TOP); expect(matSupported(s, f.x, Y + 1, f.z)).toBe(true);
    s.volume.set(f.x, Y, f.z, T.SLAB_DOUBLE); expect(matSupported(s, f.x, Y + 1, f.z)).toBe(true);
  });
  it('a mira acerta só a faixa fina de cima; o corpo atravessa', async () => {
    const { s } = await open(); const f = pad(s); hold(s); placeFromSlot(s, f.hit, 0);
    const cx = f.x + 0.5, cz = f.z + 0.5;
    const h = raycast(s.volume, cx, Y + 3, cz, 0, -1, 0, 6, s.items);
    expect(h).toMatchObject({ x: f.x, y: Y + 1, z: f.z, ny: 1 });
    expect(h!.box![4]).toBeCloseTo(Y + 1 + MAT_HEIGHT, 6);
    expect(raycast(s.volume, f.x - 2, Y + 1.5, cz, 1, 0, 0, 6, s.items)).toBeNull(); // rente ao chão mas acima de 1/16 m: o raio passa por cima da esteira
    expect(raycast(s.volume, f.x - 2, Y + 1.03, cz, 1, 0, 0, 6, s.items)).toMatchObject({ x: f.x, y: Y + 1, nx: -1 }); // dentro da faixa fina: acerta a lateral
    expect(s.volume.bodySpan(f.x, Y + 1, f.z)).toEqual([0, 0]); // sem colisão
  });
  it('a malha é fina: o topo a 1/16 m e laterais só nas bordas livres', async () => {
    const { s } = await open(); const f = pad(s); hold(s); placeFromSlot(s, f.hit, 0);
    const cx = Math.floor(f.x / 16), cz = Math.floor(f.z / 16), sy = Math.floor((Y + 1 - -64) / 16);
    const m = meshSection(s.volume, cx, sy, cz).opaque!;
    const ys: number[] = []; for (let i = 1; i < m.pos.length; i += 3) ys.push(m.pos[i]);
    const inCell = [...Array(m.pos.length / 3).keys()].filter((i) => m.pos[i * 3] >= f.x && m.pos[i * 3] <= f.x + 1 && m.pos[i * 3 + 2] >= f.z && m.pos[i * 3 + 2] <= f.z + 1 && m.pos[i * 3 + 1] > Y + 1 - 1e-6 && m.pos[i * 3 + 1] <= Y + 1 + MAT_HEIGHT + 1e-6);
    expect(inCell.length).toBeGreaterThanOrEqual(4 + 4 * 4); // topo (4) + 4 laterais (16)
    expect(Math.max(...inCell.map((i) => m.pos[i * 3 + 1]))).toBeCloseTo(Y + 1 + MAT_HEIGHT, 6);
    expect(ys.length).toBeGreaterThan(0);
  });
  it('quebrar a esteira devolve o item no chão; quebrar o piso derruba a esteira', async () => {
    const { s } = await open(); const f = pad(s); hold(s); placeFromSlot(s, f.hit, 0);
    const mh = raycast(s.volume, f.x + 0.5, Y + 3, f.z + 0.5, 0, -1, 0, 6, s.items)!;
    expect(breakOrCollect(s, mh).ok).toBe(true); sweep(s);
    expect(s.volume.get(f.x, Y + 1, f.z)).toBe(T.AIR); expect(s.inventory.total(Item.ESTEIRA)).toBe(3);
    placeFromSlot(s, f.hit, 0);
    expect(breakOrCollect(s, f.hit).ok).toBe(true); // o piso
    expect(s.volume.get(f.x, Y + 1, f.z)).toBe(T.AIR);
    expect([...s.drops.values()].some((d) => d.item === Item.ESTEIRA)).toBe(true);
    expect(sweep(s)).toBeGreaterThanOrEqual(1); // a esteira (e o bloco do piso) caíram até o chão e se recolhem por proximidade
    expect(s.inventory.total(Item.ESTEIRA)).toBe(3);
  });
  it('persiste ao reabrir (edição de chunk)', async () => {
    const { st, s } = await open(); const f = pad(s); hold(s); placeFromSlot(s, f.hit, 0);
    await flush(st, s);
    const r = await openSession(st, null, () => 1);
    expect(r.volume.get(f.x, Y + 1, f.z)).toBe(T.MAT);
  });
});
