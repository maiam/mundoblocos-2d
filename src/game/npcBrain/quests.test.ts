import { describe, expect, it } from 'vitest';
import { Block } from '../../world/blocks';
import { blockStack } from '../../world/items';
import { mulberry32 } from '../../world/random';
import { World } from '../../world/world';
import { Entities } from '../entities';
import { Player } from '../player';
import { applySave, captureSave, migrate } from '../save';
import { Inventory } from '../inventory';
import { breakDrops } from '../../world/items';
import { blockDef, FLOWER_BLOCKS, wildFlowerIndex } from '../../world/blocks';
import { compass, haveOf, healingHerbsFor, markOf, phaseOf, questOf, questsFor, sanitizeLog, takeOf } from './quests';

describe('missão Ervas de cura por seed (v0.93.119)', () => {
  const world = new World(42);
  const q = healingHerbsFor(world)!;

  it('pede UMA espécie específica (a do canteiro da seed), diz o nome, o rumo e os passos, e só ela vale', () => {
    const patch = world.flowerPatch!;
    expect(q.giver).toBe('silvano');
    expect(q.items).toEqual([blockStack(patch.species)]);
    const name = blockDef(patch.species).name;
    expect(q.offer).toContain(name);
    expect(q.offer).toMatch(/ao (norte|sul|leste|oeste|nordeste|noroeste|sudeste|sudoeste) do portão/);
    expect(q.offer).toMatch(/a uns \d+ passos/);
    expect(q.progress(2)).toContain('só ela serve');
    const inv = new Inventory();
    const count = (id: string) => inv.count(id as never);
    const other = FLOWER_BLOCKS.find((b) => b !== patch.species)!;
    inv.add(blockStack(other), 20); // outras espécies não contam
    expect(haveOf(q, count)).toBe(0);
    inv.add(blockStack(patch.species), 5);
    expect(haveOf(q, count)).toBe(5);
    expect(takeOf(q, count, (id, n) => inv.take(id as never, n))).toBe(false); // faltam: não tira nada
    expect(haveOf(q, count)).toBe(5);
    inv.add(blockStack(patch.species), 2);
    expect(takeOf(q, count, (id, n) => inv.take(id as never, n))).toBe(true);
    expect(haveOf(q, count)).toBe(1);
    expect(inv.count(blockStack(other))).toBe(20); // nada mais é tirado
  });

  it('o canteiro garante flores: a missão é oferecida; sem o canteiro (mundo mexido) deixa de ser oferecida; sem canteiro no mundo, não há missão', () => {
    expect(q.offerable()).toBe(true);
    const w2 = new World(42);
    for (const [x, y] of w2.flowerPatch!.cells.slice(0, 5)) w2.breakBlock(x, y); // sobram 5
    expect(healingHerbsFor(w2)!.offerable()).toBe(false);
    expect(questsFor(world)).toHaveLength(1);
    expect(questOf(questsFor(world), 'silvano')).not.toBeNull();
    expect(questOf(questsFor(world), 'dante')).toBeNull();
  });

  it('o rumo vem do mapa: compass', () => {
    expect(compass(10, 0)).toBe('leste');
    expect(compass(0, 10)).toBe('sul');
    expect(compass(-10, 0)).toBe('oeste');
    expect(compass(0, -10)).toBe('norte');
    expect(compass(7, 7)).toBe('sudeste');
    expect(compass(-7, -7)).toBe('noroeste');
  });

  it('fases e sinal sobre a cabeça: ! → ? → ? dourado → nada', () => {
    expect(phaseOf({}, q, 99)).toBe('available'); // sem aceitar, as flores não contam
    expect(markOf('available')).toBe('offer');
    expect(phaseOf({ 'ervas-de-cura': 'active' }, q, 5)).toBe('active');
    expect(markOf('active')).toBe('progress');
    expect(phaseOf({ 'ervas-de-cura': 'active' }, q, 6)).toBe('ready');
    expect(markOf('ready')).toBe('ready');
    expect(phaseOf({ 'ervas-de-cura': 'done' }, q, 0)).toBe('done');
    expect(markOf('done')).toBeNull();
  });

  it('o save valida e migra (v18 → v19 sem missões)', () => {
    expect(sanitizeLog({ 'ervas-de-cura': 'active', lixo: 'x' })).toEqual({ 'ervas-de-cura': 'active' });
    expect(sanitizeLog({ 'ervas-de-cura': 'feito' })).toEqual({});
    const w = new World(42);
    const [sx, sy] = w.town!.start;
    const p = new Player(sx + 0.5, sy + 0.6);
    const e = new Entities(p, mulberry32(42));
    e.quests['ervas-de-cura'] = 'active';
    const state = { world: w, player: p, entities: e, inventory: new Inventory(), time: 0.3, selected: null, hotbar: null };
    const d = captureSave(state);
    const e2 = new Entities(new Player(sx + 0.5, sy + 0.6), mulberry32(42));
    applySave(JSON.parse(JSON.stringify(d)), { world: new World(42), player: new Player(sx + 0.5, sy + 0.6), entities: e2, inventory: new Inventory(), time: 0, selected: null, hotbar: null });
    expect(e2.quests).toEqual({ 'ervas-de-cura': 'active' });
    const { quests: _q, ...old } = d;
    expect(migrate({ ...old, v: 18 })?.quests).toEqual({});
    expect(migrate({ ...old, v: 19, missions: undefined })?.missions).toEqual({ done: [], active: null, progress: {} });
    const money = migrate({ ...old, v: 20, inventory: { wheat: 2, copper_coin: 7 }, coins: undefined } as never)!; // v20 → v21: moedas da bolsa viram carteira
    expect(money.coins).toBe(7);
    expect(money.inventory).toEqual({ wheat: 2 });
  });
});

