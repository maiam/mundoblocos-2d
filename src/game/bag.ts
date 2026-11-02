import type { StackId } from '../world/items';

export interface BagEntry {
  id: StackId;
  icon: string;
  name: string;
  /** null = ferramenta (sem quantidade). */
  count: number | null;
  /** Já está na grade (espaço 1–8)? */
  inGrid: number;
}

/**
 * Painel da bolsa: tudo que a heroína carrega. Tocar num item o escolhe; depois, tocar num espaço da grade
 * coloca-o lá (o que estava volta para a bolsa). Com nada escolhido, tocar num espaço da grade guarda-o na bolsa.
 * Apresentação pura; a troca é feita pelo Game (`Hotbar.assign`).
 */
export class BagPanel {
  private readonly el: HTMLElement;
  private readonly grid: HTMLElement;
  private readonly hint: HTMLElement;
  private open = false;
  picked: StackId | null = null;

  constructor(root: HTMLElement, private readonly onClose: () => void) {
    this.el = document.createElement('div');
    this.el.className = 'bag-panel';
    this.el.hidden = true;
    this.el.setAttribute('role', 'dialog');
    this.el.setAttribute('aria-label', 'Bolsa');
    this.el.innerHTML = `<header><h2>Bolsa</h2><button class="bag-close" aria-label="Fechar a bolsa">✕</button></header>
      <p class="bag-hint"></p><div class="bag-grid"></div>`;
    this.grid = this.el.querySelector('.bag-grid')!;
    this.hint = this.el.querySelector('.bag-hint')!;
    this.el.querySelector('.bag-close')!.addEventListener('click', () => this.onClose());
    root.appendChild(this.el);
  }

  get isOpen(): boolean {
    return this.open;
  }

  setOpen(open: boolean): void {
    this.open = open;
    this.el.hidden = !open;
    if (!open) this.picked = null;
  }

  /** Redesenha a lista. */
  render(entries: BagEntry[]): void {
    this.hint.textContent = this.picked
      ? 'Agora toque num espaço da grade para colocar o item lá.'
      : 'Toque num item e depois num espaço da grade. Tocar num espaço da grade guarda o item na bolsa.';
    this.grid.innerHTML = '';
    if (!entries.length) {
      this.grid.innerHTML = '<p class="bag-empty">A bolsa está vazia.</p>';
      return;
    }
    for (const e of entries) {
      const b = document.createElement('button');
      b.className = 'bag-item';
      b.classList.toggle('picked', e.id === this.picked);
      b.classList.toggle('in-grid', e.inGrid >= 0);
      b.title = e.name;
      b.setAttribute('aria-label', `${e.name}${e.count !== null ? `: ${e.count}` : ''}${e.inGrid >= 0 ? ` (na grade, espaço ${e.inGrid + 1})` : ''}`);
      b.innerHTML = `<img alt="" src="${e.icon}">${e.count !== null ? `<b>${e.count}</b>` : ''}${e.inGrid >= 0 ? `<i>${e.inGrid + 1}</i>` : ''}`;
      b.addEventListener('click', () => {
        this.picked = this.picked === e.id ? null : e.id;
        this.render(entries);
      });
      this.grid.appendChild(b);
    }
  }
}
