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
  /** Mundo com coleta: personagem (10), habilidades (11) e bolsa (12) depois dos 9 itens, após um separador. */
  menu?: { character: string; skills: string; bag: string; onSkills(): void; onBag(): void };
  /** Mostra a barra de vida (mundos com combate). */
  health?: boolean;
}

export class Hud {
  readonly root: HTMLElement;
  private readonly slots: HTMLButtonElement[] = [];
  private readonly bagButton: HTMLButtonElement | null = null;
  private readonly skillsButton: HTMLButtonElement | null = null;
  /** Painel acima dos 9 itens (mesma largura): bolsa ou receitas. */
  readonly bagSection: HTMLElement;
  readonly recipesSection: HTMLElement;
  /** Baú aberto (3×9), acima da bolsa. */
  readonly chestSection: HTMLElement;
  private readonly toastEl: HTMLElement;
  private toastTimer = 0;
  /** Card acima dos 3 botões do menu: profissões. */
  readonly professionsSection: HTMLElement;
  private selected = -1;
  private views: string[] = [];
  /** Barra de vida (preenchimento + "85 / 100"). */
  private readonly healthBar: HTMLElement;
  private readonly healthFill: HTMLElement;
  private readonly healthText: HTMLElement;
  private readonly hasHealth: boolean;
  private lastHealth = '';
  private readonly hungerBar: HTMLElement;
  private readonly hungerFill: HTMLElement;
  private lastHunger = '';

