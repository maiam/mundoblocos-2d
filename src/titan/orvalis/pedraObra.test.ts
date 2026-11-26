import { describe, expect, it } from 'vitest';
import { breakOrCollect, placeFromSlot } from '../actions';
import { breakTotalMs } from '../breaking';
import { sweep } from '../dropTestUtil';
import { BAG, HOTBAR } from '../inventory';
import { blockOfItem, isItem, Item, ITEM_NAMES, itemOfBlock } from '../items';
import { craft, recipeById } from '../recipes';
import { MemoryTitanStorage } from '../save';
import { openSession } from '../session';
import { resolveSlabPlacement } from '../slabs';
import { surfaceOf } from '../sounds';
import { blockBoxes, blockSpan, isFull, isSlab, isSlabBottom, isSolid, isStair, isStoneStair, modelOf, slabPartner, isWall, wallId, wallMask, wallBoxes, WALL_E, WALL_W, WALL_N, WALL_S, WALL_HEIGHT, stairId, stairTurn, T, tileFor } from '../voxel';
import { wallModelData } from '../../render/muretaModel';
import { newBody, raycast, stepBody } from '../physics';
import { ORVALIS_GENERATOR_VERSION, OrvalisGenerator, orvalisGeneratorFor } from './generator';

/** Pedra de obra do Orvalis em voxel (ADR 0108): Pedra Lisa, Tijolo de Pedra e Laje de Pedra (que funde na Pedra Lisa). */
const open = () => openSession(new MemoryTitanStorage(), 42, () => 1, orvalisGeneratorFor, ORVALIS_GENERATOR_VERSION, (s, v) => new OrvalisGenerator(s, v));
const slotOf = (s: Awaited<ReturnType<typeof open>>, item: number): number => [...Array(HOTBAR + BAG).keys()].find((i) => s.inventory.get(i)?.item === item) ?? -1;

