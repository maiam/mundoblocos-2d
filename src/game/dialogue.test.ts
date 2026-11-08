import { describe, expect, it } from 'vitest';
import { NPCS } from './npcs';
import { paginate } from './dialogue';

/** Caixa de mentira: cada linha tem até `perLine` letras e cabem `lines` linhas (mede como o navegador: por altura). */
function fakeBox(perLine: number, lines: number): HTMLElement {
  const box = { textContent: '' } as { textContent: string; scrollHeight: number; clientHeight: number };
  Object.defineProperty(box, 'scrollHeight', {
    get() {
      let rows = 1, col = 0;
      for (const w of box.textContent.split(' ').filter(Boolean)) {
        if (col && col + 1 + w.length > perLine) { rows++; col = w.length; } else col += (col ? 1 : 0) + w.length;
      }
      return box.textContent ? rows * 10 : 0;
    },
  });
  box.clientHeight = lines * 10;
  return box as unknown as HTMLElement;
}

describe('Caixa de conversa: páginas', () => {
  it('texto curto cabe numa página só (sem setinha)', () => {
    expect(paginate('Olá, viajante!', fakeBox(30, 3))).toEqual(['Olá, viajante!']);
  });

  it('texto longo vira páginas que cabem, sem perder nem repetir palavra, em ordem', () => {
    const text = NPCS[0].lines[0];
    const pages = paginate(text, fakeBox(28, 3));
    expect(pages.length).toBeGreaterThan(1);
    expect(pages.join(' ')).toBe(text.split(/\s+/).join(' '));
    const box = fakeBox(28, 3);
    for (const p of pages) { box.textContent = p; expect(box.scrollHeight).toBeLessThanOrEqual(box.clientHeight); }
  });

  it('caixa menor gera mais páginas; palavra maior que a caixa vai sozinha', () => {
    const text = 'um dois três quatro cinco seis sete oito nove dez';
    expect(paginate(text, fakeBox(12, 2)).length).toBeGreaterThan(paginate(text, fakeBox(30, 3)).length);
    expect(paginate('supercalifragilisticoespialidoso fim', fakeBox(10, 1))).toEqual(['supercalifragilisticoespialidoso', 'fim']);
  });

  it('toda fala de todo NPC cabe em no máximo 5 páginas numa caixa de 3 linhas de ~44 letras (a do celular)', () => {
    for (const n of NPCS) for (const l of n.lines) expect(paginate(l, fakeBox(44, 3)).length).toBeLessThanOrEqual(5);
  });
});
