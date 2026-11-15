import { describe, expect, it } from 'vitest';
import { mulberry32 } from './random';
import { Block } from './blocks';
import { Entities } from '../game/entities';
import { Player } from '../game/player';
import { GUILD_INTERIOR, INTERIOR_DEFS } from './interiors';
import { World } from './world';

describe('Guilda dos Aventureiros por dentro (v0.93.120)', () => {
  it('a construção tem porta, o cômodo vem depois dos outros e a tenda anda uma posição', () => {
    const w = new World(42);
    const g = w.town!.buildings.find((b) => b.id === Block.GUILD)!;
    expect(g.door).not.toBeNull();
    const l = w.interiors.find((x) => x.def.id === 'guild')!;
    expect(l).toBeTruthy();
    expect(l.def.name).toBe('Guilda dos Aventureiros');
    expect(l.doors).toHaveLength(1);
    expect(l.doors[0].outside).toEqual(g.door);
    expect(INTERIOR_DEFS.at(-1)).toBe(GUILD_INTERIOR);
    // entrada larga: 6 colunas de capacho; sair pisando em qualquer uma
    const m = l.doors[0].mat;
    expect(m.x1 - m.x0 + 1).toBe(6 * 2);
  });

  it('o Mestre da Guilda mora atrás do balcão, sem sair das linhas dele', () => {
    const w = new World(42);
    const [sx, sy] = w.town!.start;
    const e = new Entities(new Player(sx + 0.5, sy + 0.6), mulberry32(1));
    e.spawnVillagers(w);
    const m = e.villagers.find((v) => v.resident?.id === 'guild')!;
    const l = w.interiors.find((x) => x.def.id === 'guild')!;
    expect(w.interiorAt(m.cellX, m.cellY)?.def.id).toBe('guild');
    for (let i = 0; i < 600; i++) e.update(0.1, w);
    expect(m.cellY).toBeGreaterThanOrEqual(l.keeper!.rows[0]);
    expect(m.cellY).toBeLessThanOrEqual(l.keeper!.rows[1]);
    expect(m.name).toBe('Mestre Aldric');
  });
});
