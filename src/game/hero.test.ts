import { describe, expect, it } from 'vitest';
import { World } from '../world/world';
import { Entities } from './entities';
import { Inventory } from './inventory';
import { Player } from './player';
import { applySave, captureSave, migrate, SAVE_VERSION } from './save';

describe('Herói (personagem pronto)', () => {
  it('as folhas seguem o personagem escolhido: andar, segurar e golpear', () => {
    const p = new Player(0.5, 0.5);
    const e = new Entities(p);
    expect(e.actors[0].kind).toBe('heroine');
    e.body = 'hero';
    expect(e.actors[0].kind).toBe('hero');
    p.equipped = 'axe';
    expect(e.actors[0].kind).toBe('hero-axe');
    p.startAttack('axe');
    expect(e.actors[0].kind).toBe('hero-axe-attack');
  });

  it('salvamento guarda o personagem; salvamentos antigos continuam com a Heroína', () => {
    const world = new World(7);
    const [sx, sy] = world.outsideGate();
    const player = new Player(sx + 0.5, sy + 0.5);
    const entities = new Entities(player);
    entities.body = 'hero';
    const state = { world, player, entities, inventory: new Inventory(), time: 0.3, selected: null, hotbar: null };
    const data = JSON.parse(JSON.stringify(captureSave(state)));
    expect(data.v).toBe(SAVE_VERSION);
    expect(data.body).toBe('hero');
    const e2 = new Entities(new Player(0, 0));
    applySave(data, { ...state, entities: e2, player: new Player(0, 0) });
    expect(e2.body).toBe('hero');
    const { body: _drop, ...old } = data;
    void _drop;
    expect(migrate({ ...old, v: 9 })!.body).toBe('heroine');
  });
});
