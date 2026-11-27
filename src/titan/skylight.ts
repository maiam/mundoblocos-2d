/**
 * Luz do céu (ADR 0123, auditoria #32), nas regras da Minecraft Wiki ("Light"): 0–15 por célula. Uma coluna aberta ao céu vale **15**; a luz desce sem perder nível por blocos transparentes
 * (ar, tocha…) e perde **1 a mais** em cada bloco que filtra (folhas, água); um bloco opaco a barra; em todas as outras direções (lados e para cima) perde 1 por célula, por inundação — assim
 * entra por uma janela ou porta e esmaece (14, 13…) dentro de um cômodo ou caverna. **Não cai à noite**: a hora e a chuva escurecem o céu por fora (`skyAt`), no shader; aqui só vale a geometria.
 *
 * Puro e sem DOM: recebe a classificação das células (`SkyWorld.kind`) e guarda os níveis numa grade do tamanho da região. Acima de `scanTop` de cada coluna vale 15 sem guardar (o céu aberto).
 * `compute()` faz a conta inteira uma vez; `update(x, y, z)` refaz só a vizinhança (±16 em x e z) depois que **uma** célula mudou de classe, e o teste compara o resultado com o cálculo inteiro.
 * O mundo gerado não tem cavernas (abaixo da primeira célula opaca de uma coluna tudo é sólido, salvo o que o jogador escavou: `edited`), então o custo inicial é só o céu das colunas.
 */
export const SKY_MAX = 15;
/** 0 = transparente (ar, tocha…), 1 = filtra a luz do céu (folhas, água), 2 = opaco (cubo inteiro). */
export type SkyKind = 0 | 1 | 2;
export interface SkyWorld {
  kind(x: number, y: number, z: number): SkyKind;
  /** Caixa da grade: x e z em [x0, x1) × [z0, z1); y em [yMin, yMax]. Fora dela vale 15 (o mar em volta). */
  readonly x0: number; readonly x1: number; readonly z0: number; readonly z1: number; readonly yMin: number; readonly yMax: number;
}
/** Folga acima do topo conhecido de uma coluna onde ainda pode haver folhas ou blocos soltos (copa de árvore). */
export const SCAN_MARGIN = 24;
/** Alcance lateral máximo da luz (15 células): a vizinhança refeita por `update` leva uma folga a mais. */
const REACH = 16;

export class SkyLight {
  private readonly sx: number; private readonly sz: number; private readonly sy: number;
  private readonly lv: Uint8Array;
  /** Altura do primeiro nível implícito: acima de `scanTop[col]` vale 15. */
  private readonly scanTop: Int16Array;

  constructor(private readonly w: SkyWorld) {
    this.sx = w.x1 - w.x0; this.sz = w.z1 - w.z0; this.sy = w.yMax - w.yMin + 1;
    this.lv = new Uint8Array(this.sx * this.sz * this.sy);
    this.scanTop = new Int16Array(this.sx * this.sz).fill(w.yMin);
  }

  private col(x: number, z: number): number { return (z - this.w.z0) * this.sx + (x - this.w.x0); }
  private cell(x: number, y: number, z: number): number { return (y - this.w.yMin) * this.sx * this.sz + this.col(x, z); }
  private inside(x: number, z: number): boolean { return x >= this.w.x0 && x < this.w.x1 && z >= this.w.z0 && z < this.w.z1; }

  /** Nível do céu na célula (0–15). Fora da grade e acima do `scanTop` da coluna: 15. */
  at(x: number, y: number, z: number): number {
    if (!this.inside(x, z) || y < this.w.yMin) return this.inside(x, z) ? 0 : SKY_MAX;
    if (y > this.w.yMax) return SKY_MAX;
    return y > this.scanTop[this.col(x, z)] ? SKY_MAX : this.lv[this.cell(x, y, z)];
  }

  /**
   * Conta inteira. `topHint(x, z)` = a altura do terreno na coluna (o topo da coluna gerada); `edited` = células editadas pelo jogador (só elas podem criar buracos abaixo do terreno, ou
   * blocos acima dele): cada uma sobe o `scanTop` da coluna até ela e entra como candidata de sombra.
   */
  compute(topHint: (x: number, z: number) => number, edited: Iterable<readonly [number, number, number]> = []): void {
    this.lv.fill(0);
    for (let z = this.w.z0; z < this.w.z1; z++) for (let x = this.w.x0; x < this.w.x1; x++) this.scanTop[this.col(x, z)] = Math.min(this.w.yMax, Math.max(this.w.yMin, topHint(x, z)) + SCAN_MARGIN);
    for (const e of edited) {
      const [x, y, z] = e;
      if (!this.inside(x, z)) continue;
      const c = this.col(x, z);
      this.scanTop[c] = Math.min(this.w.yMax, Math.max(this.scanTop[c], y + SCAN_MARGIN));
    }
    const queue: number[] = [];
    for (let z = this.w.z0; z < this.w.z1; z++) for (let x = this.w.x0; x < this.w.x1; x++) this.sweep(x, z, this.w.yMin, queue);
    // células escavadas abaixo do terreno: ficam em 0 depois da varredura e recebem luz só pela inundação (a coluna acima delas é opaca)
    this.flood(queue, null);
  }

