import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../../world/random';
import { World } from '../../world/world';
import { Entities } from '../entities';
import { Inventory } from '../inventory';
import { Player } from '../player';
import { applySave, captureSave, migrate } from '../save';
import { knownLine, noteBuy, noteTalk, relation, sanitizeBook, shopGreeting, tierOf, type MemoryBook } from './memory';

describe('memória dos NPCs (ADR 0034, nível 3)', () => {
  it('relação e faixas: estranho → conhecido → amigo → íntimo', () => {
    const book: MemoryBook = {};
    expect(tierOf(book.bento)).toBe('stranger');
    noteTalk(book, 'bento');
    expect(tierOf(book.bento)).toBe('acquaintance');
    for (let i = 0; i < 4; i++) noteTalk(book, 'bento'); // 5 conversas = 30
    expect(tierOf(book.bento)).toBe('friend');
    for (let i = 0; i < 8; i++) noteBuy(book, 'bento'); // +32 = 62
    expect(tierOf(book.bento)).toBe('close');
    expect(relation(book.bento)).toBe(62);
    for (let i = 0; i < 99; i++) noteBuy(book, 'bento', 10);
    expect(relation(book.bento)).toBe(100); // teto
  });

  it('falas por faixa: estranho não ganha frase de reencontro; os outros sim, e as lojas cumprimentam diferente', () => {
    expect(knownLine('stranger')).toBe('');
    expect(knownLine('friend').length).toBeGreaterThan(10);
    expect(knownLine('friend', 0)).not.toBe(knownLine('friend', 1));
    const t = (['stranger', 'acquaintance', 'friend', 'close'] as const).map((x) => shopGreeting('merchant', x));
    expect(new Set(t).size).toBe(4);
  });

  it('o salvamento valida o que lê', () => {
    expect(sanitizeBook(null)).toEqual({});
    expect(sanitizeBook({ a: { talks: 3.7, bought: -2 }, b: 'x', c: { talks: 0, bought: 0 }, d: { talks: 1e9, bought: 1 } }))
      .toEqual({ a: { talks: 3, bought: 0 }, d: { talks: 9999, bought: 1 } });
  });

  it('vai e volta pelo save (v18) e o save v17 migra com a memória vazia', () => {
    const w = new World(42);
    const [sx, sy] = w.town!.start;
    const p = new Player(sx + 0.5, sy + 0.6);
    const e = new Entities(p, mulberry32(42));
    noteTalk(e.memory, 'dante');
    noteBuy(e.memory, 'bento', 3);
    const state = { world: w, player: p, entities: e, inventory: new Inventory(), time: 0.3, selected: null, hotbar: null };
    const d = captureSave(state);
    expect(d.npcMemory.bento.bought).toBe(3);
    const w2 = new World(42);
    const p2 = new Player(sx + 0.5, sy + 0.6);
    const e2 = new Entities(p2, mulberry32(42));
    applySave(JSON.parse(JSON.stringify(d)), { world: w2, player: p2, entities: e2, inventory: new Inventory(), time: 0, selected: null, hotbar: null });
    expect(e2.memory).toEqual({ dante: { talks: 1, bought: 0 }, bento: { talks: 0, bought: 3 } });
    const { npcMemory: _m, ...old } = d;
    expect(migrate({ ...old, v: 17 })?.npcMemory).toEqual({});
  });

  it('o morador cumprimenta quem já conhece, só na primeira fala da sessão', () => {
    const w = new World(42);
    const [sx, sy] = w.town!.start;
    const e = new Entities(new Player(sx + 0.5, sy + 0.6), mulberry32(42));
    e.spawnVillagers(w);
    const v = e.villagers.find((x) => !x.role)!;
    const first = v.conversation('friend').text;
    const second = v.conversation('friend').text;
    expect(first.startsWith(knownLine('friend', 0))).toBe(true);
    expect(second.startsWith(knownLine('friend', 0))).toBe(false);
    expect(v.memoryKey).toBe(v.npc);
  });
});
