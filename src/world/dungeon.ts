import { CHUNK_SIZE } from '../config';
import type { Biome } from './biomes';
import { Block, type BlockId, blockDef } from './blocks';
import { hash2, mulberry32 } from './random';
import type { Cell, TerrainSource } from './terrain';

/**
 * Dungeon 01 — Covil das Aranhas: LABIRINTO procedural (função pura da seed), em três etapas:
 *  1. Área: tamanho sorteado pela seed (`dungeonSize`), num lugar isolado do mapa (`isolatedDungeon`, ADR 0019): no
 *     mundo só existe a entrada — a caverna (`planCave`), a pelo menos 10 chunks do castelo.
 *  2. Labirinto (`buildMaze`): só chão e paredes — caminhos sinuosos, bifurcações, circuitos, becos sem saída,
 *     câmaras, UMA entrada no perímetro e a câmara da Rainha (chefe) com UMA passagem, no ponto mais fundo.
 *  3. Conteúdo (`decorateDungeon`): blocos de chão/parede, obstáculos nas câmaras e monstros, respeitando a geometria.
 * O mapa lógico é completo antes de existir qualquer chunk; cada chunk só copia a sua parte (`DungeonTerrain`),
 * então corredores atravessam chunks sem interrupção e recarregar um chunk não muda o labirinto.
 */

/** Lobos do mapa (v0.91.0): três cores, cada bando de uma cor só. */
export type WolfKind = 'wolf-brown' | 'wolf-gray' | 'wolf-white';
export const WOLF_KINDS: readonly WolfKind[] = ['wolf-brown', 'wolf-gray', 'wolf-white'];
export type MonsterKind = 'spider-small' | 'spider-big' | 'spider-boss' | WolfKind | 'goblin';

/** É um monstro do mundo aberto, gerado por seed fora da dungeon? */
export function isOpenWorldMonster(kind: MonsterKind): boolean {
  return isWolf(kind) || kind === 'goblin';
}

/** É um lobo (monstro do mapa aberto, não da dungeon)? */
export function isWolf(kind: MonsterKind): kind is WolfKind {
  return (WOLF_KINDS as readonly string[]).includes(kind);
}
export type Side = 'north' | 'south' | 'west' | 'east';

export interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface MonsterSpawn {
  kind: MonsterKind;
  x: number;
  y: number;
}

/** Espessura do perímetro (anel de montanhas + anel de parede) e passo da grade lógica de nós (blocos). */
const PERIMETER = 2;
const NODE = 6;
/** Câmara da Rainha: bloco de 3 × 3 nós. */
const BOSS_NODES = 3;

/** Resultado da etapa 2: geometria pura (sem blocos nem monstros). */
export interface Maze {
  w: number;
  h: number;
  /** 1 = chão, 0 = parede (índice = y * w + x, relativo ao canto da área). */
  floor: Uint8Array;
  side: Side;
  /** Células (relativas) do vão da entrada no perímetro. */
  gate: Array<[number, number]>;
  /** Chegada logo dentro da entrada (relativa). */
  inside: [number, number];
  /** Câmaras abertas e câmara da Rainha (relativas, inclusivas). */
  chambers: Rect[];
  bossRoom: Rect;
  /** Célula (relativa) da única passagem que liga o labirinto à câmara da Rainha. */
  bossDoor: [number, number];
}

export interface DungeonLayout {
  w: number;
  h: number;
  /** Área inteira (perímetro incluído), em coordenadas do mundo, inclusiva. Protegida: nada quebra/coloca. */
  area: Rect;
  /** Interior (sem o perímetro). Monstros nunca saem daqui. */
  interior: Rect;
  side: Side;
  gate: Array<[number, number]>;
  /** Célula do lado de fora, diante da entrada. */
  doorstep: [number, number];
  chambers: Rect[];
  bossRoom: Rect;
  bossHome: [number, number];
  spawns: MonsterSpawn[];
  /** Mapa da área: chão e objeto por célula (índice = (y - y0) * w + (x - x0)). */
  ground: Uint8Array;
  objects: Uint8Array;
}

