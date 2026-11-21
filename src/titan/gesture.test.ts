import { describe, expect, it } from 'vitest';
import { BREAK_MS, breakProgress, breakTotalMs, crackStage, CRACK_STAGES, DRAG_TOLERANCE_PX, HOLD_MS } from './breaking';
import { type ActionOutcome, type GestureHooks, type GestureTarget, InteractionGesture } from './gesture';
import { T } from './voxel';

const sand: GestureTarget = { x: 3, y: 64, z: 4, nx: 0, ny: 1, nz: 0, kind: 'block', block: T.SAND };
const sandOtherFace: GestureTarget = { ...sand, nx: 1, ny: 0 };
const rock: GestureTarget = { x: 5, y: 64, z: 4, nx: 0, ny: 1, nz: 0, kind: 'block', block: T.DARK_ROCK };
const lantern: GestureTarget = { x: 7, y: 65, z: 4, nx: 0, ny: 1, nz: 0, kind: 'lantern' };
const bedrock: GestureTarget = { x: 0, y: -64, z: 0, nx: 0, ny: 1, nz: 0, kind: 'block', block: T.BEDROCK };

function rig(opts: { placeOk?: boolean; completeOk?: boolean } = {}) {
  const log: string[] = [];
  const effects: Array<{ t: GestureTarget | null; p: number; stage: number }> = [];
  const hooks: GestureHooks = {
    totalMs: (t) => breakTotalMs(t.kind, t.block),
    place: (t): ActionOutcome => { log.push(`place@${t.x},${t.y},${t.z}`); return { ok: opts.placeOk ?? true }; },
    complete: (t): ActionOutcome => { log.push(`complete@${t.x},${t.y},${t.z}`); return { ok: opts.completeOk ?? true }; },
    effect: (t, p, stage) => effects.push({ t, p, stage }),
  };
  return { g: new InteractionGesture(hooks), log, effects, lastEffect: () => effects[effects.length - 1] };
}

describe('tempos de quebra', () => {
  it('areia 0,6 s, gelo 1,2 s, rocha 1,6 s; lanterna e lasca 0,35 s; rocha-mãe e líquido não quebram', () => {
    expect(BREAK_MS).toEqual({ sand: 600, ice: 1200, rock: 1600, slab: 1000, collect: 350 });
    expect(breakTotalMs('block', T.SAND)).toBe(600);
    expect(breakTotalMs('block', T.DAMP_SAND)).toBe(600);
    expect(breakTotalMs('block', T.FROST)).toBe(1200);
    expect(breakTotalMs('block', T.DARK_ROCK)).toBe(1600);
    expect(breakTotalMs('block', T.SLAB)).toBe(1000); // a laje (meio bloco de rocha) cede mais depressa
    expect(breakTotalMs('lantern')).toBe(350);
    expect(breakTotalMs('shard')).toBe(350);
    expect(breakTotalMs('block', T.BEDROCK)).toBeNull();
    expect(breakTotalMs('block', T.LAKE)).toBeNull();
    expect(breakTotalMs('block', T.AIR)).toBeNull();
  });

  it('o progresso é (tempo − 200 ms) / (total − 200 ms) limitado a 0–1, e há dez estágios de rachadura', () => {
    expect(HOLD_MS).toBe(200);
    expect(breakProgress(0, 1000)).toBe(0);
    expect(breakProgress(200, 1000)).toBe(0);
    expect(breakProgress(600, 1000)).toBe(0.5);
    expect(breakProgress(1000, 1000)).toBe(1);
    expect(breakProgress(5000, 1000)).toBe(1);
    expect(CRACK_STAGES).toBe(10);
    expect([0, 0.099, 0.1, 0.55, 0.99, 1].map(crackStage)).toEqual([0, 0, 1, 5, 9, 9]);
  });
});

