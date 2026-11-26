import { describe, expect, it } from 'vitest';
import { breakOrCollect, placeFromSlot } from '../actions';
import { sweep } from '../dropTestUtil';
import { BAG, HOTBAR } from '../inventory';
import { Item, ITEM_NAMES, blockOfItem, itemOfBlock, isItem } from '../items';
import { MemoryTitanStorage } from '../save';
import { flush, openSession } from '../session';
import { skyAt } from '../sky';
import { breakTotalMs } from '../breaking';
import { surfaceOf } from '../sounds';
import { T, tileFor } from '../voxel';
import { ORVALIS_GENERATOR_VERSION, OrvalisGenerator, orvalisGeneratorFor } from './generator';

/** Orvalis em voxel (ADR 0105): o mundo roda no motor do Titã com gerador, banco, itens e céu próprios. */
const open = (st = new MemoryTitanStorage(), seed = 42) => openSession(st, seed, () => 1, orvalisGeneratorFor, ORVALIS_GENERATOR_VERSION, (s, v) => new OrvalisGenerator(s, v));
const hit = (x: number, y: number, z: number) => ({ x, y, z, nx: 0, ny: 1, nz: 0 });

describe('Orvalis em voxel — mundo no motor do Titã', () => {
  it('abre uma partida do Orvalis: gerador, chegada de grama e corpo sobre o chão', async () => {
    const s = await open();
    expect(s.volume.gen.world).toBe('orvalis');
    const a = s.volume.gen.arrival;
    expect(s.volume.get(Math.floor(a.x), a.y - 1, Math.floor(a.z))).toBe(T.GRASS);
    expect(s.body.y).toBeCloseTo(a.y, 5);
    expect(s.creatures).toEqual([]); // sem Farejadores
  });

  it('quebrar a grama solta o bloco; recolhido, vai para a mochila e se coloca de volta', async () => {
    const s = await open();
    const a = s.volume.gen.arrival, bx = Math.floor(a.x), bz = Math.floor(a.z);
    expect(breakOrCollect(s, hit(bx, a.y - 1, bz)).ok).toBe(true);
    expect(s.volume.get(bx, a.y - 1, bz)).not.toBe(T.GRASS);
    sweep(s);
    expect(s.inventory.total(Item.GRASS)).toBe(1);
    const slot = [...Array(HOTBAR + BAG).keys()].find((i) => s.inventory.get(i)?.item === Item.GRASS) ?? -1;
    expect(slot).toBeGreaterThanOrEqual(0);
    expect(placeFromSlot(s, { x: bx, y: a.y - 2, z: bz, nx: 0, ny: 1, nz: 0 }, slot).ok).toBe(true);
    expect(s.volume.get(bx, a.y - 1, bz)).toBe(T.GRASS);
  });

  it('itens ↔ blocos: 42–51 são válidos, nomeados e vão e voltam dos 10 blocos', () => {
    const pares: Array<[number, number]> = [[Item.GRASS, T.GRASS], [Item.DIRT, T.DIRT], [Item.STONE, T.STONE], [Item.BEACH, T.BEACH], [Item.LOG_OAK, T.LOG_OAK], [Item.LEAVES_OAK, T.LEAVES_OAK], [Item.LOG_CHERRY, T.LOG_CHERRY], [Item.LEAVES_CHERRY, T.LEAVES_CHERRY], [Item.LOG_BIRCH, T.LOG_BIRCH], [Item.LEAVES_BIRCH, T.LEAVES_BIRCH]];
    for (const [item, block] of pares) {
      expect(isItem(item)).toBe(true);
      expect(blockOfItem(item)).toBe(block);
      expect(itemOfBlock(block)).toBe(item);
      expect(ITEM_NAMES[item]).toBeTruthy();
      expect(breakTotalMs('block', block)).not.toBeNull();
      expect(surfaceOf(block)).not.toBeNull();
      expect(tileFor(block, 'top')).toBeGreaterThanOrEqual(48); // tiles do Orvalis no fim do atlas
    }
    expect(isItem(62)).toBe(false);
    expect(blockOfItem(Item.SAND)).toBe(T.SAND); // os itens do Titã seguem iguais
  });

  it('tempos de quebra: terra e areia 0,6 s, tora 1 s, folha 0,4 s, pedra 1,6 s (0,96 s com picareta de rocha)', () => {
    expect(breakTotalMs('block', T.DIRT)).toBe(600);
    expect(breakTotalMs('block', T.LOG_OAK)).toBe(1000);
    expect(breakTotalMs('block', T.LEAVES_OAK)).toBe(400);
    expect(breakTotalMs('block', T.STONE)).toBe(1600);
    expect(breakTotalMs('block', T.STONE, 'rock')).toBe(960);
  });

  it('salva com `world: orvalis` e reabre a mesma partida com o gerador do Orvalis (edições incluídas)', async () => {
    const st = new MemoryTitanStorage();
    const s = await open(st);
    const a = s.volume.gen.arrival, bx = Math.floor(a.x), bz = Math.floor(a.z);
    s.volume.set(bx, a.y + 1, bz, T.STONE);
    await flush(st, s);
    expect(st.games.get(42)!.world).toBe('orvalis');
    const again = await open(st);
    expect(again.resumed).toBe(true);
    expect(again.volume.gen.world).toBe('orvalis');
    expect(again.volume.get(bx, a.y + 1, bz)).toBe(T.STONE);
  });

  it('o céu do Orvalis é azul de dia e o do Titã segue cobre; a noite tem a mesma luz', () => {
    const o = skyAt(0.375, 'orvalis'), t = skyAt(0.375);
    expect(o.zenith[2]).toBeGreaterThan(o.zenith[0]); // azul domina
    expect(t.zenith[0]).toBeGreaterThan(t.zenith[2]); // cobre domina
    expect(skyAt(0.75, 'orvalis').ambient).toBe(skyAt(0.75).ambient);
  });
});
