import { describe, expect, it } from 'vitest';
import { breakOrCollect, placeFromSlot } from './actions';
import { breakTotalMs } from './breaking';
import { TitanGenerator } from './generator';
import { SLOTS } from './inventory';
import { blockOfItem, Item, itemOfBlock, isItem } from './items';
import { MARCO_SIZE, modelBox, PANEL_SIZE } from './models';
import { collides, newBody, raycast, stepBody } from './physics';
import { craft, recipeById } from './recipes';
import { MemoryTitanStorage } from './save';
import { flush, openSession } from './session';
import { surfaceOf } from './sounds';
import { TitanVolume } from './volume';
import { blockSpan, blocksLight, isCollectBlock, isFull, isMarco, isPanel, isSolid, isTarget, marcoId, marcoTurn, marcoTurnFacing, modelOf, panelIdFacing, PANEL_HEIGHT, T } from './voxel';
import { sweep } from './dropTestUtil';

const FLAT_Y = 200;
function arena(): TitanVolume {
  const v = new TitanVolume(new TitanGenerator(42, 5));
  for (let x = 4; x <= 20; x++) for (let z = 4; z <= 20; z++) v.place(x, FLAT_Y - 1, z, T.DARK_ROCK);
  return v;
}
const walk = (v: TitanVolume, b: ReturnType<typeof newBody>, dirX: number, dirZ: number, secs: number): void => { for (let k = 0; k < secs * 40; k++) stepBody(v, b, { dirX, dirZ, jump: false }, 1 / 40); };

