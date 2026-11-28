import { describe, expect, it } from 'vitest';
import { grunhoSpecs } from '../grunho';
import { LAKE_LAST_Y } from '../voxel';
import { T } from '../voxel';
import { TitanVolume } from '../volume';
import { meshSection } from '../mesher';
import { CAMP_FLAT_R, CAMP_SIZE, CAMP_TREE_R, COSTA_CAMP_SITES, COSTA_GENERATOR_VERSION, COSTA_LEGACY_VERSION, CostaGenerator, orvalisGeneratorFor } from './generator';

/** Os 4 acampamentos de 12 Grunhos da Aldeia da Costa (ADR 0147): clareira plana de terra batida fora do muro, Fogueira no centro, roda de goblins. */
const gen = new CostaGenerator(128064);
const camps = gen.camps!;

describe('acampamentos do Grunho na Aldeia da Costa (v101)', () => {
  it('4 acampamentos de 12 lugares, todos distintos, ids estáveis; a versão 101 os tem e a 100 não', () => {
    expect(COSTA_GENERATOR_VERSION).toBe(102); expect(camps).toHaveLength(4); expect(COSTA_CAMP_SITES).toHaveLength(4);
    const specs = grunhoSpecs(gen);
    expect(specs).toHaveLength(48); expect(new Set(specs.map((s) => s.id)).size).toBe(48); expect(new Set(specs.map((s) => `${s.x},${s.z}`)).size).toBe(48);
    expect(specs[0].id).toBe('g:oeste:0'); expect(camps.every((c) => c.slots.length === CAMP_SIZE)).toBe(true);
    const old = orvalisGeneratorFor(128064, COSTA_LEGACY_VERSION) as CostaGenerator;
    expect(old).toBeInstanceOf(CostaGenerator); expect(old.camps).toBeUndefined(); expect(grunhoSpecs(old)).toEqual([]);
    expect(old.blockAt(-38, old.column(-38, 4).top + 1, 4)).toBe(T.AIR); // a 100 não tem a Fogueira
  });

  it('fora do muro, em terra firme: clareira plana de terra batida, goblins na roda de 3 a 4 m, Fogueira no centro e sem árvore perto', () => {
    for (const c of camps) {
      expect(c.x < -17 || c.x > 31 || c.z < -3 || c.z > 37).toBe(true); // fora da caixa do muro (x −15…29, z −1…35)
      const top = gen.column(c.x, c.z).top;
      expect(top).toBeGreaterThan(LAKE_LAST_Y + 1); expect(c.y).toBe(top + 1);
      expect(gen.blockAt(c.x, c.y, c.z)).toBe(T.CAMPFIRE); expect(gen.blockAt(c.x, c.y - 1, c.z)).toBe(T.PATH);
      for (let dz = -5; dz <= 5; dz++) for (let dx = -5; dx <= 5; dx++) {
        if (Math.hypot(dx, dz) > CAMP_FLAT_R - 0.2) continue;
        const col = gen.column(c.x + dx, c.z + dz); expect(col.top).toBe(top); expect(col.surface).toBe(T.PATH);
      }
      for (const s of c.slots) { const d = Math.hypot(s.x - c.x, s.z - c.z); expect(d).toBeGreaterThan(2.5); expect(d).toBeLessThan(4.6); expect(s.y).toBe(c.y); }
      for (let dz = -CAMP_TREE_R; dz <= CAMP_TREE_R; dz++) for (let dx = -CAMP_TREE_R; dx <= CAMP_TREE_R; dx++) for (let h = 0; h < 8; h++) {
        if (Math.hypot(dx, dz) > CAMP_TREE_R - 3.5) continue; // o tronco fica a mais de CAMP_TREE_R e a copa chega a 3 m dele
        const b = gen.blockAt(c.x + dx, c.y + h, c.z + dz); expect([T.LOG_OAK, T.LEAVES_OAK]).not.toContain(b);
      }
    }
  });

  it('da clareira até 8 m dela o chão não tem degrau maior que 2 blocos (dá para andar em qualquer direção; além disso é o relevo natural do mapa), e os acampamentos ficam a mais de 20 m um do outro', () => {
    for (const c of camps) for (let a = 0; a < 16; a++) {
      let prev = gen.column(c.x, c.z).top;
      for (let r = 1; r <= 8; r++) { const t = gen.column(Math.round(c.x + Math.cos(a * Math.PI / 8) * r), Math.round(c.z + Math.sin(a * Math.PI / 8) * r)).top; if (Math.abs(t - prev) > 2) throw new Error(`${c.id}: degrau de ${t - prev} a ${r} m, ângulo ${a * 22.5}°`); prev = t; }
    }
    for (let i = 0; i < camps.length; i++) for (let j = i + 1; j < camps.length; j++) expect(Math.hypot(camps[i].x - camps[j].x, camps[i].z - camps[j].z)).toBeGreaterThan(20);
  });

  it('o volume acende a Fogueira do gerador (luz 15 e claridade em volta) e a malha registra o modelo dela', () => {
    const v = new TitanVolume(new CostaGenerator(128064)), c = v.gen.camps![0];
    expect(v.light(c.x, c.y, c.z)).toBe(15); expect(v.light(c.x + 3, c.y, c.z)).toBeGreaterThan(8);
    meshSection(v, c.x >> 4, (c.y >> 4) + 4, c.z >> 4);
    expect(v.modelCells('fogueira').some(([x, y, z]) => x === c.x && y === c.y && z === c.z)).toBe(true);
  });
});