export function inRect(r: Rect, x: number, y: number): boolean {
  return x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1;
}

const shift = (r: Rect, dx: number, dy: number): Rect => ({ x0: r.x0 + dx, y0: r.y0 + dy, x1: r.x1 + dx, y1: r.y1 + dy });

/** Tamanho da área pela seed: ~100 × 72 blocos (cerca de 9× a primeira versão), variando a cada geração. */
export function dungeonSize(seed: number): [number, number] {
  return [96 + Math.floor(hash2(seed, 811, 3) * 13), 66 + Math.floor(hash2(seed, 812, 5) * 13)];
}

// ---------------------------------------------------------------------------------------------
// Etapa 2 — labirinto
// ---------------------------------------------------------------------------------------------

/**
 * Constrói o labirinto numa área w × h com a entrada no lado `side`.
 * Grade lógica de nós (passo NODE): cada nó é um trecho de corredor; arestas abertas viram corredores.
 * A coluna/linha 0 de cada célula de nó é sempre parede, então só arestas abertas atravessam entre nós.
 */
export function buildMaze(seed: number, w: number, h: number, side: Side): Maze {
  const rand = mulberry32((seed ^ 0x5f3759df) >>> 0);
  const ri = (n: number) => Math.floor(rand() * n);
  const gw = Math.floor((w - 2 * PERIMETER) / NODE);
  const gh = Math.floor((h - 2 * PERIMETER) / NODE);
  const node = (i: number, j: number) => j * gw + i;
  const floor = new Uint8Array(w * h);
  const carve = (x0: number, y0: number, x1: number, y1: number) => {
    for (let y = Math.max(0, Math.min(y0, y1)); y <= Math.min(h - 1, Math.max(y0, y1)); y++) {
      for (let x = Math.max(0, Math.min(x0, x1)); x <= Math.min(w - 1, Math.max(x0, x1)); x++) floor[y * w + x] = 1;
    }
  };
  const cellX = (i: number) => PERIMETER + i * NODE;
  const cellY = (j: number) => PERIMETER + j * NODE;
  // Centro de cada nó com deslocamento (geometria não simétrica) e largura do corredor (2 ou 3).
  const cx = new Int16Array(gw * gh);
  const cy = new Int16Array(gw * gh);
  const width = new Uint8Array(gw * gh);
  for (let j = 0; j < gh; j++) {
    for (let i = 0; i < gw; i++) {
      cx[node(i, j)] = cellX(i) + 3 + ri(3) - 1;
      cy[node(i, j)] = cellY(j) + 3 + ri(3) - 1;
      width[node(i, j)] = rand() < 0.4 ? 3 : 2;
    }
  }

  // Entrada: nó na borda do lado escolhido; Rainha: bloco 3×3 de nós na borda oposta.
  const horizontal = side === 'west' || side === 'east';
  const along = horizontal ? gh : gw;
  const entryK = 1 + ri(along - 2);
  const entry = side === 'west' ? node(0, entryK) : side === 'east' ? node(gw - 1, entryK)
    : side === 'north' ? node(entryK, 0) : node(entryK, gh - 1);
  const bk = ri(along - BOSS_NODES + 1);
  const bi0 = side === 'west' ? gw - BOSS_NODES : side === 'east' ? 0 : bk;
  const bj0 = side === 'north' ? gh - BOSS_NODES : side === 'south' ? 0 : bk;
  const isBoss = (i: number, j: number) => i >= bi0 && i < bi0 + BOSS_NODES && j >= bj0 && j < bj0 + BOSS_NODES;

  // Arestas abertas (índice do nó → vizinhos conectados).
  const open = new Map<number, Set<number>>();
  const link = (a: number, b: number) => {
    if (!open.has(a)) open.set(a, new Set());
    if (!open.has(b)) open.set(b, new Set());
    open.get(a)!.add(b);
    open.get(b)!.add(a);
  };
  const neighbors = (n: number): number[] => {
    const i = n % gw;
    const j = Math.floor(n / gw);
    const out: number[] = [];
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ni = i + di;
      const nj = j + dj;
      if (ni >= 0 && nj >= 0 && ni < gw && nj < gh && !isBoss(ni, nj)) out.push(node(ni, nj));
    }
    return out;
  };

  // Árvore geradora "growing tree": mais recente (caminhos longos e sinuosos) misturado com aleatório
  // (ramificações). Becos sem saída surgem naturalmente nas folhas da árvore.
  const visited = new Uint8Array(gw * gh);
  const active = [entry];
  visited[entry] = 1;
  while (active.length) {
    const k = rand() < 0.75 ? active.length - 1 : ri(active.length);
    const cur = active[k];
    const next = neighbors(cur).filter((n) => !visited[n]);
    if (!next.length) {
      active.splice(k, 1);
      continue;
    }
    const n = next[ri(next.length)];
    visited[n] = 1;
    link(cur, n);
    active.push(n);
  }
  // Circuitos: algumas paredes extras viram passagem (corredores que se reconectam).
  for (let n = 0; n < gw * gh; n++) {
    if (!visited[n]) continue;
    for (const m of neighbors(n)) if (m > n && !open.get(n)?.has(m) && rand() < 0.09) link(n, m);
  }

  // Câmaras abertas: retângulos de 2×2 ou 3×2 nós (fora da Rainha e da entrada).
  const chambersN: Array<[number, number, number, number]> = [];
  const target = Math.max(3, Math.round((gw * gh) / 30));
  for (let t = 0; t < 200 && chambersN.length < target; t++) {
    const cw = 2 + ri(2);
    const ch = 2 + ri(2) * (cw === 2 ? 1 : 0);
    const i0 = ri(gw - cw + 1);
    const j0 = ri(gh - ch + 1);
    let ok = true;
    for (let j = j0 - 1; j <= j0 + ch && ok; j++) {
      for (let i = i0 - 1; i <= i0 + cw && ok; i++) {
        if (isBoss(i, j) || (i >= 0 && j >= 0 && i < gw && j < gh && node(i, j) === entry)) ok = false;
      }
    }
    for (const [a0, b0, a1, b1] of chambersN) if (i0 <= a1 + 1 && i0 + cw - 1 >= a0 - 1 && j0 <= b1 + 1 && j0 + ch - 1 >= b0 - 1) ok = false;
    if (!ok) continue;
    chambersN.push([i0, j0, i0 + cw - 1, j0 + ch - 1]);
    for (let j = j0; j < j0 + ch; j++) for (let i = i0; i < i0 + cw; i++) {
      if (i + 1 < i0 + cw) link(node(i, j), node(i + 1, j));
      if (j + 1 < j0 + ch) link(node(i, j), node(i, j + 1));
    }
  }

  // Rainha: liga UMA vez, pelo nó vizinho mais fundo (maior distância da entrada pelo grafo final).
  const dist = new Int32Array(gw * gh).fill(-1);
  dist[entry] = 0;
  const q = [entry];
  for (let h0 = 0; h0 < q.length; h0++) {
    for (const m of open.get(q[h0]) ?? []) if (dist[m] < 0) { dist[m] = dist[q[h0]] + 1; q.push(m); }
  }
  let best: [number, number] | null = null; // [nó do labirinto, nó da Rainha]
  for (let j = bj0; j < bj0 + BOSS_NODES; j++) {
    for (let i = bi0; i < bi0 + BOSS_NODES; i++) {
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ni = i + di;
        const nj = j + dj;
        if (ni < 0 || nj < 0 || ni >= gw || nj >= gh || isBoss(ni, nj)) continue;
        const m = node(ni, nj);
        if (!best || dist[m] > dist[best[0]]) best = [m, node(i, j)];
      }
    }
  }

  // ---- Rasterização ----
  const chambers: Rect[] = [];
  for (const [i0, j0, i1, j1] of chambersN) {
    const r = { x0: cellX(i0) + 1, y0: cellY(j0) + 1, x1: cellX(i1) + NODE - 1, y1: cellY(j1) + NODE - 1 };
    chambers.push(r);
  }
  for (let n = 0; n < gw * gh; n++) {
    const i = n % gw;
    const j = Math.floor(n / gw);
    if (isBoss(i, j) || !visited[n]) continue;
    const wd = width[n];
    carve(cx[n] - 1, cy[n] - 1, cx[n] - 2 + wd, cy[n] - 2 + wd);
    for (const m of open.get(n) ?? []) {
      if (m < n) continue;
      // Corredor em L entre os centros (curvas), com a largura do mais estreito.
      const ww = Math.min(wd, width[m]);
      carve(cx[n] - 1, cy[n] - 1, cx[m] - 2 + ww, cy[n] - 2 + ww);
      carve(cx[m] - 1, cy[n] - 1, cx[m] - 2 + ww, cy[m] - 2 + ww);
    }
  }
  // Câmaras: área aberta com bordas irregulares (saliências de 1 bloco onde não há corredor chegando).
  const notches: Array<[number, number]> = [];
  for (const r of chambers) {
    carve(r.x0, r.y0, r.x1, r.y1);
    for (let x = r.x0; x <= r.x1; x++) {
      for (const [y, out] of [[r.y0, r.y0 - 1], [r.y1, r.y1 + 1]]) {
        if (rand() < 0.22 && !floor[out * w + x] && !floor[out * w + x - 1] && !floor[out * w + x + 1]) notches.push([x, y]);
      }
    }
    for (let y = r.y0; y <= r.y1; y++) {
      for (const [x, out] of [[r.x0, r.x0 - 1], [r.x1, r.x1 + 1]]) {
        if (rand() < 0.22 && !floor[y * w + out] && !floor[(y - 1) * w + out] && !floor[(y + 1) * w + out]) notches.push([x, y]);
      }
    }
  }
  for (const [x, y] of notches) floor[y * w + x] = 0;
  // Câmara da Rainha + a única passagem.
  const bossRoom = { x0: cellX(bi0) + 1, y0: cellY(bj0) + 1, x1: cellX(bi0 + BOSS_NODES - 1) + NODE - 1, y1: cellY(bj0 + BOSS_NODES - 1) + NODE - 1 };
  carve(bossRoom.x0, bossRoom.y0, bossRoom.x1, bossRoom.y1);
  const [mn, bn] = best!;
  const bxn = bn % gw;
  const byn = Math.floor(bn / gw);
  const mxn = mn % gw;
  const myn = Math.floor(mn / gw);
  let bossDoor: [number, number];
  if (mxn !== bxn) {
    // Passagem horizontal de 2 blocos de altura, na linha do centro do nó do labirinto.
    const y = cy[mn] - 1;
    const xa = mxn < bxn ? cx[mn] : bossRoom.x1;
    const xb = mxn < bxn ? bossRoom.x0 : cx[mn];
    carve(xa, y, xb, y + 1);
    bossDoor = [mxn < bxn ? bossRoom.x0 - 1 : bossRoom.x1 + 1, y];
  } else {
    const x = cx[mn] - 1;
    const ya = myn < byn ? cy[mn] : bossRoom.y1;
    const yb = myn < byn ? bossRoom.y0 : cy[mn];
    carve(x, ya, x + 1, yb);
    bossDoor = [x, myn < byn ? bossRoom.y0 - 1 : bossRoom.y1 + 1];
  }

  // Entrada: corredor de 3 blocos do nó de entrada até fora do perímetro.
  const gate: Array<[number, number]> = [];
  const ex = cx[entry];
  const ey = cy[entry];
  if (horizontal) {
    const [xa, xb] = side === 'west' ? [0, ex] : [ex, w - 1];
    carve(xa, ey - 1, xb, ey + 1);
    for (let d = 0; d < PERIMETER; d++) for (let k = -1; k <= 1; k++) gate.push([side === 'west' ? d : w - 1 - d, ey + k]);
  } else {
    const [ya, yb] = side === 'north' ? [0, ey] : [ey, h - 1];
    carve(ex - 1, ya, ex + 1, yb);
    for (let d = 0; d < PERIMETER; d++) for (let k = -1; k <= 1; k++) gate.push([ex + k, side === 'north' ? d : h - 1 - d]);
  }
  // Perímetro sempre fechado, exceto o vão da entrada.
  const gateSet = new Set(gate.map(([x, y]) => y * w + x));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const edge = x < PERIMETER || y < PERIMETER || x >= w - PERIMETER || y >= h - PERIMETER;
      if (edge && !gateSet.has(y * w + x)) floor[y * w + x] = 0;
    }
  }
  const inside: [number, number] = [ex, ey];
  // Validação da navegação: chão que não se alcança a partir da entrada (ex.: canto fechado por saliências) vira parede.
  const maze: Maze = { w, h, floor, side, gate, inside, chambers, bossRoom, bossDoor };
  const reach = floorDistances(maze, ex, ey);
  for (let i = 0; i < w * h; i++) if (floor[i] && reach[i] < 0) floor[i] = 0;
  return maze;
}

