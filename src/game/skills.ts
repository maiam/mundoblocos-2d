import { blockDef, type BlockId } from '../world/blocks';
import { blockStack, canCraft, PROFESSIONS, type ProfessionId, type Recipe, RECIPES, type StackId } from '../world/items';

/** Ícone e nome de uma pilha (resolvidos pelo Game com a arte do mundo). */
export type StackLook = (id: StackId) => { icon: string; name: string };

const RECIPE_ROWS = 4;
const RECIPE_COLS = 9;
const PROF_ROWS = 4;
const PROF_COLS = 2;

/** Para onde vai o que a receita cria: mão, bolsa, ou null se não há lugar. */
export type RecipeDestination = 'mão' | 'bolsa' | null;

/**
 * Habilidades: à esquerda "Receitas" (4 fileiras de 9 espaços, acima dos 9 itens da mão), à direita "Profissões"
 * (4 fileiras de 2, acima dos 3 botões). Tocar numa receita abre a **ficha** dela no lugar da lista: ícone grande,
 * ingredientes "tem / precisa", estação, para onde o item vai e Confirmar/Cancelar — e o Game mostra a bolsa à direita
 * (`onDetail`), para ver o item entrar. Receitas sem ingredientes ficam apagadas na lista.
 */
export class SkillsPanel {
  private readonly recipeSlots: HTMLButtonElement[] = [];
  private readonly professionSlots = new Map<ProfessionId, HTMLButtonElement>();
  private open = false;
  profession: ProfessionId = 'builder';
  /** Último estado usado para desenhar (para redesenhar ao trocar de profissão). */
  private lastCount: ((id: StackId) => number) | null = null;
  private lastNear: (id: BlockId) => boolean = () => true;
  /** Receita com a ficha aberta (null = lista). */
  private selected: Recipe | null = null;
  private readonly detail: HTMLElement;

  constructor(
    private readonly recipesEl: HTMLElement,
    private readonly professionsEl: HTMLElement,
    private readonly look: StackLook,
    private readonly onCraft: (r: Recipe) => void,
    /** Ficha aberta/fechada (o Game mostra a bolsa no lugar das profissões). */
    private readonly onDetail: (open: boolean) => void = () => {},
    /** Para onde vai o item criado (mão/bolsa/sem lugar). */
    private readonly destination: (r: Recipe) => RecipeDestination = () => 'bolsa',
    /** Ícones da mão e da bolsa (para "vai para" sem depender de leitura). */
    private readonly destIcons: { hand: string; bag: string } = { hand: '', bag: '' },
  ) {
    recipesEl.innerHTML = '<h2>Receitas</h2>';
    for (let r = 0; r < RECIPE_ROWS; r++) {
      const row = document.createElement('div');
      row.className = 'hotbar-row';
      for (let c = 0; c < RECIPE_COLS; c++) {
        const b = document.createElement('button');
        b.className = 'slot vacant';
        b.innerHTML = '<img alt="" hidden><span class="count" hidden></span>';
        const i = this.recipeSlots.length;
        b.addEventListener('click', () => {
          const rec = this.recipes()[i];
          if (rec) this.openDetail(rec);
        });
        row.appendChild(b);
        this.recipeSlots.push(b);
      }
      recipesEl.appendChild(row);
    }
    this.detail = document.createElement('div');
    this.detail.className = 'recipe-detail';
    this.detail.hidden = true;
    this.detail.innerHTML = `
      <div class="recipe-big"><img alt=""><span class="count" hidden></span></div>
      <div class="recipe-info">
        <h3></h3>
        <ul class="recipe-ings"></ul>
        <p class="recipe-meta"></p>
        <div class="recipe-actions">
          <button type="button" class="confirm" aria-label="Criar"><span class="ico" aria-hidden="true">✓</span><span>Criar</span></button>
          <button type="button" class="cancel" aria-label="Voltar"><span class="ico" aria-hidden="true">✕</span><span>Voltar</span></button>
        </div>
      </div>`;
    this.detail.querySelector('.confirm')!.addEventListener('click', () => {
      if (this.selected) this.onCraft(this.selected);
    });
    this.detail.querySelector('.cancel')!.addEventListener('click', () => this.closeDetail());
    recipesEl.appendChild(this.detail);
    professionsEl.innerHTML = '<h2>Profissões</h2>';
    for (let r = 0; r < PROF_ROWS; r++) {
      const row = document.createElement('div');
      row.className = 'hotbar-row';
      for (let c = 0; c < PROF_COLS; c++) {
        const p = PROFESSIONS[r * PROF_COLS + c];
        const b = document.createElement('button');
        b.className = p ? `slot profession${p.id === this.profession ? ' active' : ''}` : 'slot vacant';
        b.title = p ? p.name : '';
        b.setAttribute('aria-label', p ? `Profissão: ${p.name}` : 'Profissão ainda não disponível');
        b.innerHTML = p ? `<img alt="" src="${professionIcon(p.id)}">` : '';
        if (p) {
          this.professionSlots.set(p.id, b);
          // Tocar numa profissão mostra as receitas dela.
          b.addEventListener('click', () => this.selectProfession(p.id));
        }
        row.appendChild(b);
      }
      professionsEl.appendChild(row);
    }
  }

  get isOpen(): boolean {
    return this.open;
  }

  setOpen(open: boolean): void {
    this.open = open;
    if (!open && this.selected) this.closeDetail();
    this.recipesEl.hidden = !open;
    this.professionsEl.hidden = !open;
  }

  /** Ficha de receita aberta? */
  get detailOpen(): boolean {
    return this.selected !== null;
  }