describe('pedra de obra (ADR 0108)', () => {
  it('receitas: 1 Pedra → 1 Pedra Lisa, 4 Pedra → 4 Tijolos, 3 Pedra Lisa → 6 Lajes; todas pedem a mesa', async () => {
    const s = await open();
    s.inventory.add(Item.STONE, 6);
    expect(craft(s.inventory, recipeById('pedra-lisa')!, null)).toEqual({ ok: false, reason: 'station' }); // na mão não
    expect(craft(s.inventory, recipeById('pedra-lisa')!, 'workbench').ok).toBe(true);
    expect(s.inventory.total(Item.STONE)).toBe(5); expect(s.inventory.total(Item.PEDRA_LISA)).toBe(1);
    expect(craft(s.inventory, recipeById('tijolo-pedra')!, 'workbench').ok).toBe(true);
    expect(s.inventory.total(Item.TIJOLO_PEDRA)).toBe(4); expect(s.inventory.total(Item.STONE)).toBe(1);
    s.inventory.add(Item.PEDRA_LISA, 2);
    expect(craft(s.inventory, recipeById('laje-pedra')!, 'workbench').ok).toBe(true);
    expect(s.inventory.total(Item.LAJE_PEDRA)).toBe(6); expect(s.inventory.total(Item.PEDRA_LISA)).toBe(0);
    for (const id of ['pedra-lisa', 'tijolo-pedra', 'laje-pedra']) expect(recipeById(id)!.world).toBe('orvalis');
  });

  it('itens ↔ blocos: lisa e tijolo são cubos; a laje (inferior e superior) é meia altura e devolve a mesma laje', () => {
    expect(blockOfItem(Item.PEDRA_LISA)).toBe(T.STONE_SMOOTH); expect(itemOfBlock(T.STONE_SMOOTH)).toBe(Item.PEDRA_LISA);
    expect(blockOfItem(Item.TIJOLO_PEDRA)).toBe(T.STONE_BRICK); expect(itemOfBlock(T.STONE_BRICK)).toBe(Item.TIJOLO_PEDRA);
    expect(blockOfItem(Item.LAJE_PEDRA)).toBe(T.STONE_SLAB); expect(itemOfBlock(T.STONE_SLAB)).toBe(Item.LAJE_PEDRA); expect(itemOfBlock(T.STONE_SLAB_TOP)).toBe(Item.LAJE_PEDRA);
    for (const [i, n] of [[Item.PEDRA_LISA, 'Pedra Lisa'], [Item.TIJOLO_PEDRA, 'Tijolo de Pedra'], [Item.LAJE_PEDRA, 'Laje de Pedra']] as const) { expect(isItem(i)).toBe(true); expect(ITEM_NAMES[i]).toBe(n); }
    expect(isItem(83)).toBe(false);
    expect(isFull(T.STONE_SMOOTH) && isFull(T.STONE_BRICK)).toBe(true);
    expect(isSlab(T.STONE_SLAB) && isSlab(T.STONE_SLAB_TOP) && !isFull(T.STONE_SLAB)).toBe(true);
    expect(blockSpan(T.STONE_SLAB)).toEqual([0, 0.5]); expect(blockSpan(T.STONE_SLAB_TOP)).toEqual([0.5, 1]);
    expect(isSlabBottom(T.STONE_SLAB)).toBe(true); expect(slabPartner(T.STONE_SLAB)).toBe(T.STONE_SLAB_TOP); expect(slabPartner(T.STONE_SLAB_TOP)).toBe(T.STONE_SLAB);
    expect(slabPartner(T.REED_SLAB_TOP)).toBe(T.REED_SLAB); // as outras famílias seguem iguais
    expect(isSolid(T.STONE_SLAB)).toBe(true);
  });

  it('a laje de pedra só funde com a laje de pedra: duas viram a Pedra Lisa; com a de rocha ou de junco não', () => {
    expect(resolveSlabPlacement(T.STONE_SLAB, 1, undefined, T.STONE_SLAB)).toEqual({ merge: true, block: T.STONE_SMOOTH });
    expect(resolveSlabPlacement(T.STONE_SLAB_TOP, -1, undefined, T.STONE_SLAB)).toEqual({ merge: true, block: T.STONE_SMOOTH });
    expect(resolveSlabPlacement(T.SLAB, 1, undefined, T.STONE_SLAB).merge).toBe(false); // laje de rocha embaixo
    expect(resolveSlabPlacement(T.REED_SLAB, 1, undefined, T.STONE_SLAB).merge).toBe(false);
    expect(resolveSlabPlacement(T.STONE_SLAB, 1, undefined, T.SLAB).merge).toBe(false); // e o inverso
    expect(resolveSlabPlacement(T.STONE, -1, undefined, T.STONE_SLAB)).toEqual({ merge: false, block: T.STONE_SLAB_TOP }); // face de baixo de um bloco: superior
  });

  it('no jogo: a laje vai ao chão em meia altura, a segunda por cima funde na Pedra Lisa (gastando 1), e quebrar devolve a laje ou a lisa', async () => {
    const s = await open(), a = s.volume.gen.arrival, cx = Math.floor(a.x) + 2, cz = Math.floor(a.z);
    s.inventory.add(Item.LAJE_PEDRA, 3);
    expect(placeFromSlot(s, { x: cx, y: a.y - 1, z: cz, nx: 0, ny: 1, nz: 0 }, slotOf(s, Item.LAJE_PEDRA)).ok).toBe(true);
    expect(s.volume.get(cx, a.y, cz)).toBe(T.STONE_SLAB);
    expect(placeFromSlot(s, { x: cx, y: a.y, z: cz, nx: 0, ny: 1, nz: 0, hy: 0.5 }, slotOf(s, Item.LAJE_PEDRA)).ok).toBe(true); // no topo da laje inferior: funde
    expect(s.volume.get(cx, a.y, cz)).toBe(T.STONE_SMOOTH); expect(s.inventory.total(Item.LAJE_PEDRA)).toBe(1);
    expect(breakOrCollect(s, { x: cx, y: a.y, z: cz, nx: 0, ny: 1, nz: 0 }).ok).toBe(true);
    sweep(s); expect(s.inventory.total(Item.PEDRA_LISA)).toBe(1); // a Pedra Lisa devolve 1 bloco
  });

  it('tempos, som e arte: cubos 1,6 s, laje 1 s; tile próprio de cada um; a lateral da laje é a de meia altura', () => {
    for (const b of [T.STONE_SMOOTH, T.STONE_BRICK]) expect(breakTotalMs('block', b)).toBe(1600);
    for (const b of [T.STONE_SLAB, T.STONE_SLAB_TOP]) expect(breakTotalMs('block', b)).toBe(1000);
    expect(breakTotalMs('block', T.STONE_SMOOTH, 'rock')).toBe(960); // com picareta de rocha
    for (const b of [T.STONE_SMOOTH, T.STONE_BRICK, T.STONE_SLAB, T.STONE_SLAB_TOP]) expect(surfaceOf(b)).toBe('rock');
    expect(new Set([tileFor(T.STONE, 'top'), tileFor(T.STONE_SMOOTH, 'top'), tileFor(T.STONE_BRICK, 'top'), tileFor(T.STONE_SLAB, 'top')]).size).toBe(4);
    expect(tileFor(T.STONE_SLAB, 'side')).not.toBe(tileFor(T.STONE_SLAB, 'top'));
    expect(tileFor(T.STONE_SLAB_TOP, 'side')).toBe(tileFor(T.STONE_SLAB, 'side'));
  });
});

