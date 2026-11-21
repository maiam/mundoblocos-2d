import { isItem, maxStack } from './items';
import { maxDurability } from './wear';
import { matchBench, type Recipe, type Stackable, type Station, stationMet } from './recipes';

/**
 * Inventário do Titã (ADR 0040, 0047): hotbar de **9** espaços (índices 0–8) + mochila de **27** (9–35, 3 × 9 alinhada à hotbar) + grade 3 × 3 de montagem (41–49, ADR 0049/0050), a única. As posições 36–39 eram a grade 2 × 2 (removida na v0.105.0): só existem para ler saves antigos, e `returnCraft` as devolve à bolsa.
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
/** Grade 3 × 3 da mesa (ADR 0049): 41–49; a saída virtual da mesa é 50. Os ingredientes dela ficam separados dos da grade pessoal. */
export const BENCH_SLOTS = 9;
export const BENCH_START = OUTPUT + 1;
export const BENCH_OUT = BENCH_START + BENCH_SLOTS;
const isGrid = (i: number): boolean => (i >= CRAFT_START && i < OUTPUT) || (i >= BENCH_START && i < BENCH_OUT);

/** `wear` = pontos de desgaste da ferramenta (ADR 0067); ausente = intacta. Só ferramentas (pilha de 1) o têm. */
export interface Stack { item: number; count: number; wear?: number }
type Packed = [number, number] | [number, number, number];
export interface InventoryData { v: 1 | 2 | 3; slots: Array<Packed | null>; craft: Array<Packed | null>; /** v3: grade 3 × 3 da mesa (ausente nos saves anteriores = vazia). */ bench?: Array<Packed | null> }

export class Inventory {
  /** hotbar + mochila + grade 2 × 2 + (40 sem uso) + grade 3 × 3 da mesa (índices 0–49). */
  private readonly s: Array<Stack | null> = new Array(BENCH_OUT).fill(null);
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
  add(item: number, count = 1, wear = 0): boolean {
    if (!isItem(item) || count < 1 || !this.canAdd(item, count)) return false;
    const m = maxStack(item);
    let left = count;
    for (let i = 0; i < SLOTS && left > 0; i++) {
      const c = this.s[i];
      if (c && c.item === item && c.count < m) { const t = Math.min(m - c.count, left); c.count += t; left -= t; }
    }
    for (let i = 0; i < SLOTS && left > 0; i++) {
      if (!this.s[i]) { const t = Math.min(m, left); this.s[i] = { item, count: t, ...(wear > 0 && maxDurability(item) !== null ? { wear } : {}) }; left -= t; }
    }
    this.rev++;
    return true;
  }

  /** Tira a pilha inteira de um espaço da hotbar ou da mochila e a devolve (`null` se vazio ou fora delas): usado ao guardar no baú (ADR 0089). */
  take(slot: number): Stack | null {
    if (!Number.isInteger(slot) || slot < 0 || slot >= SLOTS || !this.s[slot]) return null;
    const c = { ...this.s[slot]! };
    this.s[slot] = null;
    this.rev++;
    return c;
  }

  /** Esvazia tudo (hotbar, mochila e as grades) e devolve as pilhas: usado ao morrer, quando os itens caem no chão (ADR 0059). */
  takeAll(): Stack[] {
    const out: Stack[] = [];
    for (let i = 0; i < BENCH_OUT; i++) { const c = this.s[i]; if (i === OUTPUT || !c) continue; out.push({ ...c }); this.s[i] = null; }
    if (out.length) this.rev++;
    return out;
  }

