import { describe, expect, it } from 'vitest';
import { Block } from '../world/blocks';
import { DAY_AMBIENT, DUNGEON_AMBIENT, NIGHT_AMBIENT, collectWorldLights, glowSource, lightColorFrom, worldAmbient } from './worldLight';

describe('luz do Mundo — só à noite e na dungeon (decisão de 13/11/2026)', () => {
  it('dia pleno: camada desligada; meia-noite: escuridão da noite; entardecer: entre os dois', () => {
    const noon = worldAmbient(0.5, false);
    expect(noon.ambient).toBeCloseTo(1);
    expect(noon.active).toBe(false);
    const midnight = worldAmbient(0, false);
    expect(midnight.ambient).toBeCloseTo(NIGHT_AMBIENT);
    expect(midnight.active).toBe(true);
    const dusk = worldAmbient(0.8, false);
    expect(dusk.active).toBe(true);
    expect(dusk.ambient).toBeGreaterThan(NIGHT_AMBIENT);
    expect(dusk.ambient).toBeLessThan(DAY_AMBIENT);
    // o ciclo é periódico e contínuo (sem salto na virada do dia)
    expect(worldAmbient(1, false).ambient).toBeCloseTo(worldAmbient(0, false).ambient);
  });

  it('na dungeon, mesmo ao meio-dia, a penumbra fica ligada; à noite vale a mais escura', () => {
    const day = worldAmbient(0.5, true);
    expect(day.active).toBe(true);
    expect(day.ambient).toBeCloseTo(DUNGEON_AMBIENT);
    expect(worldAmbient(0, true).ambient).toBeCloseTo(Math.min(NIGHT_AMBIENT, DUNGEON_AMBIENT));
  });

  it('a cor da escuridão é um índigo escuro (nunca preto puro nem clara)', () => {
    for (const t of [0, 0.25, 0.8, 0.95]) {
      const hex = worldAmbient(t, false).dark;
      expect(hex).toMatch(/^#[0-9a-f]{6}$/);
      const n = parseInt(hex.slice(1), 16);
      expect(Math.max(n >> 16, (n >> 8) & 255, n & 255)).toBeLessThan(90);
    }
  });
});

describe('fontes de luz do Mundo', () => {
  it('cor do brilho em hex → 0..1; cor ilegível = dourado quente', () => {
    expect(lightColorFrom('#ff8000')).toEqual([1, 128 / 255, 0]);
    expect(lightColorFrom('#fff')).toEqual([1, 1, 1]);
    expect(lightColorFrom('vermelho')).toEqual([1, 0.85, 0.6]);
    expect(lightColorFrom(undefined)).toEqual([1, 0.85, 0.6]);
  });

  it('fogueira: raio e cor da tabela de blocos que brilham; poste: lanterna acima do pé, deslocada pelo `at`', () => {
    const fire = glowSource(Block.CAMPFIRE, 10, 20, { color: '#ffab4a' })!;
    expect(fire.radius).toBeCloseTo(5.5);
    expect(fire.x).toBeCloseTo(10.5);
    expect(fire.z).toBe(21); // face sul da célula
    expect(fire.flicker).toBeGreaterThan(0);
    const lamp = glowSource(Block.LAMP, 4, 4, { color: '#ffd27a', at: [0.32, -1.6] })!;
    expect(lamp.x).toBeCloseTo(4.82);
    expect(lamp.height).toBeCloseTo(1.6);
    expect(lamp.color[0]).toBeCloseTo(1);
    expect(glowSource(Block.AIR, 0, 0, { color: '#fff' })).toBeNull();
    expect(glowSource(Block.OAK_TREE, 0, 0, undefined)).toBeNull(); // sem brilho na arte
  });

  it('coleta só as luzes dentro da área visível', () => {
    const objects = new Map<string, number>([['2,2', Block.CAMPFIRE], ['3,3', Block.OAK_TREE], ['50,50', Block.CAMPFIRE]]);
    const lights = collectWorldLights(
      { x0: 0, y0: 0, x1: 10, y1: 10 },
      (x, y) => objects.get(x + ',' + y) ?? Block.AIR,
      (id) => (id === Block.CAMPFIRE ? { color: '#ffab4a' } : undefined),
    );
    expect(lights).toHaveLength(1);
    expect(lights[0].x).toBeCloseTo(2.5);
  });
});
