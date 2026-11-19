import { isItem, Item, LANTERN_RECIPE, maxStack } from './items';

/**
 * Inventário do Titã (ADR 0040): hotbar de 7 espaços (índices 0–6) + mochila de 24 (7–30, 4 fileiras de 6) + grade de fabricação 2 × 2 (31–34).
 * Sem DOM. Toda regra de espaço e quantidade fica aqui; a interface só chama estes métodos. Não existe descarte: cápsula e lanterna nunca se perdem.
 */
export const HOTBAR = 7;
export const BAG = 24;
export const SLOTS = HOTBAR + BAG; // 31
export const CRAFT_SLOTS = 4;
export const CRAFT_START = SLOTS; // 31..34
export const OUTPUT = CRAFT_START + CRAFT_SLOTS; // 35: resultado (virtual)

export interface Stack { item: number; count: number }
export interface InventoryData { v: 1; slots: Array<[number, number] | null>; craft: Array<[number, number] | null> }

export class Inventory {
  /** hotbar + mochila + grade (índices 0–34). */
  private readonly s: Array<Stack | null> = new Array(SLOTS + CRAFT_SLOTS).fill(null);
  /** Sobe a cada mudança (o save compara com a revisão gravada). */
  rev = 0;

  /** Inventário inicial: só a cápsula de luz (briefing: "a cápsula inicial"). */
  static starting(): Inventory { const i = new Inventory(); i.s[HOTBAR] = { item: Item.CAPSULE, count: 1 }; return i; }

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

  // ---- Fabricação 2 × 2 ----
  /** Resultado da grade: 1 lanterna se a grade tem exatamente cápsula + fragmento de rocha + fragmento de gelo (1 de cada, qualquer disposição). */
  craftResult(): number | null {
    const items: number[] = [];
    for (let i = 0; i < CRAFT_SLOTS; i++) { const c = this.s[CRAFT_START + i]; if (c) { if (c.count !== 1) return null; items.push(c.item); } }
    if (items.length !== LANTERN_RECIPE.length) return null;
    return LANTERN_RECIPE.every((r) => items.includes(r)) ? Item.LANTERN : null;
  }

  /** Botão da receita: leva 1 cápsula, 1 fragmento de rocha e 1 de gelo da hotbar/mochila à grade (precisa de grade vazia e dos três itens). */
  fillRecipe(): boolean {
    for (let i = 0; i < CRAFT_SLOTS; i++) if (this.s[CRAFT_START + i]) return false;
    if (!LANTERN_RECIPE.every((r) => this.total(r) >= 1)) return false;
    LANTERN_RECIPE.forEach((r, k) => {
      for (let i = 0; i < SLOTS; i++) {
        const c = this.s[i];
        if (c && c.item === r) { if (--c.count <= 0) this.s[i] = null; break; }
      }
      this.s[CRAFT_START + k] = { item: r, count: 1 };
    });
    this.rev++;
    return true;
  }

  /** Pegar o resultado: precisa caber na hotbar/mochila; consome os ingredientes da grade. Sem espaço ou sem receita, não muda nada. */
  takeResult(): boolean {
    const r = this.craftResult();
    if (r === null || !this.canAdd(r, 1)) return false;
    for (let i = 0; i < CRAFT_SLOTS; i++) this.s[CRAFT_START + i] = null;
    return this.add(r, 1);
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
    return { v: 1, slots: this.s.slice(0, SLOTS).map(pack), craft: this.s.slice(SLOTS, SLOTS + CRAFT_SLOTS).map(pack) };
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
    read(o?.slots, SLOTS, 0);
    read(o?.craft, CRAFT_SLOTS, SLOTS);
    return inv;
  }
}
