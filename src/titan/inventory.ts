import { isItem, maxStack } from './items';
import { matchGrid, type Recipe, type Stackable } from './recipes';

/**
 * Inventário do Titã (ADR 0040, 0047): hotbar de **9** espaços (índices 0–8) + mochila de **27** (9–35, 3 × 9 alinhada à hotbar) + grade de fabricação 2 × 2 (36–39).
 * Sem DOM. Toda regra de espaço e quantidade fica aqui; a interface só chama estes métodos. Não existe descarte: nada se perde. A fabricação (`tryCraft`) é atômica: débito e resultado juntos, ou nada.
 */
export const HOTBAR = 9;
export const BAG = 27;
export const SLOTS = HOTBAR + BAG; // 36
/** Layout anterior (até o save v4, ADR 0040): 7 + 24 + grade. A migração leva cada seção para o novo lugar (`Inventory.fromData`). */
export const OLD_HOTBAR = 7, OLD_BAG = 24;
export const CRAFT_SLOTS = 4;
export const CRAFT_START = SLOTS; // 31..34
export const OUTPUT = CRAFT_START + CRAFT_SLOTS; // 40: resultado (virtual)

export interface Stack { item: number; count: number }
export interface InventoryData { v: 1 | 2; slots: Array<[number, number] | null>; craft: Array<[number, number] | null> }

export class Inventory {
  /** hotbar + mochila + grade (índices 0–34). */
  private readonly s: Array<Stack | null> = new Array(SLOTS + CRAFT_SLOTS).fill(null);
  /** Sobe a cada mudança (o save compara com a revisão gravada). */
  rev = 0;

  /** Inventário inicial: **vazio** (ADR 0045: o jogador chega de mãos vazias; a cápsula saiu, o id 7 fica reservado). */
  static starting(): Inventory { return new Inventory(); }

  get(slot: number): Stack | null { return this.s[slot] ? { ...this.s[slot]! } : null; }
  /** Quantidade total de um item na hotbar e na mochila (a grade não conta). */
  total(item: number): number { let n = 0; for (let i = 0; i < SLOTS; i++) if (this.s[i]?.item === item) n += this.s[i]!.count; return n; }

  /** Quanto de `item` ainda cabe (pilhas parciais + espaços vazios). */
  room(item: number): number {
    const m = maxStack(item);
    let r = 0;
    for (let i = 0; i < SLOTS; i++) { const c = this.s[i]; r += c ? (c.item === item ? m - c.count : 0) : m; }
    return r;
  }
  canAdd(item: number, count = 1): boolean { return this.room(item) >= count; }

  /** Põe `count` de `item` (completa pilhas da hotbar e da mochila, depois espaços vazios). Tudo ou nada: sem espaço, não muda nada e devolve false. */
  add(item: number, count = 1): boolean {
    if (!isItem(item) || count < 1 || !this.canAdd(item, count)) return false;
    const m = maxStack(item);
    let left = count;
    for (let i = 0; i < SLOTS && left > 0; i++) {
      const c = this.s[i];
      if (c && c.item === item && c.count < m) { const t = Math.min(m - c.count, left); c.count += t; left -= t; }
    }
    for (let i = 0; i < SLOTS && left > 0; i++) {
      if (!this.s[i]) { const t = Math.min(m, left); this.s[i] = { item, count: t }; left -= t; }
    }
    this.rev++;
    return true;
  }

  /** Gasta 1 do espaço (colocar bloco/lanterna). */
  consume(slot: number): boolean {
    const c = this.s[slot];
    if (!c) return false;
    if (--c.count <= 0) this.s[slot] = null;
    this.rev++;
    return true;
  }

  /**
   * Move/une/troca entre dois espaços (0–34; a saída 35 só sai; para a grade de fabricação vai 1 de cada vez). Vazio → move; mesmo item empilhável → une até o limite (o resto fica na origem);
   * item diferente → troca. Devolve se algo mudou.
   */
  move(from: number, to: number): boolean {
    if (from === to || from < 0 || from >= OUTPUT || to < 0 || to >= OUTPUT) return false;
    const a = this.s[from], b = this.s[to];
    if (!a) return false;
    if (to >= CRAFT_START && a.count > 1) {
      // na grade de fabricação entra 1 por vez (a receita usa 1 de cada)
      if (b && (b.item !== a.item || b.count >= maxStack(a.item))) return false;
      if (b) b.count++; else this.s[to] = { item: a.item, count: 1 };
      a.count--;
    } else if (!b) { this.s[to] = a; this.s[from] = null; }
    else if (a.item === b.item) {
      const m = maxStack(a.item), t = Math.min(m - b.count, a.count);
      if (t <= 0) return false;
      b.count += t; a.count -= t;
      if (a.count <= 0) this.s[from] = null;
    } else { this.s[to] = a; this.s[from] = b; }
    this.rev++;
    return true;
  }

  // ---- Fabricação ----
  /** Débito simulado: copia dos espaços (hotbar + mochila) depois de tirar os ingredientes, ou `null` se faltar algum. Tira da mochila antes da hotbar, das pilhas menores primeiro. */
  private debited(ingredients: readonly Stackable[]): Array<Stack | null> | null {
    const copy = this.s.map((c) => (c ? { ...c } : null));
    for (const g of ingredients) {
      let left = g.count;
      const order = [...Array(SLOTS).keys()].filter((i) => copy[i]?.item === g.item).sort((a, b) => (a >= HOTBAR ? 0 : 1) - (b >= HOTBAR ? 0 : 1) || copy[a]!.count - copy[b]!.count || b - a);
      for (const i of order) {
        const c = copy[i]!, t = Math.min(c.count, left);
        c.count -= t; left -= t;
        if (c.count <= 0) copy[i] = null;
        if (left === 0) break;
      }
      if (left > 0) return null;
    }
    return copy;
  }

