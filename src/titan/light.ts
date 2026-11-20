import { blocksLight, inRegion, Y_MAX, Y_MIN } from './voxel';

/**
 * Luz de bloco do Titã (ADR 0040): cada lanterna emite 15 e perde 1 por célula (6 vizinhas); sólidos bloqueiam. Calculada sob demanda pelo volume,
 * só na região jogável. Puro: recebe o leitor de blocos e as lanternas.
 */
export const LIGHT_MAX = 15;
export const lightKey = (x: number, y: number, z: number): number => ((x + 2048) * 4096 + (z + 2048)) * 512 + (y - Y_MIN);

const DIRS: ReadonlyArray<readonly [number, number, number]> = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];

/** Níveis de luz (chave `lightKey` → 1..15) a partir das lanternas. A célula da lanterna vale 15; vence o maior valor de cada célula. */
export function computeLight(get: (x: number, y: number, z: number) => number, lanterns: Iterable<readonly [number, number, number]>): Map<number, number> {
  const out = new Map<number, number>();
  const queue: Array<[number, number, number, number]> = [];
  for (const [x, y, z] of lanterns) { out.set(lightKey(x, y, z), LIGHT_MAX); queue.push([x, y, z, LIGHT_MAX]); }
  for (let head = 0; head < queue.length; head++) {
    const [x, y, z, l] = queue[head];
    if (l <= 1) continue;
    for (const [dx, dy, dz] of DIRS) {
      const nx = x + dx, ny = y + dy, nz = z + dz;
      if (ny < Y_MIN || ny > Y_MAX || !inRegion(nx, nz)) continue;
      if (blocksLight(get(nx, ny, nz))) continue; // opaco bloqueia (o painel de junco, de trama aberta, deixa passar)
      const k = lightKey(nx, ny, nz);
      if ((out.get(k) ?? 0) >= l - 1) continue;
      out.set(k, l - 1);
      queue.push([nx, ny, nz, l - 1]);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------------
// Motor de luz incremental (v0.95.2, ADR 0040 revisão): em vez de recalcular tudo e invalidar a caixa de ±15 blocos, mantém o mapa de luz e,
// a cada edição, propaga só o que muda (fila de remoção + fila de adição). Cada célula cujo nível muda é avisada (`onChange`), e o volume
// refaz **só as seções dessas células** (e as vizinhas das bordas), em vez das 28–37 da caixa cega.
// ---------------------------------------------------------------------------------------------------------------------

/** Luz de bloco em 4 bits por célula: uma seção de 16³ ocupa 2 048 bytes (2 células por byte); seções sem luz não existem. */
export class LightStore {
  private readonly sections = new Map<number, Uint8Array>();
  private static key(cx: number, cz: number, sy: number): number { return ((cx + 2048) * 4096 + (cz + 2048)) * 32 + sy; }

  get(x: number, y: number, z: number): number {
    const cx = x >> 4, cz = z >> 4, yy = y - Y_MIN, sy = yy >> 4;
    const a = this.sections.get(LightStore.key(cx, cz, sy));
    if (!a) return 0;
    const i = (((yy & 15) << 4) | (z & 15)) << 4 | (x & 15);
    const b = a[i >> 1];
    return i & 1 ? b >> 4 : b & 15;
  }

  set(x: number, y: number, z: number, v: number): void {
    const cx = x >> 4, cz = z >> 4, yy = y - Y_MIN, sy = yy >> 4, k = LightStore.key(cx, cz, sy);
    let a = this.sections.get(k);
    if (!a) { if (v === 0) return; a = new Uint8Array(2048); this.sections.set(k, a); }
    const i = (((yy & 15) << 4) | (z & 15)) << 4 | (x & 15);
    a[i >> 1] = i & 1 ? (a[i >> 1] & 0x0f) | (v << 4) : (a[i >> 1] & 0xf0) | v;
  }

  clear(): void { this.sections.clear(); }
  /** Seções com alguma luz guardada (diagnóstico e testes). */
  get sectionCount(): number { return this.sections.size; }
}

/**
 * Propagação incremental. `isOpaque` lê o volume (já com a edição aplicada); `onChange` recebe cada célula cujo nível mudou.
 * Seis vizinhas, −1 por célula, sólidos bloqueiam, só dentro da região jogável e do domínio Y.
 */
export class LightEngine {
  readonly store = new LightStore();
  ready = false;
  /** Durante o cálculo completo as mudanças não são avisadas. */
  private silent = false;

  constructor(private readonly isOpaque: (x: number, y: number, z: number) => boolean, private readonly onChange: (x: number, y: number, z: number) => void = () => {}, private readonly inRegionXZ: (x: number, z: number) => boolean = (x, z) => inRegion(x, z)) {}

  get(x: number, y: number, z: number): number { return this.store.get(x, y, z); }

  private inside(x: number, y: number, z: number): boolean { return y >= Y_MIN && y <= Y_MAX && this.inRegionXZ(x, z); }

  private put(x: number, y: number, z: number, v: number): void {
    if (this.store.get(x, y, z) === v) return;
    this.store.set(x, y, z, v);
    if (!this.silent) this.onChange(x, y, z);
  }

  /** Fila de adição: espalha a luz das células da fila (cada uma com o nível que tinha ao entrar). */
  private spread(q: number[]): void {
    for (let h = 0; h < q.length; h += 4) {
      const x = q[h], y = q[h + 1], z = q[h + 2], l = q[h + 3];
      if (l <= 1) continue;
      for (const [dx, dy, dz] of DIRS) {
        const nx = x + dx, ny = y + dy, nz = z + dz;
        if (!this.inside(nx, ny, nz) || this.isOpaque(nx, ny, nz) || this.store.get(nx, ny, nz) >= l - 1) continue;
        this.put(nx, ny, nz, l - 1);
        q.push(nx, ny, nz, l - 1);
      }
    }
  }

  /**
   * Fila de remoção: apaga a luz que dependia da célula (x, y, z) e, ao esbarrar em luz igual ou maior (outra lanterna!), a devolve à fila de
   * adição para preencher o que ficou escuro. Editar perto de 12 lanternas custa quase o mesmo que perto de 1.
   */
  private removeFrom(x: number, y: number, z: number): void {
    const old = this.store.get(x, y, z);
    if (old === 0) return;
    this.put(x, y, z, 0);
    const rq = [x, y, z, old], aq: number[] = [];
    for (let h = 0; h < rq.length; h += 4) {
      const cx = rq[h], cy = rq[h + 1], cz = rq[h + 2], lvl = rq[h + 3];
      for (const [dx, dy, dz] of DIRS) {
        const nx = cx + dx, ny = cy + dy, nz = cz + dz;
        if (!this.inside(nx, ny, nz)) continue;
        const nl = this.store.get(nx, ny, nz);
        if (nl !== 0 && nl < lvl) { this.put(nx, ny, nz, 0); rq.push(nx, ny, nz, nl); }
        else if (nl >= lvl) aq.push(nx, ny, nz, nl);
      }
    }
    this.spread(aq);
  }

  /** Cálculo completo (abertura da partida): espalha a luz de todas as lanternas. Não avisa mudanças (nada foi desenhado ainda). */
  rebuild(lanterns: Iterable<readonly [number, number, number]>): void {
    this.store.clear();
    const q: number[] = [];
    for (const [x, y, z] of lanterns) { this.store.set(x, y, z, LIGHT_MAX); q.push(x, y, z, LIGHT_MAX); }
    this.silent = true;
    this.spread(q);
    this.silent = false;
    this.ready = true;
  }

  /** Uma lanterna foi colocada em (x, y, z). */
  sourceAdded(x: number, y: number, z: number): void {
    if (!this.inside(x, y, z) || this.store.get(x, y, z) >= LIGHT_MAX) return;
    this.put(x, y, z, LIGHT_MAX);
    const q = [x, y, z, LIGHT_MAX];
    this.spread(q);
  }

  /** A lanterna de (x, y, z) foi retirada. */
  sourceRemoved(x: number, y: number, z: number): void { this.removeFrom(x, y, z); }

  /** Um sólido passou a ocupar (x, y, z): a luz que passava por ali some e contorna. */
  blockPlaced(x: number, y: number, z: number): void { this.removeFrom(x, y, z); }

  /** O sólido de (x, y, z) saiu: a luz das vizinhas entra na célula e segue. */
  blockRemoved(x: number, y: number, z: number): void {
    const q: number[] = [];
    for (const [dx, dy, dz] of DIRS) {
      const nx = x + dx, ny = y + dy, nz = z + dz;
      if (!this.inside(nx, ny, nz)) continue;
      const l = this.store.get(nx, ny, nz);
      if (l > 1) q.push(nx, ny, nz, l);
    }
    this.spread(q);
  }
}