// ---------------------------------------------------------------------------------------------
// Etapa 3 — conteúdo (blocos, obstáculos e monstros), respeitando a geometria
// ---------------------------------------------------------------------------------------------

const PROPS: BlockId[] = [Block.DUNGEON_ROCK, Block.DUNGEON_ROCK, Block.DUNGEON_ROCK, Block.DUNGEON_EGGS,
  Block.DUNGEON_MUSHROOM, Block.DUNGEON_SPIKES, Block.DUNGEON_ROOTS];
/** Chão por monstro (blocos): a quantidade cresce com o tamanho do labirinto. */
const FLOOR_PER_SMALL = 110;
const FLOOR_PER_BIG = 320;

/** Distâncias (passos) a partir de uma célula, pelo chão. */
function floorDistances(m: Maze, sx: number, sy: number): Int32Array {
  const d = new Int32Array(m.w * m.h).fill(-1);
  d[sy * m.w + sx] = 0;
  const q = [sy * m.w + sx];
  for (let h = 0; h < q.length; h++) {
    const i = q[h];
    const x = i % m.w;
    const y = Math.floor(i / m.w);
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h) continue;
      const k = ny * m.w + nx;
      if (m.floor[k] && d[k] < 0) { d[k] = d[i] + 1; q.push(k); }
    }
  }
  return d;
}