  /**
   * Desgasta a ferramenta do espaço (ADR 0067): soma `points` ao contador; ao chegar em `maxDurability` o item **quebra** e o espaço fica vazio. Devolve se quebrou e quanto resta
   * (`null` se o espaço não tem ferramenta desgastável ou `points` ≤ 0: nada muda).
   */
  damage(slot: number, points: number): { broken: boolean; left: number } | null {
    const c = this.s[slot], max = c ? maxDurability(c.item) : null;
    if (!c || max === null || points <= 0) return null;
    const wear = Math.min(max, (c.wear ?? 0) + points);
    this.rev++;
    if (wear >= max) { this.s[slot] = null; return { broken: true, left: 0 }; }
    c.wear = wear;
    return { broken: false, left: max - wear };
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
   * Move/une/troca entre dois espaços (0–39 e 41–49; as saídas 40 e 50 são virtuais; para as grades de fabricação vai 1 de cada vez). Vazio → move; mesmo item empilhável → une até o limite (o resto fica na origem);
   * item diferente → troca. Devolve se algo mudou.
   */
  move(from: number, to: number): boolean {
    if (from === to || from < 0 || from >= BENCH_OUT || from === OUTPUT || to < 0 || to >= BENCH_OUT || to === OUTPUT) return false;
    const a = this.s[from], b = this.s[to];
    if (!a) return false;
    if (isGrid(to) && a.count > 1) {
      // nas grades de fabricação (pessoal e da mesa) entra 1 por vez
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

  /** Troca todas as pilhas de `from` por `to` (hotbar, mochila e grade), uma a uma e com a mesma quantidade. Devolve quantas unidades trocou. Usado na migração da cápsula (ADR 0045). */
  convertItem(from: number, to: number): number {
    let n = 0;
    for (let i = 0; i < this.s.length; i++) { const c = this.s[i]; if (c && c.item === from) { n += c.count; this.s[i] = { item: to, count: Math.min(c.count, maxStack(to)) }; } }
    if (n) this.rev++;
    return n;
  }

  /** Legado (grade 2 × 2 removida, ADR 0050): devolve à hotbar/mochila o que um save antigo deixou nas posições 36–39 (cabe sempre: os itens vieram de lá). Devolve se tudo voltou. */
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

  // ---- Grade 3 × 3 da de montagem (ADR 0049/0050) ----
  /** Quantidade por item na grade da mesa (somando as células). */
  benchTotals(): Map<number, number> {
    const m = new Map<number, number>();
    for (let i = 0; i < BENCH_SLOTS; i++) { const c = this.s[BENCH_START + i]; if (c) m.set(c.item, (m.get(c.item) ?? 0) + c.count); }
    return m;
  }
  /** Receita formada pela grade: ingredientes **exatos** (qualquer disposição); extra, errado ou faltando = `null` (a saída fica vazia). Mesmo catálogo da fabricação direta. */
  benchRecipe(): Recipe | null { const t = this.benchTotals(); return t.size ? matchBench(t) : null; }
  benchResult(): Stackable | null { const r = this.benchRecipe(); return r ? { ...r.result } : null; }

  /**
   * Recolhe a saída: consome **todos** os ingredientes da grade e entrega o resultado numa operação só. `at` = estação em uso (`null` = só a bolsa): receita da Mesa sem a Mesa → `station`. Sem receita completa → `none`; sem espaço para o resultado na hotbar/mochila → `full`
   * (nada muda: os ingredientes continuam na grade). A validação da mesa e do alcance é da interface, a cada toque.
   */
  takeBenchResult(at: Station | null): 'ok' | 'none' | 'station' | 'full' {
    const rec = this.benchRecipe();
    if (!rec) return 'none';
    if (!stationMet(rec, at)) return 'station';
    const r = rec.result;
    if (!this.canAdd(r.item, r.count)) return 'full';
    for (let i = 0; i < BENCH_SLOTS; i++) this.s[BENCH_START + i] = null;
    this.add(r.item, r.count); // cabe: conferido acima
    return 'ok';
  }

  /**
   * Devolve a grade da mesa à hotbar/mochila (ao fechar o painel, perder a mesa ou abrir o save). O que não couber **fica na grade** (e no save). Devolve quantas unidades ficaram.
   */
  returnBench(): number {
    let left = 0;
    for (let i = 0; i < BENCH_SLOTS; i++) {
      const c = this.s[BENCH_START + i];
      if (!c) continue;
      this.s[BENCH_START + i] = null;
      if (this.add(c.item, c.count)) continue;
      let rest = c.count;
      while (rest > 0 && this.add(c.item, 1)) rest--; // devolve o que couber, uma unidade por vez
      if (rest > 0) { this.s[BENCH_START + i] = { item: c.item, count: rest }; left += rest; this.rev++; }
    }
    return left;
  }

  // ---- Save ----
  toData(): InventoryData {
    const pack = (c: Stack | null): Packed | null => (c ? (c.wear ? [c.item, c.count, c.wear] : [c.item, c.count]) : null);
    const bench = this.s.slice(BENCH_START, BENCH_OUT).map(pack);
    return { v: 3, slots: this.s.slice(0, SLOTS).map(pack), craft: this.s.slice(SLOTS, SLOTS + CRAFT_SLOTS).map(pack), ...(bench.some(Boolean) ? { bench } : {}) };
  }

  /** Lê um registro gravado, descartando o que não for válido (item desconhecido, contagem fora do limite). */
  static fromData(d: unknown): Inventory {
    const inv = new Inventory();
    const o = d as Partial<InventoryData> | null;
    const read = (arr: unknown, n: number, off: number): void => {
      if (!Array.isArray(arr)) return;
      for (let i = 0; i < n && i < arr.length; i++) {
        const e = arr[i] as Packed | null;
        if (Array.isArray(e) && isItem(e[0]) && Number.isInteger(e[1]) && e[1] >= 1 && e[1] <= maxStack(e[0])) {
          const max = maxDurability(e[0]), w = e[2];
          inv.s[off + i] = { item: e[0], count: e[1], ...(max !== null && Number.isInteger(w) && (w as number) >= 1 && (w as number) < max ? { wear: w as number } : {}) }; // desgaste só em ferramenta e dentro do limite
        }
      }
    };
    if (o?.v === 1) {
      // migração por seção (ADR 0047): os 7 espaços antigos da hotbar vão para 1–7 (8–9 vazios) e os 24 da bolsa para o novo início da grade (9–32); a grade 2 × 2 não muda de conteúdo
      read(Array.isArray(o.slots) ? o.slots.slice(0, OLD_HOTBAR) : [], OLD_HOTBAR, 0);
      read(Array.isArray(o.slots) ? o.slots.slice(OLD_HOTBAR, OLD_HOTBAR + OLD_BAG) : [], OLD_BAG, HOTBAR);
    } else read(o?.slots, SLOTS, 0);
    read(o?.craft, CRAFT_SLOTS, SLOTS);
    read(o?.bench, BENCH_SLOTS, BENCH_START); // saves anteriores: sem grade da mesa = vazia
    return inv;
  }
}
