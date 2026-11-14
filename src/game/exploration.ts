import { CHUNK_SIZE } from '../config';

/**
 * Névoa do minimapa: quais células o jogador já viu. Estado do jogador (não do mundo): o `World` continua dono do
 * mapa; aqui só se marca o que já foi descoberto, um bit por célula, em blocos do tamanho do chunk. Sem DOM.
 * Persistência pelo salvamento (`SaveData.explored`, ADR 0011).
 */

const CELLS = CHUNK_SIZE * CHUNK_SIZE;
const BYTES = CELLS / 8;

const key = (cx: number, cy: number): string => `${cx},${cy}`;

export class Exploration {
  private readonly chunks = new Map<string, Uint8Array>();
  /** Muda a cada célula descoberta num chunk (o minimapa refaz só a imagem desse chunk). */
  private readonly versions = new Map<string, number>();

  /** Descobre o círculo de raio `r` (células) em volta de (x, y). Devolve se algo novo apareceu. */
  revealAround(x: number, y: number, r: number): boolean {
    const cx0 = Math.floor(x);
    const cy0 = Math.floor(y);
    const r2 = r * r;
    let changed = false;
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy > r2) continue;
        if (this.reveal(cx0 + dx, cy0 + dy)) changed = true;
      }
    }
    return changed;
  }

  /** Marca uma célula; true se ela ainda não era conhecida. */
  reveal(x: number, y: number): boolean {
    const cx = Math.floor(x / CHUNK_SIZE);
    const cy = Math.floor(y / CHUNK_SIZE);
    const k = key(cx, cy);
    let bits = this.chunks.get(k);
    if (!bits) {
      bits = new Uint8Array(BYTES);
      this.chunks.set(k, bits);
    }
    const i = (y - cy * CHUNK_SIZE) * CHUNK_SIZE + (x - cx * CHUNK_SIZE);
    const mask = 1 << (i & 7);
    if (bits[i >> 3] & mask) return false;
    bits[i >> 3] |= mask;
    this.versions.set(k, (this.versions.get(k) ?? 0) + 1);
    return true;
  }

  isExplored(x: number, y: number): boolean {
    const cx = Math.floor(x / CHUNK_SIZE);
    const cy = Math.floor(y / CHUNK_SIZE);
    const bits = this.chunks.get(key(cx, cy));
    if (!bits) return false;
    const i = (y - cy * CHUNK_SIZE) * CHUNK_SIZE + (x - cx * CHUNK_SIZE);
    return (bits[i >> 3] & (1 << (i & 7))) !== 0;
  }

  /** Bits do chunk (null = nada descoberto nele) e a versão, para o cache do minimapa. */
  chunk(cx: number, cy: number): { bits: Uint8Array; version: number } | null {
    const k = key(cx, cy);
    const bits = this.chunks.get(k);
    return bits ? { bits, version: this.versions.get(k) ?? 0 } : null;
  }

  /** Chunks com algo descoberto, como `{ cx, cy }` (o mapa grande desenha só esses). */
  chunkCoords(): Array<{ cx: number; cy: number }> {
    return [...this.chunks.keys()].map((k) => {
      const [cx, cy] = k.split(',').map(Number);
      return { cx, cy };
    });
  }

  /** Total de células descobertas (estatística e testes). */
  get count(): number {
    let n = 0;
    for (const bits of this.chunks.values()) for (const b of bits) for (let v = b; v; v &= v - 1) n++;
    return n;
  }

  /** Para o salvamento: um item por chunk com algo descoberto, bits em base64. */
  toSave(): Array<{ cx: number; cy: number; bits: string }> {
    return [...this.chunks.entries()].map(([k, bits]) => {
      const [cx, cy] = k.split(',').map(Number);
      let s = '';
      for (const b of bits) s += String.fromCharCode(b);
      return { cx, cy, bits: btoa(s) };
    });
  }

  /** Restaura (ignora itens malformados). */
  load(list: Array<{ cx: number; cy: number; bits: string }> | undefined): void {
    this.chunks.clear();
    this.versions.clear();
    for (const c of list ?? []) {
      try {
        const raw = Uint8Array.from(atob(c.bits), (ch) => ch.charCodeAt(0));
        if (raw.length !== BYTES || !Number.isInteger(c.cx) || !Number.isInteger(c.cy)) continue;
        this.chunks.set(key(c.cx, c.cy), raw);
        this.versions.set(key(c.cx, c.cy), 1);
      } catch {
        /* item corrompido: fica coberto pela névoa */
      }
    }
  }
}
