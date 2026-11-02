/**
 * Interface mínima sobre o canvas: a grade (hotbar) na parte inferior — 8 espaços + bolsa no 9º no mundo com
 * coleta — e os corações no canto. Apresentação pura; o estado vem do Game.
 */
/** O que um espaço da grade mostra (null = vazio). `count` null = infinito (sem número). */
export interface SlotView {
  icon: string;
  name: string;
  count: number | null;
}

export interface HudHandlers {
  /** Quantidade de espaços da grade. */
  slots: number;
  onSelect(i: number): void;
  /** Bolsa no fim da grade (mundo com coleta). */
  bag?: { icon: string; onOpen(): void };
  /** Vida máxima em meios corações (0 = sem corações neste mundo). */
  maxHp?: number;
}

const HEART = (fill: 'full' | 'half' | 'empty') => `<svg viewBox="0 0 24 22" aria-hidden="true"><defs><clipPath id="hh"><rect width="12" height="22"/></clipPath></defs>
<path d="M12 21 2.6 11.8A5.6 5.6 0 0 1 12 4.2a5.6 5.6 0 0 1 9.4 7.6Z" fill="#3a2350" stroke="#1c1030" stroke-width="1.6"/>
${fill === 'empty' ? '' : `<path ${fill === 'half' ? 'clip-path="url(#hh)"' : ''} d="M12 21 2.6 11.8A5.6 5.6 0 0 1 12 4.2a5.6 5.6 0 0 1 9.4 7.6Z" fill="#ff5c7a"/>
<path ${fill === 'half' ? 'clip-path="url(#hh)"' : ''} d="M6.5 7.5c1.2-1.4 3-1.2 3.8.2" fill="none" stroke="#ffd0da" stroke-width="1.6" stroke-linecap="round"/>`}</svg>`;

export class Hud {
  readonly root: HTMLElement;
  private readonly slots: HTMLButtonElement[] = [];
  private readonly bagButton: HTMLButtonElement | null = null;
  /** Seção da bolsa dentro do cartão da grade (2 fileiras acima da mão), preenchida pelo `BagPanel`. */
  readonly bagSection: HTMLElement;
  private selected = -1;
  private views: string[] = [];
  private readonly hearts: HTMLElement;
  private lastHp = -1;
  private readonly maxHp: number;

  constructor(h: HudHandlers) {
    this.root = document.createElement('div');
    this.root.className = 'hud';
    // Um só cartão: bolsa (oculta até abrir) em cima e a fileira da mão embaixo — mesma largura e mesmos espaços.
    const card = document.createElement('nav');
    card.className = 'hotbar';
    card.setAttribute('aria-label', 'Grade');
    this.bagSection = document.createElement('div');
    this.bagSection.className = 'bag-section';
    card.appendChild(this.bagSection);
    const hotbar = document.createElement('div');
    hotbar.className = 'hotbar-row';
    card.appendChild(hotbar);
    for (let i = 0; i < h.slots; i++) {
      const b = document.createElement('button');
      b.className = 'slot';
      b.innerHTML = '<img alt=""><span class="count" hidden></span>';
      b.addEventListener('click', () => h.onSelect(i));
      hotbar.appendChild(b);
      this.slots.push(b);
    }
    if (h.bag) {
      const bag = document.createElement('button');
      bag.className = 'slot bag';
      bag.title = 'Bolsa (9)';
      bag.setAttribute('aria-label', 'Abrir ou fechar a bolsa');
      bag.innerHTML = `<img alt="" src="${h.bag.icon}">`;
      bag.addEventListener('click', () => h.bag!.onOpen());
      hotbar.appendChild(bag);
      this.bagButton = bag;
    }
    this.root.appendChild(card);
    this.maxHp = h.maxHp ?? 0;
    const status = document.createElement('div');
    status.className = 'status';
    this.hearts = document.createElement('div');
    this.hearts.className = 'hearts';
    this.hearts.setAttribute('role', 'img');
    status.appendChild(this.hearts);
    this.root.appendChild(status);
    document.body.appendChild(this.root);
  }

  /** Conteúdo dos espaços (só redesenha o que mudou). */
  setSlots(views: (SlotView | null)[]): void {
    views.forEach((v, i) => {
      const key = v ? `${v.icon}|${v.name}|${v.count}` : '';
      if (key === this.views[i] || !this.slots[i]) return;
      this.views[i] = key;
      const b = this.slots[i];
      const img = b.querySelector('img')!;
      const badge = b.querySelector<HTMLElement>('.count')!;
      b.classList.toggle('vacant', !v);
      b.title = v ? `${v.name} (${i + 1})` : `Espaço ${i + 1} vazio`;
      b.setAttribute('aria-label', v ? v.name : `Espaço ${i + 1} vazio`);
      img.hidden = !v;
      if (v && img.getAttribute('src') !== v.icon) img.src = v.icon;
      badge.hidden = !v || v.count === null;
      badge.textContent = v && v.count !== null ? String(v.count) : '';
      b.classList.toggle('empty', !!v && v.count === 0);
    });
  }

  update(selected: number): void {
    if (selected === this.selected) return;
    this.selected = selected;
    this.slots.forEach((b, i) => b.classList.toggle('active', i === selected));
  }

  /** Destaca a bolsa aberta e os espaços como alvo de troca. */
  setBagOpen(open: boolean): void {
    this.bagButton?.classList.toggle('active', open);
    this.root.classList.toggle('bag-open', open);
  }

  /** Vida em meios corações; `visible` mostra a fileira (ferida ou na dungeon). */
  setHealth(hp: number, visible: boolean): void {
    this.hearts.classList.toggle('shown', visible && this.maxHp > 0);
    if (hp === this.lastHp || this.maxHp === 0) return;
    this.lastHp = hp;
    const html: string[] = [];
    for (let i = 0; i < this.maxHp / 2; i++) html.push(HEART(hp >= i * 2 + 2 ? 'full' : hp === i * 2 + 1 ? 'half' : 'empty'));
    this.hearts.innerHTML = html.join('');
    this.hearts.setAttribute('aria-label', `Vida: ${hp / 2} de ${this.maxHp / 2} corações`);
  }

  destroy(): void {
    this.root.remove();
  }
}
