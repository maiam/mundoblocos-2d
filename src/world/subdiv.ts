import { CHUNK_SIZE } from '../config';
import { fromB64, toB64 } from '../net/b64';
import { Block, blockDef, type BlockId } from './blocks';

/**
 * Migração da grade fina (ADR 0032, F6): converte o que o jogo e a sala SALVAM de uma grade antiga (cada célula = `from`) para a nova
 * (`to`; hoje 1 → 2). Funções puras e sem DOM, compartilhadas pelo salvamento do navegador (`game/save.ts`) e pelo arquivo da sala no
 * servidor (`net/room.ts`, que o servidor roda pelo pacote do jogo).
 *
 * Regras: o chão repete nas `f × f` células; blocos e objetos "contínuos" (cubos, paredes, portas, cercas, plantações, ar) também;
 * objetos soltos (árvores, flores, baús, fogueira, caldeirão, forno, cadeira…) ficam numa célula só — a do canto inferior esquerdo, a
 * mesma regra de `upsampleTown` — e o resto da célula antiga vira ar. Pontos contínuos (jogador, bichos) multiplicam por `f`; pontos de
 * célula (tenda, baús, buracos) vão para o canto. Diminuir a grade não é suportado (devolve erro): quem abre um arquivo mais fino que o
 * jogo não o altera (`SaveStore`, `Room`).
 */

/** Fator inteiro de `from` para `to`; erro se `to` não for múltiplo (ou for menor). */
export function rescaleFactor(from: number, to: number): number {
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to < from || to % from !== 0) {
    throw new Error(`grade ${from} → ${to} não suportada`);
  }
  return to / from;
}

/** O bloco se repete nas células novas (contínuo) em vez de ficar numa célula só? */
export function repeatsWhenRescaled(id: BlockId): boolean {
  if (id === Block.AIR || id === Block.TENT || id === Block.TENT_PART || id === Block.TOWN_PART) return true;
  const shape = blockDef(id).shape;
  return shape === 'cube' || shape === 'wall' || shape === 'wall-door' || shape === 'door' || shape === 'fence' || shape === 'crop';
}

export interface ChunkEdit { cx: number; cy: number; ground: Uint8Array; levels: Uint8Array[] }

/** Um chunk salvo na grade antiga → os `f × f` chunks da grade nova que ele cobre (uma lista, sem repetir chunk). */
export function rescaleChunk(c: ChunkEdit, f: number): ChunkEdit[] {
  if (f === 1) return [c];
  const out = new Map<string, ChunkEdit>();
  const target = (gx: number, gy: number): { t: ChunkEdit; i: number } => {
    const tcx = Math.floor(gx / CHUNK_SIZE);
    const tcy = Math.floor(gy / CHUNK_SIZE);
    const k = `${tcx},${tcy}`;
    let t = out.get(k);
    if (!t) {
      t = { cx: tcx, cy: tcy, ground: new Uint8Array(CHUNK_SIZE * CHUNK_SIZE), levels: c.levels.map(() => new Uint8Array(CHUNK_SIZE * CHUNK_SIZE)) };
      out.set(k, t);
    }
    return { t, i: (gy - tcy * CHUNK_SIZE) * CHUNK_SIZE + (gx - tcx * CHUNK_SIZE) };
  };
  for (let ly = 0; ly < CHUNK_SIZE; ly++) {
    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      const src = ly * CHUNK_SIZE + lx;
      for (let dy = 0; dy < f; dy++) {
        for (let dx = 0; dx < f; dx++) {
          const { t, i } = target((c.cx * CHUNK_SIZE + lx) * f + dx, (c.cy * CHUNK_SIZE + ly) * f + dy);
          t.ground[i] = c.ground[src];
          const corner = dx === 0 && dy === f - 1; // canto inferior esquerdo da célula antiga
          c.levels.forEach((l, k) => { t.levels[k][i] = repeatsWhenRescaled(l[src] as BlockId) || corner ? l[src] : Block.AIR; });
        }
      }
    }
  }
  return [...out.values()];
}