export function decorateDungeon(seed: number, m: Maze, x0: number, y0: number): DungeonLayout {
  const { w, h } = m;
  const ground = new Uint8Array(w * h);
  const objects = new Uint8Array(w * h);
  const idx = (x: number, y: number) => y * w + x;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = idx(x, y);
      const r = hash2(seed, x * 3 + 101, y * 5 - 77);
      ground[i] = r < 0.84 ? Block.DUNGEON_DIRT : r < 0.92 ? Block.DUNGEON_MOSS : r < 0.97 ? Block.DUNGEON_WEB : Block.DUNGEON_BONES;
      if (m.floor[i]) continue;
      const outer = x === 0 || y === 0 || x === w - 1 || y === h - 1;
      ground[i] = Block.DUNGEON_DIRT;
      objects[i] = outer ? Block.DUNGEON_MOUNTAIN : Block.DUNGEON_WALL;
    }
  }
  // Obstáculos só no miolo das câmaras (2 blocos longe da borda) e isolados → nunca fecham o caminho.
  const [bhx, bhy] = [(m.bossRoom.x0 + m.bossRoom.x1) >> 1, (m.bossRoom.y0 + m.bossRoom.y1) >> 1];
  for (const r of [...m.chambers, m.bossRoom]) {
    for (let y = r.y0 + 2; y <= r.y1 - 2; y++) {
      for (let x = r.x0 + 2; x <= r.x1 - 2; x++) {
        if (!m.floor[idx(x, y)] || hash2(seed, x + 913, y - 211) > 0.12) continue;
        if (r === m.bossRoom && Math.hypot(x - bhx, y - bhy) < 5) continue; // arena livre
        let lonely = true;
        for (let dy = -1; dy <= 1 && lonely; dy++) for (let dx = -1; dx <= 1; dx++) {
          if (!m.floor[idx(x + dx, y + dy)] || objects[idx(x + dx, y + dy)] !== Block.AIR) lonely = false;
        }
        if (lonely) objects[idx(x, y)] = PROPS[Math.floor(hash2(seed, x - 57, y + 389) * PROPS.length)];
      }
    }
  }
  // Monstros: quantidade proporcional ao chão; longe da entrada, fora da câmara da Rainha, espaçados.
  const dist = floorDistances(m, m.inside[0], m.inside[1]);
  const free: number[] = [];
  for (let i = 0; i < w * h; i++) {
    const x = i % w;
    const y = Math.floor(i / w);
    if (m.floor[i] && objects[i] === Block.AIR && dist[i] >= 14 && !inRect(m.bossRoom, x, y)) free.push(i);
  }
  const want: MonsterKind[] = [
    ...Array<MonsterKind>(Math.round(free.length / FLOOR_PER_BIG)).fill('spider-big'),
    ...Array<MonsterKind>(Math.round(free.length / FLOOR_PER_SMALL)).fill('spider-small'),
  ];
  const spawns: MonsterSpawn[] = [{ kind: 'spider-boss', x: x0 + bhx + 0.5, y: y0 + bhy + 0.5 }];
  const taken: Array<[number, number]> = [];
  for (let n = 0; n < 20000 && want.length && free.length; n++) {
    const i = free[Math.floor(hash2(seed, n, 4441) * free.length)];
    const x = i % w;
    const y = Math.floor(i / w);
    if (taken.some(([tx, ty]) => Math.abs(tx - x) + Math.abs(ty - y) < 4)) continue;
    taken.push([x, y]);
    spawns.push({ kind: want.shift()!, x: x0 + x + 0.5, y: y0 + y + 0.5 });
  }
  // gate[1] = célula central do vão na borda externa (ordem: anel externo primeiro, k = -1, 0, 1).
  const out = { north: [0, -1], south: [0, 1], west: [-1, 0], east: [1, 0] }[m.side];
  const c = m.gate[1];
  return {
    w, h,
    area: { x0, y0, x1: x0 + w - 1, y1: y0 + h - 1 },
    interior: { x0: x0 + PERIMETER, y0: y0 + PERIMETER, x1: x0 + w - 1 - PERIMETER, y1: y0 + h - 1 - PERIMETER },
    side: m.side,
    gate: m.gate.map(([x, y]) => [x0 + x, y0 + y] as [number, number]),
    doorstep: [x0 + c[0] + out[0], y0 + c[1] + out[1]],
    chambers: m.chambers.map((r) => shift(r, x0, y0)),
    bossRoom: shift(m.bossRoom, x0, y0),
    bossHome: [x0 + bhx, y0 + bhy],
    spawns, ground, objects,
  };
}