  constructor(h: HudHandlers) {
    this.root = document.createElement('div');
    this.root.className = 'hud';
    // Cartão em grade: coluna esquerda = painel de cima (baú/receitas) + 9 itens; coluna direita = profissões ou bolsa
    // + personagem/habilidades/bolsa. Separador vertical entre os 9 itens e os botões.
    const card = document.createElement('nav');
    card.className = 'hotbar';
    card.setAttribute('aria-label', 'Grade');
    const panel = (cls: string) => { const e = document.createElement('div'); e.className = `panel-section ${cls}`; e.hidden = true; return e; };
    this.bagSection = panel('bag-section');
    this.recipesSection = panel('recipes-section');
    this.chestSection = panel('chest-section');
    this.professionsSection = panel('professions-section');
    const top = document.createElement('div');
    top.className = 'hotbar-top';
    top.append(this.chestSection, this.recipesSection);
    // Coluna da direita (largura dos 3 botões): profissões ou bolsa (4 × 3).
    const side = document.createElement('div');
    side.className = 'hotbar-side';
    side.append(this.professionsSection, this.bagSection);
    card.append(top, side);
    const hotbar = document.createElement('div');
    hotbar.className = 'hotbar-row hand';
    card.appendChild(hotbar);
    for (let i = 0; i < h.slots; i++) {
      const b = document.createElement('button');
      b.className = 'slot';
      b.innerHTML = '<img alt=""><span class="count" hidden></span>';
      b.addEventListener('click', () => h.onSelect(i));
      hotbar.appendChild(b);
      this.slots.push(b);
    }
    if (h.menu) {
      const m = h.menu;
      const menu = document.createElement('div');
      menu.className = 'hotbar-row menu-row';
      const btn = (cls: string, icon: string, title: string, label: string, onClick?: () => void) => {
        const b = document.createElement('button');
        b.className = `slot ${cls}`;
        b.title = title;
        b.setAttribute('aria-label', label);
        b.innerHTML = `<img alt="" src="${icon}">`;
        if (onClick) b.addEventListener('click', onClick);
        else b.setAttribute('aria-disabled', 'true');
        menu.appendChild(b);
        return b;
      };
      btn('ui character', m.character, 'Personagem (em breve)', 'Personagem (em breve)');
      this.skillsButton = btn('ui skills', m.skills, 'Habilidades (K)', 'Abrir ou fechar habilidades e receitas', m.onSkills);
      this.bagButton = btn('ui bag', m.bag, 'Bolsa (B)', 'Abrir ou fechar a bolsa', m.onBag);
      card.appendChild(menu);
      card.classList.add('with-menu');
    }
    this.root.appendChild(card);
    this.hasHealth = !!h.health;
    const status = document.createElement('div');
    status.className = 'status';
    this.healthBar = document.createElement('div');
    this.healthBar.className = 'health';
    this.healthBar.setAttribute('role', 'meter');
    this.healthBar.innerHTML = '<span class="health-fill"></span><span class="health-text"></span>';
    this.healthFill = this.healthBar.querySelector('.health-fill')!;
    this.healthText = this.healthBar.querySelector('.health-text')!;
    status.appendChild(this.healthBar);
    // Fome (mundos com cultivo): logo abaixo da vida, sempre visível — esvazia com o tempo, comer enche.
    this.hungerBar = document.createElement('div');
    this.hungerBar.className = 'hunger';
    this.hungerBar.setAttribute('role', 'meter');
    this.hungerBar.innerHTML = '<span class="hunger-fill"></span><span class="hunger-text">Fome</span>';
    this.hungerBar.hidden = true;
    this.hungerFill = this.hungerBar.querySelector('.hunger-fill')!;
    status.appendChild(this.hungerBar);
    this.root.appendChild(status);
    this.toastEl = document.createElement('div');
    this.toastEl.className = 'toast';
    this.toastEl.setAttribute('role', 'status');
    this.toastEl.setAttribute('aria-live', 'polite');
    this.root.appendChild(this.toastEl);
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

  /** Destaca habilidades aberta (receitas + profissões). */
  setSkillsOpen(open: boolean): void {
    this.skillsButton?.classList.toggle('active', open);
    this.root.classList.toggle('skills-open', open);
  }

  /** Barra de fome (0..max, cheia = satisfeita); null esconde (mundo sem fome). */
  setHunger(value: number | null, max: number): void {
    this.hungerBar.hidden = value === null;
    if (value === null) return;
    const f = Math.max(0, Math.min(1, value / max));
    const key = `${Math.round(f * 100)}`;
    if (key === this.lastHunger) return;
    this.lastHunger = key;
    this.hungerFill.style.width = `${f * 100}%`;
    this.hungerBar.classList.toggle('low', f <= 0.3);
    this.hungerBar.classList.toggle('empty', f <= 0);
    this.hungerBar.setAttribute('aria-label', `Fome: ${Math.round(value)} de ${max}`);
    this.hungerBar.setAttribute('aria-valuenow', String(Math.round(value)));
    this.hungerBar.setAttribute('aria-valuemax', String(max));
  }

  /** Vida em pontos numa barra com número; `visible` mostra a barra (ferida ou na dungeon). */
  setHealth(hp: number, maxHp: number, visible: boolean): void {
    this.healthBar.classList.toggle('shown', visible && this.hasHealth);
    const key = `${hp}/${maxHp}`;
    if (key === this.lastHealth || !this.hasHealth) return;
    this.lastHealth = key;
    const f = maxHp > 0 ? Math.max(0, Math.min(1, hp / maxHp)) : 0;
    this.healthFill.style.width = `${f * 100}%`;
    this.healthBar.classList.toggle('low', f <= 0.3);
    this.healthText.textContent = `${Math.ceil(hp)} / ${maxHp}`;
    this.healthBar.setAttribute('aria-label', `Vida: ${Math.ceil(hp)} de ${maxHp}`);
    this.healthBar.setAttribute('aria-valuenow', String(Math.ceil(hp)));
    this.healthBar.setAttribute('aria-valuemax', String(maxHp));
  }

  /** Mensagem no alto da tela: some sozinha em ~2,5 s (falas longas ficam mais, para dar tempo de ler). */
  toast(text: string): void {
    this.toastEl.textContent = text;
    this.toastEl.classList.add('shown');
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => this.toastEl.classList.remove('shown'), 2500 + Math.max(0, text.length - 30) * 45);
  }

  /** Marca o espaço da mão escolhido para levar ao baú (-1 = nenhum). */
  setHandPicked(i: number): void {
    this.slots.forEach((b, k) => b.classList.toggle('picked', k === i));
  }

  /** Baú aberto: destaca e ativa o modo de troca. */
  setChestOpen(open: boolean): void {
    this.root.classList.toggle('chest-open', open);
  }

  destroy(): void {
    this.root.remove();
  }
}
