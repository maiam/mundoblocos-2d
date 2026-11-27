import { describe, expect, it } from 'vitest';
import { breakOrCollect, furnaceAt, furnaceMoveIn, furnaceTakeOut, placeFromSlot } from '../actions';
import { blockToolOf, breakTotalMs, HOLD_MS } from '../breaking';
import { accepts, BRAZIER_RULES, canSmelt, FURNACE_RULES, FUEL_TIME_S, furnaceFromData, isFuel, newFurnace, rulesOf, showsLit, smeltRecipe, tickFurnace } from '../furnace';
import { blockOfItem, isItem, Item, itemOfBlock, ITEM_NAMES, maxStack } from '../items';
import { craft, recipeById, RECIPES, stationMet } from '../recipes';
import { MemoryTitanStorage } from '../save';
import { flush, openSession, tickFurnaces } from '../session';
import { surfaceOf } from '../sounds';
import { blocksLight, furnaceId, furnaceTurn, isFull, isFurnace, isFurnaceLit, lightLevelOf, T, tileFor, tileForFace, tileIndex } from '../voxel';
import { ORVALIS_GENERATOR_VERSION, OrvalisGenerator, orvalisGeneratorFor } from './generator';

/** Fornalha do Orvalis e Carvão Vegetal (ADR 0120, auditoria #21): motor do braseiro com as regras da Minecraft Wiki. */
const open = async (st = new MemoryTitanStorage(), seed: number | null = 42) => ({ st, s: await openSession(st, seed, () => 1, orvalisGeneratorFor, ORVALIS_GENERATOR_VERSION, (sd, v) => new OrvalisGenerator(sd, v)) });
const Y = 150;
const spot = (s: Awaited<ReturnType<typeof open>>['s']) => { const a = s.volume.gen.arrival, x = Math.floor(a.x) + 6, z = Math.floor(a.z) + 6; for (let yy = Y + 1; yy < Y + 4; yy++) s.volume.set(x, yy, z, T.AIR); s.volume.set(x, Y, z, T.STONE); return { x, z }; };

describe('Fornalha: blocos, itens e regras do bloco', () => {
  it('8 ids (apagada 137–140, acesa 141–144) com o giro no id; cubo opaco que bloqueia a luz; acesa emite 13', () => {
    for (let t = 0; t < 4; t++) {
      const off = furnaceId(t, false), on = furnaceId(t, true);
      expect(off).toBe(T.FURNACE + t); expect(on).toBe(T.FURNACE_LIT + t); expect(isFurnace(off) && isFurnace(on)).toBe(true);
      expect(isFurnaceLit(off)).toBe(false); expect(isFurnaceLit(on)).toBe(true); expect(furnaceTurn(off)).toBe(t); expect(furnaceTurn(on)).toBe(t);
      expect(isFull(off) && blocksLight(off) && blocksLight(on)).toBe(true);
      expect(lightLevelOf(off)).toBe(0); expect(lightLevelOf(on)).toBe(13); // Wiki: fornalha acesa = 13
      expect(blockToolOf(off)).toBe('pick'); expect(surfaceOf(on)).toBe('rock');
      expect(itemOfBlock(off)).toBe(Item.FORNALHA); expect(itemOfBlock(on)).toBe(Item.FORNALHA); // a acesa volta apagada
    }
    expect(isFurnace(T.BRICK_BLOCK) || isFurnace(T.FURNACE_LIT_270 + 1)).toBe(false);
    expect(blockOfItem(Item.FORNALHA)).toBe(T.FURNACE);
  });
  it('itens 83 (Fornalha) e 84 (Carvão Vegetal): nomes, pilha de 64 e combustível de 80 s; 86 não é item (só a textura da Tocha de parede)', () => {
    expect(Item.FORNALHA).toBe(83); expect(Item.CARVAO_VEGETAL).toBe(84); expect(isItem(84) && isItem(85)).toBe(true); expect(isItem(86)).toBe(false);
    expect(ITEM_NAMES[83]).toBe('Fornalha'); expect(ITEM_NAMES[84]).toBe('Carvão Vegetal'); expect(maxStack(83)).toBe(64); expect(maxStack(84)).toBe(64);
    expect(blockOfItem(Item.CARVAO_VEGETAL)).toBeNull();
  });
  it('quebra: dureza 3,5 da Wiki (picareta de pedra 1,35 s; mão 17,5 s)', () => {
    expect(breakTotalMs('block', T.FURNACE)).toBe(HOLD_MS + 17500); expect(breakTotalMs('block', T.FURNACE_LIT_90, 'rock')).toBe(HOLD_MS + 1350);
  });
  it('tiles: topo e lateral comuns; a frente (a direção do giro) é a apagada ou a acesa', () => {
    expect(tileFor(T.FURNACE, 'top')).toBe(tileIndex('orvalis/fornalha-topo')); expect(tileFor(T.FURNACE, 'side')).toBe(tileIndex('orvalis/fornalha-lateral'));
    expect(tileForFace(T.FURNACE, 'side', [0, 0, 1])).toBe(tileIndex('orvalis/fornalha-frente-apagada')); // giro 0: frente em +Z
    expect(tileForFace(T.FURNACE_LIT, 'side', [0, 0, 1])).toBe(tileIndex('orvalis/fornalha-frente-acesa'));
    expect(tileForFace(T.FURNACE_90, 'side', [1, 0, 0])).toBe(tileIndex('orvalis/fornalha-frente-apagada')); expect(tileForFace(T.FURNACE_90, 'side', [0, 0, 1])).toBe(tileIndex('orvalis/fornalha-lateral'));
  });
});