/** Labirinto completo (etapas 2 e 3) com o canto em (x0, y0). */
export function buildDungeon(seed: number, x0: number, y0: number, side: Side, size = dungeonSize(seed)): DungeonLayout {
  return decorateDungeon(seed, buildMaze(seed, size[0], size[1], side), x0, y0);
}

// ---------------------------------------------------------------------------------------------
// Covil isolado + entrada de caverna no mundo (ADR 0019)
// ---------------------------------------------------------------------------------------------

/** Canto do covil: coordenadas fixas muito longe de tudo (os interiores ficam em (0, -100000)). */
export const DUNGEON_ORIGIN: [number, number] = [-100000, -100000];
/** Anel de montanhas em volta do covil (ninguém sai andando; o render escurece o que fica fora). */
export const DUNGEON_RIM = 6;
/** Distância mínima da caverna ao centro do castelo (células): 10 chunks. */
export const CAVE_MIN_CASTLE_DIST = 10 * CHUNK_SIZE;
/** Base da caverna no mundo (células): a boca fica no meio da fileira de baixo. */
export const CAVE_W = 5;
export const CAVE_D = 3;

/** Entrada do covil no mundo: base da arte da caverna (sólida, protegida) e a célula diante da boca. */
export interface CaveEntrance {
  /** Canto inferior esquerdo (onde fica `DUNGEON_CAVE`; as outras células são `TOWN_PART`). */
  x: number;
  y: number;
  footprint: Rect;
  /** Célula diante da boca: andar para cima nela = entrar; ao sair do covil, volta para cá. */
  outside: [number, number];
  /** Área protegida (base + anel) e área limpa diante da boca (sem árvores nem água). */
  guard: Rect;
  front: Rect;
}

