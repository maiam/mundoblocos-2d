import { describe, expect, it } from 'vitest';
import { placeFromSlot } from '../actions';
import { breakTotalMs } from '../breaking';
import { BAG, HOTBAR } from '../inventory';
import { blockOfItem, isItem, Item, ITEM_NAMES, itemOfBlock } from '../items';
import { craft, matchBench, RECIPES, recipeById } from '../recipes';
import { MemoryTitanStorage } from '../save';
import { discoverRecipes, openSession } from '../session';
import { surfaceOf } from '../sounds';
import { carpentryId, carpentryTurn, carpentryTurnFacing, isCarpentry, isCraftingTable, isPlanks, isWorkbench, ladderFacing, T, tileFor, tileForFace } from '../voxel';
import { ORVALIS_GENERATOR_VERSION, OrvalisGenerator, orvalisGeneratorFor } from './generator';

/** Madeira básica do Orvalis em voxel (ADR 0107): tábuas, haste e Mesa de Carpintaria, com as regras do Minecraft. */
const open = () => openSession(new MemoryTitanStorage(), 42, () => 1, orvalisGeneratorFor, ORVALIS_GENERATOR_VERSION, (s, v) => new OrvalisGenerator(s, v));
const WOODS = [['carvalho', Item.LOG_OAK, Item.TABUA_CARVALHO, T.PLANKS_OAK], ['cerejeira', Item.LOG_CHERRY, Item.TABUA_CEREJEIRA, T.PLANKS_CHERRY], ['betula', Item.LOG_BIRCH, Item.TABUA_BETULA, T.PLANKS_BIRCH]] as const;

