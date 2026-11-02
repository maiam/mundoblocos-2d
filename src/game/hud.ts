/**
 * Interface mínima sobre o canvas: apenas a hotbar (grade de blocos) na parte
 * inferior. Apresentação pura; o estado vem do Game.
 */
export interface HudHandlers {
  icons: string[];
  names: string[];
  onSelect(i: number): void;
  /** Espólios (ícone + nome), na ordem de `setLoot`. Vazio = mundo sem combate. */
  loot?: Array<{ icon: string; name: string }>;
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
  private selected = -1;
  private counts: (number | null)[] = [];
  private readonly status: HTMLElement;
  private readonly hearts: HTMLElement;
  private readonly lootEls: HTMLElement[] = [];
  private lastHp = -1;
  private lastLoot: number[] = [];
  private readonly maxHp: number;

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
    // Canto superior esquerdo: corações (aparecem só quando importam) e espólios coletados (só os que há).
    this.maxHp = h.maxHp ?? 0;
    this.status = document.createElement('div');
    this.status.className = 'status';
    this.hearts = document.createElement('div');
    this.hearts.className = 'hearts';
    this.hearts.setAttribute('role', 'img');
    this.status.appendChild(this.hearts);
    const loot = document.createElement('div');
    loot.className = 'loot';
    for (const it of h.loot ?? []) {
      const el = document.createElement('span');
      el.className = 'loot-item';
      el.title = it.name;
      el.hidden = true;
      el.innerHTML = `<img alt="${it.name}" src="${it.icon}"><b></b>`;
      loot.appendChild(el);
      this.lootEls.push(el);
    }
    this.status.appendChild(loot);
    this.root.appendChild(this.status);
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

  /** Quantidade de cada espólio (mostra só os que já foram coletados). */
  setLoot(counts: number[]): void {
    counts.forEach((n, i) => {
      if (n === this.lastLoot[i] || !this.lootEls[i]) return;
      this.lastLoot[i] = n;
      this.lootEls[i].hidden = n <= 0;
      this.lootEls[i].querySelector('b')!.textContent = String(n);
    });
  }

  destroy(): void {
    this.root.remove();
  }
}