/** O labirinto do mundo, sempre com a entrada ao sul, no canto isolado. */
export function isolatedDungeon(seed: number): DungeonLayout {
  return buildDungeon(seed, DUNGEON_ORIGIN[0], DUNGEON_ORIGIN[1], 'south');
}

/** Área do covil com o anel de montanhas (protegida). */
export function dungeonGuard(l: DungeonLayout): Rect {
  return { x0: l.area.x0 - DUNGEON_RIM, y0: l.area.y0 - DUNGEON_RIM, x1: l.area.x1 + DUNGEON_RIM, y1: l.area.y1 + DUNGEON_RIM };
}

/** Onde se chega ao entrar: logo para dentro do vão da entrada, no centro. */
export function dungeonEntry(l: DungeonLayout): [number, number] {
  const c = l.gate[l.gate.length - 2]; // anel mais interno do vão, k = 0
  const inward = { north: [0, 1], south: [0, -1], west: [1, 0], east: [-1, 0] }[l.side];
  return [c[0] + inward[0], c[1] + inward[1]];
}

/** Pisar aqui sai do covil: o anel externo do vão (as 3 células da borda). */
export function isDungeonExit(l: DungeonLayout, x: number, y: number): boolean {
  return l.gate.slice(0, 3).some(([gx, gy]) => gx === x && gy === y);
}