describe('Marco de Margem e Painel de Junco: ids, modelos e regras (ADR 0058)', () => {
  it('Marco: 4 ids de giro, atravessável, alvo da mira, não bloqueia luz; Painel: 2 ids, sólido até 0,944 m, não é cubo e deixa a luz passar', () => {
    for (let t = 0; t < 4; t++) { const id = marcoId(t); expect(isMarco(id)).toBe(true); expect(marcoTurn(id)).toBe(t); expect(isSolid(id)).toBe(false); expect(isTarget(id)).toBe(true); expect(blocksLight(id)).toBe(false); expect(modelOf(id)).toEqual({ kind: 'marco', turn: t }); expect(isCollectBlock(id)).toBe(true); expect(itemOfBlock(id)).toBe(Item.MARCO); }
    for (const id of [T.PAINEL, T.PAINEL_Z]) { expect(isPanel(id)).toBe(true); expect(isSolid(id)).toBe(true); expect(isFull(id)).toBe(false); expect(blocksLight(id)).toBe(false); expect(blockSpan(id)).toEqual([0, PANEL_HEIGHT]); expect(isCollectBlock(id)).toBe(true); expect(itemOfBlock(id)).toBe(Item.PAINEL); }
    expect(modelOf(T.PAINEL)).toEqual({ kind: 'painel', turn: 0 }); expect(modelOf(T.PAINEL_Z)).toEqual({ kind: 'painel', turn: 1 });
    expect(modelOf(T.DARK_ROCK)).toBeNull(); expect(blocksLight(T.DARK_ROCK)).toBe(true);
    expect(blockOfItem(Item.MARCO)).toBe(T.MARCO); expect(blockOfItem(Item.PAINEL)).toBe(T.PAINEL);
    expect(isItem(Item.MARCO) && isItem(Item.PAINEL)).toBe(true); expect(isItem(40)).toBe(true); expect(isItem(78)).toBe(false);
    expect(breakTotalMs('lantern', T.MARCO)).toBe(350); expect(breakTotalMs('block', T.PAINEL)).toBe(350);
    expect(surfaceOf(T.MARCO)).toBe('rock'); expect(surfaceOf(T.PAINEL)).toBe('sand');
  });

  it('o giro do Marco fica de frente para o jogador (a frente do modelo é +Z); o painel corre de través ao olhar', () => {
    // yaw 0 olha para −Z: a frente (+Z) já aponta para o jogador → giro 0; olhando a oeste (yaw π/2) o jogador está a leste → +Z gira para +X (giro 1)
    expect(marcoTurnFacing(0)).toBe(0); expect(marcoTurnFacing(Math.PI / 2)).toBe(1); expect(marcoTurnFacing(Math.PI)).toBe(2); expect(marcoTurnFacing(-Math.PI / 2)).toBe(3); expect(marcoTurnFacing(0.3)).toBe(0);
    expect(panelIdFacing(0)).toBe(T.PAINEL); expect(panelIdFacing(Math.PI)).toBe(T.PAINEL); // olhando ao longo de Z: painel ao longo de X
    expect(panelIdFacing(Math.PI / 2)).toBe(T.PAINEL_Z); expect(panelIdFacing(-Math.PI / 2)).toBe(T.PAINEL_Z);
  });

  it('caixas da mira: o Marco gira (largura ↔ profundidade nos giros ímpares) e o Painel corre em X ou Z', () => {
    const near = (a: readonly number[], b: readonly number[]): void => a.forEach((v, i) => expect(v).toBeCloseTo(b[i], 6));
    near(modelBox(T.MARCO, 10, 65, 20), [10.5 - MARCO_SIZE.w / 2, 65, 20.5 - MARCO_SIZE.d / 2, 10.5 + MARCO_SIZE.w / 2, 65 + MARCO_SIZE.h, 20.5 + MARCO_SIZE.d / 2]);
    near(modelBox(T.MARCO_90, 10, 65, 20), [10.5 - MARCO_SIZE.d / 2, 65, 20.5 - MARCO_SIZE.w / 2, 10.5 + MARCO_SIZE.d / 2, 65 + MARCO_SIZE.h, 20.5 + MARCO_SIZE.w / 2]);
    near(modelBox(T.PAINEL, 3, 70, 4), [3, 70, 4.5 - PANEL_SIZE.d / 2, 4, 70 + PANEL_SIZE.h, 4.5 + PANEL_SIZE.d / 2]);
    near(modelBox(T.PAINEL_Z, 3, 70, 4), [3.5 - PANEL_SIZE.d / 2, 70, 4, 3.5 + PANEL_SIZE.d / 2, 70 + PANEL_SIZE.h, 5]);
    near(modelBox(T.MARCO, 10, 65, 20, 0.1), [10.5 - MARCO_SIZE.w / 2 - 0.1, 64.9, 20.5 - MARCO_SIZE.d / 2 - 0.1, 10.5 + MARCO_SIZE.w / 2 + 0.1, 65 + MARCO_SIZE.h + 0.1, 20.5 + MARCO_SIZE.d / 2 + 0.1]); // folga de toque
  });

  it('o corpo atravessa o Marco; o Painel barra (célula inteira, 0,944 m) e o salto automático o vence; a mira acerta a caixa fina e o raio passa pelo vão da célula', () => {
    const v = arena();
    v.place(8, FLAT_Y, 8, T.MARCO); v.place(12, FLAT_Y, 11, T.PAINEL);
    expect(collides(v, 8.5, FLAT_Y, 8.5)).toBe(false); // atravessável
    expect(collides(v, 12.5, FLAT_Y, 11.5)).toBe(true); // barra
    const a = newBody(5.5, FLAT_Y, 8.5); walk(v, a, 1, 0, 0.4); walk(v, a, 1, 0, 1.2);
    expect(a.x).toBeGreaterThan(9); // passou pelo Marco
    // a mira: no Marco, de frente e no meio da altura; sobre ele, por cima da caixa (0,629 m), o raio passa
    expect(raycast(v, 6, FLAT_Y + 0.3, 8.5, 1, 0, 0)).toMatchObject({ x: 8, y: FLAT_Y, z: 8 });
    expect(raycast(v, 6, FLAT_Y + 0.8, 8.5, 1, 0, 0)).toBeNull(); // acima do Marco (0,629): nada
    // no Painel (ao longo de X, fino em Z): de lado (mirando em X) acerta a ponta; mirando em Z fora da faixa de 0,224 m erra
    expect(raycast(v, 10, FLAT_Y + 0.5, 11.5, 1, 0, 0)).toMatchObject({ x: 12, y: FLAT_Y, z: 11 });
    expect(raycast(v, 12.5, FLAT_Y + 0.5, 8, 0, 0, 1)).toMatchObject({ x: 12, z: 11 });
    expect(raycast(v, 12.5, FLAT_Y + 0.5, 8, 0, 0, 1)!.box).toEqual(modelBox(T.PAINEL, 12, FLAT_Y, 11));
    expect(raycast(v, 12.05, FLAT_Y + 0.5, 8, 0, 0, 1)).toMatchObject({ x: 12, z: 11 });
    // o painel é vencido pelo salto automático (0,944 m < 1 m) e fica por cima do degrau
    const b = newBody(9.5, FLAT_Y, 11.5); walk(v, b, 0, 0, 0.4);
    walk(v, b, 1, 0, 0.9);
    expect(b.y).toBeGreaterThanOrEqual(FLAT_Y + 0.9); // subiu no painel: pulou sozinho sobre os 0,944 m
  });
});