  private openDetail(r: Recipe): void {
    this.selected = r;
    this.detail.hidden = false;
    this.recipesEl.classList.add('detail');
    this.recipesEl.querySelector('h2')!.textContent = 'Criar';
    this.professionsEl.hidden = true;
    this.onDetail(true);
    if (this.lastCount) this.render(this.lastCount, this.lastNear);
  }

  /** Volta para a lista de receitas (Cancelar, Esc ou ao fechar o painel). */
  closeDetail(): void {
    if (!this.selected) return;
    this.selected = null;
    this.detail.hidden = true;
    this.recipesEl.classList.remove('detail');
    this.recipesEl.querySelector('h2')!.textContent = 'Receitas';
    this.professionsEl.hidden = !this.open;
    this.onDetail(false);
  }

  /** Ficha: ícone, ingredientes tem/precisa, estação, destino e Confirmar (só ativo quando dá para fazer). */
  private renderDetail(r: Recipe, count: (id: StackId) => number, nearStation: (id: BlockId) => boolean): void {
    const d = this.detail;
    const out = this.look(r.output.item);
    const img = d.querySelector<HTMLImageElement>('.recipe-big img')!;
    if (img.getAttribute('src') !== out.icon) img.src = out.icon;
    const badge = d.querySelector<HTMLElement>('.recipe-big .count')!;
    badge.hidden = r.output.count <= 1;
    badge.textContent = String(r.output.count);
    d.querySelector('h3')!.textContent = r.output.count > 1 ? `${r.name} ×${r.output.count}` : r.name;
    const ings = d.querySelector('.recipe-ings')!;
    ings.innerHTML = '';
    for (const i of r.inputs) {
      const l = this.look(i.item);
      const have = count(i.item);
      const li = document.createElement('li');
      li.className = have >= i.count ? 'ok' : 'miss';
      li.innerHTML = '<img alt=""><span></span><b></b>';
      li.querySelector('img')!.src = l.icon;
      li.querySelector('span')!.textContent = l.name;
      li.querySelector('b')!.textContent = `${have} / ${i.count}`;
      li.title = `${l.name}: tem ${have}, precisa ${i.count}`;
      ings.appendChild(li);
    }
    // Estação e destino como ícones (crianças que ainda não leem): caldeirão ✓/✗ e → mão/bolsa.
    const meta = d.querySelector('.recipe-meta')!;
    meta.innerHTML = '';
    const chip = (icon: string, mark: string, ok: boolean, label: string) => {
      const c = document.createElement('span');
      c.className = `recipe-chip ${ok ? 'ok' : 'miss'}`;
      c.title = label;
      c.setAttribute('aria-label', label);
      c.innerHTML = '<img alt=""><b aria-hidden="true"></b>';
      c.querySelector('img')!.src = icon;
      c.querySelector('b')!.textContent = mark;
      meta.appendChild(c);
    };
    if (r.station !== undefined) {
      const near = nearStation(r.station);
      const name = blockDef(r.station).name;
      chip(this.look(blockStack(r.station)).icon, near ? '✓' : '✗', near, near ? `Perto de um ${name}` : `Precisa estar perto de um ${name}`);
    }
    const dest = this.destination(r);
    if (dest) chip(dest === 'mão' ? this.destIcons.hand : this.destIcons.bag, '→', true, `Vai para a ${dest}`);
    else chip(this.destIcons.bag, '✗', false, 'Sem lugar na mão nem na bolsa');
    (d.querySelector('.confirm') as HTMLButtonElement).disabled = !canCraft(r, count, nearStation) || !dest;
  }

  selectProfession(id: ProfessionId): void {
    this.closeDetail();
    this.profession = id;
    for (const [pid, b] of this.professionSlots) b.classList.toggle('active', pid === id);
    if (this.lastCount) this.render(this.lastCount, this.lastNear);
  }

  private recipes(): Recipe[] {
    return RECIPES.filter((r) => r.profession === this.profession);
  }

  /** Redesenha as receitas com o que a heroína tem agora; `nearStation` = a estação pedida está perto? */
  render(count: (id: StackId) => number, nearStation: (id: BlockId) => boolean = () => true): void {
    this.lastCount = count;
    this.lastNear = nearStation;
    if (this.selected) this.renderDetail(this.selected, count, nearStation);
    const list = this.recipes();
    this.recipeSlots.forEach((b, i) => {
      const r = list[i];
      const img = b.querySelector('img')!;
      const badge = b.querySelector<HTMLElement>('.count')!;
      b.classList.toggle('vacant', !r);
      b.classList.toggle('unavailable', !!r && !canCraft(r, count, nearStation));
      img.hidden = !r;
      badge.hidden = !r || r.output.count <= 1;
      if (!r) {
        b.title = '';
        b.setAttribute('aria-label', 'Espaço de receita vazio');
        return;
      }
      const out = this.look(r.output.item);
      if (img.getAttribute('src') !== out.icon) img.src = out.icon;
      badge.textContent = String(r.output.count);
      const ing = r.inputs.map((x) => `${x.count} ${this.look(x.item).name} (tem ${count(x.item)})`).join(' + ');
      const where = r.station !== undefined ? ` · perto de um ${blockDef(r.station).name}${nearStation(r.station) ? '' : ' (longe)'}` : '';
      b.title = `${r.name} ×${r.output.count}: ${ing}${where}`;
      b.setAttribute('aria-label', `Criar ${r.output.count} ${r.name} com ${ing}`);
    });
  }
}

/** Ícone de cada profissão (preenchido pelo Game com o pacote de arte). */
const PROFESSION_ICONS: Partial<Record<ProfessionId, string>> = {};
export function setProfessionIcon(id: ProfessionId, url: string): void {
  PROFESSION_ICONS[id] = url;
}
function professionIcon(id: ProfessionId): string {
  return PROFESSION_ICONS[id] ?? '';
}