function caveAt(x: number, y: number): CaveEntrance {
  const footprint = { x0: x, y0: y - CAVE_D + 1, x1: x + CAVE_W - 1, y1: y };
  const outside: [number, number] = [x + (CAVE_W >> 1), y + 1];
  return {
    x, y, footprint, outside,
    guard: { x0: footprint.x0 - 1, y0: footprint.y0 - 1, x1: footprint.x1 + 1, y1: footprint.y1 },
    front: { x0: outside[0] - 2, y0: outside[1], x1: outside[0] + 2, y1: outside[1] + 2 },
  };
}

/**
 * Onde fica a caverna: direção e distância sorteadas pela seed, sempre a pelo menos `CAVE_MIN_CASTLE_DIST` do centro
 * do castelo, fora da área a evitar (cidade, estrada, campo do rebanho) e em terra firme (base e frente sem água).
 */
export function planCave(base: TerrainSource, castle: [number, number], avoid: Rect | null): CaveEntrance {
  const seed = base.seed;
  const a0 = hash2(seed, 7001, 3) * Math.PI * 2;
  const overlaps = (r: Rect) => !!avoid && r.x0 <= avoid.x1 && r.x1 >= avoid.x0 && r.y0 <= avoid.y1 && r.y1 >= avoid.y0;
  let fallback: CaveEntrance | null = null;
  for (let t = 0; t < 96; t++) {
    const a = a0 + t * 0.7;
    const dist = CAVE_MIN_CASTLE_DIST + 8 + hash2(seed, 7002, t) * 80 + Math.floor(t / 9) * 24;
    const ox = Math.round(castle[0] + Math.cos(a) * dist);
    const oy = Math.round(castle[1] + Math.sin(a) * dist);
    const cave = caveAt(ox - (CAVE_W >> 1), oy);
    if (Math.hypot(cave.outside[0] - castle[0], cave.outside[1] - castle[1]) < CAVE_MIN_CASTLE_DIST) continue;
    if (overlaps(cave.guard) || overlaps(cave.front)) continue;
    fallback ??= cave;
    let dry = true;
    for (const r of [cave.footprint, cave.front]) {
      for (let y = r.y0; y <= r.y1 && dry; y++) for (let x = r.x0; x <= r.x1 && dry; x++) if (base.groundAt(x, y) === Block.WATER) dry = false;
    }
    if (dry) return cave;
  }
  return fallback!;
}

