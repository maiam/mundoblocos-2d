import type { StackId } from '../world/items';
import { BAG_SLOTS } from './hotbar';

export interface BagEntry {
  id: StackId;
  icon: string;
  name: string;
  /** null = ferramenta (sem quantidade). */
  count: number | null;
}

/** Espaços por fileira (igual à grade da mão: 8 + bolsa). */
const PER_ROW = 9;

/**
 * Bolsa: 2 fileiras de 9 espaços dentro do mesmo cartão da grade (acima dela), do mesmo tamanho dos espaços da mão,
 * só com o título "Bolsa". Mostra o que a heroína carrega e não está na grade. Tocar num item o escolhe; depois,
 * tocar num espaço da grade coloca-o lá (o Game faz a troca com `Hotbar.assign`).
 */
export class BagPanel {
  private readonly slots: HTMLButtonElement[] = [];
  private open = false;
  private entries: BagEntry[] = [];
  picked: StackId | null = null;

  constructor(private readonly section: HTMLElement) {
    section.hidden = true;
    section.innerHTML = '<h2>Bolsa</h2>';
    for (let r = 0; r < BAG_SLOTS / PER_ROW; r++) {
      const row = document.createElement('div');
      row.className = 'hotbar-row';
      for (let c = 0; c < PER_ROW; c++) {
        const b = document.createElement('button');
        b.className = 'slot vacant';
        b.innerHTML = '<img alt="" hidden><span class="count" hidden></span>';
        const i = this.slots.length;
        b.addEventListener('click', () => this.pick(i));
        row.appendChild(b);
        this.slots.push(b);
      }
      section.appendChild(row);
    }
  }

  get isOpen(): boolean {
    return this.open;
  }

  setOpen(open: boolean): void {
    this.open = open;
    this.section.hidden = !open;
    if (!open) this.picked = null;
  }

  private pick(i: number): void {
    const e = this.entries[i];
    this.picked = !e || this.picked === e.id ? null : e.id;
    this.render(this.entries);
  }

  /** Redesenha os 18 espaços (vazios ficam tracejados). */
  render(entries: BagEntry[]): void {
    this.entries = entries.slice(0, BAG_SLOTS);
    this.slots.forEach((b, i) => {
      const e = this.entries[i];
      const img = b.querySelector('img')!;
      const badge = b.querySelector<HTMLElement>('.count')!;
      b.classList.toggle('vacant', !e);
      b.classList.toggle('picked', !!e && e.id === this.picked);
      b.title = e ? e.name : 'Espaço vazio da bolsa';
      b.setAttribute('aria-label', e ? `${e.name}${e.count !== null ? `: ${e.count}` : ''}` : 'Espaço vazio da bolsa');
      img.hidden = !e;
      if (e && img.getAttribute('src') !== e.icon) img.src = e.icon;
      badge.hidden = !e || e.count === null;
      badge.textContent = e && e.count !== null ? String(e.count) : '';
    });
  }
}
