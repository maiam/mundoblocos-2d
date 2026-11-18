import { describe, expect, it } from 'vitest';
import { WORLD_PROFILES } from '../world/profiles';
import { valeGoblinHomes } from '../world/sanctuaryValeGoblin';
import { World } from '../world/world';
import { ValeGoblins } from './valeGoblins';

const S = WORLD_PROFILES.santuario;
function vale(): World {
  const w = new World(1, S);
  for (let cx = -2; cx <= 1; cx++) for (let cy = -6; cy <= -3; cy++) w.loadChunk(cx, cy);
  return w;
}

describe('Goblins do Vale que andam (v0.93.161)', () => {
  it('nascem 7, nos pontos do pacote, virados para a fogueira e em chão firme', () => {
    const w = vale();
    const g = new ValeGoblins(w);
    const { homes, fire } = valeGoblinHomes();
    expect(g.goblins).toHaveLength(7);
    g.goblins.forEach((gb, i) => {
      expect([gb.x, gb.y]).toEqual(homes[i]);
      expect(gb.z).toBe(2);
      expect(gb.yaw).toBeCloseTo(Math.atan2(fire[0] - homes[i][0], fire[1] - homes[i][1]), 5);
    });
    expect(g.views(w)).toHaveLength(7);
  });

  it('andam (alguns saem do lugar e a fase de caminhada avança) e nunca passam de 4 células do ponto de nascimento nem entram em objeto sólido', () => {
    const w = vale();
    const g = new ValeGoblins(w);
    const { homes } = valeGoblinHomes();
    let maxWalk = 0, phase0 = g.goblins.map((x) => x.phase);
    for (let t = 0; t < 60 * 40; t++) {
      g.update(1 / 60, w);
      for (const [i, gb] of g.goblins.entries()) {
        maxWalk = Math.max(maxWalk, gb.walkBlend);
        expect(Math.hypot(gb.x - homes[i][0], gb.y - homes[i][1]), `goblin ${i} t=${t}`).toBeLessThan(4.7);
        expect(w.standHeight(Math.floor(gb.x), Math.floor(gb.y)), `goblin ${i} em ${gb.x.toFixed(2)},${gb.y.toFixed(2)}`).not.toBeNull();
      }
    }
    expect(maxWalk).toBeGreaterThan(0.9);
    expect(g.goblins.some((gb, i) => gb.phase > phase0[i] + 6)).toBe(true);
    expect(g.goblins.some((gb, i) => Math.hypot(gb.x - homes[i][0], gb.y - homes[i][1]) > 1)).toBe(true);
  });

  it('é determinístico e só anda quem está em chunk carregado', () => {
    const run = (): number[] => {
      const w = vale();
      const g = new ValeGoblins(w);
      for (let t = 0; t < 600; t++) g.update(1 / 60, w);
      return g.goblins.flatMap((gb) => [gb.x, gb.y, gb.yaw]);
    };
    expect(run()).toEqual(run());
    const bare = new World(1, S); // nenhum chunk do vale carregado
    const g = new ValeGoblins(bare);
    const before = g.goblins.map((gb) => [gb.x, gb.y]);
    for (let t = 0; t < 120; t++) g.update(1 / 60, bare);
    expect(g.goblins.map((gb) => [gb.x, gb.y])).toEqual(before);
    expect(g.views(bare)).toHaveLength(0);
  });
});
