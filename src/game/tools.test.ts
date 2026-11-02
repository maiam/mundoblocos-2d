import { describe, expect, it } from 'vitest';
import { TOOL_ORDER, TOOLS } from '../world/items';
import { World } from '../world/world';
import { Entities } from './entities';
import { Hotbar } from './hotbar';
import { Player } from './player';

describe('Ferramentas', () => {
  it('cinco ferramentas registradas e nos primeiros espaços da hotbar', () => {
    expect(TOOL_ORDER).toEqual(['sword', 'hoe', 'pickaxe', 'shovel', 'axe']);
    for (const t of TOOL_ORDER) expect(TOOLS[t].name.length).toBeGreaterThan(0);
    const grid = new Hotbar();
    expect([0, 1, 2, 3, 4].map((i) => grid.get(i))).toEqual(TOOL_ORDER.map((tool) => ({ kind: 'tool', tool })));
    expect(grid.get(5)).toEqual({ kind: 'item', item: 'wheat_seed' });
    expect(grid.get(6)).toEqual({ kind: 'item', item: 'wheat' });
    expect(grid.get(7)).toBeNull(); // 8º espaço livre; 9º é a bolsa
  });

  it('ferramenta equipada troca o sprite da heroína; mãos livres usam o sprite base', () => {
    const w = new World(7);
    const [sx, sy] = w.findSpawn();
    const p = new Player(sx + 0.5, sy + 0.5);
    const e = new Entities(p);
    expect(e.actors[0].kind).toBe('heroine');
    p.equipped = 'pickaxe';
    expect(e.actors[0].kind).toBe('heroine-pickaxe');
    p.equipped = null;
    expect(e.actors[0].kind).toBe('heroine');
  });
});