  /** Quanto de `item` cabe numa cópia dos espaços (mesma regra de `room`). */
  private static roomIn(copy: ReadonlyArray<Stack | null>, item: number): number {
    const m = maxStack(item);
    let r = 0;
    for (let i = 0; i < SLOTS; i++) { const c = copy[i]; r += c ? (c.item === item ? m - c.count : 0) : m; }
    return r;
  }

  /** Dá para fabricar? Tem os ingredientes e, **depois dos débitos**, o resultado cabe. Não muda nada. */
  canCraft(ingredients: readonly Stackable[], result: Stackable): boolean {
    const d = this.debited(ingredients);
    return !!d && Inventory.roomIn(d, result.item) >= result.count;
  }

  /** Fabrica de forma atômica: consumo e resultado numa operação só. Falhou → as pilhas ficam como estavam e devolve o motivo. */
  tryCraft(ingredients: readonly Stackable[], result: Stackable): 'ok' | 'missing' | 'full' {
    const d = this.debited(ingredients);
    if (!d) return 'missing';
    if (Inventory.roomIn(d, result.item) < result.count) return 'full';
    for (let i = 0; i < SLOTS; i++) this.s[i] = d[i];
    this.add(result.item, result.count); // cabe: conferido acima (sobe a revisão)
    return 'ok';
  }

  /** Receita pessoal formada pela grade 2 × 2 (1 por espaço, qualquer disposição), ou `null`. */
  craftRecipe(): Recipe | null {
    const items: number[] = [];
    for (let i = 0; i < CRAFT_SLOTS; i++) { const c = this.s[CRAFT_START + i]; if (c) { if (c.count !== 1) return null; items.push(c.item); } }
    return items.length ? matchGrid(items) : null;
  }
  craftResult(): Stackable | null { const r = this.craftRecipe(); return r ? { ...r.result } : null; }

  /** Pegar o resultado da grade: precisa caber na hotbar/mochila (a grade esvazia, então os ingredientes não ocupam mais espaço); consome a grade. Sem espaço ou sem receita, nada muda. */
  takeResult(): boolean {
    const r = this.craftResult();
    if (!r || !this.canAdd(r.item, r.count)) return false;
    for (let i = 0; i < CRAFT_SLOTS; i++) this.s[CRAFT_START + i] = null;
    return this.add(r.item, r.count);
  }

  /** Troca todas as pilhas de `from` por `to` (hotbar, mochila e grade), uma a uma e com a mesma quantidade. Devolve quantas unidades trocou. Usado na migração da cápsula (ADR 0045). */
  convertItem(from: number, to: number): number {
    let n = 0;
    for (let i = 0; i < this.s.length; i++) { const c = this.s[i]; if (c && c.item === from) { n += c.count; this.s[i] = { item: to, count: Math.min(c.count, maxStack(to)) }; } }
    if (n) this.rev++;
    return n;
  }

  /** Ao fechar a mochila: devolve o que está na grade à hotbar/mochila (cabe sempre: os itens vieram de lá). Devolve se tudo voltou. */
  returnCraft(): boolean {
    let ok = true;
    for (let i = 0; i < CRAFT_SLOTS; i++) {
      const c = this.s[CRAFT_START + i];
      if (!c) continue;
      this.s[CRAFT_START + i] = null;
      if (!this.add(c.item, c.count)) { this.s[CRAFT_START + i] = c; ok = false; }
    }
    return ok; // `add` já sobe a revisão; sem nada na grade, nada muda
  }

  // ---- Save ----
  toData(): InventoryData {
    const pack = (c: Stack | null): [number, number] | null => (c ? [c.item, c.count] : null);
    return { v: 2, slots: this.s.slice(0, SLOTS).map(pack), craft: this.s.slice(SLOTS, SLOTS + CRAFT_SLOTS).map(pack) };
  }

  /** Lê um registro gravado, descartando o que não for válido (item desconhecido, contagem fora do limite). */
  static fromData(d: unknown): Inventory {
    const inv = new Inventory();
    const o = d as Partial<InventoryData> | null;
    const read = (arr: unknown, n: number, off: number): void => {
      if (!Array.isArray(arr)) return;
      for (let i = 0; i < n && i < arr.length; i++) {
        const e = arr[i] as [number, number] | null;
        if (Array.isArray(e) && isItem(e[0]) && Number.isInteger(e[1]) && e[1] >= 1 && e[1] <= maxStack(e[0])) inv.s[off + i] = { item: e[0], count: e[1] };
      }
    };
    if (o?.v === 1) {
      // migração por seção (ADR 0047): os 7 espaços antigos da hotbar vão para 1–7 (8–9 vazios) e os 24 da bolsa para o novo início da grade (9–32); a grade 2 × 2 não muda de conteúdo
      read(Array.isArray(o.slots) ? o.slots.slice(0, OLD_HOTBAR) : [], OLD_HOTBAR, 0);
      read(Array.isArray(o.slots) ? o.slots.slice(OLD_HOTBAR, OLD_HOTBAR + OLD_BAG) : [], OLD_BAG, HOTBAR);
    } else read(o?.slots, SLOTS, 0);
    read(o?.craft, CRAFT_SLOTS, SLOTS);
    return inv;
  }
}
