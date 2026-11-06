import { describe, expect, it } from 'vitest';
import manifestJson from '../assets/chibi-manifesto.json';
import { cleanLook, defaultLook, lookFromSearch, lookOptions, modularFrame, pieceLabel, randomLook, type ModularManifest } from './modular';

const m = manifestJson as unknown as ModularManifest;
const look = { corpo: 'base', cabelo: 'curto-castanho', tronco: 'colete-verde', pernas: 'calca-ardosia', pes: 'sapatos-couro' };

describe('personagem modular (ADR 0017)', () => {
  it('lê a aparência de teste só com personagem=chibi', () => {
    expect(lookFromSearch('?seed=42')).toBeNull();
    expect(lookFromSearch('?personagem=chibi')).toEqual({ corpo: 'base', cabelo: 'curto-castanho' });
    expect(lookFromSearch('?personagem=Chibi&tronco=tunica-azul&pes=sapatos-couro'))
      .toEqual({ corpo: 'base', cabelo: 'curto-castanho', tronco: 'tunica-azul', pes: 'sapatos-couro' });
  });

  it('empilha as partes na ordem do manifesto, não na ordem das peças', () => {
    const f = modularFrame(m, look, 'down', true, 0, 0)!;
    expect(f.layers.map((l) => l.parte)).toEqual(['cabelo-tras', 'corpo', 'pes', 'pernas', 'tronco', 'cabeca', 'cabelo-frente']);
    for (const l of f.layers) expect(l.arquivo).toMatch(/^chibi-.*\.webp$/);
  });

  it('direções seguem o contrato (frente, esquerda, direita, costas)', () => {
    expect(modularFrame(m, look, 'down', true, 0, 0)!.row).toBe(0);
    expect(modularFrame(m, look, 'left', true, 0, 0)!.row).toBe(1);
    expect(modularFrame(m, look, 'right', true, 0, 0)!.row).toBe(2);
    expect(modularFrame(m, look, 'up', true, 0, 0)!.row).toBe(3);
  });

  it('andando cicla a caminhada na velocidade da ação; parado sem repouso = quadro 0', () => {
    const fps = m.acoes.caminhada.fps;
    const n = m.acoes.caminhada.quadros;
    expect(modularFrame(m, look, 'down', true, 3 / fps, 0)!.col).toBe(3);
    expect(modularFrame(m, look, 'down', true, (n + 2) / fps, 0)!.col).toBe(2);
    const parado = modularFrame(m, look, 'down', false, 5, 7)!;
    expect(parado.acao).toBe('caminhada');
    expect(parado.col).toBe(0);
  });

  it('peça desconhecida é ignorada; sem corpo não há quadro', () => {
    const f = modularFrame(m, { cabelo: 'nao-existe', tronco: 'blusa-ocre' }, 'down', true, 0, 0)!;
    expect(f.layers.map((l) => l.parte)).toEqual(['corpo', 'tronco', 'cabeca']);
    expect(modularFrame(m, { corpo: 'nenhum' }, 'down', true, 0, 0)).toBeUndefined();
  });

  it('a escala vem do mestre: altura de referência = 2,2 células', () => {
    const a = m.acoes.caminhada;
    // 360 px do mestre (corpo-base) × escala de exportação 0,4 × escalaMundo = 2,2 × 32 px de mundo.
    expect(360 * 0.4 * a.escalaMundo).toBeCloseTo(2.2 * 32, 1);
  });

  it('opções de montagem vêm do manifesto (pés podem ficar descalços)', () => {
    expect(lookOptions(m, 'tronco')).toContain('tunica-azul');
    expect(lookOptions(m, 'tronco')).not.toContain(null);
    expect(lookOptions(m, 'pes').at(-1)).toBeNull();
    expect(defaultLook(m)).toEqual({ corpo: 'base', cabelo: 'curto-castanho', tronco: 'blusa-ocre', pernas: 'shorts-marinho', pes: 'sapatos-couro' });
    expect(pieceLabel('pes', null)).toBe('Descalço');
    expect(pieceLabel('tronco', 'blusa-lilas')).toBe('Blusa lilás');
  });

  it('sorteio só usa peças existentes', () => {
    let i = 0;
    const seq = [0.99, 0.5, 0.7, 0.999];
    const r = randomLook(m, () => seq[i++ % seq.length]);
    for (const [k, v] of Object.entries(r)) if (k !== 'corpo') expect(lookOptions(m, k)).toContain(v);
    expect(r.pes).toBeUndefined(); // último da lista = descalço
  });

  it('aparência salva é limpa contra o manifesto', () => {
    expect(cleanLook(m, null)).toBeNull();
    expect(cleanLook(m, { tronco: 'armadura-dourada', pernas: 'shorts-vinho', pes: 'chinelo' }))
      .toEqual({ corpo: 'base', cabelo: 'curto-castanho', tronco: 'blusa-ocre', pernas: 'shorts-vinho' });
  });
});