describe('flores do campo (v0.93.118)', () => {
  it('a flor do campo solta exatamente a espécie que o mundo desenha ali; seed e célula decidem', () => {
    const seen = new Set<number>();
    for (let x = 0; x < 80; x++) for (let y = 0; y < 5; y++) {
      const i = wildFlowerIndex(42, x, y);
      expect(i).toBeGreaterThanOrEqual(0);
      expect(i).toBeLessThan(15);
      seen.add(i);
      expect(breakDrops(null, Block.FLOWER, true, Math.random, { seed: 42, x, y })).toEqual([{ item: blockStack(FLOWER_BLOCKS[i]), count: 1 }]);
    }
    expect(seen.size).toBe(15); // todas as 15 aparecem
    expect(breakDrops(null, Block.FLOWER, false, Math.random, { seed: 42, x: 1, y: 1 })).toEqual([]); // mundo sem coleta
  });
});

describe('Silvano acompanhando a jogadora', () => {
  function setup() {
    const w = new World(42);
    const [sx, sy] = w.town!.start;
    const p = new Player(sx + 0.5, sy + 0.6);
    const e = new Entities(p, mulberry32(42));
    e.spawnVillagers(w);
    const v = e.villagers.find((x) => x.npc === 'silvano')!;
    return { w, p, e, v };
  }

  it('segue de perto, corre para alcançar e reaparece ao lado quando a perde; ao terminar volta ao posto', () => {
    const { w, p, e, v } = setup();
    v.setCompanion(true);
    expect(v.escorting).toBe(true);
    // a jogadora anda 12 células; ele a alcança e para perto
    for (let i = 0; i < 300; i++) { p.x += 0.04; e.update(0.05, w); }
    expect(Math.hypot(v.x - p.x, v.y - p.y)).toBeLessThan(6);
    // some da vista (longe demais): aparece ao lado
    p.x += 60; e.update(0.05, w);
    expect(Math.hypot(v.x - p.x, v.y - p.y)).toBeLessThan(3);
    // termina: volta ao posto andando e retoma o passeio
    v.setCompanion(false);
    expect(v.escorting).toBe(true); // ainda a caminho de casa
    for (let i = 0; i < 4000 && v.escorting; i++) e.update(0.05, w);
    expect(v.escorting).toBe(false);
    expect(Math.hypot(v.x - v.homeX, v.y - v.homeY)).toBeLessThan(2);
  });

  it('só quem tem missão mostra o sinal', () => {
    const { w, e } = setup();
    e.marks = { silvano: 'offer' };
    e.update(0.05, w);
    const withMark = e.actors.filter((a) => a.mark);
    expect(withMark.map((a) => a.kind)).toEqual(['npc-silvano']);
  });
});
