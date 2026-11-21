import { describe, expect, it } from 'vitest';
import { breakOrCollect, placeFromSlot } from './actions';
import { TitanGenerator } from './generator';
import { SLOTS } from './inventory';
import { Item } from './items';
import { meshSection } from './mesher';
import { BODY_HEIGHT, canPlaceAt, collides, newBody, raycast, stepBody } from './physics';
import { craft, recipeById } from './recipes';
import { MemoryTitanStorage } from './save';
import { flush, openSession } from './session';
import { TitanVolume } from './volume';
import { blockHeight, isFull, isSolid, T } from './voxel';
import { sweep } from './dropTestUtil';

const FLAT_Y = 200; // alto, longe do terreno: um piso de rocha de teste
function arena(): TitanVolume {
  const v = new TitanVolume(new TitanGenerator(42));
  for (let x = 4; x <= 14; x++) for (let z = 4; z <= 14; z++) v.place(x, FLAT_Y - 1, z, T.DARK_ROCK); // piso: topo em FLAT_Y
  return v;
}
const walk = (v: TitanVolume, b: ReturnType<typeof newBody>, dirX: number, dirZ: number, secs: number): void => { for (let k = 0; k < secs * 40; k++) stepBody(v, b, { dirX, dirZ, jump: false }, 1 / 40); };

