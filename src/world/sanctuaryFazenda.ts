import { Block, cropId, FLOWER_BLOCKS } from './blocks';
import { FAZENDA_AGUA, FAZENDA_ALTURAS } from './fazendaData';
import { hash2 } from './random';
import { RIO_LAGO } from './rio';

/**
 * Fazenda do Santuário (v0.93.152): o bloco de 4 × 4 chunks (64 × 64 células) a leste do Santuário original, feito a partir do **heightmap** do dono do produto
 * (`assets-src/santuario-fazenda`, dados em `fazendaData.ts` por `scripts/make-fazenda-data.py`). Função PURA (sem DOM, sem `Math.random()`): sempre a mesma.
 *
 * Alturas: o heightmap vai de 0 a 8 unidades; no jogo cada cubo vale 1 nível (a pilha do Santuário tem 8). A planície do pátio e das plantações (2,0) é a pilha de
 * 2 cubos do Santuário; os patamares do norte (4, 6 e 8) viram 4, 6 e 7 (o nível 8 não deixaria espaço para objetos em cima). O rio é escavado 1 cubo abaixo da
 * margem, com a água (pincel Lago do Rio das Fadas) no topo da pilha; a queda ao norte vira degraus de água (superfície plana por célula).
 * Objetos (pátio, duas casas, plantações cercadas, ponte, árvores, flores) ficam em cima da pilha, como no resto do Santuário.
 */
export const FAZENDA_N = 64;
/** Pilha máxima do Santuário (`SANCTUARY_MAX_STACK`); objetos de superfície precisam de `altura < MAX`. */
const MAX_H = 7;

export type Column = number[];

/** Retângulos (colunas c0..c1, linhas r0..r1, inclusivos) das áreas planas do pacote do heightmap. */
export const FAZENDA_AREAS = {
  patio: { c0: 7, c1: 26, r0: 28, r1: 33 },
  milho: { c0: 5, c1: 17, r0: 35, r1: 41 },
  aboboras: { c0: 21, c1: 30, r0: 35, r1: 41 },
  horta: { c0: 5, c1: 17, r0: 45, r1: 51 },
  trigo: { c0: 21, c1: 30, r0: 45, r1: 51 },
  talhao: { c0: 5, c1: 17, r0: 55, r1: 59 },
} as const;

const dec = (ch: string): number => parseInt(ch, 36) / 4;
const at = (r: number, c: number, n = FAZENDA_N): number => r * n + c;

/** Alturas (cubos) por célula depois do arredondamento e do alisamento de degraus (diferença ≤ 1 entre vizinhos secos). Exportado para os testes. */
export function fazendaHeights(): { h: Uint8Array; wet: Uint8Array } {
  const N = FAZENDA_N;
  const h = new Uint8Array(N * N);
  const wet = new Uint8Array(N * N);
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const i = at(r, c);
      const w = FAZENDA_AGUA[r][c];
      if (w !== '.') { wet[i] = 1; h[i] = Math.max(1, Math.min(MAX_H, Math.round(dec(w)))); }
      else h[i] = Math.max(1, Math.min(MAX_H, Math.round(dec(FAZENDA_ALTURAS[r][c]))));
    }
  }
  const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;
  // Margem nunca abaixo da água vizinha; dois cubos secos vizinhos nunca diferem mais de 1 (o jogador sobe 1 nível por vez).
  for (let pass = 0; pass < 12; pass++) {
    let changed = false;
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        const i = at(r, c);
        if (wet[i]) continue;
        for (const [dx, dy] of nb) {
          const rr = r + dy, cc = c + dx;
          if (rr < 0 || cc < 0 || rr >= N || cc >= N) continue;
          const j = at(rr, cc);
          if (wet[j]) { if (h[i] < h[j]) { h[i] = h[j]; changed = true; } continue; }
          if (h[i] > h[j] + 1) { h[i] = h[j] + 1; changed = true; }
        }
      }
    }
    if (!changed) break;
  }
  return { h, wet };
}

