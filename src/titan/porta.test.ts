import { describe, expect, it } from 'vitest';
import { breakOrCollect, doorHingeFor, placeFromSlot, useDoor } from './actions';
import { doorAngle, doorMoving, doorPivot, stepDoor, DOOR_PIVOT } from './doorPose';
import { Item, blockOfItem, isItem, itemOfBlock } from './items';
import { newBody, raycast, stepBody } from './physics';
import { recipeById } from './recipes';
import { MemoryTitanStorage } from './save';
import { openSession } from './session';
import { surfaceOf } from './sounds';
import { sweep } from './dropTestUtil';
import { DOOR_THICK, T, T_MAX, blockBoxes, doorId, doorRight, doorToggled, doorTurn, isDoor, isDoorHingeRight, isDoorOpen, isDoorUpper, isFull, isModelBlock, isSolid, modelOf } from './voxel';

/** Porta de Junco (ADR 0102): duas células, estado no id, dobradiça automática, abrir e fechar, colisão por caixa. */
const open = async () => openSession(new MemoryTitanStorage(), 42, () => 1, undefined, 2);
type S = Awaited<ReturnType<typeof open>>;
const Y = 150;
const floor = (s: S) => {
  const a = s.volume.gen.arrival, x = Math.floor(a.x) + 6, z = Math.floor(a.z) + 6;
  for (let dx = -4; dx <= 4; dx++) for (let dz = -4; dz <= 4; dz++) { s.volume.set(x + dx, Y - 1, z + dz, T.DARK_ROCK); for (let yy = Y; yy < Y + 5; yy++) s.volume.set(x + dx, yy, z + dz, T.AIR); }
  s.body.x = x + 20.5; s.body.z = z + 20.5; s.body.y = Y;
  return { x, z };
};
const hold = (s: S, item: number): void => { s.inventory.add(item, 5); const k = [...Array(36).keys()].find((i) => s.inventory.get(i)?.item === item)!; s.inventory.move(k, 0); s.selected = 0; };
/** Põe a porta olhando para `yaw` (0 = olhar para −Z, frente da porta em +Z, giro 0). */
const put = (s: S, x: number, z: number, yaw = 0) => { s.yaw = yaw; if (s.inventory.get(0)?.item !== Item.PORTA_JUNCO) hold(s, Item.PORTA_JUNCO); return placeFromSlot(s, { x, y: Y - 1, z, nx: 0, ny: 1, nz: 0 } as never, 0); };

describe('porta de junco: regras do bloco', () => {
  it('32 ids (giro, abertura, dobradiça, metade), sólidos que não são cubo, uma instância só na metade de baixo, item 41', () => {
    expect(T_MAX).toBeGreaterThanOrEqual(T.DOOR_LAST); // o Orvalis em voxel (ids 90–99, ADR 0105) vem depois das portas
    expect(isItem(Item.PORTA_JUNCO) && !isItem(62)).toBe(true);
    let n = 0;
    for (let t = 0; t < 4; t++) for (const hr of [false, true]) for (const op of [false, true]) for (const up of [false, true]) {
      const id = doorId(t, hr, op, up); n++;
      expect(isDoor(id) && doorTurn(id) === t && isDoorHingeRight(id) === hr && isDoorOpen(id) === op && isDoorUpper(id) === up).toBe(true);
      expect(isSolid(id) && !isFull(id) && isModelBlock(id) && itemOfBlock(id) === Item.PORTA_JUNCO).toBe(true);
      expect(blockBoxes(id)).toHaveLength(1);
      expect(modelOf(id)?.kind ?? null).toBe(up ? null : 'porta');
      expect(surfaceOf(id)).toBe('sand');
    }
    expect(n).toBe(32); expect(blockOfItem(Item.PORTA_JUNCO)).toBe(T.DOOR);
    expect(recipeById('porta-junco')).toMatchObject({ station: 'workbench', result: { item: Item.PORTA_JUNCO, count: 1 } });
    expect(doorToggled(doorId(1, true, false, true))).toBe(doorId(1, true, true, true));
  });
  it('a caixa: fechada rente à borda +Z (3/16 m), aberta rente à borda da dobradiça; gira com o bloco', () => {
    const near = (a: readonly number[], b: readonly number[]) => a.forEach((v, i) => expect(v).toBeCloseTo(b[i], 6));
    near(blockBoxes(doorId(0, false, false, false))![0], [0, 0, 1 - DOOR_THICK, 1, 1, 1]);
    near(blockBoxes(doorId(0, false, true, false))![0], [0, 0, 0, DOOR_THICK, 1, 1]); // dobradiça à esquerda (−X), aberta
    near(blockBoxes(doorId(0, true, true, false))![0], [1 - DOOR_THICK, 0, 0, 1, 1, 1]); // à direita (+X)
    near(blockBoxes(doorId(1, false, false, false))![0], [1 - DOOR_THICK, 0, 0, 1, 1, 1]); // giro 1: a frente vai para +X
    expect(doorRight(0)).toEqual([1, 0]); expect(doorRight(1)).toEqual([0, -1]);
  });
  it('pose visual: eixo na quina (0,40625 m), ±90° ao abrir, animação suave que termina exata', () => {
    expect(DOOR_PIVOT).toBeCloseTo(0.40625, 6); expect(doorPivot(true)[0]).toBeCloseTo(0.40625, 6); expect(doorPivot(false)[0]).toBeCloseTo(-0.40625, 6);
    expect(doorAngle(false, 1)).toBeCloseTo(Math.PI / 2, 6); expect(doorAngle(true, 1)).toBeCloseTo(-Math.PI / 2, 6); expect(doorAngle(true, 0)).toBe(0);
    let a = 0, steps = 0; while (doorMoving(a, true) && steps < 200) { a = stepDoor(a, true, 1 / 60); steps++; }
    expect(a).toBe(1); expect(steps).toBeLessThan(60);
  });
});