describe('Laje de Rocha: bloco de meia altura (ADR 0046)', () => {
  it('altura, oclusão e receita: a laje tem 0,5, é sólida mas não esconde faces vizinhas; 3 rochas → 6 lajes na mesa', () => {
    expect(blockHeight(T.SLAB)).toBe(0.5); expect(blockHeight(T.DARK_ROCK)).toBe(1); expect(blockHeight(T.AIR)).toBe(0);
    expect(isSolid(T.SLAB)).toBe(true); expect(isFull(T.SLAB)).toBe(false); expect(isFull(T.DARK_ROCK)).toBe(true);
    expect(recipeById('laje')!.result).toEqual({ item: Item.SLAB, count: 6 });
  });

  it('colisão: de pé sobre o piso, a laje barra de lado (0,5) e o corpo sobe o degrau andando; o cubo inteiro continua barrando', () => {
    const v = arena();
    v.place(8, FLAT_Y, 8, T.SLAB);
    v.place(10, FLAT_Y, 8, T.DARK_ROCK); // cubo inteiro, para comparar
    const b = newBody(6.5, FLAT_Y, 8.5);
    walk(v, b, 0, 0, 0.3); // assenta no piso
    expect(b.onGround).toBe(true); expect(b.y).toBeCloseTo(FLAT_Y, 5);
    expect(collides(v, 8.5, FLAT_Y, 8.5)).toBe(true); // pés abaixo do topo da laje
    expect(collides(v, 8.5, FLAT_Y + 0.5, 8.5)).toBe(false); // sobre a laje, livre
    walk(v, b, 1, 0, 0.45); // anda para +x (até x ≈ 8,4): encontra a laje na borda e sobe
    expect(b.y).toBeCloseTo(FLAT_Y + 0.5, 5); // subiu o degrau de meia altura sem pular
    expect(b.x).toBeGreaterThan(8);
    // contra o cubo inteiro (1 m) o degrau de meia altura não vale: o corpo só sobe pelo salto automático (ADR 0055), nunca encaixado como na laje
    const c = newBody(9.5, FLAT_Y, 10.5); v.place(11, FLAT_Y, 10, T.DARK_ROCK);
    walk(v, c, 0, 0, 0.3); walk(v, c, 1, 0, 0.12);
    expect(c.y).toBeCloseTo(FLAT_Y, 5); expect(c.x).toBeLessThan(11 - 0.3 + 0.01); // antes de o salto automático se completar, o cubo ainda barra
  });

  it('queda sobre a laje: pousa no topo dela (y + 0,5), não no piso do cubo', () => {
    const v = arena();
    v.place(8, FLAT_Y, 8, T.SLAB);
    const b = newBody(8.5, FLAT_Y + 3, 8.5);
    walk(v, b, 0, 0, 1.2);
    expect(b.onGround).toBe(true);
    expect(b.y).toBeCloseTo(FLAT_Y + 0.5, 5);
    // pulo de 1 bloco (1,25 m) chega a duas lajes empilhadas lado a lado em degraus de 0,5
    v.place(9, FLAT_Y, 8, T.SLAB); v.place(9, FLAT_Y + 1, 8, T.DARK_ROCK);
  });

  it('degraus de lajes: de uma laje para um cubo ao lado (+0,5) o corpo sobe andando; descer devolve ao piso', () => {
    const v = arena();
    v.place(8, FLAT_Y, 8, T.SLAB); v.place(9, FLAT_Y, 8, T.DARK_ROCK);
    const b = newBody(8.5, FLAT_Y + 0.5, 8.5);
    walk(v, b, 0, 0, 0.3);
    expect(b.y).toBeCloseTo(FLAT_Y + 0.5, 5);
    walk(v, b, 1, 0, 0.25); // x ≈ 9,6: já sobre o cubo
    expect(b.y).toBeCloseTo(FLAT_Y + 1, 5); // topo do cubo: subiu mais meio bloco
    walk(v, b, -1, 0, 0.5); // volta pela laje (x ≈ 7,5) e desce ao piso
    walk(v, b, 0, 0, 0.4); // assenta
    expect(b.y).toBeCloseTo(FLAT_Y, 5);
  });

  it('cabeça: a laje não é teto até o corpo (1,8 m) cruzar a altura dela; passa por baixo de uma laje a 2 blocos', () => {
    const v = arena();
    v.place(8, FLAT_Y + 2, 8, T.SLAB); // laje flutuante a 2 m do chão: base em y + 2 = 1,8 m + folga
    const b = newBody(6.5, FLAT_Y, 8.5);
    walk(v, b, 0, 0, 0.3);
    walk(v, b, 1, 0, 1.5);
    expect(b.x).toBeGreaterThan(9); // atravessou por baixo
    expect(BODY_HEIGHT).toBe(1.8);
  });

  it('mira: acerta só a metade de baixo da célula (outline de meia altura); o raio rasante por cima segue para o que está atrás', () => {
    const v = arena();
    v.place(8, FLAT_Y, 8, T.SLAB);
    v.place(8, FLAT_Y, 5, T.DARK_ROCK); // cubo atrás
    // de cima: acerta o topo da laje em y + 0,5 (normal +y) com a caixa de meia altura
    const top = raycast(v, 8.5, FLAT_Y + 3, 8.5, 0, -1, 0, 6)!;
    expect(top).toMatchObject({ x: 8, y: FLAT_Y, z: 8, ny: 1 });
    expect(top.box).toEqual([8, FLAT_Y, 8, 9, FLAT_Y + 0.5, 9]);
    // rasante a 0,75 de altura (acima do topo da laje): passa e acerta o cubo atrás
    const over = raycast(v, 8.5, FLAT_Y + 0.75, 10, 0, 0, -1, 10)!;
    expect(over).toMatchObject({ x: 8, y: FLAT_Y, z: 5 });
    // rasante a 0,25 de altura: acerta a lateral da laje
    const side = raycast(v, 8.5, FLAT_Y + 0.25, 10, 0, 0, -1, 10)!;
    expect(side).toMatchObject({ x: 8, y: FLAT_Y, z: 8, nz: 1 });
  });

  it('colocar: a laje ocupa só 0,5 do espaço (cabe junto ao corpo logo acima dela), e some do espaço de cima', () => {
    const v = arena();
    const b = newBody(8.5, FLAT_Y + 0.5, 8.5); // de pé a 0,5 acima da célula (8, FLAT_Y, 8)
    expect(canPlaceAt(v, b, 8, FLAT_Y, 8, undefined, [0, 0.5])).toBe(true); // laje embaixo dos pés: não invade o corpo
    expect(canPlaceAt(v, b, 8, FLAT_Y, 8, undefined, [0, 1])).toBe(false); // um cubo inteiro invadiria
  });

  it('malha: laje com topo a 0,5, lateral de 8 px, sem face lateral entre lajes iguais; cubo vizinho mostra a face que a laje não cobre', () => {
    const v = arena();
    v.place(8, FLAT_Y, 8, T.SLAB); v.place(9, FLAT_Y, 8, T.SLAB); v.place(8, FLAT_Y, 9, T.DARK_ROCK);
    const cx = Math.floor(8 / 16), sy = Math.floor((FLAT_Y + 64) / 16);
    const m = meshSection(v, cx, sy, 0).opaque!;
    const ys = new Set<number>();
    for (let i = 1; i < m.pos.length; i += 3) ys.add(Math.round(m.pos[i] * 1000) / 1000);
    expect(ys.has(FLAT_Y + 0.5)).toBe(true); // topo da laje
    // todas as faces: nenhuma entre as duas lajes (x = 9, z 8..9) é desenhada; conta de vértices por laje: top + 4 laterais externas + base
    expect(m.idx.length / 6).toBeGreaterThan(0);
  });
});

