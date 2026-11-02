import { canCraft, PROFESSIONS, type ProfessionId, type Recipe, RECIPES, type StackId } from '../world/items';

/** Ícone e nome de uma pilha (resolvidos pelo Game com a arte do mundo). */
export type StackLook = (id: StackId) => { icon: string; name: string };

const RECIPE_ROWS = 4;
const RECIPE_COLS = 9;
const PROF_ROWS = 4;
const PROF_COLS = 2;

/**
 * Habilidades: à esquerda "Receitas" (4 fileiras de 9 espaços, acima dos 9 itens da mão), à direita "Profissões"
 * (4 fileiras de 2, acima dos 3 botões). Tocar numa receita cria 1 se houver os ingredientes (o Game faz a troca).
 * Receitas sem ingredientes ficam apagadas; o título do espaço mostra nome e ingredientes.
 */
export class SkillsPanel {
  private readonly recipeSlots: HTMLButtonElement[] = [];
  private open = false;
  profession: ProfessionId = 'builder';

  constructor(
    private readonly recipesEl: HTMLElement,
    private readonly professionsEl: HTMLElement,
    private readonly look: StackLook,
    private readonly onCraft: (r: Recipe) => void,
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
          if (rec) this.onCraft(rec);
        });
        row.appendChild(b);
        this.recipeSlots.push(b);
      }
      recipesEl.appendChild(row);
    }
    professionsEl.innerHTML = '<h2>Profissões</h2>';
    for (let r = 0; r < PROF_ROWS; r++) {
      const row = document.createElement('div');
      row.className = 'hotbar-row';
      for (let c = 0; c < PROF_COLS; c++) {
        const p = PROFESSIONS[r * PROF_COLS + c];
        const b = document.createElement('button');
        b.className = p ? 'slot profession active' : 'slot vacant';
        b.title = p ? p.name : '';
        b.setAttribute('aria-label', p ? `Profissão: ${p.name}` : 'Profissão ainda não disponível');
        b.innerHTML = p ? `<img alt="" src="${professionIcon(p.id)}">` : '';
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
    this.recipesEl.hidden = !open;
    this.professionsEl.hidden = !open;
  }

  private recipes(): Recipe[] {
    return RECIPES.filter((r) => r.profession === this.profession);
  }

  /** Redesenha as receitas com o que a heroína tem agora. */
  render(count: (id: StackId) => number): void {
    const list = this.recipes();
    this.recipeSlots.forEach((b, i) => {
      const r = list[i];
      const img = b.querySelector('img')!;
      const badge = b.querySelector<HTMLElement>('.count')!;
      b.classList.toggle('vacant', !r);
      b.classList.toggle('unavailable', !!r && !canCraft(r, count));
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
      b.title = `${r.name} ×${r.output.count}: ${ing}`;
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
