import { describe, expect, it } from 'vitest';
import { Block } from '../../world/blocks';
import { blockStack, Item } from '../../world/items';
import { Inventory } from '../inventory';
import {
  accept, complete, EMPTY_LOG, goalsOf, isReady, MISSIONS, marksOf, missionOf, nextMission, onEvent, sanitizeMissions,
} from './missions';

const inv = () => new Inventory({});
const counter = (i: Inventory) => (id: string) => i.count(id as never);
const taker = (i: Inventory) => (id: string, n: number) => i.take(id as never, n);

describe('Capítulo 1: corrente de missões (ADR 0034)', () => {
  it('a corrente é linear e cada missão vale uma vez; sem missão ativa o Mestre oferece com !', () => {
    const log = EMPTY_LOG();
    expect(nextMission(log)!.id).toBe('m01');
    expect(marksOf(log, () => 0)).toEqual({ guild: 'offer' });
    log.done.push('m01');
    expect(nextMission(log)!.id).toBe('m02');
    log.done.push('m02', 'm03');
    expect(nextMission(log)).toBeNull();
    expect(marksOf(log, () => 0)).toEqual({});
  });

  it('m01: registrar-se e conhecer Black e Bento (eventos de falar, só depois de aceitar); entrega ao Mestre', () => {
    const log = EMPTY_LOG();
    const i = inv();
    expect(onEvent(log, { type: 'talk', npc: 'black' })).toBe(false); // antes de aceitar não conta
    accept(log, 'm01');
    const m = missionOf('m01')!;
    expect(marksOf(log, counter(i))).toEqual({ guild: 'progress' });
    expect(onEvent(log, { type: 'talk', npc: 'guild' })).toBe(true);
    expect(onEvent(log, { type: 'talk', npc: 'guild' })).toBe(false); // já cumprida: não passa do alvo
    onEvent(log, { type: 'talk', npc: 'black' });
    expect(isReady(m, log, counter(i))).toBe(false);
    onEvent(log, { type: 'talk', npc: 'bento' });
    expect(isReady(m, log, counter(i))).toBe(true);
    expect(marksOf(log, counter(i))).toEqual({ guild: 'ready' });
    expect(complete(log, m, counter(i), taker(i))).toBe(true);
    expect(log.done).toEqual(['m01']);
    expect(log.active).toBeNull();
  });

  it('m02: juntar 6 toras de carvalho e 8 pedras; a entrega é ao Black e tira exatamente isso', () => {
    const log = EMPTY_LOG();
    const i = inv();
    log.done.push('m01');
    accept(log, 'm02');
    const m = missionOf('m02')!;
    expect(m.turnIn).toBe('black');
    expect(marksOf(log, counter(i))).toEqual({ black: 'progress' });
    i.add(blockStack(Block.OAK_LOG), 6);
    i.add(blockStack(Block.STONE), 7);
    expect(isReady(m, log, counter(i))).toBe(false);
    expect(complete(log, m, counter(i), taker(i))).toBe(false); // não tira nada se não está pronta
    expect(i.count(blockStack(Block.OAK_LOG))).toBe(6);
    i.add(blockStack(Block.STONE), 5);
    expect(marksOf(log, counter(i))).toEqual({ black: 'ready' });
    expect(complete(log, m, counter(i), taker(i))).toBe(true);
    expect(i.count(blockStack(Block.OAK_LOG))).toBe(0);
    expect(i.count(blockStack(Block.STONE))).toBe(4); // 12 - 8
  });

  it('m03: só lobos contam (de qualquer cor), 3 abatidos', () => {
    const log = EMPTY_LOG();
    log.done.push('m01', 'm02');
    accept(log, 'm03');
    const m = missionOf('m03')!;
    onEvent(log, { type: 'kill', monster: 'spider-small' });
    onEvent(log, { type: 'kill', monster: 'goblin' });
    expect(goalsOf(m, log, () => 0)[0].have).toBe(0);
    for (const k of ['wolf-brown', 'wolf-gray', 'wolf-white'] as const) onEvent(log, { type: 'kill', monster: k });
    expect(isReady(m, log, () => 0)).toBe(true);
    onEvent(log, { type: 'kill', monster: 'wolf-gray' });
    expect(goalsOf(m, log, () => 0)[0].have).toBe(3);
  });

  it('as recompensas e os textos existem; o save valida (descarta lixo, limita contagem)', () => {
    expect(MISSIONS.map((m) => m.reward.coins)).toEqual([8, 12, 15]);
    for (const m of MISSIONS) for (const t of [m.offer, m.prompt, m.accepted, m.progress, m.complete]) expect(t.length).toBeGreaterThan(10);
    expect(Item.COPPER_COIN).toBe('copper_coin');
    const clean = sanitizeMissions({ done: ['m01', 'xx', 'm02'], active: 'm03', progress: { wolves: 99, lixo: 4 } });
    expect(clean).toEqual({ done: ['m01', 'm02'], active: 'm03', progress: { wolves: 3 } });
    expect(sanitizeMissions({ done: ['m01'], active: 'm01' }).active).toBeNull(); // missão cumprida não fica ativa
    expect(sanitizeMissions(null)).toEqual(EMPTY_LOG());
  });
});