describe('madeira básica (ADR 0107)', () => {
  it('1 tora → 4 tábuas, 2 tábuas → 4 hastes, 4 tábuas → 1 mesa, por madeira e na mão (sem mesa)', async () => {
    for (const [slug, log, plank] of WOODS) {
      const s = await open();
      s.inventory.add(log, 2);
      expect(craft(s.inventory, recipeById(`tabuas-${slug}`)!, null)).toEqual({ ok: true, reason: 'ok' });
      expect(s.inventory.total(log)).toBe(1); expect(s.inventory.total(plank)).toBe(4);
      expect(craft(s.inventory, recipeById(`hastes-${slug}`)!, null).ok).toBe(true);
      expect(s.inventory.total(plank)).toBe(2); expect(s.inventory.total(Item.HASTE)).toBe(4);
      expect(craft(s.inventory, recipeById(`mesa-carpintaria-${slug}`)!, null)).toEqual({ ok: false, reason: 'missing' }); // 2 tábuas não bastam
      s.inventory.add(plank, 2);
      expect(craft(s.inventory, recipeById(`mesa-carpintaria-${slug}`)!, null).ok).toBe(true);
      expect(s.inventory.total(Item.MESA_CARPINTARIA)).toBe(1); expect(s.inventory.total(plank)).toBe(0);
    }
  });

  it('a grade 3 × 3 reconhece as receitas pelas quantidades; cada receita nova tem ingredientes únicos', () => {
    for (const [slug, log, plank] of WOODS) {
      expect(matchBench(new Map([[log, 1]]))?.id).toBe(`tabuas-${slug}`);
      expect(matchBench(new Map([[plank, 2]]))?.id).toBe(`hastes-${slug}`);
      expect(matchBench(new Map([[plank, 4]]))?.id).toBe(`mesa-carpintaria-${slug}`);
    }
    expect(new Set(RECIPES.map((r) => r.id)).size).toBe(RECIPES.length);
  });

  it('itens ↔ blocos: tábuas e mesa (4 giros devolvem 1 mesa); a haste não é bloco', () => {
    for (const [, , item, block] of WOODS) { expect(blockOfItem(item)).toBe(block); expect(itemOfBlock(block)).toBe(item); expect(isPlanks(block)).toBe(true); expect(ITEM_NAMES[item]).toMatch(/^Tábuas de /); }
    expect(blockOfItem(Item.MESA_CARPINTARIA)).toBe(T.CARPENTRY);
    for (let t = 0; t < 4; t++) { expect(itemOfBlock(carpentryId(t))).toBe(Item.MESA_CARPINTARIA); expect(isCarpentry(carpentryId(t))).toBe(true); expect(carpentryTurn(carpentryId(t))).toBe(t); }
    expect(blockOfItem(Item.HASTE)).toBeNull(); expect(ITEM_NAMES[Item.HASTE]).toBe('Haste de Madeira');
    expect(isItem(Item.MESA_CARPINTARIA)).toBe(true); expect(isItem(83)).toBe(false);
  });

  it('a Mesa de Carpintaria é bancada como a Mesa de Trabalho, mas só a do Titã é modelo 3D', () => {
    expect(isCraftingTable(T.CARPENTRY_180)).toBe(true); expect(isCraftingTable(T.WORKBENCH)).toBe(true); expect(isCraftingTable(T.PLANKS_OAK)).toBe(false);
    expect(isWorkbench(T.CARPENTRY)).toBe(false);
  });

  it('colocada, a frente da mesa fica voltada para o jogador; as outras laterais e o topo têm arte própria', async () => {
    const s = await open(), a = s.volume.gen.arrival, cx = Math.floor(a.x) + 2, cz = Math.floor(a.z); // ao lado do jogador (a clareira é plana)
    for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
      s.yaw = yaw;
      s.volume.set(cx, a.y, cz, T.AIR);
      s.inventory.add(Item.MESA_CARPINTARIA, 1);
      const slot = [...Array(HOTBAR + BAG).keys()].find((i) => s.inventory.get(i)?.item === Item.MESA_CARPINTARIA)!;
      expect(placeFromSlot(s, { x: cx, y: a.y - 1, z: cz, nx: 0, ny: 1, nz: 0 }, slot).ok).toBe(true);
      const id = s.volume.get(cx, a.y, cz), [fx, fz] = ladderFacing(carpentryTurn(id));
      expect(id).toBe(carpentryId(carpentryTurnFacing(yaw)));
      expect(tileForFace(id, 'side', [fx, 0, fz])).not.toBe(tileFor(id, 'side')); // a frente é outra arte
      expect(tileForFace(id, 'side', [-fx, 0, -fz])).toBe(tileFor(id, 'side')); // as outras três são a lateral
      expect(tileForFace(id, 'side', [fz, 0, fx])).toBe(tileFor(id, 'side'));
      expect(tileForFace(id, 'top', [0, 1, 0])).toBe(tileFor(id, 'top'));
      // o olhar (−sen yaw, −cos yaw) vai de quem coloca para a mesa: a frente aponta de volta, para o jogador
      expect([fx + 0, fz + 0]).toEqual([Math.round(Math.sin(yaw)) + 0, Math.round(Math.cos(yaw)) + 0]);
    }
  });

  it('a madeira revela as receitas pessoais e a mesa revela as da bancada', async () => {
    const s = await open();
    discoverRecipes(s); expect(s.known.has('mesa')).toBe(false);
    s.inventory.add(Item.LOG_OAK, 1);
    expect(discoverRecipes(s)).toContain('mesa'); expect(s.known.has('bancada')).toBe(false);
    s.inventory.add(Item.MESA_CARPINTARIA, 1);
    expect(discoverRecipes(s)).toContain('bancada');
  });

  it('cada mundo mostra só as suas receitas: as 9 de madeira são do Orvalis, o resto (Mesa de Trabalho, lanterna…) é do Titã', () => {
    const orv = RECIPES.filter((r) => r.world === 'orvalis' && /^(tabuas|hastes|mesa-carpintaria)-/.test(r.id)).map((r) => r.id).sort(); // as de madeira (as de pedra, ADR 0108, também são do Orvalis)
    expect(orv).toEqual(['hastes-betula', 'hastes-carvalho', 'hastes-cerejeira', 'mesa-carpintaria-betula', 'mesa-carpintaria-carvalho', 'mesa-carpintaria-cerejeira', 'tabuas-betula', 'tabuas-carvalho', 'tabuas-cerejeira']);
    expect(recipeById('mesa')!.world).toBeUndefined(); expect(recipeById('lanterna')!.world).toBeUndefined();
  });

  it('tempos e som: tábuas e mesa por dureza da Wiki (tábuas 3 s, mesa 3,75 s na mão)', () => {
    for (const b of [T.PLANKS_OAK, T.PLANKS_CHERRY, T.PLANKS_BIRCH, T.CARPENTRY, T.CARPENTRY_90, T.CARPENTRY_180, T.CARPENTRY_270]) { expect(breakTotalMs('block', b)).toBe(b === T.PLANKS_OAK || b === T.PLANKS_CHERRY || b === T.PLANKS_BIRCH ? 3200 : 3950); expect(surfaceOf(b)).not.toBeNull(); }
  });
});
