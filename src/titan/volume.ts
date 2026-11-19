import { TitanGenerator } from './generator';
import { chunkKey, chunkOf, columnIndex, inRegion, isSolid, localOf, sectionOf, T, unpackIndex, Y_MAX, Y_MIN } from './voxel';

/**
 * Volume do Titã: base gerada (pura) + edições do jogador por chunk (ADR 0039). Fonte de verdade da leitura, da colisão e da edição.
 *
 * Edições: ausência = a base; entrada = o id gravado (0 = remoção explícita para ar). Devolver a célula ao que a base diz **apaga** a
 * entrada — assim o líquido da bacia reaparece quando se retira o sólido que o deslocou, e a remoção de um bloco da praia permanece.
 */
export class TitanVolume {
  /** Edições por chunk: índice da célula na coluna → id. */
  private readonly edits = new Map<string, Map<number, number>>();
  /** Chunks com edição ainda não gravada → revisão da última edição (sobe a cada `set` que muda o chunk). */
  private readonly dirty = new Map<string, number>();
  private chunkRev = 0;
  /** Chunks (e seções) tocados desde a última coleta pelo renderer. */
  private readonly touched = new Set<string>();
  /** Revisão de cada seção: sobe a cada edição (descarta malhas antigas). */
  private readonly rev = new Map<string, number>();

  constructor(readonly gen: TitanGenerator) {}

  get seed(): number { return this.gen.seed; }

  /** Voxel efetivo (base + edições). Fora de Y: rocha-mãe abaixo, ar acima. */
  get(x: number, y: number, z: number): number {
    if (y < Y_MIN) return T.BEDROCK;
    if (y > Y_MAX) return T.AIR;
    const e = this.edits.get(chunkKey(chunkOf(x), chunkOf(z)));
    if (e) {
      const v = e.get(columnIndex(localOf(x), y, localOf(z)));
      if (v !== undefined) return v;
    }
    return this.gen.blockAt(x, y, z);
  }

  /** Voxel da base, ignorando edições. */
  base(x: number, y: number, z: number): number { return y < Y_MIN ? T.BEDROCK : y > Y_MAX ? T.AIR : this.gen.blockAt(x, y, z); }

  /** Colisão: sólido, mais uma parede invisível em volta da região de teste e a rocha-mãe. */
  solidForBody(x: number, y: number, z: number): boolean {
    if (!inRegion(x, z)) return true;
    return isSolid(this.get(x, y, z));
  }

  /** Pode editar esta célula? Dentro da região e do domínio Y, e nunca a rocha-mãe (Y = −64). */
  editable(x: number, y: number, z: number): boolean {
    return inRegion(x, z) && y > Y_MIN && y <= Y_MAX;
  }

  /** Grava `id` na célula respeitando a regra de edição. Devolve se algo mudou. */
  set(x: number, y: number, z: number, id: number): boolean {
    if (!this.editable(x, y, z)) return false;
    const cx = chunkOf(x), cz = chunkOf(z);
    const key = chunkKey(cx, cz);
    const idx = columnIndex(localOf(x), y, localOf(z));
    const baseId = this.gen.blockAt(x, y, z);
    let e = this.edits.get(key);
    const current = e?.get(idx) ?? baseId;
    if (current === id) return false;
    if (id === baseId) {
      e?.delete(idx);
      if (e && e.size === 0) this.edits.delete(key);
    } else {
      if (!e) { e = new Map(); this.edits.set(key, e); }
      e.set(idx, id);
    }
    this.dirty.set(key, ++this.chunkRev);
    this.markSections(x, y, z);
    return true;
  }

  /** Remove o sólido da célula: na bacia, a célula volta a ser líquida; fora dela, vira ar (remoção explícita se a base era sólida). */
  remove(x: number, y: number, z: number): boolean {
    const baseId = this.gen.blockAt(x, y, z);
    return this.set(x, y, z, baseId === T.LAKE ? T.LAKE : T.AIR);
  }

