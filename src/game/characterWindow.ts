import { CharacterPreview } from '../render/characterPreview';
import type { HeroBody } from './entities';
import { splitCoins } from './wallet';

/**
 * Painel do personagem (v0.93.122): a moldura é a arte do dono do produto (`assets-src/ui/character-frame.png`, sem os valores que mudam —
 * `scripts/make-character-frame.py`) e tudo o que é dinâmico fica em cima, por porcentagem das medidas da arte (1448 × 1086): o avatar no círculo e o
 * personagem de corpo inteiro na caixa do meio (desenhados ATRÁS da moldura, que é vazada ali), título, nível, barra de XP, ataque, HP e as três moedas
 * (cobre, prata, ouro — a carteira, que não se perde ao morrer). Os seis espaços de roupa (chapéu, blusa, calça, luvas, anel, sapato) são só a arte por
 * enquanto: ainda não há itens de equipamento. Apresentação pura: os números vêm do `Game` (`CharacterView`).
 */
const W = 1448;
const H = 1086;

/** O que o painel mostra (o `Game` monta). */
export interface CharacterView {
  body: HeroBody;
  name: string;
  level: number;
  /** Fração da barra de XP (0..1) e o texto à direita (sem sistema de XP ainda: vazio). */
  xp: number;
  xpText: string;
  attack: number;
  hp: number;
  maxHp: number;
  /** Saldo em Moedas de Cobre (a carteira). */
  copper: number;
}

export interface CharacterHandlers {
  /** Arte da moldura (`art().characterFrame`). */
  frame: string;
  onOpenChange(open: boolean): void;
}

const pct = (v: number, total: number): string => `${((v / total) * 100).toFixed(3)}%`;
function place(el: HTMLElement, x0: number, y0: number, x1: number, y1: number): void {
  el.style.left = pct(x0, W);
  el.style.top = pct(y0, H);
  el.style.width = pct(x1 - x0, W);
  el.style.height = pct(y1 - y0, H);
}

export class CharacterWindow {
  readonly root: HTMLElement;
  private readonly avatar: CharacterPreview;
  private readonly full: CharacterPreview;
  private readonly el: Record<'title' | 'level' | 'xpFill' | 'xpText' | 'attack' | 'hp' | 'copper' | 'silver' | 'gold', HTMLElement>;
  private open_ = false;

  constructor(parent: HTMLElement, private readonly h: CharacterHandlers) {
    this.root = document.createElement('div');
    this.root.className = 'charwin';
    this.root.hidden = true;
    this.root.innerHTML = `
      <div class="charwin-box" role="dialog" aria-label="Personagem">
        <canvas class="charwin-avatar" aria-label="Avatar"></canvas>
        <canvas class="charwin-body" aria-label="Personagem de corpo inteiro"></canvas>
        <img class="charwin-frame" alt="" draggable="false" src="${h.frame}">
        <div class="charwin-title"></div>
        <button class="charwin-close" aria-label="Fechar"></button>
        <div class="charwin-xp"><i class="charwin-xp-fill"></i></div>
        <div class="charwin-val charwin-level"></div>
        <div class="charwin-val charwin-xptext"></div>
        <div class="charwin-val charwin-attack"></div>
        <div class="charwin-val charwin-hp"></div>
        <div class="charwin-val charwin-copper"></div>
        <div class="charwin-val charwin-silver"></div>
        <div class="charwin-val charwin-gold"></div>
      </div>`;
    const q = <T extends HTMLElement>(s: string): T => this.root.querySelector<T>(s)!;
    const avatarCanvas = q<HTMLCanvasElement>('.charwin-avatar');
    const bodyCanvas = q<HTMLCanvasElement>('.charwin-body');
    // Avatar no círculo (rosto e ombros) e personagem inteiro na caixa; ambos ficam atrás da moldura.
    place(avatarCanvas, 106, 34, 277, 195);
    place(bodyCanvas, 604, 228, 841, 555);
    this.avatar = new CharacterPreview(avatarCanvas, { still: true, bust: true });
    this.full = new CharacterPreview(bodyCanvas, { still: true });
    place(q('.charwin-title'), 470, 52, 1000, 122);
    place(q('.charwin-close'), 1290, 40, 1398, 142);
    place(q('.charwin-xp'), 600, 684, 1068, 705);
    place(q('.charwin-level'), 222, 750, 332, 784);
    place(q('.charwin-xptext'), 1090, 678, 1250, 710);
    place(q('.charwin-attack'), 630, 794, 780, 826);
    place(q('.charwin-hp'), 1050, 794, 1210, 826);
    place(q('.charwin-copper'), 600, 888, 716, 922);
    place(q('.charwin-silver'), 870, 888, 986, 922);
    place(q('.charwin-gold'), 1150, 888, 1266, 922);
    this.el = {
      title: q('.charwin-title'), level: q('.charwin-level'), xpFill: q('.charwin-xp-fill'), xpText: q('.charwin-xptext'),
      attack: q('.charwin-attack'), hp: q('.charwin-hp'), copper: q('.charwin-copper'), silver: q('.charwin-silver'), gold: q('.charwin-gold'),
    };
    q('.charwin-close').addEventListener('click', () => this.close());
    // Tocar fora da moldura fecha; dentro, não vaza para o jogo.
    this.root.addEventListener('pointerdown', (e) => { e.stopPropagation(); if (e.target === this.root) this.close(); });
    this.root.addEventListener('click', (e) => e.stopPropagation());
    parent.appendChild(this.root);
  }

  get isOpen(): boolean {
    return this.open_;
  }

  /** Abre com os números de agora (o jogo fica pausado enquanto o painel está aberto, então não precisa atualizar). */
  show(v: CharacterView): void {
    this.render(v);
    this.avatar.setBody(v.body);
    this.full.setBody(v.body);
    this.root.hidden = false;
    if (this.open_) return;
    this.open_ = true;
    this.avatar.start();
    this.full.start();
    this.h.onOpenChange(true);
  }

  close(): void {
    if (!this.open_) return;
    this.open_ = false;
    this.root.hidden = true;
    this.avatar.stop();
    this.full.stop();
    this.h.onOpenChange(false);
  }

  private render(v: CharacterView): void {
    const e = this.el;
    e.title.textContent = v.name;
    e.level.textContent = String(v.level);
    e.xpFill.style.width = `${Math.round(Math.max(0, Math.min(1, v.xp)) * 100)}%`;
    e.xpText.textContent = v.xpText;
    e.attack.textContent = String(v.attack);
    e.hp.textContent = `${v.hp} / ${v.maxHp}`;
    const c = splitCoins(v.copper);
    e.copper.textContent = String(c.copper);
    e.silver.textContent = String(c.silver);
    e.gold.textContent = String(c.gold);
  }

  destroy(): void {
    this.avatar.stop();
    this.full.stop();
    this.root.remove();
  }
}