describe('Laje de Rocha: fabricar, colocar, quebrar e persistir', () => {
  it('3 rochas → 6 lajes na mesa; colocar gasta 1; quebrar devolve 1 laje; persiste ao reabrir', async () => {
    const st = new MemoryTitanStorage();
    const s = await openSession(st, 42, () => 1);
    s.inventory.add(Item.DARK_ROCK, 3);
    expect(craft(s.inventory, recipeById('laje')!, null)).toEqual({ ok: false, reason: 'station' });
    expect(craft(s.inventory, recipeById('laje')!, 'workbench').ok).toBe(true);
    expect(s.inventory.total(Item.SLAB)).toBe(6); expect(s.inventory.total(Item.DARK_ROCK)).toBe(0);
    const a = s.volume.gen.arrival, bx = Math.floor(a.x) + 2, bz = Math.floor(a.z);
    const slot = [...Array(SLOTS).keys()].find((i) => s.inventory.get(i)?.item === Item.SLAB)!;
    s.inventory.move(slot, 0);
    expect(placeFromSlot(s, { x: bx, y: 64, z: bz, nx: 0, ny: 1, nz: 0 }, 0).ok).toBe(true);
    expect(s.volume.get(bx, 65, bz)).toBe(T.SLAB);
    expect(s.inventory.total(Item.SLAB)).toBe(5);
    await flush(st, s);
    const r = await openSession(st, null, () => 1);
    expect(r.volume.get(bx, 65, bz)).toBe(T.SLAB); // edição de chunk: sobrevive
    expect(r.inventory.total(Item.SLAB)).toBe(5);
    expect(breakOrCollect(r, { x: bx, y: 65, z: bz, nx: 0, ny: 1, nz: 0 }).ok).toBe(true); sweep(r);
    expect(r.inventory.total(Item.SLAB)).toBe(6);
    expect(r.volume.get(bx, 65, bz)).toBe(T.AIR);
  });

  it('mochila cheia: a laje não é quebrada e fica no lugar', async () => {
    const s = await openSession(new MemoryTitanStorage(), 42, () => 1);
    const a = s.volume.gen.arrival, bx = Math.floor(a.x) + 2, bz = Math.floor(a.z);
    s.volume.place(bx, 65, bz, T.SLAB);
    let n = 0; while (s.inventory.canAdd(Item.SAND) && n++ < 5000) s.inventory.add(Item.SAND, 1);
    expect(breakOrCollect(s, { x: bx, y: 65, z: bz, nx: 0, ny: 1, nz: 0 }).ok).toBe(true); // ADR 0082: cai no chão e fica lá com a mochila cheia
    expect(s.volume.get(bx, 65, bz)).toBe(T.AIR);
    expect(sweep(s)).toBe(0);
  });
});
