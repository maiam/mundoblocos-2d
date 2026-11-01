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
      b.innerHTML = `<img alt="" src="${src}">`;
      b.addEventListener('click', () => h.onSelect(i));
      hotbar.appendChild(b);
      this.slots.push(b);
    });
    this.root.appendChild(hotbar);
    document.body.appendChild(this.root);
  }

  update(selected: number): void {
    if (selected === this.selected) return;
    this.selected = selected;
    this.slots.forEach((b, i) => b.classList.toggle('active', i === selected));
  }

  destroy(): void {
    this.root.remove();
  }
}