describe('toque curto coloca', () => {
  it('soltar antes de 200 ms, sem arrastar e com o mesmo alvo e face, coloca uma vez', () => {
    const { g, log } = rig();
    expect(g.press('mouse', 1000, sand)).toBe(true);
    expect(g.state).toBe('ARMED');
    g.update(1100, sand);
    g.release('mouse', 1199, sand); // 199 ms
    expect(log).toEqual(['place@3,64,4']);
    expect(g.state).toBe('IDLE');
    expect(g.lastOutcome).toBe('placed');
  });

  it('na fronteira: 199 ms coloca, 200 ms nunca coloca', () => {
    const a = rig(); a.g.press(1, 0, sand); a.g.release(1, 199, sand); expect(a.log).toEqual(['place@3,64,4']);
    const b = rig(); b.g.press(1, 0, sand); b.g.release(1, 200, sand); expect(b.log).toEqual([]);
  });

  it('quadro atrasado: sem nenhum update entre o press e o release, 250 ms ainda não vira colocação', () => {
    const { g, log } = rig();
    g.press('t', 0, sand);
    g.release('t', 250, sand); // o quadro não rodou: o tempo vem do evento de soltar
    expect(log).toEqual([]);
    expect(g.state).toBe('IDLE');
  });

  it('quadro atrasado depois do tempo total: a quebra vale (uma ação) e nunca vira colocação', () => {
    const { g, log } = rig();
    g.press('t', 0, sand);
    g.release('t', 700, sand); // ≥ 600 ms
    expect(log).toEqual(['complete@3,64,4']);
  });

  it('colocação que falha na validação não repete e não consome mais nada', () => {
    const { g, log } = rig({ placeOk: false });
    g.press(1, 0, sand); g.release(1, 100, sand);
    expect(log).toEqual(['place@3,64,4']);
    expect(g.lastOutcome).toBe('failed');
  });

  it('mudar a face antes de soltar invalida a colocação; mudar de bloco consome o gesto', () => {
    const a = rig(); a.g.press(1, 0, sand); a.g.update(50, sandOtherFace); a.g.release(1, 100, sandOtherFace); expect(a.log).toEqual([]);
    const b = rig(); b.g.press(1, 0, sand); b.g.update(50, rock); expect(b.g.state).toBe('COMPLETED'); b.g.release(1, 100, sand); expect(b.log).toEqual([]);
  });
});

describe('arrasto vira câmera', () => {
  it('arrastar além da tolerância antes dos 200 ms entrega à câmera e soltar não faz nada', () => {
    const { g, log } = rig();
    g.press(1, 0, sand);
    g.drag(1, DRAG_TOLERANCE_PX); // exatamente na tolerância: ainda não é arrasto
    expect(g.state).toBe('ARMED');
    g.drag(1, DRAG_TOLERANCE_PX + 1);
    expect(g.state).toBe('CAMERA_DRAG');
    g.update(100, sand);
    g.release(1, 150, sand);
    expect(log).toEqual([]);
    expect(g.state).toBe('IDLE');
  });

  it('dentro da tolerância o toque ainda coloca; sem alvo na mira o gesto é só câmera', () => {
    const a = rig(); a.g.press(1, 0, sand); a.g.drag(1, 8); a.g.release(1, 120, sand); expect(a.log).toEqual(['place@3,64,4']);
    const b = rig(); b.g.press(1, 0, null); expect(b.g.state).toBe('CAMERA_DRAG'); b.g.release(1, 100, null); expect(b.log).toEqual([]);
  });
});

