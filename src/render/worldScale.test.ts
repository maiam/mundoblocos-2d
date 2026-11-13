import { describe, expect, it } from 'vitest';
import { actorScaleFor, objectScaleFor, CHARACTER_SCALE_FACTOR, cellsTallFromSearch, SANCTUARY_CELLS_TALL, WORLD_CELLS_TALL } from './worldScale';

describe('?celulas= (experimento de escala do Mundo)', () => {
  it('sem parâmetro ou inválido, mantém as 14 células', () => {
    expect(cellsTallFromSearch('')).toBe(SANCTUARY_CELLS_TALL);
    expect(cellsTallFromSearch('?celulas=abc')).toBe(SANCTUARY_CELLS_TALL);
  });
  it('lê o valor e limita entre 10 e 32', () => {
    expect(cellsTallFromSearch('?celulas=21')).toBe(21);
    expect(cellsTallFromSearch('?celulas=2')).toBe(10);
    expect(cellsTallFromSearch('?celulas=99')).toBe(32);
  });
  it('no padrão (sem ?grade=2) o Mundo mostra 14 células', () => {
    expect(WORLD_CELLS_TALL).toBe(SANCTUARY_CELLS_TALL);
  });
  it('o fator dos atores acompanha as células: o personagem mantém os pixels', () => {
    expect(actorScaleFor(SANCTUARY_CELLS_TALL)).toBeCloseTo(CHARACTER_SCALE_FACTOR);
    // pixels na tela ∝ fator ÷ células visíveis: constante
    for (const n of [14, 21, 28]) expect(actorScaleFor(n) / n).toBeCloseTo(CHARACTER_SCALE_FACTOR / SANCTUARY_CELLS_TALL);
  });
});

describe('tamanho dos objetos na grade fina (ADR 0032)', () => {
  it('árvores e prédios mantêm os pixels; o resto encolhe com a célula', () => {
    expect(objectScaleFor('tree', 2)).toBe(2);
    expect(objectScaleFor('building', 2)).toBe(2);
    for (const shape of ['decoration', 'crop', 'fence', 'rock', 'door', 'flat'] as const) expect(objectScaleFor(shape, 2)).toBe(1);
  });
  it('no padrão (SUBDIV = 1) nada muda', () => {
    expect(objectScaleFor('tree', 1)).toBe(1);
  });
});
