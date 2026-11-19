/**
 * Salvamento do Titã (ADR 0039): IndexedDB exclusivo do perfil, separado do `localStorage` do `SaveStore` dos outros mundos.
 * Cabeçalho + jogador + chunks alterados vão **na mesma transação** (a gravação só é "confirmada" no `oncomplete`); a inventário/coleta da
 * entrega 2 entra no mesmo registro `games` sem mudar o modelo. A base nunca é guardada: só `seed + generatorVersion` e os deltas.
 */
/**
 * v2 (entrega 2, ADR 0040): `inventory` passa a existir (mochila, grade, fragmentos recolhidos). v1 (sem inventário) continua abrindo.
 * v3 (ADR 0044): `drops` = lascas soltas por veios quebrados e ainda não recolhidas. v1 e v2 continuam abrindo (sem drops).
 * v4 (ADR 0045): `recipes` (receitas descobertas) e `grants` (adição localizada de brasa em partida legada); a cápsula remanescente vira brasa uma única vez ao abrir um save < 4.
 */
export const TITAN_SAVE_VERSION = 4;
const DB_NAME = 'orvalis-titan';

export interface TitanHeader {
  v: number;
  world: 'titan';
  seed: number;
  generatorVersion: number;
  savedAt: number;
  player: { x: number; y: number; z: number; yaw: number; pitch: number };
  /** Bloco selecionado na hotbar (índice). */
  selected: number;
  /** Hora do dia: fração 0–1 do dia de 8 minutos (ADR 0041). Ausente em saves antigos: começam à tarde. A hora forçada de teste (`?hora=`) nunca é gravada. */
  time?: number;
  /**
   * Hotbar, mochila e grade de fabricação + ids dos fragmentos de superfície já recolhidos; vai neste registro, **na mesma transação** das edições de chunk
   * (as lanternas colocadas são edições de chunk). `null` = save da v1: abre com o inventário inicial.
   */
  inventory: { bag: InventoryData; collected: string[] } | null;
  /** v3: lascas soltas ainda no mundo (id `v:x,y,z` do veio que as soltou); gravadas na mesma transação do inventário e das edições. Ausente = nenhuma. */
  drops?: Drop[];
  /** v4: ids das receitas já descobertas (`mesa`, `bancada`): a descoberta é derivada do estado, mas fica gravada para não depender de um evento único. */
  recipes?: string[];
  /** v4: adições localizadas feitas numa partida de gerador antigo: o depósito de brasa dado uma vez (a célula; some do mapa se o jogador o quebrar). */
  grants?: { ember?: [number, number, number] };
}
/** Lasca solta: 5 = fragmento de rocha, 6 = fragmento de gelo, 11 = brasa de âmbar, 12 = junco de vidro (ids de item). A célula é onde ela pousa. */
export interface Drop { id: string; item: 5 | 6 | 11 | 12; x: number; y: number; z: number }
import type { InventoryData } from './inventory';

export interface ChunkRecord { cx: number; cz: number; edits: Array<[number, number]> }
export interface TitanSave { header: TitanHeader; chunks: ChunkRecord[] }

export interface TitanStorage {
  /** Partida mais recente (maior `savedAt`), se houver. */
  latestSeed(): Promise<number | null>;
  load(seed: number): Promise<TitanSave | null>;
  /** Grava cabeçalho, chunks alterados e remoções numa só transação; resolve só quando confirmada. */
  commit(header: TitanHeader, puts: ChunkRecord[], deletes: Array<{ cx: number; cz: number }>): Promise<void>;
  /** Apaga a partida (e só ela). */
  erase(seed: number): Promise<void>;
}

const chunkId = (seed: number, cx: number, cz: number): string => `${seed}:${cx}:${cz}`;
const valid = (h: unknown): h is TitanHeader => {
  const o = h as TitanHeader | null;
  return !!o && o.world === 'titan' && Number.isInteger(o.seed) && Number.isInteger(o.generatorVersion) && !!o.player && [o.player.x, o.player.y, o.player.z, o.player.yaw, o.player.pitch].every(Number.isFinite);
};

