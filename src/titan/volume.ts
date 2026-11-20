import { TitanGenerator } from './generator';
import { LightEngine, lightKey } from './light';
import { blockHeight, blockSpan, chunkKey, chunkOf, columnIndex, blocksLight, isMarco, isOccupied, isSolid, isTarget, isWorkbench, localOf, modelOf, sectionOf, T, T_MAX, unpackIndex, Y_MAX, Y_MIN } from './voxel';

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
  /** Lanternas colocadas (as únicas fontes de luz) e o mapa de luz calculado sob demanda. */
  private readonly lanterns = new Map<number, [number, number, number]>();
  /** Luz incremental em 4 bits por célula (ver `light.ts`); `ready` só depois da primeira consulta (cálculo completo sob demanda). */
  private readonly light$ = new LightEngine((x, y, z) => blocksLight(this.get(x, y, z)), (x, y, z) => this.markLightCell(x, y, z), (x, z) => this.gen.inRegion(x, z));
  /** Medição opcional do tempo de cada atualização do mapa de luz (ms): cálculo completo e cada edição. */
  onLightMs: ((ms: number) => void) | null = null;
  /** Seções cuja luz mudou (só luz, sem edição de bloco), a refazer com orçamento por quadro. Chave numérica → `"cx,sy,cz"`. */
  private readonly lightTouched = new Set<number>();
  /** Chunks (e seções) tocados desde a última coleta pelo renderer. */
  private readonly touched = new Set<string>();
  /** Seções cuja luz mudou (refazer sem pressa, com orçamento). */
  private readonly lightOnly = new Set<string>();
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
    if (!this.gen.inRegion(x, z)) return true;
    return isSolid(this.get(x, y, z));
  }

  /** Altura sólida da célula para o corpo do jogador (0–1; a parede invisível em volta da região conta como cubo inteiro). */
  bodyHeight(x: number, y: number, z: number): number {
    if (!this.gen.inRegion(x, z)) return 1;
    return blockHeight(this.get(x, y, z));
  }

  /** Faixa `[baixo, topo]` ocupada na célula para o corpo (a parede invisível em volta da região conta como cubo inteiro). */
  bodySpan(x: number, y: number, z: number): readonly [number, number] {
    if (!this.gen.inRegion(x, z)) return [0, 1];
    return blockSpan(this.get(x, y, z));
  }

  /** Pode quebrar esta célula? Editável e alvo da mira (sólido ou lanterna); rocha-mãe e líquido não. */
  breakable(x: number, y: number, z: number): boolean {
    return this.editable(x, y, z) && isTarget(this.get(x, y, z));
  }

  /** Pode editar esta célula? Dentro da região e do domínio Y, e nunca a rocha-mãe (Y = −64). */
  editable(x: number, y: number, z: number): boolean {
    return this.gen.inRegion(x, z) && y > Y_MIN && y <= Y_MAX;
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
    this.updateLight(x, y, z, current, id);
    return true;
  }

  /** Remove o sólido da célula: na bacia, a célula volta a ser líquida; fora dela, vira ar (remoção explícita se a base era sólida). */
  remove(x: number, y: number, z: number): boolean {
    const baseId = this.gen.blockAt(x, y, z);
    return this.set(x, y, z, baseId === T.LAKE ? T.LAKE : T.AIR);
  }

  /** Coloca um sólido na célula (ar ou líquido; o líquido é deslocado, mas continua na base para voltar depois). */
  place(x: number, y: number, z: number, id: number): boolean {
    if (!isSolid(id) && id !== T.LANTERN && !isMarco(id)) return false;
    if (isOccupied(this.get(x, y, z))) return false;
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
  takeTouched(): string[] {
    const out = [...this.touched];
    this.touched.clear();
    for (const k of out) this.lightOnly.delete(k); // já vão ser refeitas agora: não repetem na fila de só-luz
    return out;
  }

  /** Seções em que **só a luz** mudou (sem edição de bloco): a malha pode esperar uns quadros. As já devolvidas por `takeTouched` não repetem. */
  takeLightTouched(): string[] {
    const out = [...this.lightOnly];
    this.lightOnly.clear();
    return out;
  }

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
      for (const [idx, id] of c.edits) if (Number.isInteger(idx) && idx >= 0 && idx < 384 * 256 && Number.isInteger(id) && id >= 0 && id <= T_MAX) m.set(idx, id);
      if (m.size) this.edits.set(chunkKey(c.cx, c.cz), m);
      for (const [idx, id] of m) { const md = modelOf(id); if (md) { const u = unpackIndex(idx); const x = c.cx * 16 + u.lx, z = c.cz * 16 + u.lz; this.models[md.kind].set(lightKey(x, u.y, z), [x, u.y, z, md.turn]); } }
      for (const [idx, id] of m) if (id === T.LANTERN) { const u = unpackIndex(idx); const x = c.cx * 16 + u.lx, z = c.cz * 16 + u.lz; this.lanterns.set(lightKey(x, u.y, z), [x, u.y, z]); }
    }
    this.light$.ready = false; // a luz é calculada por inteiro na primeira consulta
    this.lanternVersion++;
    this.modelVersion++;
  }

  // ---- Luz de lanterna ----
  /** Modelos 3D colocados (mesa, Marco de Margem, Painel de Junco): o renderer desenha uma instância por célula; `modelVersion` muda a cada peça posta, retirada ou carregada. */
  private readonly models: Record<'workbench' | 'marco' | 'painel', Map<number, [number, number, number, number]>> = { workbench: new Map(), marco: new Map(), painel: new Map() };
  modelVersion = 0;
  /** Cada peça: `[x, y, z, giro]` (giro 0–3 em quartos de volta ao redor de Y; o painel usa 0 = ao longo de X e 1 = ao longo de Z). */
  modelCells(kind: 'workbench' | 'marco' | 'painel'): Array<[number, number, number, number]> { return [...this.models[kind].values()]; }
  workbenchCells(): Array<[number, number, number, number]> { return this.modelCells('workbench'); }
  /** Há uma Mesa de Trabalho nesta célula? */
  isWorkbench(x: number, y: number, z: number): boolean { return isWorkbench(this.get(x, y, z)); }
  /** Muda a cada lanterna posta ou retirada (o renderer refaz as instâncias só então). */
  lanternVersion = 0;
  get hasLanterns(): boolean { return this.lanterns.size > 0; }
  lanternCells(): Array<[number, number, number]> { return [...this.lanterns.values()]; }

  /** Nível de luz (0–15) da célula. O primeiro uso faz o cálculo completo; depois a luz é mantida de forma incremental. */
  light(x: number, y: number, z: number): number {
    if (!this.lanterns.size) return 0;
    if (!this.light$.ready) {
      const t0 = this.onLightMs ? performance.now() : 0;
      this.light$.rebuild(this.lanterns.values());
      this.onLightMs?.(performance.now() - t0);
    }
    return this.light$.get(x, y, z);
  }

  /**
   * Atualiza a luz depois de uma edição já aplicada (`before` → `after`): só propaga o que muda, e cada célula cuja luz mudou marca a sua seção
   * (e as vizinhas das bordas) para refazer a malha. Antes de o mapa existir (nada desenhado ainda) não há o que atualizar.
   */
  private updateLight(x: number, y: number, z: number, before: number, after: number): void {
    const key = lightKey(x, y, z);
    const mBefore = modelOf(before), mAfter = modelOf(after);
    if (mBefore) { this.models[mBefore.kind].delete(key); this.modelVersion++; }
    if (mAfter) { this.models[mAfter.kind].set(key, [x, y, z, mAfter.turn]); this.modelVersion++; }
    const wasLantern = before === T.LANTERN, isLantern = after === T.LANTERN;
    if (wasLantern && !isLantern) { this.lanterns.delete(key); this.lanternVersion++; }
    if (isLantern && !wasLantern) { this.lanterns.set(key, [x, y, z]); this.lanternVersion++; }
    if (!this.light$.ready) return;
    const t0 = this.onLightMs ? performance.now() : 0;
    if (wasLantern && !isLantern) this.light$.sourceRemoved(x, y, z);
    if (isLantern && !wasLantern) this.light$.sourceAdded(x, y, z);
    // sólido: entrou (bloqueia) ou saiu (libera); lanterna e ar não bloqueiam
    const solidBefore = blocksLight(before), solidAfter = blocksLight(after);
    if (!solidBefore && solidAfter) this.light$.blockPlaced(x, y, z);
    else if (solidBefore && !solidAfter) this.light$.blockRemoved(x, y, z);
    this.flushLightTouched();
    this.onLightMs?.(performance.now() - t0);
  }

  /** Uma célula mudou de nível de luz: as faces dos sólidos vizinhos leem esse valor, então a seção dela e as vizinhas da borda refazem a malha. */
  private markLightCell(x: number, y: number, z: number): void {
    const cx = x >> 4, cz = z >> 4, yy = y - Y_MIN, sy = yy >> 4, lx = x & 15, lz = z & 15, ly = yy & 15;
    const add = (dcx: number, dsy: number, dcz: number): void => { const s = sy + dsy; if (s >= 0 && s < 24) this.lightTouched.add(((cx + dcx + 2048) * 4096 + (cz + dcz + 2048)) * 32 + s); };
    add(0, 0, 0);
    if (lx === 0) add(-1, 0, 0);
    if (lx === 15) add(1, 0, 0);
    if (lz === 0) add(0, 0, -1);
    if (lz === 15) add(0, 0, 1);
    if (ly === 0) add(0, -1, 0);
    if (ly === 15) add(0, 1, 0);
  }

  /** Passa as seções de luz alteradas para a revisão de malha (a revisão sobe; a lista de só-luz fica para o renderer pegar com orçamento). */
  private flushLightTouched(): void {
    for (const n of this.lightTouched) {
      const s = n & 31, rest = Math.floor(n / 32), cz = (rest % 4096) - 2048, cx = Math.floor(rest / 4096) - 2048;
      const k = `${cx},${s},${cz}`;
      this.rev.set(k, (this.rev.get(k) ?? 0) + 1);
      this.lightOnly.add(k);
    }
    this.lightTouched.clear();
  }

  /** Quantas edições o volume guarda (testes e diagnóstico). */
  get editCount(): number { let n = 0; for (const m of this.edits.values()) n += m.size; return n; }
}