describe('degrau de pedra (ADR 0109)', () => {
  it('ids 111–114 com o giro no id, item 60, mesmas caixas do degrau de junco, modelo próprio, sólido que não é cubo', () => {
    expect(T.STONE_STAIR).toBe(111); expect(T.STONE_STAIR_270).toBe(114);
    for (let t = 0; t < 4; t++) {
      const id = stairId(t, true);
      expect(id).toBe(T.STONE_STAIR + t); expect(isStoneStair(id) && isStair(id) && stairTurn(id) === t).toBe(true);
      expect(modelOf(id)).toEqual({ kind: 'degrauPedra', turn: t });
      expect(blockBoxes(id)).toEqual(blockBoxes(stairId(t))); // a forma e a física são as do degrau de junco
      expect(isSolid(id) && !isFull(id)).toBe(true);
      expect(itemOfBlock(id)).toBe(Item.DEGRAU_PEDRA);
      expect(surfaceOf(id)).toBe('rock'); expect(breakTotalMs('block', id)).toBe(1000);
    }
    expect(modelOf(T.REED_STAIR)).toEqual({ kind: 'degrau', turn: 0 }); // o de junco segue com o modelo dele
    expect(blockOfItem(Item.DEGRAU_PEDRA)).toBe(T.STONE_STAIR); expect(ITEM_NAMES[Item.DEGRAU_PEDRA]).toBe('Degrau de Pedra');
    expect(isItem(Item.DEGRAU_PEDRA) && !isItem(83)).toBe(true);
  });

  it('receita: 3 Pedra Lisa → 4 Degraus (na mesa, só no Orvalis); colocar gira para o jogador e quebrar devolve 1', async () => {
    const s = await open();
    s.inventory.add(Item.PEDRA_LISA, 3);
    expect(craft(s.inventory, recipeById('degrau-pedra')!, null)).toEqual({ ok: false, reason: 'station' });
    expect(craft(s.inventory, recipeById('degrau-pedra')!, 'workbench').ok).toBe(true);
    expect(s.inventory.total(Item.DEGRAU_PEDRA)).toBe(4); expect(s.inventory.total(Item.PEDRA_LISA)).toBe(0);
    expect(recipeById('degrau-pedra')!.world).toBe('orvalis');
    const a = s.volume.gen.arrival, cx = Math.floor(a.x) + 2, cz = Math.floor(a.z);
    s.yaw = 0;
    expect(placeFromSlot(s, { x: cx, y: a.y - 1, z: cz, nx: 0, ny: 1, nz: 0 }, slotOf(s, Item.DEGRAU_PEDRA)).ok).toBe(true);
    const placed = s.volume.get(cx, a.y, cz);
    expect(isStoneStair(placed)).toBe(true); expect(s.inventory.total(Item.DEGRAU_PEDRA)).toBe(3);
    expect(s.volume.modelCells('degrauPedra').length).toBe(1);
    expect(breakOrCollect(s, { x: cx, y: a.y, z: cz, nx: 0, ny: 1, nz: 0 }).ok).toBe(true);
    sweep(s); expect(s.inventory.total(Item.DEGRAU_PEDRA)).toBe(4);
    expect(s.volume.modelCells('degrauPedra').length).toBe(0);
  });
});