  /** Coloca um sólido na célula (ar ou líquido; o líquido é deslocado, mas continua na base para voltar depois). */
  place(x: number, y: number, z: number, id: number): boolean {
    if (!isSolid(id)) return false;
    const cur = this.get(x, y, z);
    if (isSolid(cur)) return false;
    return this.set(x, y, z, id);
  }

  /** A seção da célula e as vizinhas do outro lado da borda (a malha de uma depende da outra): `"cx,sy,cz"`. */
  private sectionsAround(x: number, y: number, z: number): string[] {
    const cx = chunkOf(x), cz = chunkOf(z), sy = sectionOf(y);
    const lx = localOf(x), lz = localOf(z), ly = y - Y_MIN - sy * 16;
    const out = [`${cx},${sy},${cz}`];
    const add = (dcx: number, dsy: number, dcz: number): void => { const s = sy + dsy; if (s >= 0 && s < 24) out.push(`${cx + dcx},${s},${cz + dcz}`); };
    if (lx === 0) add(-1, 0, 0);
    if (lx === 15) add(1, 0, 0);
    if (lz === 0) add(0, 0, -1);
    if (lz === 15) add(0, 0, 1);
    if (ly === 0) add(0, -1, 0);
    if (ly === 15) add(0, 1, 0);
    return out;
  }

  private markSections(x: number, y: number, z: number): void {
    for (const k of this.sectionsAround(x, y, z)) {
      this.touched.add(k);
      this.rev.set(k, (this.rev.get(k) ?? 0) + 1);
    }
  }

  /** Seções com edição (e as vizinhas das bordas): entram na fila inicial do renderer, mesmo acima do relevo natural (ex.: construção em Y = 150 ao reabrir). */
  editedSections(): string[] {
    const out = new Set<string>();
    for (const [key, cells] of this.edits) {
      const [cx, cz] = key.split(',').map(Number);
      for (const idx of cells.keys()) { const u = unpackIndex(idx); for (const k of this.sectionsAround(cx * 16 + u.lx, u.y, cz * 16 + u.lz)) out.add(k); }
    }
    return [...out];
  }

  sectionRevision(cx: number, sy: number, cz: number): number { return this.rev.get(`${cx},${sy},${cz}`) ?? 0; }

  /** Seções tocadas por edições desde a última chamada (`"cx,sy,cz"`). */
  takeTouched(): string[] { const out = [...this.touched]; this.touched.clear(); return out; }

  // ---- Persistência ----

  /**
   * Chunks sujos, cada um com a **revisão** do instante da cópia (as edições vão copiadas: edições posteriores não entram nesta gravação).
   * Depois da confirmação, `markClean` limpa só a revisão confirmada.
   */
  dirtyChunks(): Array<{ cx: number; cz: number; rev: number; edits: Array<[number, number]> }> {
    return [...this.dirty].map(([key, rev]) => {
      const [cx, cz] = key.split(',').map(Number);
      return { cx, cz, rev, edits: [...(this.edits.get(key) ?? [])] as Array<[number, number]> };
    });
  }

  /** Marca como gravada a revisão confirmada; um chunk editado de novo durante a gravação (revisão maior) continua pendente. */
  markClean(saved: Array<{ cx: number; cz: number; rev: number }>): void {
    for (const k of saved) { const key = chunkKey(k.cx, k.cz); if (this.dirty.get(key) === k.rev) this.dirty.delete(key); }
  }
  get hasDirty(): boolean { return this.dirty.size > 0; }

  /** Reaplica as edições gravadas sobre a base (na retomada). Entradas fora do domínio são descartadas. */
  load(chunks: Array<{ cx: number; cz: number; edits: Array<[number, number]> }>): void {
    for (const c of chunks) {
      const m = new Map<number, number>();
      for (const [idx, id] of c.edits) if (Number.isInteger(idx) && idx >= 0 && idx < 384 * 256 && Number.isInteger(id) && id >= 0 && id <= T.BEDROCK) m.set(idx, id);
      if (m.size) this.edits.set(chunkKey(c.cx, c.cz), m);
    }
  }

  /** Quantas edições o volume guarda (testes e diagnóstico). */
  get editCount(): number { let n = 0; for (const m of this.edits.values()) n += m.size; return n; }
}