/** Chunks em base64 (o formato do salvamento e do arquivo da sala): o mesmo `rescaleChunk`, entrando e saindo como texto. */
export interface ChunkRecord { cx: number; cy: number; ground: string; levels: string[] }
export function rescaleChunkRecords<T extends ChunkRecord>(list: readonly T[], f: number): ChunkRecord[] {
  if (f === 1) return [...list];
  return list.flatMap((r) => rescaleChunk({ cx: r.cx, cy: r.cy, ground: fromB64(r.ground), levels: r.levels.map(fromB64) }, f))
    .map((c) => ({ cx: c.cx, cy: c.cy, ground: toB64(c.ground), levels: c.levels.map(toB64) }));
}

/** Ponto contínuo (jogador, bichos, casas deles): multiplica por `f`. */
export function rescaleXY(x: number, y: number, f: number): [number, number] {
  return [x * f, y * f];
}

/** Célula de um objeto único (tenda, baú): vai para o canto inferior esquerdo da célula antiga. */
export function rescaleCell(x: number, y: number, f: number): [number, number] {
  return [x * f, y * f + f - 1];
}

/** Chave "x,y" de célula (baús): idem `rescaleCell`. */
export function rescaleCellKey(key: string, f: number): string {
  const [x, y] = key.split(',').map(Number);
  const [nx, ny] = rescaleCell(x, y, f);
  return `${nx},${ny}`;
}

/** Buracos `[x, y, segundos]`: cada célula antiga vira `f × f` buracos (o chão repete), todos com a mesma idade. */
export function rescaleHoles(holes: ReadonlyArray<[number, number, number]>, f: number): Array<[number, number, number]> {
  if (f === 1) return holes.map((h) => [...h]);
  return holes.flatMap(([x, y, s]) => {
    const out: Array<[number, number, number]> = [];
    for (let dy = 0; dy < f; dy++) for (let dx = 0; dx < f; dx++) out.push([x * f + dx, y * f + dy, s]);
    return out;
  });
}

/** Névoa do minimapa (um bit por célula, por chunk, em base64): cada célula descoberta vira `f × f` descobertas. */
export function rescaleExplored(list: ReadonlyArray<{ cx: number; cy: number; bits: string }>, f: number): Array<{ cx: number; cy: number; bits: string }> {
  if (f === 1) return list.map((c) => ({ ...c }));
  const out = new Map<string, { cx: number; cy: number; bits: Uint8Array }>();
  const bytes = (CHUNK_SIZE * CHUNK_SIZE) / 8;
  for (const c of list) {
    let raw: Uint8Array;
    try { raw = fromB64(c.bits); } catch { continue; }
    if (raw.length !== bytes) continue;
    for (let i = 0; i < CHUNK_SIZE * CHUNK_SIZE; i++) {
      if (!(raw[i >> 3] & (1 << (i & 7)))) continue;
      const lx = i % CHUNK_SIZE;
      const ly = Math.floor(i / CHUNK_SIZE);
      for (let dy = 0; dy < f; dy++) {
        for (let dx = 0; dx < f; dx++) {
          const gx = (c.cx * CHUNK_SIZE + lx) * f + dx;
          const gy = (c.cy * CHUNK_SIZE + ly) * f + dy;
          const tcx = Math.floor(gx / CHUNK_SIZE);
          const tcy = Math.floor(gy / CHUNK_SIZE);
          const k = `${tcx},${tcy}`;
          let t = out.get(k);
          if (!t) out.set(k, (t = { cx: tcx, cy: tcy, bits: new Uint8Array(bytes) }));
          const j = (gy - tcy * CHUNK_SIZE) * CHUNK_SIZE + (gx - tcx * CHUNK_SIZE);
          t.bits[j >> 3] |= 1 << (j & 7);
        }
      }
    }
  }
  return [...out.values()].map((t) => ({ cx: t.cx, cy: t.cy, bits: toB64(t.bits) }));
}