describe('mureta de pedra (ADR 0110)', () => {
  const free = async () => { const s = await open(), a = s.volume.gen.arrival; return { s, x: Math.floor(a.x) + 3, y: a.y, z: Math.floor(a.z) + 3 }; };

  it('ids 115–130 pela máscara, item 61, 0,75 m de altura, sólida que não é cubo, modelo por máscara', () => {
    expect(T.STONE_WALL).toBe(115); expect(T.STONE_WALL_LAST).toBe(130);
    for (let m = 0; m < 16; m++) {
      const id = wallId(m);
      expect(isWall(id) && wallMask(id) === m && isSolid(id) && !isFull(id)).toBe(true);
      expect(modelOf(id)).toEqual({ kind: `mureta${m}`, turn: 0 });
      expect(blockBoxes(id)).toEqual(wallBoxes(m)); expect(blockSpan(id)).toEqual([0, WALL_HEIGHT]);
      expect(itemOfBlock(id)).toBe(Item.MURETA_PEDRA); expect(surfaceOf(id)).toBe('rock'); expect(breakTotalMs('block', id)).toBe(1000);
    }
    expect(blockBoxes(wallId(0))).toHaveLength(1); expect(blockBoxes(wallId(15))).toHaveLength(5); // poste e braços
    expect(blockOfItem(Item.MURETA_PEDRA)).toBe(T.STONE_WALL); expect(ITEM_NAMES[Item.MURETA_PEDRA]).toBe('Mureta de Pedra'); expect(isItem(82) && !isItem(83)).toBe(true);
    for (let m = 0; m < 16; m++) { const d = wallModelData(m); expect(d.idx.length / 3).toBe(d.pos.length / 3 / 2); expect(d.uv.every((v) => v >= 0 && v <= 1)).toBe(true); }
    expect(wallModelData(0).idx.length / 6).toBe(5); // o poste sozinho: topo e 4 laterais
    expect(wallModelData(WALL_E | WALL_W).idx.length / 6).toBeLessThan(wallModelData(0).idx.length / 6 + 10);
  });

  it('liga sozinha às vizinhas e a cubo inteiro, e se desliga quando o vizinho sai', async () => {
    const { s, x, y, z } = await free();
    s.volume.set(x, y, z, T.STONE_WALL);
    expect(s.volume.get(x, y, z)).toBe(wallId(0)); // sozinha: só o poste
    s.volume.set(x + 1, y, z, T.STONE_WALL); // à direita (leste)
    expect(s.volume.get(x, y, z)).toBe(wallId(WALL_E)); expect(s.volume.get(x + 1, y, z)).toBe(wallId(WALL_W)); // as duas se ligam
    s.volume.set(x, y, z + 1, T.STONE_SMOOTH); // um cubo inteiro ao sul
    expect(wallMask(s.volume.get(x, y, z))).toBe(WALL_E | WALL_S);
    s.volume.set(x, y, z - 1, T.STONE_SLAB); // laje não é cubo inteiro: não liga
    expect(wallMask(s.volume.get(x, y, z))).toBe(WALL_E | WALL_S);
    s.volume.remove(x + 1, y, z); s.volume.remove(x, y, z + 1);
    expect(s.volume.get(x, y, z)).toBe(wallId(0));
    expect(wallMask(wallId(WALL_N))).toBe(WALL_N);
    expect(s.volume.modelCells('mureta0').length).toBe(1); // a instância troca de modelo junto com a máscara
  });

  it('receita 6 Pedra Lisa → 6; colocar liga à vizinha, quebrar devolve 1 e desliga a vizinha; a sala repassa a vizinha (onSet)', async () => {
    const { s, x, y, z } = await free();
    s.inventory.add(Item.PEDRA_LISA, 6);
    expect(craft(s.inventory, recipeById('mureta-pedra')!, null)).toEqual({ ok: false, reason: 'station' });
    expect(craft(s.inventory, recipeById('mureta-pedra')!, 'workbench').ok).toBe(true);
    expect(s.inventory.total(Item.MURETA_PEDRA)).toBe(6); expect(recipeById('mureta-pedra')!.world).toBe('orvalis');
    const sent: number[] = []; s.volume.onSet = (_a, _b, _c, id) => { if (isWall(id)) sent.push(id); };
    for (const dx of [0, 1]) expect(placeFromSlot(s, { x: x + dx, y: y - 1, z, nx: 0, ny: 1, nz: 0 }, slotOf(s, Item.MURETA_PEDRA)).ok).toBe(true);
    expect(s.volume.get(x, y, z)).toBe(wallId(WALL_E)); expect(s.volume.get(x + 1, y, z)).toBe(wallId(WALL_W));
    expect(sent).toContain(wallId(WALL_E)); // a primeira foi reenviada com o braço quando a segunda chegou
    expect(breakOrCollect(s, { x: x + 1, y, z, nx: 0, ny: 1, nz: 0 }).ok).toBe(true);
    expect(s.volume.get(x, y, z)).toBe(wallId(0));
    sweep(s); expect(s.inventory.total(Item.MURETA_PEDRA)).toBe(5);
  });

  it('física: o braço barra o corpo; o vão ao lado do poste passa; a mira acerta o poste e passa por cima da mureta', async () => {
    const { s, x, y, z } = await free();
    s.volume.set(x, y, z, T.STONE_WALL); s.volume.set(x + 1, y, z, T.STONE_WALL); // trecho de 2 células ao longo de X
    const b = newBody(x + 0.5, y, z + 2.5);
    for (let i = 0; i < 40; i++) stepBody(s.volume, b, { dirX: 0, dirZ: -1, jump: false }, 0.05);
    expect(b.z).toBeGreaterThan(z + 0.75); // parou na frente da mureta (a caixa vai até z + 0,75)
    const c = newBody(x + 1.5, y, z + 2.5); // saindo do alcance do poste: a mureta de duas células ocupa x de 0,25 a 1,75 do trecho
    const hit = raycast(s.volume, x + 0.5, y + 0.4, z + 3, 0, 0, -1, 6)!;
    expect(hit).not.toBeNull(); expect(hit.x).toBe(x);
    expect(raycast(s.volume, x + 0.5, y + 0.9, z + 3, 0, 0, -1, 6)).toBeNull(); // acima de 0,75 m passa
    expect(c.z).toBeGreaterThan(z);
  });
});
