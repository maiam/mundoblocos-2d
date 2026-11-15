import type { StackId } from '../world/items';
import { type BuyResult, shopPage, shopPages, type ShopOffer } from '../world/shop';

/**
 * Janela da loja (v0.93.57): a moldura é a arte do dono do produto (`assets-src/ui/shop-frame.png`, sem os textos que mudam —
 * `scripts/make-shop-frame.py`) e tudo o que é dinâmico fica em cima, por porcentagem das medidas da arte (1187 × 1326): retrato do
 * mercador no círculo (atrás da moldura, que é vazada ali), título, fala, 10 espaços (2 × 5) com ícone, nome e preço, páginas e o saldo de
 * moedas. Tocar num item compra 1 unidade. "Vender" ainda não existe. Apresentação pura: as regras são de `world/shop.ts` e o `Game`
 * faz a compra (`buy`). Escala pela altura/largura da tela (`--shop-w`), como a caixa de conversa.
 */
const W = 1187;
const H = 1326;
/** Topo do ícone de cada fileira e a altura do espaço (px da arte); colunas: esquerda e direita. */
const ROW_TOPS = [308, 461, 615, 759, 898];
const SLOT_H = 124;
const COL_X = [68, 620];

const pct = (v: number, total: number): string => `${((v / total) * 100).toFixed(3)}%`;
function place(el: HTMLElement, x0: number, y0: number, x1: number, y1: number): void {
  el.style.left = pct(x0, W);
  el.style.top = pct(y0, H);
  el.style.width = pct(x1 - x0, W);
  el.style.height = pct(y1 - y0, H);
}

/** O que muda de uma loja para outra (Mercado, Floricultura): título, fala de abertura e a etiqueta da categoria. */
export interface ShopStyle {
  title: string;
  greeting: string;
  category: string;
}

export interface ShopHandlers {
  /** Arte da moldura (`art().shopFrame`). */
  frame: string;
  /** Ícone e nome de uma pilha à venda (item ou bloco). */
  icon(item: StackId): string;
  name(item: StackId): string;
  coins(): number;
  buy(offer: ShopOffer): BuyResult;
  onOpenChange(open: boolean): void;
}

export class ShopWindow {
  readonly root: HTMLElement;
  private readonly box: HTMLElement;
  private readonly portrait: HTMLImageElement;
  private readonly bubble: HTMLElement;
  private readonly pageEl: HTMLElement;
  private readonly coinsEl: HTMLElement;
  private readonly prev: HTMLButtonElement;
  private readonly next: HTMLButtonElement;
  private readonly cards: Array<{ btn: HTMLButtonElement; icon: HTMLImageElement; name: HTMLElement; price: HTMLElement }> = [];
  private offers: readonly ShopOffer[] = [];
  private page = 0;
  private opened = false;
  private bubbleTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly onResize = (): void => { if (this.opened) this.fit(); };
  private readonly onKey = (e: KeyboardEvent): void => { if (this.opened && e.code === 'Escape') { e.stopPropagation(); this.close(); } };

  private greeting = '';
  private readonly titleEl: HTMLElement;
  private readonly catEl: HTMLElement;

