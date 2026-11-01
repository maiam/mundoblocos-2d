/**
 * Interface mínima sobre o canvas: apenas a hotbar (grade de blocos) na parte
 * inferior. Apresentação pura; o estado vem do Game.
 */
export interface HudHandlers {
  icons: string[];
  names: string[];
  onSelect(i: number): void;
}

export class Hud {
  readonly root: HTMLElement;
  private readonly slots: HTMLButtonElement[] = [];
  private selected = -1;
  private counts: (number | null)[] = [];

  constructor(h: HudHandlers) {
    this.root = document.createElement('div');
    this.root.className = 'hud';
    const hotbar = document.createElement('nav');
    hotbar.className = 'hotbar';
    hotbar.setAttribute('aria-label', 'Blocos');
    h.icons.forEach((src, i) => {
      const b = document.createElement('button');
      b.className = 'slot';
      b.title = h.names[i];
      b.setAttribute('aria-label', h.names[i]);
      b.innerHTML = `<img alt="" src="${src}"><span class="count" hidden></span>`;
      b.addEventListener('click', () => h.onSelect(i));
      hotbar.appendChild(b);
      this.slots.push(b);
    });
    this.root.appendChild(hotbar);
    document.body.appendChild(this.root);
  }

  /** `counts[i]`: quantidade do item no espaço i, ou null para blocos (infinitos). */
  update(selected: number, counts: (number | null)[]): void {
    if (selected !== this.selected) {
      this.selected = selected;
      this.slots.forEach((b, i) => b.classList.toggle('active', i === selected));
    }
    counts.forEach((n, i) => {
      if (n === this.counts[i]) return;
      this.counts[i] = n;
      const badge = this.slots[i].querySelector<HTMLElement>('.count')!;
      badge.hidden = n === null;
      badge.textContent = n === null ? '' : String(n);
      this.slots[i].classList.toggle('empty', n === 0);
    });
  }

  destroy(): void {
    this.root.remove();
  }
}