describe('fabricar, colocar, recolher e persistir', () => {
  it('Marco: 1 fragmento + 1 junco (Mesa) → 1 marco, recolhido inteiro, com o giro no id e persistência', async () => {
    const st = new MemoryTitanStorage();
    const s = await openSession(st, 42, () => 1, undefined, 5);
    s.inventory.add(Item.ROCK_SHARD, 1); s.inventory.add(Item.GLASS_REED, 1);
    expect(craft(s.inventory, recipeById('marco')!, null)).toEqual({ ok: false, reason: 'station' });
    expect(craft(s.inventory, recipeById('marco')!, 'workbench').ok).toBe(true);
    expect(s.inventory.total(Item.MARCO)).toBe(1); expect(s.inventory.total(Item.ROCK_SHARD)).toBe(0); expect(s.inventory.total(Item.GLASS_REED)).toBe(0);
    const slot = [...Array(SLOTS).keys()].find((i) => s.inventory.get(i)?.item === Item.MARCO)!;
    s.inventory.move(slot, 0);
    const a = s.volume.gen.arrival, bx = Math.floor(a.x) + 3, bz = Math.floor(a.z);
    s.yaw = Math.PI / 2; // olhando a oeste → giro 1
    expect(placeFromSlot(s, { x: bx, y: 64, z: bz, nx: 0, ny: 1, nz: 0, hy: 1 }, 0).ok).toBe(true);
    expect(s.volume.get(bx, 65, bz)).toBe(T.MARCO_90);
    expect(s.volume.modelCells('marco')).toEqual([[bx, 65, bz, 1]]);
    expect(s.inventory.total(Item.MARCO)).toBe(0);
    await flush(st, s);
    const r = await openSession(st, null, () => 1);
    expect(r.volume.get(bx, 65, bz)).toBe(T.MARCO_90); expect(r.volume.modelCells('marco')).toEqual([[bx, 65, bz, 1]]);
    expect(breakOrCollect(r, { x: bx, y: 65, z: bz, nx: 0, ny: 1, nz: 0 }).ok).toBe(true); sweep(r);
    expect(r.inventory.total(Item.MARCO)).toBe(1); expect(r.volume.modelCells('marco')).toEqual([]);
  });

  it('Painel: 2 juncos + 1 rocha (Mesa) → 2 painéis; o eixo vem do olhar; persiste e é recolhido', async () => {
    const st = new MemoryTitanStorage();
    const s = await openSession(st, 42, () => 1, undefined, 5);
    s.inventory.add(Item.GLASS_REED, 2); s.inventory.add(Item.DARK_ROCK, 1);
    expect(craft(s.inventory, recipeById('painel')!, 'workbench').ok).toBe(true);
    expect(s.inventory.total(Item.PAINEL)).toBe(2);
    const slot = [...Array(SLOTS).keys()].find((i) => s.inventory.get(i)?.item === Item.PAINEL)!;
    s.inventory.move(slot, 0);
    const a = s.volume.gen.arrival, bx = Math.floor(a.x) + 3, bz = Math.floor(a.z);
    s.yaw = 0;
    expect(placeFromSlot(s, { x: bx, y: 64, z: bz, nx: 0, ny: 1, nz: 0, hy: 1 }, 0).ok).toBe(true);
    s.yaw = Math.PI / 2;
    expect(placeFromSlot(s, { x: bx + 2, y: 64, z: bz, nx: 0, ny: 1, nz: 0, hy: 1 }, 0).ok).toBe(true);
    expect(s.volume.get(bx, 65, bz)).toBe(T.PAINEL); expect(s.volume.get(bx + 2, 65, bz)).toBe(T.PAINEL_Z);
    expect(s.volume.modelCells('painel').sort((p, q) => p[0] - q[0])).toEqual([[bx, 65, bz, 0], [bx + 2, 65, bz, 1]]);
    await flush(st, s);
    const r = await openSession(st, null, () => 1);
    expect(r.volume.get(bx, 65, bz)).toBe(T.PAINEL); expect(r.volume.get(bx + 2, 65, bz)).toBe(T.PAINEL_Z);
    expect(breakOrCollect(r, { x: bx, y: 65, z: bz, nx: 0, ny: 1, nz: 0 }).ok).toBe(true); sweep(r);
    expect(r.inventory.total(Item.PAINEL)).toBe(1);
  });

  it('a luz de uma lanterna atravessa o painel (trama aberta) mas não a rocha', async () => {
    const s = await openSession(new MemoryTitanStorage(), 42, () => 1, undefined, 5);
    const a = s.volume.gen.arrival, bx = Math.floor(a.x) + 3, bz = Math.floor(a.z) + 2;
    s.volume.place(bx, 65, bz, T.LANTERN);
    s.volume.place(bx + 1, 65, bz, T.PAINEL); s.volume.place(bx + 1, 66, bz, T.DARK_ROCK);
    expect(s.volume.light(bx + 2, 65, bz)).toBeGreaterThan(0); // atrás do painel: recebe luz
    expect(s.volume.light(bx + 2, 66, bz)).toBeLessThanOrEqual(s.volume.light(bx + 2, 65, bz)); // atrás da rocha: bloqueada
    expect(s.volume.light(bx + 1, 66, bz)).toBe(0); // dentro da rocha
  });
});