describe('Fornalha: receitas e combustíveis (Wiki)', () => {
  it('Fornalha = 8 Pedras na bancada; toras viram Carvão Vegetal; Pedra Lisa e Tijolo saem da fornalha; tudo só no Orvalis', () => {
    const r = (id: string) => recipeById(id)!;
    expect(r('fornalha').ingredients).toEqual([{ item: Item.STONE, count: 8 }]); expect(r('fornalha').station).toBe('workbench');
    for (const [id, log] of [['carvao-carvalho', Item.LOG_OAK], ['carvao-cerejeira', Item.LOG_CHERRY], ['carvao-betula', Item.LOG_BIRCH]] as const) {
      expect(r(id).station).toBe('furnace'); expect(r(id).ingredients).toEqual([{ item: log, count: 1 }]); expect(r(id).result).toEqual({ item: Item.CARVAO_VEGETAL, count: 1 });
    }
    expect(r('pedra-lisa').station).toBe('furnace'); expect(r('tijolo').station).toBe('furnace');
    for (const id of ['fornalha', 'carvao-carvalho', 'carvao-cerejeira', 'carvao-betula', 'pedra-lisa', 'tijolo']) expect(r(id).world).toBe('orvalis');
    expect(stationMet(r('carvao-carvalho'), 'furnace')).toBe(true); expect(stationMet(r('carvao-carvalho'), 'workbench')).toBe(false); expect(stationMet(r('carvao-carvalho'), 'brazier')).toBe(false);
    expect(RECIPES.filter((x) => x.station === 'furnace' && x.ingredients.length !== 1)).toEqual([]); // receita de fornalha é um ingrediente só
  });
  it('combustíveis em segundos de queima da Wiki: carvão vegetal 80, tora e tábuas 15, Mesa 15, haste 5; entrada só a da estação', () => {
    expect([Item.CARVAO_VEGETAL, Item.LOG_OAK, Item.TABUA_BETULA, Item.MESA_CARPINTARIA, Item.HASTE].map((i) => FUEL_TIME_S[i])).toEqual([80, 15, 15, 15, 5]);
    expect(isFuel(Item.LOG_CHERRY)).toBe(true); expect(isFuel(Item.STONE)).toBe(false);
    expect(accepts('input', Item.LOG_OAK, 'furnace')).toBe(true); expect(accepts('input', Item.LOG_OAK, 'brazier')).toBe(false); // a tora é do Orvalis, o braseiro não a cozinha
    expect(accepts('input', Item.COPPER_SHARD, 'brazier')).toBe(true); expect(accepts('input', Item.COPPER_SHARD, 'furnace')).toBe(false);
    expect(smeltRecipe(Item.BOLA_ARGILA, 'furnace')!.result.item).toBe(Item.TIJOLO); expect(smeltRecipe(Item.STONE, 'furnace')!.result.item).toBe(Item.PEDRA_LISA);
    expect(furnaceFromData({ i: [Item.LOG_OAK, 2] }, FURNACE_RULES).input).toEqual({ item: Item.LOG_OAK, count: 2 }); expect(furnaceFromData({ i: [Item.LOG_OAK, 2] }, BRAZIER_RULES).input).toBeNull(); // ler o save usa as regras do bloco
    expect(rulesOf(T.FURNACE_LIT_180)).toBe(FURNACE_RULES); expect(rulesOf(T.BRAZIER)).toBe(BRAZIER_RULES); expect(rulesOf(T.STONE)).toBeNull();
  });
  it('fabricar a fornalha na bancada (8 Pedras) e o carvão só na fornalha', async () => {
    const { s } = await open(); s.inventory.add(Item.STONE, 8); s.inventory.add(Item.LOG_OAK, 1);
    expect(craft(s.inventory, recipeById('carvao-carvalho')!, 'workbench').reason).toBe('station');
    expect(craft(s.inventory, recipeById('fornalha')!, 'workbench').ok).toBe(true);
    expect(s.inventory.total(Item.FORNALHA)).toBe(1); expect(s.inventory.total(Item.STONE)).toBe(0);
    expect(craft(s.inventory, recipeById('carvao-carvalho')!, 'furnace').ok).toBe(true); expect(s.inventory.total(Item.CARVAO_VEGETAL)).toBe(1);
  });
});