describe('segurar quebra', () => {
  it('após 200 ms começa o progresso; areia completa aos 600 ms com uma única ação', () => {
    const { g, log, effects, lastEffect } = rig();
    g.press(1, 0, sand);
    g.update(199, sand); expect(g.state).toBe('ARMED'); expect(effects).toEqual([]); // sem efeito antes dos 200 ms
    g.update(200, sand); expect(g.state).toBe('BREAKING');
    expect(lastEffect()).toMatchObject({ p: 0, stage: 0, t: sand });
    g.update(400, sand); expect(lastEffect()).toMatchObject({ p: 0.5, stage: 5 });
    g.update(599, sand); expect(log).toEqual([]);
    g.update(600, sand);
    expect(log).toEqual(['complete@3,64,4']);
    expect(g.state).toBe('COMPLETED');
    expect(lastEffect().t).toBeNull(); // efeito limpo ao concluir
    // pressão mantida: nada mais acontece
    for (const t of [700, 1200, 5000]) g.update(t, sand);
    g.release(1, 6000, sand);
    expect(log).toEqual(['complete@3,64,4']);
    expect(g.state).toBe('IDLE');
  });

  it('para quebrar de novo é obrigatório soltar e pressionar', () => {
    const { g, log } = rig();
    g.press(1, 0, sand); g.update(200, sand); g.update(600, sand);
    expect(g.press(1, 700, sand)).toBe(false); // ainda pressionado: não rearma
    g.release(1, 800, sand);
    expect(g.press(1, 900, sand)).toBe(true);
    g.update(1100, sand); g.update(1500, sand);
    expect(log).toEqual(['complete@3,64,4', 'complete@3,64,4']);
  });

  it('soltar antes da conclusão cancela, limpa o efeito e não coloca nem quebra', () => {
    const { g, log, lastEffect } = rig();
    g.press(1, 0, rock); g.update(200, rock); g.update(900, rock);
    expect(lastEffect().t).not.toBeNull();
    g.release(1, 1000, rock); // rocha: 1 600 ms
    expect(log).toEqual([]);
    expect(lastEffect().t).toBeNull();
    expect(g.state).toBe('IDLE');
  });

  it('sair do alcance (ou apontar algo que não quebra) cancela a quebra e espera: voltar à mira sem arrastar não retoma', () => {
    const b = rig(); b.g.press(1, 0, sand); b.g.update(200, sand); b.g.update(300, null);
    expect(b.g.state).toBe('COMPLETED'); b.g.update(400, sand); b.g.update(2000, sand); b.g.release(1, 2100, sand); expect(b.log).toEqual([]);
    const c = rig(); c.g.press(1, 0, sand); c.g.update(200, sand); c.g.update(300, bedrock);
    expect(c.g.state).toBe('COMPLETED'); c.g.update(2000, bedrock); expect(c.log).toEqual([]); // rocha-mãe não quebra
  });

  it('segurando e arrastando para outro bloco, a quebra segue nele com o tempo cheio, do zero (ADR 0055)', () => {
    const { g, log, effects } = rig();
    g.press(1, 0, sand); g.update(200, sand); g.update(400, sand); // meio da areia
    g.update(500, rock); // a mira passou para a rocha
    expect(g.state).toBe('BREAKING');
    expect(effects[effects.length - 1].t).toMatchObject({ x: 5 }); // a rachadura vai para o novo bloco
    expect(effects[effects.length - 1].p).toBe(0); // progresso do zero
    g.update(500 + 1599, rock); expect(log).toEqual([]); // rocha: 1 600 ms cheios desde a troca
    g.update(500 + 1600, rock); expect(log).toEqual(['complete@5,64,4']);
    g.release(1, 3000, rock);
    expect(log).toEqual(['complete@5,64,4']); // a areia deixada pela metade nunca quebrou
  });

  it('depois de quebrar, sem arrastar o bloco de trás não cede sozinho; arrastando além da tolerância, a quebra recomeça no próximo', () => {
    const a = rig(); a.g.press(1, 0, sand); a.g.update(200, sand); a.g.update(600, sand); // quebrou
    expect(a.log).toEqual(['complete@3,64,4']); expect(a.g.state).toBe('COMPLETED');
    a.g.update(700, rock); a.g.update(5000, rock); // a mira agora pega o bloco de trás, sem arrastar
    expect(a.log).toEqual(['complete@3,64,4']); expect(a.g.state).toBe('COMPLETED');
    const b = rig(); b.g.press(1, 0, sand); b.g.update(200, sand); b.g.update(600, sand);
    b.g.drag(1, DRAG_TOLERANCE_PX - 2); b.g.update(650, rock); expect(b.g.state).toBe('COMPLETED'); // arrasto curto: ainda não
    b.g.drag(1, DRAG_TOLERANCE_PX + 25); b.g.update(700, rock);
    expect(b.g.state).toBe('BREAKING');
    b.g.update(700 + 1600, rock);
    expect(b.log).toEqual(['complete@3,64,4', 'complete@5,64,4']);
    b.g.release(1, 3000, rock);
  });

  it('soltar encerra tudo: pressionar de novo é um gesto novo, e o arrasto de antes não conta', () => {
    const { g, log } = rig();
    g.press(1, 0, sand); g.update(200, sand); g.update(600, sand); g.drag(1, 200);
    g.release(1, 700, sand);
    expect(g.state).toBe('IDLE');
    g.press(1, 800, rock); g.update(1000, rock); g.update(1500, rock);
    expect(log).toEqual(['complete@3,64,4']); // a rocha ainda está no meio (1 600 ms)
  });

  it('um gesto que nunca quebrou (rocha-mãe aos 200 ms) não recomeça ao arrastar', () => {
    const { g, log } = rig();
    g.press(1, 0, bedrock); g.update(250, bedrock); expect(g.state).toBe('COMPLETED');
    g.drag(1, 200); g.update(400, sand); g.update(2000, sand);
    expect(log).toEqual([]);
  });

  it('mudar só a face do mesmo bloco mantém o progresso', () => {
    const { g, log, lastEffect } = rig();
    g.press(1, 0, sand); g.update(200, sand);
    g.update(400, sandOtherFace);
    expect(g.state).toBe('BREAKING');
    expect(lastEffect()).toMatchObject({ p: 0.5, stage: 5 });
    g.update(600, sandOtherFace);
    expect(log).toEqual(['complete@3,64,4']);
  });

  it('tempos por material: gelo 1,2 s e rocha 1,6 s', () => {
    const ice = { ...sand, block: T.FROST };
    const a = rig(); a.g.press(1, 0, ice); a.g.update(200, ice); a.g.update(1199, ice); expect(a.log).toEqual([]); a.g.update(1200, ice); expect(a.log).toHaveLength(1);
    const b = rig(); b.g.press(1, 0, rock); b.g.update(200, rock); b.g.update(1599, rock); expect(b.log).toEqual([]); b.g.update(1600, rock); expect(b.log).toHaveLength(1);
  });

  it('a ação revalidada que falha (mochila cheia) acontece uma vez e o gesto fica consumido até soltar', () => {
    const { g, log } = rig({ completeOk: false });
    g.press(1, 0, sand); g.update(200, sand); g.update(600, sand);
    for (const t of [700, 1000, 3000]) g.update(t, sand);
    expect(log).toEqual(['complete@3,64,4']);
    expect(g.lastOutcome).toBe('failed');
    g.release(1, 3100, sand);
    expect(g.state).toBe('IDLE');
  });

  it('rocha-mãe (sem tempo de quebra) consome o gesto aos 200 ms, sem efeito nem ação', () => {
    const { g, log, effects } = rig();
    g.press(1, 0, bedrock); g.update(250, bedrock);
    expect(g.state).toBe('COMPLETED');
    expect(log).toEqual([]);
    expect(effects.every((e) => e.t === null)).toBe(true);
  });
});

