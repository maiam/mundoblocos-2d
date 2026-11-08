import { describe, expect, it } from 'vitest';
import { Block } from '../world/blocks';
import { inRect } from '../world/dungeon';
import { mulberry32 } from '../world/random';
import { World } from '../world/world';
import { Entities, HOME_SPACING } from './entities';
import { NPCS, NPC_IDS, npcDef, SMITH } from './npcs';
import { Player } from './player';

function setup(seed: number) {
  const w = new World(seed);
  const [sx, sy] = w.town!.start;
  const p = new Player(sx + 0.5, sy + 0.6);
  const e = new Entities(p, mulberry32(seed));
  e.spawnVillagers(w);
  const [gx, gy] = w.outsideGate();
  e.spawnHorse(w, gx + 9, gy + 10);
  return { w, p, e };
}

describe('NPCs da cidade (nomes e falas em game/npcs.ts)', () => {
  it('16 NPCs com id e nome únicos: Black (ferreiro) e 15 moradores; cada um com falas', () => {
    expect(NPCS).toHaveLength(16);
    expect(new Set(NPC_IDS).size).toBe(16);
    expect(new Set(NPCS.map((n) => n.name)).size).toBe(16);
    expect(SMITH).toBe('black');
    expect(npcDef('black').name).toBe('Black');
    expect(NPCS.filter((n) => 'role' in n)).toHaveLength(1);
    for (const n of NPCS) {
      expect(n.lines.length).toBeGreaterThanOrEqual(2);
      for (const l of n.lines) expect(l.length).toBeGreaterThan(20);
    }
  });

  it('a cidade tem os 16: o ferreiro Black na Ferraria e os 15 espalhados pelas ruas, cada um uma vez', () => {
    const { w, e } = setup(42);
    expect(e.villagers.map((v) => v.npc).sort()).toEqual([...NPC_IDS].sort());
    const smith = e.villagers.find((v) => v.role === 'smith')!;
    expect(smith.npc).toBe('black');
    expect(smith.name).toBe('Black');
    expect(w.interiorAt(smith.cellX, smith.cellY)?.def.id).toBe('smithy');
    // Espalhados: nenhum par de moradores comuns nasce colado e os pontos de casa ficam a pelo menos HOME_SPACING (os 4 fixos à parte).
    const common = e.villagers.filter((v) => !v.role);
    expect(common).toHaveLength(15);
    const homes = common.slice(4).map((v) => [v.homeX, v.homeY]);
    for (let i = 0; i < homes.length; i++) for (let j = i + 1; j < homes.length; j++) {
      expect(Math.hypot(homes[i][0] - homes[j][0], homes[i][1] - homes[j][1])).toBeGreaterThan(HOME_SPACING * 0.5);
    }
    // A cidade é igual em toda seed: mesmos NPCs nos mesmos lugares.
    expect(setup(7).e.villagers.map((v) => [v.npc, v.cellX, v.cellY])).toEqual(e.villagers.map((v) => [v.npc, v.cellX, v.cellY]));
  });

  it('moradores só andam por ruas e praças, sem sair pela muralha nem pelo portão', () => {
    for (const seed of [3, 42]) {
      const { w, e } = setup(seed);
      const t = w.town!;
      for (let f = 0; f < 60 * 90; f++) {
        e.update(1 / 60, w);
        if (f % 30) continue;
        // O ferreiro fica no interior: só anda nas linhas do ofício, no chão do cômodo.
        const smith = e.villagers.find((v) => v.role === 'smith')!;
        const room = w.interiorAt(smith.cellX, smith.cellY)!;
        expect(smith.cellY).toBeGreaterThanOrEqual(room.keeper!.rows[0]);
        expect(smith.cellY).toBeLessThanOrEqual(room.keeper!.rows[1]);
        for (const v of e.villagers.filter((x) => !x.role)) {
          expect(inRect(t.area, v.cellX, v.cellY)).toBe(true);
          expect(v.cellY).toBeLessThan(t.gate.y0);
          expect(t.street[(v.cellY - t.area.y0) * t.w + (v.cellX - t.area.x0)]).toBe(1);
        }
      }
      expect(e.villagers.some((v) => Math.hypot(v.x - v.homeX, v.y - v.homeY) > 0.5)).toBe(true);
    }
  });

  it('conversa: a fala sai com nome, retrato e texto, em roda; o NPC fica parado até soltar e volta a passear', () => {
    const { w, e } = setup(42);
    const v = e.villagers.find((x) => x.npc === 'rubem')!;
    const def = npcDef('rubem');
    const c1 = v.conversation();
    expect([c1.npc, c1.name, c1.text]).toEqual(['rubem', 'Rubem', def.lines[0]]);
    expect(v.conversation().text).toBe(def.lines[1]);
    expect(v.conversation().text).toBe(def.lines[0]); // volta ao começo
    expect(v.talking).toBe(true);
    const [x0, y0] = [v.x, v.y];
    for (let f = 0; f < 60 * 20; f++) e.update(1 / 60, w);
    expect([v.x, v.y]).toEqual([x0, y0]); // parado durante a conversa
    v.faceTo(x0, y0 - 5);
    expect(v.facing).toBe('up');
    v.faceTo(x0 + 5, y0);
    expect(v.facing).toBe('right');
    v.release();
    expect(v.talking).toBe(false);
    for (let f = 0; f < 60 * 40; f++) e.update(1 / 60, w);
    expect(Math.hypot(v.x - x0, v.y - y0)).toBeGreaterThan(0.2); // voltou a andar
  });

  it('as falas citam só regras que existem (o Black fala da Ferraria; Rubem dos lobos a 3 passos)', () => {
    expect(npcDef('black').lines[0]).toContain('Ferraria');
    expect(npcDef('rubem').lines[0]).toContain('três passos');
  });

  it('o golpe não atinge moradores', () => {
    const { w, p, e } = setup(5);
    const v = e.villagers[0];
    p.x = v.x - 0.8;
    p.y = v.y;
    expect(e.strike('right', w, 'sword')).toBe(0);
    expect(e.villagers).toHaveLength(16);
  });

  it('cada NPC aparece com a própria folha (npc-<id>), sem camadas de roupa nem rosto', () => {
    const { e } = setup(42);
    const kinds = e.actors.filter((a) => a.kind.startsWith('npc-')).map((a) => a.kind).sort();
    expect(kinds).toEqual(NPC_IDS.map((id) => `npc-${id}`).sort());
    for (const a of e.actors.filter((x) => x.kind.startsWith('npc-'))) expect(Object.keys(a)).not.toContain('outfit');
  });

  it('um cavalo no campo fora da cidade, em grama, que passeia', () => {
    const { w, e } = setup(42);
    expect(e.horses).toHaveLength(1);
    const h = e.horses[0];
    expect(inRect(w.town!.area, h.cellX, h.cellY)).toBe(false);
    expect(w.getGround(h.cellX, h.cellY)).toBe(Block.GRASS);
    const [x0, y0] = [h.x, h.y];
    for (let f = 0; f < 60 * 30; f++) e.update(1 / 60, w);
    expect(Math.hypot(h.x - x0, h.y - y0)).toBeGreaterThan(0.3);
    expect(e.actors.some((a) => a.kind === 'horse')).toBe(true);
  });
});
