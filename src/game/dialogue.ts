import { art } from '../render/art';
import type { Conversation, Villager } from './villager';

/**
 * Caixa de conversa (v0.92.0): quando um NPC fala, a moldura aparece no centro da tela (embaixo, acima da grade) com o
 * retrato no círculo, o nome na plaquinha e o texto dentro da caixa. Texto que não cabe vira páginas; a setinha ▼ avisa
 * que tem mais e um toque (na caixa, no botão de ação, Espaço ou Enter) mostra a próxima; na última página, fecha.
 * Só interface: o texto e quem fala vêm de `game/npcs.ts`; a moldura e os retratos só baixam na primeira conversa.
 */

/** Largura máxima da moldura (px) e quanto da tela ela pode ocupar. */
const MAX_W = 620;
const MAX_W_VW = 0.94;
const MAX_H_VH = 0.46;
/** Proporção da moldura (largura ÷ altura), da arte recortada. */
const ASPECT = 1627 / 424;

/**
 * Divide `text` em páginas que cabem em `box` (um elemento com o mesmo tamanho e fonte da caixa de texto): enche com
 * palavras até transbordar e recua uma. Função pura sobre o DOM só para medir (nada é lido de canvas).
 */
export function paginate(text: string, box: HTMLElement): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const pages: string[] = [];
  let i = 0;
  const overflows = (): boolean => box.scrollHeight > box.clientHeight + 1;
  while (i < words.length) {
    let n = 0;
    box.textContent = '';
    while (i + n < words.length) {
      box.textContent = words.slice(i, i + n + 1).join(' ');
      if (overflows()) break;
      n++;
    }
    n = Math.max(1, n); // uma palavra maior que a caixa ainda vai sozinha
    pages.push(words.slice(i, i + n).join(' '));
    i += n;
  }
  box.textContent = '';
  return pages.length ? pages : [''];
}

export class DialogueBox {
  readonly root: HTMLElement;
  private readonly frame: HTMLElement;
  private readonly portrait: HTMLImageElement;
  private readonly nameEl: HTMLElement;
  private readonly textEl: HTMLElement;
  private readonly arrow: HTMLElement;
  private readonly choicesEl: HTMLElement;
  private pages: string[] = [];
  private page = 0;
  private current: { conv: Conversation; npc: Villager | null; onClose: () => void } | null = null;
  private readonly onResize = (): void => { if (this.current) this.layout(true); };

  constructor(parent: HTMLElement) {
    this.root = document.createElement('div');
    this.root.className = 'dialogue';
    this.root.hidden = true;
    this.root.innerHTML = `
      <div class="dlg-frame" role="dialog" aria-live="polite">
        <img class="dlg-bg" alt="" draggable="false">
        <div class="dlg-portrait"><img alt="" draggable="false"></div>
        <div class="dlg-name"></div>
        <div class="dlg-text"></div>
        <div class="dlg-choices" hidden></div>
        <div class="dlg-arrow" aria-hidden="true"></div>
      </div>`;
    this.frame = this.root.querySelector('.dlg-frame')!;
    this.portrait = this.root.querySelector('.dlg-portrait img')!;
    this.nameEl = this.root.querySelector('.dlg-name')!;
    this.textEl = this.root.querySelector('.dlg-text')!;
    this.arrow = this.root.querySelector('.dlg-arrow')!;
    this.choicesEl = this.root.querySelector('.dlg-choices')!;
    // Um toque na caixa avança (ou fecha na última página); não vaza para o canvas.
    this.root.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); });
    this.root.addEventListener('click', (e) => { e.stopPropagation(); this.advance(); });
    parent.appendChild(this.root);
    window.addEventListener('resize', this.onResize);
  }

  destroy(): void {
    window.removeEventListener('resize', this.onResize);
    this.root.remove();
  }

  /** Altura (px de tela) da moldura aberta; 0 fechada. O jogo sobe a câmera por ela para o NPC ficar à vista. */
  get boxHeight(): number {
    return this.current ? this.frame.offsetHeight : 0;
  }

  get isOpen(): boolean {
    return this.current !== null;
  }

  /** Quem está falando (null = ninguém). */
  get npc(): Villager | null {
    return this.current?.npc ?? null;
  }

  /** Abre (ou troca) a conversa; `onClose` roda ao fechar (solta o NPC). */
  open(conv: Conversation, npc: Villager | null, onClose: () => void): void {
    if (this.current) this.finish();
    const a = art();
    const bg = this.root.querySelector<HTMLImageElement>('.dlg-bg')!;
    if (a.dialogueFrame && bg.getAttribute('src') !== a.dialogueFrame) bg.src = a.dialogueFrame;
    const portrait = a.portraits?.[conv.npc];
    if (portrait) this.portrait.src = portrait;
    this.portrait.hidden = !portrait;
    this.nameEl.textContent = conv.name;
    this.current = { conv, npc, onClose };
    this.root.hidden = false;
    this.page = 0;
    this.layout(false);
  }

  /** Próxima página; na última, fecha. */
  advance(): void {
    if (!this.current) return;
    if (this.page >= this.pages.length - 1 && this.current.conv.choices?.length) return; // a pergunta só fecha por uma escolha
    if (this.page < this.pages.length - 1) {
      this.page++;
      this.render();
    } else {
      this.close();
    }
  }

  close(): void {
    if (!this.current) return;
    this.finish();
  }

  private finish(): void {
    const c = this.current;
    this.current = null;
    this.root.hidden = true;
    c?.onClose();
  }

  /** Tamanho da moldura pela tela, texto em páginas e página atual. */
  private layout(keepPage: boolean): void {
    if (!this.current) return;
    const w = Math.max(220, Math.min(MAX_W, window.innerWidth * MAX_W_VW, window.innerHeight * MAX_H_VH * ASPECT));
    this.frame.style.setProperty('--dlg-w', `${Math.round(w)}px`);
    this.pages = paginate(this.current.conv.text, this.textEl);
    if (this.current.conv.choices?.length) this.pages.push(this.current.conv.prompt ?? ''); // a última página é a pergunta, com os botões
    this.page = keepPage ? Math.min(this.page, this.pages.length - 1) : 0;
    this.render();
  }

  private render(): void {
    this.textEl.textContent = this.pages[this.page] ?? '';
    this.arrow.hidden = this.page >= this.pages.length - 1; // ▼ só quando tem mais
    const choices = this.current?.conv.choices;
    const show = !!choices?.length && this.page >= this.pages.length - 1;
    this.choicesEl.hidden = !show;
    this.choicesEl.textContent = '';
    if (!show) return;
    for (const c of choices!) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'dlg-choice';
      b.textContent = c.label;
      b.addEventListener('click', (e) => { e.stopPropagation(); this.close(); c.run(); });
      this.choicesEl.appendChild(b);
    }
  }
}