describe('lanterna e lasca solta: recolhimento em 0,35 s', () => {
  it('segurar 350 ms recolhe uma vez; antes disso, soltar cancela', () => {
    const a = rig(); a.g.press(1, 0, lantern); a.g.update(200, lantern); a.g.update(349, lantern); expect(a.log).toEqual([]); a.g.update(350, lantern); expect(a.log).toEqual(['complete@7,65,4']);
    const b = rig(); b.g.press(1, 0, lantern); b.g.update(300, lantern); b.g.release(1, 340, lantern); expect(b.log).toEqual([]);
  });
  it('com a mochila cheia a lanterna fica (a ação falha uma vez) e o toque curto coloca um bloco ao lado, não recolhe', () => {
    const a = rig({ completeOk: false }); a.g.press(1, 0, lantern); a.g.update(200, lantern); a.g.update(400, lantern); a.g.update(900, lantern);
    expect(a.log).toEqual(['complete@7,65,4']);
    const b = rig(); b.g.press(1, 0, lantern); b.g.release(1, 100, lantern); expect(b.log).toEqual(['place@7,65,4']);
  });
});

describe('ponteiros e cancelamentos', () => {
  it('um segundo ponteiro não dispara nem encerra a ação armada pelo primeiro', () => {
    const { g, log } = rig();
    expect(g.press(1, 0, sand)).toBe(true);
    expect(g.press(2, 10, rock)).toBe(false);
    g.release(2, 50, sand); // outro ponteiro soltando: ignorado
    expect(g.state).toBe('ARMED');
    g.drag(2, 99); expect(g.state).toBe('ARMED');
    g.release(1, 100, sand);
    expect(log).toEqual(['place@3,64,4']);
  });

  it('cancelamento externo (blur, menu, ponteiro cancelado) limpa gesto e efeito sem ação, e o soltar tardio é ignorado', () => {
    const { g, log, lastEffect } = rig();
    g.press(1, 0, sand); g.update(200, sand); g.update(300, sand);
    g.cancel();
    expect(g.state).toBe('IDLE');
    expect(lastEffect().t).toBeNull();
    g.release(1, 400, sand);
    g.update(900, sand);
    expect(log).toEqual([]);
    expect(g.lastOutcome).toBe('cancelled');
  });

  it('uma pressão que virou quebra nunca vira colocação ao soltar, em qualquer tempo ≥ 200 ms', () => {
    for (const t of [200, 201, 350, 599]) {
      const { g, log } = rig();
      g.press(1, 0, sand); g.update(t, sand); g.release(1, t, sand);
      expect(log, `solta em ${t} ms`).toEqual([]);
    }
  });
});