/** Memória (testes e navegadores sem IndexedDB). */
export class MemoryTitanStorage implements TitanStorage {
  games = new Map<number, TitanHeader>();
  chunks = new Map<string, ChunkRecord & { seed: number }>();
  /** Teste de falha de gravação. */
  failNext = false;
  async latestSeed(): Promise<number | null> {
    let best: TitanHeader | null = null;
    for (const h of this.games.values()) if (!best || h.savedAt > best.savedAt) best = h;
    return best ? best.seed : null;
  }
  async load(seed: number): Promise<TitanSave | null> {
    const header = this.games.get(seed);
    if (!header) return null;
    const chunks = [...this.chunks.values()].filter((c) => c.seed === seed).map(({ cx, cz, edits }) => ({ cx, cz, edits }));
    return { header: structuredClone(header), chunks: structuredClone(chunks) };
  }
  async commit(header: TitanHeader, puts: ChunkRecord[], deletes: Array<{ cx: number; cz: number }>): Promise<void> {
    if (this.failNext) { this.failNext = false; throw new Error('falha simulada'); }
    this.games.set(header.seed, structuredClone(header));
    for (const p of puts) this.chunks.set(chunkId(header.seed, p.cx, p.cz), { seed: header.seed, ...structuredClone(p) });
    for (const d of deletes) this.chunks.delete(chunkId(header.seed, d.cx, d.cz));
  }
  async erase(seed: number): Promise<void> {
    this.games.delete(seed);
    for (const [k, c] of this.chunks) if (c.seed === seed) this.chunks.delete(k);
  }
}

/** IndexedDB: `games` (chave `seed`, índice `savedAt`) e `chunks` (chave `seed:cx:cz`, índice `seed`). */
export class IdbTitanStorage implements TitanStorage {
  private db: Promise<IDBDatabase> | null = null;
  private open(): Promise<IDBDatabase> {
    this.db ??= new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        db.createObjectStore('games', { keyPath: 'seed' }).createIndex('savedAt', 'savedAt');
        db.createObjectStore('chunks', { keyPath: 'id' }).createIndex('seed', 'seed');
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error ?? new Error('IndexedDB indisponível'));
      req.onblocked = () => reject(new Error('IndexedDB bloqueado'));
    });
    return this.db;
  }
  private static wait<T>(req: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => { req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
  }
  async latestSeed(): Promise<number | null> {
    const db = await this.open();
    const cur = await IdbTitanStorage.wait(db.transaction('games').objectStore('games').index('savedAt').openCursor(null, 'prev'));
    const h = cur?.value;
    return valid(h) ? h.seed : null;
  }
  async load(seed: number): Promise<TitanSave | null> {
    const db = await this.open();
    const tx = db.transaction(['games', 'chunks']);
    const header = await IdbTitanStorage.wait(tx.objectStore('games').get(seed));
    if (!valid(header)) return null;
    const rows = (await IdbTitanStorage.wait(tx.objectStore('chunks').index('seed').getAll(seed))) as Array<ChunkRecord & { id: string }>;
    return { header, chunks: rows.map(({ cx, cz, edits }) => ({ cx, cz, edits })) };
  }
  async commit(header: TitanHeader, puts: ChunkRecord[], deletes: Array<{ cx: number; cz: number }>): Promise<void> {
    const db = await this.open();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['games', 'chunks'], 'readwrite');
      tx.objectStore('games').put(header);
      const cs = tx.objectStore('chunks');
      for (const p of puts) cs.put({ id: chunkId(header.seed, p.cx, p.cz), seed: header.seed, cx: p.cx, cz: p.cz, edits: p.edits });
      for (const d of deletes) cs.delete(chunkId(header.seed, d.cx, d.cz));
      tx.oncomplete = () => resolve(); // confirmada
      tx.onerror = () => reject(tx.error ?? new Error('falha ao gravar'));
      tx.onabort = () => reject(tx.error ?? new Error('gravação cancelada'));
    });
  }
  async erase(seed: number): Promise<void> {
    const db = await this.open();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['games', 'chunks'], 'readwrite');
      tx.objectStore('games').delete(seed);
      const idx = tx.objectStore('chunks').index('seed');
      const req = idx.openKeyCursor(IDBKeyRange.only(seed));
      req.onsuccess = () => { const c = req.result; if (c) { tx.objectStore('chunks').delete(c.primaryKey); c.continue(); } };
      tx.oncomplete = () => resolve();
      tx.onerror = tx.onabort = () => reject(tx.error ?? new Error('falha ao apagar'));
    });
  }
}

export function defaultTitanStorage(): TitanStorage {
  try { if (typeof indexedDB !== 'undefined') return new IdbTitanStorage(); } catch { /* cai para a memória */ }
  return new MemoryTitanStorage();
}