  /** Varre a coluna de cima para baixo até o primeiro bloco opaco, fixando níveis; empilha as células com nível ≥ 2 para a inundação. */
  private sweep(x: number, z: number, yLow: number, queue: number[]): void {
    let level = SKY_MAX;
    for (let y = this.scanTop[this.col(x, z)]; y >= this.w.yMin; y--) {
      const k = this.w.kind(x, y, z);
      if (k === 2) { this.lv[this.cell(x, y, z)] = 0; return; } // abaixo do primeiro opaco só chega luz de lado
      if (k === 1 && level > 0) level--;
      if (y >= yLow) { this.lv[this.cell(x, y, z)] = level; if (level >= 2) queue.push(x, y, z); }
    }
  }

  /** Inundação: cada célula passa `nível − 1` aos vizinhos não opacos (para baixo, o 15 desce inteiro); filtros tiram 1 a mais. `box` limita onde se escreve (a vizinhança refeita). */
  private flood(queue: number[], box: { x0: number; x1: number; z0: number; z1: number; y0: number; y1: number } | null): void {
    const DIRS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]] as const;
    for (let head = 0; head < queue.length; head += 3) {
      const x = queue[head], y = queue[head + 1], z = queue[head + 2], v = this.lv[this.cell(x, y, z)];
      if (v < 2) continue;
      for (const [dx, dy, dz] of DIRS) {
        const nx = x + dx, ny = y + dy, nz = z + dz;
        if (!this.inside(nx, nz) || ny < this.w.yMin || ny > this.w.yMax || ny > this.scanTop[this.col(nx, nz)]) continue; // acima do scanTop é céu aberto (15)
        if (box && (nx < box.x0 || nx >= box.x1 || nz < box.z0 || nz >= box.z1 || ny < box.y0 || ny > box.y1)) continue;
        const k = this.w.kind(nx, ny, nz);
        if (k === 2) continue;
        let nv = dy === -1 && v === SKY_MAX ? SKY_MAX : v - 1;
        if (k === 1 && nv > 0) nv -= 1;
        const i = this.cell(nx, ny, nz);
        if (nv > this.lv[i]) { this.lv[i] = nv; queue.push(nx, ny, nz); }
      }
    }
  }

  /**
   * Refaz a vizinhança depois que **uma** célula `(x, y, z)` mudou de classe (opaco, filtro ou transparente). Recalcula as colunas a ±16 em x e z, da primeira célula opaca abaixo de
   * `y` (menos 16) até o topo, e re-propaga a luz de fora da caixa para dentro.
   */
  update(x: number, y: number, z: number): void {
    if (!this.inside(x, z) || y < this.w.yMin || y > this.w.yMax) return;
    const c = this.col(x, z);
    if (y + SCAN_MARGIN > this.scanTop[c]) this.scanTop[c] = Math.min(this.w.yMax, y + SCAN_MARGIN); // bloco acima do topo conhecido
    let below = this.w.yMin;
    for (let yy = y - 1; yy >= this.w.yMin; yy--) if (this.w.kind(x, yy, z) === 2) { below = yy; break; }
    const box = { x0: Math.max(this.w.x0, x - REACH), x1: Math.min(this.w.x1, x + REACH + 1), z0: Math.max(this.w.z0, z - REACH), z1: Math.min(this.w.z1, z + REACH + 1), y0: Math.max(this.w.yMin, below - REACH), y1: this.w.yMax };
    for (let zz = box.z0; zz < box.z1; zz++) for (let xx = box.x0; xx < box.x1; xx++) for (let yy = box.y0; yy <= Math.min(box.y1, this.scanTop[this.col(xx, zz)]); yy++) this.lv[this.cell(xx, yy, zz)] = 0;
    const queue: number[] = [];
    for (let zz = box.z0; zz < box.z1; zz++) for (let xx = box.x0; xx < box.x1; xx++) this.sweep(xx, zz, box.y0, queue);
    // a luz que vem de fora da caixa (células a 1 de distância com nível ≥ 2) entra pela borda
    for (let zz = box.z0 - 1; zz <= box.z1; zz++) for (let xx = box.x0 - 1; xx <= box.x1; xx++) {
      if (!this.inside(xx, zz)) continue;
      const edgeXZ = xx < box.x0 || xx >= box.x1 || zz < box.z0 || zz >= box.z1;
      for (let yy = box.y0 - 1; yy <= Math.min(box.y1, this.scanTop[this.col(xx, zz)]); yy++) {
        if (yy < this.w.yMin) continue;
        if ((edgeXZ || yy < box.y0) && this.lv[this.cell(xx, yy, zz)] >= 2) queue.push(xx, yy, zz);
      }
    }
    this.flood(queue, box);
  }
}
