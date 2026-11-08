import { CharacterPreview } from '../render/characterPreview';
import { sanitizeName } from '../net/protocol';
import { HERO_BODIES, HERO_NAMES, type HeroBody } from './entities';

/**
 * Tela de entrada (antes do mundo): título, "Novo jogo" e "Continuar" (só com jogo salvo no aparelho), e a montagem
 * do personagem depois de "Novo jogo". Só interface: quem cria o mundo é o `main.ts` (pelos callbacks), e a
 * personagem escolhido vai para o `Game` → `Entities.body` → salvamento. O fundo é o próprio jogo em modo vitrine.
 * Reservado para depois: "Jogar com amigos" e "Entrar" (cadastro no backend do Orvalis, ADR 0015).
 */

export interface TitleHandlers {
  /** Há jogo salvo para continuar? */
  canContinue: boolean;
  /** Nome lembrado no aparelho (o mesmo do multiplayer). */
  name: string;
  onContinue(): void;
  /** Começar um mundo novo com o personagem e o nome escolhidos. */
  onStart(name: string, body: HeroBody): void;
  /** Abrir direto na escolha de personagem ("Novo mundo" no menu do jogo); "Voltar" chama `onBack`. */
  creatorOnly?: boolean;
  onBack?(): void;
}

export class TitleScreen {
  private readonly root: HTMLElement;
  private readonly preview: CharacterPreview;
  private body: HeroBody = 'heroine';

  constructor(private readonly h: TitleHandlers) {
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
            ${HERO_BODIES.map((b) => `<button data-kind="${b}" role="radio">${HERO_NAMES[b]}</button>`).join('')}
          </div>
          <input class="title-name" maxlength="16" placeholder="Seu nome (opcional)" autocomplete="nickname" aria-label="Nome">
          <div class="title-actions">
            <button data-act="back">Voltar</button>
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
    if (act === 'start') {
      const name = sanitizeName((this.root.querySelector('.title-name') as HTMLInputElement).value) ?? '';
      this.h.onStart(name, this.body);
    }
    const kind = btn.dataset.kind as HeroBody | undefined;
    if (kind) {
      this.body = kind;
      this.refresh();
    }
  }

  private showCreator(on: boolean): void {
    (this.root.querySelector('.title-main') as HTMLElement).hidden = on;
    (this.root.querySelector('.title-creator') as HTMLElement).hidden = !on;
    if (on) this.preview.start();
    else this.preview.stop();
  }

  private refresh(): void {
    this.preview.setBody(this.body);
    for (const b of this.root.querySelectorAll<HTMLButtonElement>('[data-kind]')) {
      b.setAttribute('aria-checked', String(b.dataset.kind === this.body));
    }
  }
}
