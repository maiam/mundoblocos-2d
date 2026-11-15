import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../../world/random';
import { World } from '../../world/world';
import { Entities } from '../entities';
import { MERCHANT } from '../npcs';
import { Player } from '../player';
import { BENTO_SCHEDULE, closedLine, hourOf, phaseAt, scheduleOf, shopOpen } from './schedule';

const at = (h: number) => h / 24;

describe('agenda do Bento (ADR 0034, nível 1)', () => {
  it('fases pela hora: dorme → abrindo → aberta → fechando → dorme', () => {
    const s = BENTO_SCHEDULE;
    expect(phaseAt(s, at(3))).toBe('asleep');
    expect(phaseAt(s, at(6.5))).toBe('opening');
    expect(phaseAt(s, at(12))).toBe('open');
    expect(phaseAt(s, at(20))).toBe('closing');
    expect(phaseAt(s, at(22))).toBe('asleep');
    expect(shopOpen(s, at(12))).toBe(true);
    expect(shopOpen(s, at(20))).toBe(false);
    expect(hourOf(1.5)).toBeCloseTo(12);
    expect(scheduleOf('bento')).toBe(s);
    expect(scheduleOf('black')).toBeNull();
    expect(closedLine('closing')).not.toBe(closedLine('opening'));
  });
});

describe('Bento na rotina', () => {
  function setup() {
    const w = new World(42);
    const [sx, sy] = w.town!.start;
    const e = new Entities(new Player(sx + 0.5, sy + 0.6), mulberry32(42));
    e.spawnVillagers(w);
    const bento = e.villagers.find((v) => v.npc === MERCHANT)!;
    return { w, e, bento };
  }

  it('de dia fica à vista e a loja abre; de noite entra pela porta dos fundos, some e sai do jogo', () => {
    const { w, e, bento } = setup();
    e.time = at(12);
    for (let i = 0; i < 20; i++) e.update(0.1, w);
    expect(bento.hidden).toBe(false);
    expect(bento.shopIsOpen).toBe(true);
    e.time = at(22);
    for (let i = 0; i < 600 && !bento.hidden; i++) e.update(0.1, w);
    expect(bento.hidden).toBe(true);
    expect(e.actors.some((a) => a.kind === 'npc-bento')).toBe(false);
    e.time = at(8);
    for (let i = 0; i < 40; i++) e.update(0.1, w);
    expect(bento.hidden).toBe(false);
    expect(e.actors.some((a) => a.kind === 'npc-bento')).toBe(true);
  });

  it('mundo aberto de madrugada já o encontra dormindo; sem relógio (sala) não há rotina', () => {
    const a = setup();
    a.e.time = at(2);
    a.e.update(0.1, a.w);
    expect(a.bento.hidden).toBe(true);
    const b = setup();
    for (let i = 0; i < 20; i++) b.e.update(0.1, b.w);
    expect(b.bento.hidden).toBe(false);
  });
});