  constructor(parent: HTMLElement, private readonly h: ShopHandlers) {
    this.root = document.createElement('div');
    this.root.className = 'shop';
    this.root.hidden = true;
    this.root.innerHTML = `
      <div class="shop-box" role="dialog">
        <div class="shop-portrait"><img alt="" draggable="false" hidden></div>
        <img class="shop-frame" alt="" draggable="false" src="${h.frame}">
        <div class="shop-title"></div>
        <button class="shop-close" aria-label="Fechar"></button>
        <div class="shop-bubble"></div>
        <div class="shop-cat"></div>
        <button class="shop-prev" aria-label="Página anterior"></button>
        <div class="shop-page"></div>
        <button class="shop-next" aria-label="Próxima página"></button>
        <button class="shop-buy-tab" aria-label="Comprar"></button>
        <button class="shop-sell-tab" aria-label="Vender"></button>
        <div class="shop-coins"></div>
      </div>`;
    this.box = this.root.querySelector('.shop-box')!;
    this.titleEl = this.root.querySelector('.shop-title')!;
    this.catEl = this.root.querySelector('.shop-cat')!;
    this.portrait = this.root.querySelector('.shop-portrait img')!;
    this.bubble = this.root.querySelector('.shop-bubble')!;
    this.pageEl = this.root.querySelector('.shop-page')!;
    this.coinsEl = this.root.querySelector('.shop-coins')!;
    this.prev = this.root.querySelector('.shop-prev')!;
    this.next = this.root.querySelector('.shop-next')!;
    place(this.root.querySelector<HTMLElement>('.shop-portrait')!, 48, 15, 248, 215);
    place(this.root.querySelector<HTMLElement>('.shop-title')!, 520, 42, 850, 104);
    place(this.root.querySelector<HTMLElement>('.shop-close')!, 1050, 50, 1165, 155);
    place(this.bubble, 326, 180, 724, 224);
    place(this.root.querySelector<HTMLElement>('.shop-cat')!, 812, 182, 1068, 232);
    place(this.prev, 85, 1050, 380, 1120);
    place(this.pageEl, 466, 1062, 704, 1108);
    place(this.next, 805, 1050, 1095, 1120);
    place(this.root.querySelector<HTMLElement>('.shop-buy-tab')!, 40, 1166, 352, 1254);
    place(this.root.querySelector<HTMLElement>('.shop-sell-tab')!, 373, 1166, 682, 1252);
    place(this.coinsEl, 940, 1188, 1128, 1246);
    for (let i = 0; i < 10; i++) {
      const col = i % 2, row = Math.floor(i / 2);
      const x = COL_X[col], top = ROW_TOPS[row];
      const btn = document.createElement('button');
      btn.className = 'shop-card';
      btn.innerHTML = '<img class="shop-icon" alt="" draggable="false"><span class="shop-name"></span><span class="shop-price"></span>';
      place(btn, x - 20, top - 12, x + 520, top + SLOT_H + 4); // o cartão inteiro (a moldura mostra o espaço e a pílula do preço)
      const rel = (el: HTMLElement, x0: number, y0: number, x1: number, y1: number): void => {
        const bx = x - 20, by = top - 12, bw = 540, bh = SLOT_H + 16;
        el.style.left = pct(x0 - bx, bw); el.style.top = pct(y0 - by, bh); el.style.width = pct(x1 - x0, bw); el.style.height = pct(y1 - y0, bh);
      };
      const icon = btn.querySelector<HTMLImageElement>('.shop-icon')!;
      const name = btn.querySelector<HTMLElement>('.shop-name')!;
      const price = btn.querySelector<HTMLElement>('.shop-price')!;
      rel(icon, x + 6, top + 6, x + 131, top + 118);
      rel(name, x + 164, top + 4, x + 515, top + 52);
      rel(price, x + 232, top + 58, x + 328, top + 104);
      btn.addEventListener('click', () => this.buy(i));
      this.box.appendChild(btn);
      this.cards.push({ btn, icon, name, price });
    }
    this.root.querySelector('.shop-close')!.addEventListener('click', () => this.close());
    this.prev.addEventListener('click', () => this.go(-1));
    this.next.addEventListener('click', () => this.go(1));
    this.root.querySelector('.shop-sell-tab')!.addEventListener('click', () => this.say('Em breve eu compro o que você tiver de sobra!'));
    // Tocar fora da janela fecha; nada vaza para o canvas do jogo.
    this.root.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); });
    this.root.addEventListener('click', (e) => { e.stopPropagation(); if (e.target === this.root) this.close(); });
    parent.appendChild(this.root);
    window.addEventListener('resize', this.onResize);
    window.addEventListener('keydown', this.onKey, true);
  }

  get isOpen(): boolean {
    return this.opened;
  }

  open(offers: readonly ShopOffer[], merchant: { portrait?: string }, style: ShopStyle): void {
    this.offers = offers;
    this.greeting = style.greeting;
    this.titleEl.textContent = style.title;
    this.catEl.textContent = style.category;
    this.box.setAttribute('aria-label', style.title);
    this.page = 0;
    if (merchant.portrait) this.portrait.src = merchant.portrait;
    this.portrait.hidden = !merchant.portrait;
    this.opened = true;
    this.root.hidden = false;
    this.fit();
    this.say(this.greeting, 0);
    this.render();
    this.h.onOpenChange(true);
  }

  close(): void {
    if (!this.opened) return;
    this.opened = false;
    this.root.hidden = true;
    if (this.bubbleTimer) clearTimeout(this.bubbleTimer);
    this.h.onOpenChange(false);
  }

  /** Redesenha saldo, páginas e espaços (chamado ao abrir e depois de cada compra). */
  render(): void {
    const pages = shopPages(this.offers);
    const list = shopPage(this.offers, this.page);
    const coins = this.h.coins();
    this.cards.forEach((c, i) => {
      const o = list[i];
      c.btn.hidden = !o;
      if (!o) return;
      c.icon.src = this.h.icon(o.item);
      const name = this.h.name(o.item);
      c.name.textContent = name;
      c.price.textContent = String(o.price);
      c.btn.classList.toggle('poor', coins < o.price);
      c.btn.setAttribute('aria-label', `${name}, ${o.price} moedas de cobre${coins < o.price ? ' (faltam moedas)' : ''}`);
    });
    this.pageEl.textContent = `Página ${this.page + 1} de ${pages}`;
    this.prev.classList.toggle('off', this.page <= 0);
    this.next.classList.toggle('off', this.page >= pages - 1);
    this.coinsEl.textContent = String(coins);
  }

  private go(d: number): void {
    const p = this.page + d;
    if (p < 0 || p >= shopPages(this.offers)) return;
    this.page = p;
    this.render();
  }

  private buy(i: number): void {
    const o = shopPage(this.offers, this.page)[i];
    if (!o) return;
    const r = this.h.buy(o);
    const name = this.h.name(o.item);
    if (r === 'ok') this.say(`Obrigado! ${name} é seu.`);
    else if (r === 'coins') this.say('Faltam Moedas de Cobre para esse item.');
    else this.say('Sua bolsa está cheia. Abra espaço e volte!');
    this.render();
    const card = this.cards[i].btn;
    card.classList.remove('bump', 'deny');
    void card.offsetWidth; // reinicia a animação
    card.classList.add(r === 'ok' ? 'bump' : 'deny');
  }

  /** Fala do mercador no balão; volta à saudação depois de um tempo (`ms` 0 = fica). */
  private say(text: string, ms = 3200): void {
    this.bubble.textContent = text;
    if (this.bubbleTimer) clearTimeout(this.bubbleTimer);
    if (ms > 0) this.bubbleTimer = setTimeout(() => { this.bubble.textContent = this.greeting; }, ms);
  }

  /** Largura da janela: cabe na tela (altura e largura) mantendo a proporção da arte. */
  private fit(): void {
    const w = Math.min(window.innerWidth * 0.96, window.innerHeight * 0.97 * (W / H));
    this.root.style.setProperty('--shop-w', `${Math.floor(w)}px`);
  }

  destroy(): void {
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('keydown', this.onKey, true);
    if (this.bubbleTimer) clearTimeout(this.bubbleTimer);
    this.root.remove();
  }
}

