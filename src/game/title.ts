import { CharacterPreview } from '../render/characterPreview';
import {
  defaultLook, LOOK_SLOTS, lookOptions, pieceLabel, randomLook, type ModularLook, type ModularManifest,
} from '../render/modular';
import { sanitizeName } from '../net/protocol';
import { HERO_BODIES, HERO_NAMES, type HeroBody } from './entities';

/**
 * Tela de entrada (antes do mundo): título, "Novo jogo" e "Continuar" (só com jogo salvo no aparelho), e a montagem
 * do personagem depois de "Novo jogo". Só interface: quem cria o mundo é o `main.ts` (pelos callbacks), e a
 * aparência escolhida vai para o `Game` → `Entities.look` → salvamento. O fundo é o próprio jogo em modo vitrine.
 * Reservado para depois: "Jogar com amigos" e "Entrar" (cadastro no backend do Orvalis, ADR 0015).
 */

export interface TitleHandlers {
  /** Há jogo salvo para continuar? */
  canContinue: boolean;
  /** Nome lembrado no aparelho (o mesmo do multiplayer). */
  name: string;
  /** Peças do chibi; ausente = só a heroína (mundo sem personagem modular). */
  manifest?: ModularManifest;
  onContinue(): void;
  /** Começar um mundo novo com a aparência (null = personagem pronto `body`) e o nome escolhidos. */
  onStart(look: ModularLook | null, name: string, body: HeroBody): void;
  /** Abrir direto na escolha de personagem ("Novo mundo" no menu do jogo); "Voltar" chama `onBack`. */
  creatorOnly?: boolean;
  onBack?(): void;
}

type Kind = HeroBody | 'chibi';

export class TitleScreen {
  private readonly root: HTMLElement;
  private readonly preview: CharacterPreview;
  private kind: Kind;
  private look: ModularLook;

  constructor(private readonly h: TitleHandlers) {
    this.kind = h.manifest ? 'chibi' : 'heroine';
    this.look = h.manifest ? defaultLook(h.manifest) : {};
    this.root = document.createElement('div');
    this.root.className = 'title-screen';
    this.root.innerHTML = `
      <section class="title-main">
        <h1>Orvalis</h1>
        <p class="title-tagline">Explore, construa e cultive num mundo de blocos.</p>
        <button data-act="new" class="primary">Novo jogo</button>
        ${h.canContinue ? '<button data-act="continue">Continuar</button>' : ''}
        <p class="title-soon">Em breve: jogar com amigos e entrar com sua conta.</p>
      </section>
      <section class="title-creator" hidden>
        <div class="title-preview"><canvas aria-label="Prévia do personagem"></canvas></div>
        <div class="title-options">
          <h2>Seu personagem</h2>
          <div class="title-kind" role="radiogroup" aria-label="Personagem">
            ${h.manifest ? '<button data-kind="chibi" role="radio">Chibi</button>' : ''}
            ${HERO_BODIES.map((b) => `<button data-kind="${b}" role="radio">${HERO_NAMES[b]}</button>`).join('')}
          </div>
          <div class="title-pieces">${h.manifest ? LOOK_SLOTS.map((s) => `
            <div class="title-piece" data-slot="${s}">
              <span class="title-piece-name">${SLOT_NAMES[s]}</span>
              <button data-step="-1" aria-label="${SLOT_NAMES[s]} anterior">‹</button>
              <span class="title-piece-value"></span>
              <button data-step="1" aria-label="Próximo ${SLOT_NAMES[s].toLowerCase()}">›</button>
            </div>`).join('') : ''}
          </div>
          <input class="title-name" maxlength="16" placeholder="Seu nome (opcional)" autocomplete="nickname" aria-label="Nome">
          <div class="title-actions">
            <button data-act="back">Voltar</button>
            ${h.manifest ? '<button data-act="random">Sortear</button>' : ''}
            <button data-act="start" class="primary">Começar</button>
          </div>
        </div>
      </section>`;
    (this.root.querySelector('.title-name') as HTMLInputElement).value = h.name;
    this.preview = new CharacterPreview(this.root.querySelector('canvas')!);
    this.root.addEventListener('click', (e) => this.onClick(e.target as HTMLElement));
    document.body.appendChild(this.root);
    this.refresh();
    if (h.creatorOnly) this.showCreator(true);
  }

  destroy(): void {
    this.preview.stop();
    this.root.remove();
  }

  private onClick(el: HTMLElement): void {
    const btn = el.closest('button');
    if (!btn) return;
    const act = btn.dataset.act;
    if (act === 'continue') this.h.onContinue();
    if (act === 'new') this.showCreator(true);
    if (act === 'back') {
      if (this.h.creatorOnly) this.h.onBack?.();
      else this.showCreator(false);
    }
    if (act === 'random' && this.h.manifest) {
      this.kind = 'chibi';
      this.look = randomLook(this.h.manifest, Math.random);
      this.refresh();
    }
    if (act === 'start') {
      const name = sanitizeName((this.root.querySelector('.title-name') as HTMLInputElement).value) ?? '';
      this.h.onStart(this.kind === 'chibi' ? { ...this.look } : null, name, this.body);
    }
    const kind = btn.dataset.kind as Kind | undefined;
    if (kind) {
      this.kind = kind;
      this.refresh();
    }
    const step = Number(btn.dataset.step);
    const slot = btn.closest<HTMLElement>('.title-piece')?.dataset.slot;
    if (step && slot && this.h.manifest) {
      const opts = lookOptions(this.h.manifest, slot);
      const i = opts.indexOf(this.look[slot] ?? null);
      const next = opts[(i + step + opts.length) % opts.length];
      if (next) this.look[slot] = next;
      else delete this.look[slot];
      this.kind = 'chibi';
      this.refresh();
    }
  }

  /** Personagem pronto escolhido (o chibi usa a folha da Heroína por baixo). */
  private get body(): HeroBody {
    return this.kind === 'chibi' ? 'heroine' : this.kind;
  }

  private showCreator(on: boolean): void {
    (this.root.querySelector('.title-main') as HTMLElement).hidden = on;
    (this.root.querySelector('.title-creator') as HTMLElement).hidden = !on;
    if (on) this.preview.start();
    else this.preview.stop();
  }

  private refresh(): void {
    this.preview.setLook(this.kind === 'chibi' ? this.look : null, this.body);
    for (const b of this.root.querySelectorAll<HTMLButtonElement>('[data-kind]')) {
      b.setAttribute('aria-checked', String(b.dataset.kind === this.kind));
    }
    const pieces = this.root.querySelector<HTMLElement>('.title-pieces');
    if (pieces) pieces.classList.toggle('off', this.kind !== 'chibi');
    for (const row of this.root.querySelectorAll<HTMLElement>('.title-piece')) {
      const slot = row.dataset.slot!;
      row.querySelector('.title-piece-value')!.textContent = pieceLabel(slot, this.look[slot] ?? null);
    }
  }
}

const SLOT_NAMES: Record<string, string> = { cabelo: 'Cabelo', tronco: 'Roupa', pernas: 'Pernas', pes: 'Pés' };