describe('Fornalha: tempo e queima (Wiki)', () => {
  const load = (input: [number, number] | null, fuel: [number, number] | null) => { const f = newFurnace(); if (input) f.input = { item: input[0], count: input[1] }; if (fuel) f.fuel = { item: fuel[0], count: fuel[1] }; return f; };
  it('uma preparação a cada 10 s e 1 carvão vegetal rende 8 (80 s)', () => {
    const f = load([Item.LOG_OAK, 8], [Item.CARVAO_VEGETAL, 1]);
    tickFurnace(f, 9.9, FURNACE_RULES); expect(f.output).toBeNull();
    tickFurnace(f, 0.2, FURNACE_RULES); expect(f.output).toEqual({ item: Item.CARVAO_VEGETAL, count: 1 });
    tickFurnace(f, 70, FURNACE_RULES); expect(f.output!.count).toBe(8); expect(f.input).toBeNull(); expect(f.fuel).toBeNull(); expect(f.burnLeft).toBeLessThanOrEqual(0.001);
  });
  it('queima contínua: o combustível é gasto ao começar e queima até o fim mesmo sem entrada; o braseiro do Titã segue guardando a carga', () => {
    const f = load([Item.LOG_OAK, 1], [Item.TABUA_CARVALHO, 1]); // 1 tábua = 15 s, 1 tora = 10 s
    tickFurnace(f, 10, FURNACE_RULES);
    expect(f.output).toEqual({ item: Item.CARVAO_VEGETAL, count: 1 }); expect(f.fuel).toBeNull(); expect(f.burnLeft).toBeCloseTo(5, 5); expect(showsLit(f, FURNACE_RULES)).toBe(true); // sobrou chama, sem nada para cozinhar
    tickFurnace(f, 3, FURNACE_RULES); expect(f.burnLeft).toBeCloseTo(2, 5); // continua queimando sozinha
    tickFurnace(f, 3, FURNACE_RULES); expect(f.burnLeft).toBe(0); expect(showsLit(f, FURNACE_RULES)).toBe(false);
    const b = load([Item.COPPER_SHARD, 2], [Item.EMBER, 1]); b.burnLeft = b.burnTotal = 40; b.input = null; // braseiro aceso e parado: o saldo fica
    tickFurnace(b, 30, BRAZIER_RULES); expect(b.burnLeft).toBe(40);
  });
  it('sem queima o cozimento regride 2× mais rápido; saída cheia ou outra trava a fornalha', () => {
    const f = load([Item.LOG_OAK, 2], null); f.cook = 6;
    tickFurnace(f, 2, FURNACE_RULES); expect(f.cook).toBe(2);
    const g = load([Item.LOG_OAK, 1], [Item.CARVAO_VEGETAL, 1]); g.output = { item: Item.TIJOLO, count: 1 };
    expect(canSmelt(g, FURNACE_RULES)).toBe(false); tickFurnace(g, 20, FURNACE_RULES); expect(g.input!.count).toBe(1); expect(g.burnLeft).toBe(0); expect(g.fuel!.count).toBe(1); // não acende sem o que cozinhar
  });
});