describe('porta de junco: colocar, quebrar, usar', () => {
  it('põe as duas metades (baixo e cima), consome 1 item, a frente voltada para quem põe', async () => {
    const s = await open(), { x, z } = floor(s);
    expect(put(s, x, z, 0).ok).toBe(true);
    expect(s.volume.get(x, Y, z)).toBe(doorId(0, false, false, false)); expect(s.volume.get(x, Y + 1, z)).toBe(doorId(0, false, false, true));
    expect(s.inventory.get(0)?.count).toBe(4);
    expect(put(s, x + 2, z, Math.PI / 2).ok).toBe(true); expect(doorTurn(s.volume.get(x + 2, Y, z))).toBe(marcoTurn(Math.PI / 2));
  });
  it('recusa sem piso firme e sem espaço em cima, sem gastar o item', async () => {
    const s = await open(), { x, z } = floor(s);
    s.volume.set(x + 2, Y - 1, z, T.AIR);
    expect(put(s, x + 2, z).ok).toBe(false);
    s.volume.set(x, Y + 1, z, T.DARK_ROCK);
    expect(put(s, x, z).ok).toBe(false); expect(s.volume.get(x, Y, z)).toBe(T.AIR);
    expect(s.inventory.get(0)?.count).toBe(5);
  });
  it('quebrar qualquer metade tira as duas e solta 1 porta; tirar o piso também leva a porta', async () => {
    const s = await open(), { x, z } = floor(s);
    put(s, x, z);
    expect(breakOrCollect(s, { x, y: Y + 1, z, nx: 0, ny: 0, nz: 1 } as never).ok).toBe(true);
    expect(s.volume.get(x, Y, z)).toBe(T.AIR); expect(s.volume.get(x, Y + 1, z)).toBe(T.AIR);
    sweep(s); expect(s.inventory.total(Item.PORTA_JUNCO)).toBe(5);
    put(s, x + 2, z);
    expect(breakOrCollect(s, { x: x + 2, y: Y - 1, z, nx: 0, ny: 1, nz: 0 } as never).ok).toBe(true);
    expect(s.volume.get(x + 2, Y, z)).toBe(T.AIR); expect(s.volume.get(x + 2, Y + 1, z)).toBe(T.AIR);
  });
  it('dobradiça automática: a segunda porta ao lado prende no lado oposto e abrem juntas', async () => {
    const s = await open(), { x, z } = floor(s);
    put(s, x, z); put(s, x + 1, z); // olhar para −Z: a direita de quem olha é +X; a vizinha da esquerda (x) tem dobradiça à esquerda
    expect(isDoorHingeRight(s.volume.get(x, Y, z))).toBe(false); expect(isDoorHingeRight(s.volume.get(x + 1, Y, z))).toBe(true);
    expect(doorHingeFor(s.volume, x + 3, Y, z, 0)).toBe(false);
    expect(useDoor(s, x, Y + 1, z)).toMatchObject({ ok: true, open: true });
    for (const cx of [x, x + 1]) for (const yy of [Y, Y + 1]) expect(isDoorOpen(s.volume.get(cx, yy, z))).toBe(true);
    expect(useDoor(s, x + 1, Y, z)).toMatchObject({ ok: true, open: false });
    for (const cx of [x, x + 1]) for (const yy of [Y, Y + 1]) expect(isDoorOpen(s.volume.get(cx, yy, z))).toBe(false);
  });
  it('fechada barra o corpo; aberta deixa passar; fechar com o corpo na folha é recusado', async () => {
    const s = await open(), { x, z } = floor(s);
    put(s, x, z);
    const walkThrough = (): number => { const b = newBody(x + 0.5, Y, z + 2.5); for (let t = 0; t < 2.5; t += 0.025) stepBody(s.volume, b, { dirX: 0, dirZ: -1, jump: false }, 0.025); return b.z; };
    expect(walkThrough()).toBeGreaterThan(z + 1.2); // a folha fechada (borda +Z) segura o corpo
    expect(useDoor(s, x, Y, z).ok).toBe(true);
    expect(walkThrough()).toBeLessThan(z - 0.5); // aberta, a passagem está livre (a folha fica rente à lateral)
    s.body.x = x + 0.5; s.body.z = z + 0.9; s.body.y = Y; // em cima da faixa da folha fechada
    expect(useDoor(s, x, Y, z)).toMatchObject({ ok: false });
    expect(isDoorOpen(s.volume.get(x, Y, z))).toBe(true);
  });
  it('a mira acerta a folha fechada (caixa fina) e atravessa a porta aberta pelo vão', async () => {
    const s = await open(), { x, z } = floor(s);
    put(s, x, z);
    const closed = raycast(s.volume, x + 0.5, Y + 1, z + 3, 0, 0, -1, 6);
    expect(closed && closed.z).toBe(z);
    useDoor(s, x, Y, z);
    const aberta = raycast(s.volume, x + 0.5, Y + 1, z + 3, 0, 0, -1, 6);
    expect(aberta === null || aberta.z !== z).toBe(true);
  });
});

function marcoTurn(yaw: number): number { return ((Math.round(yaw / (Math.PI / 2)) % 4) + 4) % 4; }