describe('golpe no animal (ADR 0080)', () => {
  const mob = (i: number, x: number): GestureTarget => ({ x, y: 65, z: 4, nx: 0, ny: 1, nz: 0, kind: 'creature', item: String(i) });
  it('o animal anda: o toque curto vale mesmo com a célula dele mudando entre o press e o release (é o mesmo animal)', () => {
    const { g, log } = rig();
    g.press(1, 0, mob(0, 10)); g.update(50, mob(0, 11)); g.release(1, 100, mob(0, 12));
    expect(log).toHaveLength(1); expect(g.lastOutcome).toBe('placed'); // o golpe vai pelo índice do animal (item), não pela célula
  });
  it('segurar no animal golpeia em sequência (a cada quadro o gancho aplica a pausa), sem quebrar nada, e soltar encerra sem golpe extra', () => {
    const { g, log } = rig();
    g.press(1, 0, mob(0, 10)); g.update(100, mob(0, 10)); expect(g.state).toBe('ARMED');
    g.update(250, mob(0, 10)); expect(g.state).toBe('ATTACKING'); expect(log).toHaveLength(1);
    g.update(300, mob(0, 11)); g.update(900, mob(0, 12)); expect(log.length).toBeGreaterThanOrEqual(3); // a pausa de 0,6 s é do gancho, não do gesto
    const n = log.length; g.release(1, 1000, mob(0, 12)); expect(log).toHaveLength(n); expect(g.state).toBe('IDLE');
  });
  it('trocar de animal segue no novo; sair da mira ou arrastar a câmera para de golpear', () => {
    const a = rig(); a.g.press(1, 0, mob(0, 10)); a.g.update(250, mob(0, 10));
    a.g.update(300, mob(1, 14)); expect(a.log[a.log.length - 1]).toBe('place@14,65,4'); expect(a.g.state).toBe('ATTACKING');
    a.g.update(350, sand); expect(a.g.state).toBe('COMPLETED'); const n = a.log.length; a.g.update(400, mob(1, 14)); expect(a.log).toHaveLength(n);
    const b = rig(); b.g.press(1, 0, mob(0, 10)); b.g.update(250, mob(0, 10)); b.g.drag(1, DRAG_TOLERANCE_PX + 1); expect(b.g.state).toBe('CAMERA_DRAG');
    const c = rig(); c.g.press(1, 0, mob(0, 10)); c.g.update(50, mob(1, 10)); expect(c.g.state).toBe('COMPLETED'); expect(c.log).toHaveLength(0); // trocou antes de armar: nada
  });
});