export function buildFazenda(seed: number): Column[] {
  const N = FAZENDA_N;
  const { h, wet } = fazendaHeights();
  const top = new Uint16Array(N * N).fill(Block.GRASS);
  const obj = new Uint16Array(N * N);
  const keep = new Uint8Array(N * N);
  const custom = new Map<number, Column>();
  const inRect = (r: number, c: number, a: { c0: number; c1: number; r0: number; r1: number }, m = 0): boolean => c >= a.c0 - m && c <= a.c1 + m && r >= a.r0 - m && r <= a.r1 + m;
  const ok = (r: number, c: number): boolean => r >= 0 && c >= 0 && r < N && c < N;

  // Praia de areia nas margens baixas do rio.
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const i = at(r, c);
      if (wet[i]) { top[i] = RIO_LAGO; keep[i] = 1; continue; }
      if (h[i] > 2) continue;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (ok(r + dr, c + dc) && wet[at(r + dr, c + dc)]) { top[i] = Block.SAND; keep[i] = 1; }
    }
  }

  const A = FAZENDA_AREAS;
  // Pátio de terra batida.
  for (let r = A.patio.r0; r <= A.patio.r1; r++) for (let c = A.patio.c0; c <= A.patio.c1; c++) { top[at(r, c)] = Block.PATH; keep[at(r, c)] = 1; }

  // Duas casas de madeira (4 × 5 paredes e telhado) com a porta ao sul.
  const hut = (c0: number, r0: number, w: number, hh: number): void => {
    for (let r = r0; r < r0 + hh; r++) {
      for (let c = c0; c < c0 + w; c++) {
        const i = at(r, c);
        keep[i] = 1;
        const edge = c === c0 || c === c0 + w - 1 || r === r0 || r === r0 + hh - 1;
        const corner = (c === c0 || c === c0 + w - 1) && (r === r0 || r === r0 + hh - 1);
        const wall = corner ? Block.OAK_LOG : Block.OAK_PLANKS;
        const door = r === r0 + hh - 1 && c === c0 + 2;
        custom.set(i, edge
          ? [Block.STONE, Block.OAK_PLANKS, door ? Block.OAK_DOOR : wall, door ? Block.OAK_PLANKS : wall, Block.OAK_PLANKS]
          : [Block.STONE, Block.OAK_PLANKS, Block.AIR, Block.AIR, Block.OAK_PLANKS]);
      }
    }
  };
  hut(9, 28, 6, 5);
  hut(19, 28, 6, 5);
  for (const [c, r] of [[17, 29], [17, 32]] as const) obj[at(r, c)] = Block.ISO_LANTERN;

  // Plantações cercadas: Terra Arada com a cultura madura em cima; portão ao sul. O talhão preparado fica só com Terra Arada.
  const field = (a: { c0: number; c1: number; r0: number; r1: number }, kinds: Array<'wheat' | 'potato' | 'tomato' | 'carrot' | null>): void => {
    for (let r = a.r0 - 1; r <= a.r1 + 1; r++) {
      for (let c = a.c0 - 1; c <= a.c1 + 1; c++) {
        const i = at(r, c);
        keep[i] = 1;
        if (inRect(r, c, a)) {
          top[i] = Block.TILLED;
          const kind = kinds[(r - a.r0) % kinds.length];
          if (kind) obj[i] = cropId(kind, 15);
        } else obj[i] = r === a.r1 + 1 && c === Math.floor((a.c0 + a.c1) / 2) ? Block.FENCE_GATE : Block.FENCE;
      }
    }
  };
  field(A.milho, ['wheat']);
  field(A.aboboras, ['tomato']);
  field(A.horta, ['carrot', 'potato']);
  field(A.trigo, ['wheat']);
  field(A.talhao, [null]);

  // Ponte de tábuas sobre o rio na linha do pátio (rente à margem), da casa leste até a outra margem.
  const BR = 31;
  let started = false;
  for (let c = A.patio.c1 + 1; c < N; c++) {
    const i = at(BR, c);
    if (wet[i]) {
      started = true;
      custom.set(i, [...Array(Math.max(0, h[i] - 1)).fill(Block.STONE), RIO_LAGO, Block.OAK_PLANKS]);
      keep[i] = 1;
    } else if (started) { top[i] = Block.OAK_PLANKS; keep[i] = 1; break; }
  }

  // Árvores nos patamares e na mata, arbustos e flores (determinísticos pela seed).
  const free = (r: number, c: number): boolean => ok(r, c) && top[at(r, c)] === Block.GRASS && !keep[at(r, c)] && !obj[at(r, c)] && !custom.has(at(r, c));
  const near = (r: number, c: number, d: number, f: (j: number) => boolean): boolean => {
    for (let dr = -d; dr <= d; dr++) for (let dc = -d; dc <= d; dc++) if (ok(r + dr, c + dc) && f(at(r + dr, c + dc))) return true;
    return false;
  };
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const i = at(r, c);
      if (!free(r, c) || near(r, c, 2, (j) => !!keep[j] && !wet[j] && top[j] !== Block.SAND)) continue;
      const x = c + 32, y = r - 32;
      const p = hash2(seed, x, y);
      if (p < (h[i] >= 4 ? 0.05 : 0.012) && !near(r, c, 2, (j) => obj[j] === Block.ISO_TREE)) obj[i] = Block.ISO_TREE;
    }
  }
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const i = at(r, c);
      if (!free(r, c)) continue;
      const q = hash2(seed ^ 0x2b, c + 32, r - 32);
      const treeNear = near(r, c, 2, (j) => obj[j] === Block.ISO_TREE);
      const bank = near(r, c, 2, (j) => !!wet[j]);
      if ((treeNear && q < 0.1) || (bank && q < 0.06)) obj[i] = q < 0.02 ? Block.ISO_BUSH_L : q < 0.04 ? Block.ISO_BUSH_M : Block.ISO_BUSH_S;
      else if (h[i] <= 2 && q > 0.9 && hash2(seed ^ 0x3c, c >> 2, r >> 2) < 0.35) obj[i] = FLOWER_BLOCKS[Math.floor(hash2(seed ^ 0x77, c >> 1, r >> 1) * FLOWER_BLOCKS.length)];
    }
  }

  // Colunas finais: pedra por baixo, bloco do topo e o objeto de superfície por cima da pilha.
  const out: Column[] = [];
  for (let i = 0; i < N * N; i++) {
    const c = custom.get(i);
    if (c) { out.push(c); continue; }
    const hh = h[i];
    let col: Column;
    if (wet[i]) col = [...Array(hh - 1).fill(Block.STONE), RIO_LAGO];
    else if (hh === 1) col = [top[i]];
    else if (hh === 2) col = [Block.STONE, top[i]];
    else col = [...Array(hh - 1).fill(Block.STONE), top[i]]; // paredes dos patamares em pedra
    if (obj[i] && !wet[i] && hh <= MAX_H) col[hh] = obj[i];
    out.push(col);
  }
  return out;
}
