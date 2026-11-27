import { describe, expect, it } from 'vitest';
import { collectNearby, DROP_LIFE_S, mergeDrops, PICKUP_DELAY_S, restDrop } from './actions';
import { settleDrops } from './drops';
import { Item } from './items';
import { MemoryTitanStorage } from './save';
import { openSession } from './session';

/** Itens soltos pela Wiki (ADR 0131): atraso 0,5 s, sumiço de 5 min para todos (menos a pilha da morte) e fusão na mesma célula. */
const mk = () => openSession(new MemoryTitanStorage(), 42, () => 1, undefined, 2);
describe('drops e coleta (ADR 0131)', () => {
  it('atraso de 0,5 s', () => expect(PICKUP_DELAY_S).toBe(0.5));
  it('funde itens iguais na mesma célula até a pilha máxima', async () => {
    const s = await mk(), p = s.body;
    restDrop(s, 'm:a', Item.COURO, p.x + 8, p.y, p.z, 2); restDrop(s, 'm:b', Item.COURO, p.x + 8, p.y, p.z, 3);
    settleDrops(s);
    expect(mergeDrops(s)).toBe(true);
    const l = [...s.drops.values()].filter((d) => d.item === Item.COURO);
    expect(l.length).toBe(1); expect(l[0].count).toBe(5);
  });
  it('espólio some em 5 min; pilha da morte não', async () => {
    const s = await mk(), p = s.body;
    restDrop(s, 'm:x', Item.COURO, p.x + 40, p.y, p.z, 1); restDrop(s, 'd:x', Item.COURO, p.x + 41, p.y, p.z, 1);
    collectNearby(s, p.x, p.y, p.z, 1); collectNearby(s, p.x, p.y, p.z, DROP_LIFE_S);
    expect(s.drops.has('m:x')).toBe(false); expect(s.drops.has('d:x')).toBe(true);
  });
});
