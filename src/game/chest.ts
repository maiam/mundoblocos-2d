import { CHEST_SLOTS, type ChestSlots } from '../world/world';
import type { StackId } from '../world/items';

/** Ícone e nome de uma pilha (resolvidos pelo Game com a arte do mundo). */
export type ChestLook = (id: StackId) => { icon: string; name: string; tool: boolean };

const PER_ROW = 9;

/**
 * Painel do baú aberto: 27 espaços (3 fileiras de 9) acima da bolsa e da mão, do mesmo tamanho dos espaços da grade.
 * Só desenha e avisa os toques; as trocas (tocar num item e depois no destino) ficam no Game.
 */
export class ChestPanel {
  private readonly slots: HTMLButtonElement[] = [];
  private open = false;
  /** Célula do baú aberto. */
  at: [number, number] | null = null;
  /** Espaço escolhido no baú (para levar à mão/bolsa ou trocar de lugar no baú). */
  picked: number | null = null;

  constructor(private readonly section: HTMLElement, private readonly onTap: (i: number) => void) {
    section.innerHTML = '<h2>Baú de Carvalho</h2>';
    for (let r = 0; r < CHEST_SLOTS / PER_ROW; r++) {
      const row = document.createElement('div');
      row.className = 'hotbar-row';
      for (let c = 0; c < PER_ROW; c++) {
        const b = document.createElement('button');
        b.className = 'slot vacant';
        b.innerHTML = '<img alt="" hidden><span class="count" hidden></span>';
        const i = this.slots.length;
        b.addEventListener('click', () => this.onTap(i));
        row.appendChild(b);
        this.slots.push(b);
      }
      section.appendChild(row);
    }
  }

  get isOpen(): boolean {
    return this.open;
  }

  setOpen(at: [number, number] | null): void {
    this.open = !!at;
    this.at = at;
    this.section.hidden = !at;
    this.picked = null;
  }

  render(slots: ChestSlots, look: ChestLook): void {
    this.slots.forEach((b, i) => {
      const s = slots[i];
      const img = b.querySelector('img')!;
      const badge = b.querySelector<HTMLElement>('.count')!;
      b.classList.toggle('vacant', !s);
      b.classList.toggle('picked', i === this.picked);
      if (!s) {
        img.hidden = true;
        badge.hidden = true;
        b.title = 'Espaço vazio do baú';
        b.setAttribute('aria-label', 'Espaço vazio do baú');
        return;
      }
      const l = look(s.item as StackId);
      img.hidden = false;
      if (img.getAttribute('src') !== l.icon) img.src = l.icon;
      badge.hidden = l.tool;
      badge.textContent = String(s.count);
      b.title = l.name;
      b.setAttribute('aria-label', `${l.name}${l.tool ? '' : `: ${s.count}`}`);
    });
  }
}