/**
 * Terreno com o covil e a caverna sobrepostos: no canto isolado, o labirinto cercado por um anel de montanhas (com 3
 * células de chão diante do vão); no mundo, a base da caverna (sólida) e a frente da boca limpa. Fora disso, o terreno base.
 */
export class DungeonTerrain implements TerrainSource {
  private readonly guard: Rect;
  private readonly landing: Rect;

  constructor(private readonly base: TerrainSource, readonly layout: DungeonLayout, readonly cave: CaveEntrance | null = null) {
    this.guard = dungeonGuard(layout);
    const [dx, dy] = layout.doorstep;
    this.landing = layout.side === 'north' || layout.side === 'south' ? { x0: dx - 1, y0: dy, x1: dx + 1, y1: dy } : { x0: dx, y0: dy - 1, x1: dx, y1: dy + 1 };
  }

  private clearFront(c: Cell): Cell {
    return { ground: blockDef(c.ground).liquid || c.ground === Block.HOLE ? Block.GRASS : c.ground, object: Block.AIR, upper: Block.AIR };
  }

  get seed(): number {
    return this.base.seed;
  }

  /** Célula sobreposta, ou null se for terreno base puro. `baseCell` só é calculada quando precisa. */
  private overlay(x: number, y: number, baseCell: () => Cell): Cell | null {
    const l = this.layout;
    if (inRect(l.area, x, y)) {
      const i = (y - l.area.y0) * l.w + (x - l.area.x0);
      return { ground: l.ground[i] as BlockId, object: l.objects[i] as BlockId, upper: Block.AIR };
    }
    if (inRect(this.guard, x, y)) {
      const floor = inRect(this.landing, x, y);
      return { ground: Block.DUNGEON_DIRT, object: floor ? Block.AIR : Block.DUNGEON_MOUNTAIN, upper: Block.AIR };
    }
    const cave = this.cave;
    if (cave && inRect(cave.footprint, x, y)) {
      const g = baseCell().ground;
      const ground = blockDef(g).liquid || g === Block.HOLE ? Block.GRASS : g;
      return { ground, object: x === cave.x && y === cave.y ? Block.DUNGEON_CAVE : Block.TOWN_PART, upper: Block.AIR };
    }
    if (cave && inRect(cave.front, x, y)) return this.clearFront(baseCell());
    return null;
  }

  cellAt(x: number, y: number): Cell {
    return this.overlay(x, y, () => this.base.cellAt(x, y)) ?? this.base.cellAt(x, y);
  }

  groundAt(x: number, y: number): BlockId {
    return this.cellAt(x, y).ground;
  }

  objectAt(x: number, y: number): BlockId {
    return this.cellAt(x, y).object;
  }

  upperAt(x: number, y: number): BlockId {
    return this.cellAt(x, y).upper;
  }

  biomeAt(x: number, y: number): Biome {
    return this.base.biomeAt(x, y);
  }

  /** Cada chunk copia a sua parte do mapa lógico (corredores seguem sem interrupção entre chunks). */
  generateChunk(cx: number, cy: number, ground: Uint8Array, objects: Uint8Array, upper: Uint8Array): void {
    this.base.generateChunk(cx, cy, ground, objects, upper);
    const S = Math.round(Math.sqrt(ground.length));
    const x0 = cx * S;
    const y0 = cy * S;
    const misses = (r: Rect) => x0 > r.x1 || x0 + S - 1 < r.x0 || y0 > r.y1 || y0 + S - 1 < r.y0;
    const c = this.cave;
    if (misses(this.guard) && (!c || (misses(c.footprint) && misses(c.front)))) return;
    for (let ly = 0; ly < S; ly++) {
      for (let lx = 0; lx < S; lx++) {
        const i = ly * S + lx;
        const cell = this.overlay(x0 + lx, y0 + ly, () => ({ ground: ground[i] as BlockId, object: objects[i] as BlockId, upper: upper[i] as BlockId }));
        if (!cell) continue;
        ground[i] = cell.ground;
        objects[i] = cell.object;
        upper[i] = cell.upper;
      }
    }
  }
}