describe('Fornalha na sessão', () => {
  it('colocar com a frente para o jogador, usar, acender e apagar sem perder o giro, luz 13 e estado no save', async () => {
    const { st, s } = await open(); const p = spot(s);
    s.inventory.add(Item.FORNALHA, 1); s.inventory.move([...Array(36).keys()].find((i) => s.inventory.get(i)?.item === Item.FORNALHA)!, 0); s.selected = 0; s.yaw = Math.PI / 2;
    expect(placeFromSlot(s, { x: p.x, y: Y, z: p.z, nx: 0, ny: 1, nz: 0 }, 0).ok).toBe(true);
    expect(s.volume.light(p.x, Y + 1, p.z)).toBe(0); // liga o motor de luz antes do estado mudar
    const id = s.volume.get(p.x, Y + 1, p.z); expect(isFurnace(id) && !isFurnaceLit(id)).toBe(true); const turn = furnaceTurn(id);
    expect(furnaceAt(s, p.x, Y + 1, p.z)).not.toBeNull();
    s.inventory.add(Item.LOG_OAK, 2); s.inventory.add(Item.CARVAO_VEGETAL, 1);
    const slot = (item: number) => [...Array(36).keys()].find((i) => s.inventory.get(i)?.item === item)!;
    expect(furnaceMoveIn(s, p.x, Y + 1, p.z, 'input', slot(Item.LOG_OAK)).ok).toBe(true);
    expect(furnaceMoveIn(s, p.x, Y + 1, p.z, 'fuel', slot(Item.CARVAO_VEGETAL)).ok).toBe(true);
    expect(furnaceMoveIn(s, p.x, Y + 1, p.z, 'input', slot(Item.STONE) >= 0 ? slot(Item.STONE) : 0).ok).toBe(false); // outro item não entra
    expect(tickFurnaces(s, 1)).toBe(true);
    const lit = s.volume.get(p.x, Y + 1, p.z); expect(isFurnaceLit(lit)).toBe(true); expect(furnaceTurn(lit)).toBe(turn); expect(s.volume.light(p.x, Y + 1, p.z)).toBe(13); // acesa: emissor de 13 (Wiki)
    await flush(st, s);
    const again = await open(st, null);
    expect(again.s.furnaces.get(`${p.x},${Y + 1},${p.z}`)!.fuel).toBeNull(); // o carvão já foi gasto ao acender
    expect(again.s.furnaces.get(`${p.x},${Y + 1},${p.z}`)!.burnLeft).toBeGreaterThan(70);
    tickFurnaces(s, 100);
    expect(furnaceTakeOut(s, p.x, Y + 1, p.z, 'output').ok).toBe(true); expect(s.inventory.total(Item.CARVAO_VEGETAL)).toBe(2);
    expect(isFurnaceLit(s.volume.get(p.x, Y + 1, p.z))).toBe(false); expect(furnaceTurn(s.volume.get(p.x, Y + 1, p.z))).toBe(turn); // apagou ao fim da carga
  });
  it('quebrar a fornalha cospe o conteúdo e devolve a Fornalha apagada', async () => {
    const { s } = await open(); const p = spot(s);
    s.volume.set(p.x, Y + 1, p.z, T.FURNACE_LIT_90);
    const f = furnaceAt(s, p.x, Y + 1, p.z)!; f.input = { item: Item.LOG_OAK, count: 3 }; f.output = { item: Item.CARVAO_VEGETAL, count: 2 };
    expect(breakOrCollect(s, { x: p.x, y: Y + 1, z: p.z, nx: 0, ny: 1, nz: 0 }).ok).toBe(true);
    expect(s.furnaces.has(`${p.x},${Y + 1},${p.z}`)).toBe(false);
    expect([...s.drops.values()].filter((d) => d.id.startsWith('f:')).map((d) => d.item).sort()).toEqual([Item.LOG_OAK, Item.CARVAO_VEGETAL].sort());
  });
});
