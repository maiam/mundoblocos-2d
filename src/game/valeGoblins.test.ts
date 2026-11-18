import { describe, expect, it } from 'vitest';
import { WORLD_PROFILES } from '../world/profiles';
import { valeGoblinCamps, valeGoblinHomes } from '../world/sanctuaryValeGoblin';
import { World } from '../world/world';
import { ValeGoblins } from './valeGoblins';

const S = WORLD_PROFILES.santuario;
function vale(): World {
  const w = new World(1, S);
  for (let cx = -2; cx <= 1; cx++) for (let cy = -6; cy <= -3; cy++) w.loadChunk(cx, cy);
  return w;
}

describe('Goblins do Vale que andam (v0.93.161)', () => {
  it('nascem 28 (7 por acampamento), nos pontos de cada fogueira, virados para ela e em chão firme', () => {
    const w = vale();
    const g = new ValeGoblins(w);
    const camps = valeGoblinCamps();
    expect(g.goblins).toHaveLength(28);
    g.goblins.forEach((gb, i) => {
      const c = camps[Math.floor(i / 7)];
      expect([gb.x, gb.y]).toEqual(c.homes[i % 7]);
      expect(gb.z).toBe(2);
      expect(gb.yaw).toBeCloseTo(Math.atan2(c.fire[0] - gb.x, c.fire[1] - gb.y), 5);
      expect(gb.crew.map((x) => x.id)).toEqual(Array.from({ length: 7 }, (_, k) => Math.floor(i / 7) * 7 + k)); // o grupo é o do acampamento
    });
    expect(g.views(w)).toHaveLength(28);
  });

  it('roupas: cerca de metade usa a cor original e as outras 4 paletas aparecem em todos os acampamentos', () => {
    const w = vale();
    const g = new ValeGoblins(w);
    const styles = g.goblins.map((x) => x.style);
    expect(styles.filter((s) => s === 0).length).toBeGreaterThanOrEqual(10);
    expect(styles.filter((s) => s === 0).length).toBeLessThanOrEqual(18);
    for (const s of [1, 2, 3, 4]) expect(styles).toContain(s);
    for (let c = 0; c < 4; c++) expect(new Set(styles.slice(c * 7, c * 7 + 7)).size).toBeGreaterThanOrEqual(4);
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

describe('Vida social dos goblins (v0.93.165)', () => {
  it('ao longo de 3 minutos, cada comportamento acontece: caminhar, correr, sentar, mexer na fogueira e conversar (com o parceiro de frente e as falas alternando)', () => {
    const w = vale();
    const g = new ValeGoblins(w);
    const { homes } = valeGoblinHomes();
    const seen = { run: 0, sit: 0, stoke: 0, chat: 0, speakA: 0, speakB: 0, duel: 0, practice: 0, swing: 0, spark: 0, parry: 0 };
    for (let t = 0; t < 60 * 180; t++) {
      g.update(1 / 60, w);
      for (const [i, gb] of g.goblins.entries()) {
        expect(Math.hypot(gb.x - homes[i][0], gb.y - homes[i][1]), `goblin ${i} t=${t}`).toBeLessThan(4.7);
        if (gb.runBlend > 0.6) seen.run++;
        if (gb.mode === 'sit' && gb.sitBlend > 0.9) seen.sit++;
        if (gb.mode === 'stoke' && gb.stokeBlend > 0.9) {
          seen.stoke++;
          expect(Math.hypot(gb.x - gb.fireX, gb.y - gb.fireY)).toBeLessThan(1.6); // perto da fogueira
        }
        if (gb.mode === 'practice') { seen.practice++; expect(gb.spark, 'treino sozinho não faísca').toBe(-1); }
        if (gb.mode === 'duel') {
          seen.duel++;
          const o = gb.mate!;
          expect(o, `goblin ${i} duela sozinho`).not.toBeNull();
          expect(o.mate).toBe(gb);
          if (gb.swing > 0.05 && gb.swing < 0.95 && o.mode === 'duel') expect(o.swing, 'só um golpeia por vez').toBe(-1);
          if (gb.swing >= 0) seen.swing++;
          if (gb.spark >= 0) seen.spark++;
          if (gb.parry > 0.5) seen.parry++;
        }
        if (gb.mode === 'chat') {
          seen.chat++;
          const o = gb.crew.find((x) => x !== gb && x.mode === 'chat' && Math.hypot(x.x - gb.x, x.y - gb.y) < 2)!;
          expect(o, `goblin ${i} conversa sozinho`).toBeDefined();
          if (gb.talkBlend > 0.8) seen.speakA++; else if (gb.talkBlend < 0.5) seen.speakB++;
        }
      }
    }
    expect(seen.run).toBeGreaterThan(0);
    expect(seen.sit).toBeGreaterThan(0);
    expect(seen.stoke).toBeGreaterThan(0);
    expect(seen.chat).toBeGreaterThan(0);
    expect(seen.speakA).toBeGreaterThan(0);
    expect(seen.speakB).toBeGreaterThan(0);
    expect(seen.practice).toBeGreaterThan(0);
    expect(seen.duel).toBeGreaterThan(0);
    expect(seen.swing).toBeGreaterThan(0);
    expect(seen.spark).toBeGreaterThan(0);
    expect(seen.parry).toBeGreaterThan(0);
  });

  it('não ficam um dentro do outro (fora de quem conversa ou está sentado) e o movimento é determinístico', () => {
    const run = (): string => {
      const w = vale();
      const g = new ValeGoblins(w);
      let minD = 9;
      for (let t = 0; t < 60 * 60; t++) {
        g.update(1 / 60, w);
        if (t > 60 * 5) for (const a of g.goblins) for (const b of g.goblins) if (a.id < b.id && !(a.chatting && b.chatting) && a.sitBlend < 0.3 && b.sitBlend < 0.3) minD = Math.min(minD, Math.hypot(a.x - b.x, a.y - b.y));
      }
      expect(minD).toBeGreaterThan(0.25);
      return g.goblins.map((x) => `${x.x.toFixed(3)},${x.y.toFixed(3)},${x.mode}`).join('|');
    };
    expect(run()).toBe(run());
  });

  it('as visões trazem as misturas de pose (sentar, agachar, falar, correr, olhar)', () => {
    const w = vale();
    const g = new ValeGoblins(w);
    const v = g.views(w)[0];
    for (const k of ['walk', 'run', 'phase', 'sit', 'stoke', 'talk', 'look', 'fight', 'swing', 'parry', 'spark'] as const) expect(typeof v[k]).toBe('number');
  });
});
