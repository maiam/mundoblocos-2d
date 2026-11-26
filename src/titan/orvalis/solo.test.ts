import { describe, expect, it } from 'vitest';
import { breakOrCollect, placeFromSlot } from '../actions';
import { breakTotalMs } from '../breaking';
import { sweep } from '../dropTestUtil';
import { BAG, HOTBAR } from '../inventory';
import { blockOfItem, isItem, Item, ITEM_NAMES, itemOfBlock } from '../items';
import { craft, recipeById } from '../recipes';
import { MemoryTitanStorage } from '../save';
import { openSession } from '../session';
import { surfaceOf } from '../sounds';
import { BLOCK_NAMES, isFull, isSolid, T, tileFor } from '../voxel';
import { ORVALIS_GENERATOR_VERSION, OrvalisGenerator, orvalisGeneratorFor } from './generator';

/** Solo de cultivo e cerâmica do Orvalis em voxel (ADR 0111): cubos inteiros e receitas provisórias. */
const open = () => openSession(new MemoryTitanStorage(), 42, () => 1, orvalisGeneratorFor, ORVALIS_GENERATOR_VERSION, (s, v) => new OrvalisGenerator(s, v));
const slotOf = (s: Awaited<ReturnType<typeof open>>, item: number): number => [...Array(HOTBAR + BAG).keys()].find((i) => s.inventory.get(i)?.item === item) ?? -1;
const GIVES_DIRT: ReadonlySet<number> = new Set([T.FARMLAND_DRY, T.FARMLAND_WET, T.PATH]); // arada e caminho devolvem terra (ADR 0112)
const PAIRS: ReadonlyArray<[number, number, string]> = [
  [Item.TERRA_ARADA_SECA, T.FARMLAND_DRY, 'Terra Arada Seca'], [Item.TERRA_ARADA_UMIDA, T.FARMLAND_WET, 'Terra Arada Úmida'], [Item.CAMINHO_TERRA, T.PATH, 'Caminho de Terra'],
  [Item.TERRA_INFERTIL, T.DIRT_INFERTILE, 'Terra Infértil'], [Item.BLOCO_ARGILA, T.CLAY_BLOCK, 'Bloco de Argila'], [Item.BLOCO_TIJOLOS, T.BRICK_BLOCK, 'Bloco de Tijolos'],
];

describe('solo de cultivo e cerâmica (ADR 0111)', () => {
  it('ids 131–136 e itens 62–67 vão e voltam, com nome, cubo inteiro e tile próprio; 68 e 69 são itens sem bloco', () => {
    expect(T.FARMLAND_DRY).toBe(131); expect(T.BRICK_BLOCK).toBe(136);
    for (const [item, block, name] of PAIRS) {
      expect(isItem(item)).toBe(true); expect(blockOfItem(item)).toBe(block); expect(itemOfBlock(block)).toBe(GIVES_DIRT.has(block) ? Item.DIRT : item);
      expect(ITEM_NAMES[item]).toBe(name); expect(BLOCK_NAMES[block]).toBe(name);
      expect(isSolid(block) && isFull(block)).toBe(true);
      expect(tileFor(block, 'top')).toBeGreaterThanOrEqual(73); // tiles novos no fim do tiles.json
    }
    for (const item of [Item.BOLA_ARGILA, Item.TIJOLO]) { expect(isItem(item)).toBe(true); expect(blockOfItem(item)).toBeNull(); }
    expect(ITEM_NAMES[Item.BOLA_ARGILA]).toBe('Bola de Argila'); expect(ITEM_NAMES[Item.TIJOLO]).toBe('Tijolo');
    expect(isItem(77) && !isItem(78)).toBe(true);
    // a arada e o caminho têm topo e lateral próprios; a infértil e os blocos de cerâmica, o mesmo tile nas faces
    for (const b of [T.FARMLAND_DRY, T.FARMLAND_WET, T.PATH]) expect(tileFor(b, 'top')).not.toBe(tileFor(b, 'side'));
    expect(tileFor(T.FARMLAND_DRY, 'top')).not.toBe(tileFor(T.FARMLAND_WET, 'top'));
    for (const b of [T.DIRT_INFERTILE, T.CLAY_BLOCK, T.BRICK_BLOCK]) expect(tileFor(b, 'top')).toBe(tileFor(b, 'side'));
  });

  it('tempos e sons: solo e argila cedem como a terra; tijolos como a pedra', () => {
    const sand = breakTotalMs('block', T.DIRT);
    for (const b of [T.FARMLAND_DRY, T.FARMLAND_WET, T.PATH, T.DIRT_INFERTILE, T.CLAY_BLOCK]) { expect(breakTotalMs('block', b)).toBe(sand); expect(surfaceOf(b)).toBe('sand'); }
    expect(breakTotalMs('block', T.BRICK_BLOCK)).toBe(breakTotalMs('block', T.STONE_BRICK)); expect(surfaceOf(T.BRICK_BLOCK)).toBe('rock');
  });

  it('receitas provisórias (mesa, só no Orvalis): terra + areia → infértil; argila → tijolo → blocos', async () => {
    const s = await open();
    const inv = s.inventory;
    inv.add(Item.DIRT, 8); inv.add(Item.BEACH, 4);
    const make = (id: string): void => { expect(recipeById(id)!.world).toBe('orvalis'); expect(craft(inv, recipeById(id)!, 'workbench').ok).toBe(true); };
    for (const gone of ['terra-arada-seca', 'terra-arada-umida', 'caminho-terra']) expect(recipeById(gone)).toBeUndefined(); // vêm da enxada e da pá (ADR 0112)
    make('terra-infertil'); expect(inv.total(Item.TERRA_INFERTIL)).toBe(2);
    make('bola-argila'); make('bola-argila'); expect(inv.total(Item.BOLA_ARGILA)).toBe(4); expect(inv.total(Item.DIRT)).toBe(3);
    make('bloco-argila'); expect(inv.total(Item.BLOCO_ARGILA)).toBe(1); expect(inv.total(Item.BOLA_ARGILA)).toBe(0);
    inv.add(Item.BOLA_ARGILA, 4);
    for (let i = 0; i < 4; i++) make('tijolo');
    expect(inv.total(Item.TIJOLO)).toBe(4);
    make('bloco-tijolos'); expect(inv.total(Item.BLOCO_TIJOLOS)).toBe(1);
    expect(craft(inv, recipeById('tijolo')!, null)).toEqual({ ok: false, reason: 'station' });
  });

  it('no jogo: coloca e quebra cada bloco devolvendo o próprio item', async () => {
    const s = await open(), a = s.volume.gen.arrival, cx = Math.floor(a.x) + 3, cz = Math.floor(a.z);
    for (const [i, [item, block]] of PAIRS.entries()) {
      s.inventory.add(item, 1);
      const x = cx + i;
      expect(placeFromSlot(s, { x, y: a.y - 1, z: cz, nx: 0, ny: 1, nz: 0 }, slotOf(s, item)).ok).toBe(true);
      expect(s.volume.get(x, a.y, cz)).toBe(block);
      expect(breakOrCollect(s, { x, y: a.y, z: cz, nx: 0, ny: 1, nz: 0 }).ok).toBe(true);
      const back = GIVES_DIRT.has(block) ? Item.DIRT : item, before = s.inventory.total(back);
      sweep(s); expect(s.inventory.total(back)).toBe(before + 1);
    }
  });
});
