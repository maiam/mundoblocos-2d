import { describe, expect, it } from 'vitest';
import { FACING_ORDER, type MobState } from '../net/protocol';
import { mulberry32 } from '../world/random';
import { World } from '../world/world';
import { CreatureMirror } from './creatureMirror';
import { Entities, RESIDENTS_TOWN } from './entities';
import { Player } from './player';
import { residentRoster } from './residents';

describe('espelho dos moradores da sala (v26)', () => {
  function setup() {
    const w = new World(20261106);
    const e = new Entities(new Player(0.5, 0.5), mulberry32(1));
    e.remote = true;
    const mirror = new CreatureMirror(e, w);
    return { w, e, mirror };
  }
  const mob = (o: Partial<MobState> & { i: number; k: string }): MobState => ({ x: 10, y: 10, f: FACING_ORDER.indexOf('down'), ...o });

  it('cria o morador nomeado e o sorteado (pelo id), segue o desbotar e quem ele acompanha, e o tira quando some da lista', () => {
    const { w, e, mirror } = setup();
    const roster = residentRoster(w.seed, RESIDENTS_TOWN, 5);
    const rid = [...roster.keys()][0];
    mirror.apply([mob({ i: 1, k: 'npc-bento', a: 0.5 }), mob({ i: 2, k: 'npc-solano', u: rid, g: 7 }), mob({ i: 3, k: 'npc-zzz' }), mob({ i: 4, k: 'npc-dante', u: 'nao-existe' })]);
    expect(e.villagers).toHaveLength(2); // os dois inválidos são ignorados
    const [bento, res] = e.villagers;
    expect(bento.npc).toBe('bento');
    expect(bento.fade).toBe(0.5);
    expect(res.resident?.id).toBe(rid);
    expect(res.name).toBe(roster.get(rid)!.name);
    expect(res.escortedBy).toBe(7);
    mirror.apply([mob({ i: 1, k: 'npc-bento' })]); // o outro saiu de perto (ou dormiu)
    expect(e.villagers).toHaveLength(1);
    expect(e.villagers[0].fade).toBe(0);
  });

  it('a conversa avisa a sala (talk) e o espelho não simula o morador', () => {
    const { e, mirror } = setup();
    const calls: Array<[number, boolean]> = [];
    mirror.onTalk = (id, on) => calls.push([id, on]);
    mirror.apply([mob({ i: 9, k: 'npc-dante', x: 20, y: 20 })]);
    const v = e.villagers[0];
    v.conversation();
    v.release();
    expect(calls).toEqual([[9, true], [9, false]]);
    // sem simulação local: só a sala o move
    const w2 = new World(20261106);
    for (let i = 0; i < 40; i++) e.update(0.1, w2);
    expect(v.x).toBe(20);
    expect(v.y).toBe(20);
  });
});
