import { describe, expect, it } from 'vitest';
import { Block } from '../../world/blocks';
import { blockStack } from '../../world/items';
import { mulberry32 } from '../../world/random';
import { World } from '../../world/world';
import { Entities } from '../entities';
import { Player } from '../player';
import { applySave, captureSave, migrate } from '../save';
import { Inventory } from '../inventory';
import { HEALING_HERBS, markOf, phaseOf, questOf, sanitizeLog } from './quests';

describe('missão Ervas de cura (ADR 0034)', () => {
  it('fases e sinal sobre a cabeça: ! → ? → ? dourado → nada', () => {
    const q = HEALING_HERBS;
    expect(q.giver).toBe('silvano');
    expect(questOf('silvano')).toBe(q);
    expect(questOf('dante')).toBeNull();
    expect(q.item).toBe(blockStack(Block.FLOWER));
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
