import { describe, expect, it } from 'vitest';
import { Block } from '../world/blocks';
import { canCraft, Item, PROFESSIONS, RECIPES, type StackId } from '../world/items';
import { FOOD, foodValue, HUNGER, REGEN } from '../world/progression';
import { Player } from './player';
import { World } from '../world/world';

const world = new World(5);
const [sx, sy] = world.outsideGate();

describe('Fome e comida (Fase P, entrega 4)', () => {
  it('pesos: pratos do caldeirão rendem mais que os crus; maçã, cenoura, batata e tomate se comem crus', () => {
    for (const raw of ['apple', 'carrot', 'potato', 'tomato'] as const) expect(foodValue(raw)).toBeGreaterThan(0);
    expect(foodValue(Item.BREAD)).toBeGreaterThan(2 * foodValue('apple'));
    expect(foodValue(Item.PASTA_TOMATO)).toBeGreaterThan(foodValue(Item.BREAD));
    expect(foodValue(Item.WHEAT)).toBe(0); // trigo é ingrediente (e comida de ovelha)
    expect(Object.values(FOOD).every((v) => v! > 0 && v! <= HUNGER.max)).toBe(true);
  });

  it('fome esvazia com o tempo, comer enche (até cheia), cheia recusa; desligada não muda nada', () => {
    const p = new Player(sx + 0.5, sy + 0.6);
    p.hungerOn = true;
    expect(p.eat(10)).toBe(false); // cheia
    p.update(60, 0, 0, world);
    expect(p.hunger).toBeCloseTo(HUNGER.max - 60 * HUNGER.perSecond, 3);
    expect(p.eat(FOOD.apple!)).toBe(true);
    expect(p.hunger).toBeCloseTo(Math.min(HUNGER.max, HUNGER.max - 60 * HUNGER.perSecond + FOOD.apple!), 3);
    const off = new Player(sx + 0.5, sy + 0.6);
    off.update(600, 0, 0, world);
    expect(off.hunger).toBe(HUNGER.max);
    expect(off.eat(10)).toBe(false);
  });

  it('com fome baixa não regenera; vazia tira vida aos poucos sem derrubar; renascer enche', () => {
    const p = new Player(sx + 0.5, sy + 0.6);
    p.hungerOn = true;
    p.hp = 50;
    p.hunger = HUNGER.regenMin - 1;
    for (let t = 0; t < REGEN.delay + 10; t += 0.5) p.update(0.5, 0, 0, world);
    expect(p.hp).toBe(50); // sem regenerar
    p.hunger = 0;
    p.hp = 3;
    for (let t = 0; t < 60; t += 0.5) p.update(0.5, 0, 0, world);
    expect(p.hp).toBe(1); // para em 1
    p.respawn(sx + 0.5, sy + 0.6);
    expect(p.hunger).toBe(HUNGER.max);
  });

  it('Cozinheiro: pão (2 trigos) e macarrão ao molho (4 trigos + 2 tomates), só perto do Caldeirão', () => {
    expect(PROFESSIONS.map((p) => p.id)).toContain('cook');
    const bread = RECIPES.find((r) => r.id === 'bread')!;
    const pasta = RECIPES.find((r) => r.id === 'pasta-tomato')!;
    expect(bread).toMatchObject({ profession: 'cook', station: Block.CAULDRON, inputs: [{ item: 'wheat', count: 2 }], output: { item: 'bread', count: 1 } });
    expect(pasta.inputs).toEqual([{ item: 'wheat', count: 4 }, { item: 'tomato', count: 2 }]);
    const inv: Partial<Record<StackId, number>> = { wheat: 4, tomato: 2 };
    const count = (id: StackId) => inv[id] ?? 0;
    expect(canCraft(bread, count, () => false)).toBe(false); // longe do caldeirão
    expect(canCraft(bread, count, (id) => id === Block.CAULDRON)).toBe(true);
    expect(canCraft(pasta, count, () => true)).toBe(true);
    inv.tomato = 1;
    expect(canCraft(pasta, count, () => true)).toBe(false);
  });
});
