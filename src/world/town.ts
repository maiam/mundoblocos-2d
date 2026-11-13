import { SUBDIV } from '../config';
import type { Biome } from './biomes';
import { Block, type BlockId, blockDef } from './blocks';
import { inRect, type Rect } from './dungeon';
import { hash2, mulberry32 } from './random';
import type { Cell, TerrainSource } from './terrain';

/**
 * Cidade 1 — A Cidade do Despertar: ponto de partida de todo jogador e de recomeço de quem morre sem tenda.
 * Gerada proceduralmente com uma SEMENTE FIXA (`TOWN_SEED`): é a mesma cidade em qualquer seed de mundo.
 * Etapas (spec V1.0): 1) território · 2) muralhas com um só portão (sul) · 3) castelo no fundo (norte) ·
 * 4) labirinto de ruas (caminho principal sinuoso, ramificações, laços, becos, praças) · 5) construções
 * (as obrigatórias são reservadas antes das ruas; casas preenchem os terrenos) · 6) decoração.
 * O mapa lógico fica pronto antes de existir qualquer chunk; cada chunk só copia a sua parte (`TownTerrain`).
 * A área inteira (muralha incluída) é protegida pelo `World`: nada quebra nem é colocado.
 */

export const TOWN_W = 164;
export const TOWN_H = 132;
/** Canto noroeste da cidade no mundo: o portão fica logo ao norte da origem. */
const TOWN_X0 = -TOWN_W / 2;
const TOWN_Y0 = -TOWN_H;
const TOWN_SEED = 0x0de59e7a;
/** Anel ao redor da muralha onde o terreno vira terra firme (sem água) e, perto dela, fica livre de objetos. */
export const TOWN_MARGIN = 8 * SUBDIV;
const TOWN_CLEAR = 3 * SUBDIV;
/** Estrada de terra que sai do portão para o sul. */
const ROAD_LEN = 14 * SUBDIV;
/** Campo ao sul do portão (estrada + rebanho inicial) que a dungeon não pode ocupar (células abaixo da muralha). */
export const TOWN_SOUTH_FIELD = 28 * SUBDIV;
const WALL = 2;
/** Espessura da muralha em células (a regra de proteção por chunk usa o anel que ela forma na borda de `area`). */
export const TOWN_WALL = WALL * SUBDIV;

export interface TownBuilding {
  id: BlockId;
  name: string;
  /** Canto inferior esquerdo (onde fica o id) e tamanho em células (mundo). */
  x: number;
  y: number;
  w: number;
  d: number;
  /** Célula da rua diante da porta (null = sem porta, ex.: torres). */
  door: [number, number] | null;
}

export interface TownLayout {
  w: number;
  h: number;
  /** Área inteira (muralha incluída), inclusiva. Protegida. */
  area: Rect;
  /** Vão do portão (células da muralha sem bloco). */
  gate: Rect;
  /** Onde o jogador começa e renasce sem tenda: praça inicial, logo dentro do portão. */
  start: [number, number];
  /** Na estrada, do lado de fora do portão. */
  doorstep: [number, number];
  /** Diante da porta do castelo (pátio). */
  castleDoor: [number, number];
  buildings: TownBuilding[];
  /** Mapa da área (índice = (y - y0) * w + (x - x0)). */
  ground: Uint8Array;
  objects: Uint8Array;
  upper: Uint8Array;
  /** Construção que ocupa a célula (índice em `buildings`) ou -1. */
  buildingAt: Int16Array;
  /** 1 = rua ou praça. */
  street: Uint8Array;
}

/**
 * Construções: [largura, profundidade do lote, fileiras bloqueadas a partir da frente] em células — fonte única para
 * gerador e render (tamanhos definidos pelo dono do produto junto com a arte). Quando o desenho é mais baixo que o
 * lote (casa/loja térrea), as fileiras de trás ficam livres: quintal andável atrás do telhado.
 */
export const TOWN_SIZES: Partial<Record<BlockId, [number, number, number]>> = {
  [Block.CASTLE]: [26, 17, 17],
  [Block.GUILD]: [9, 9, 9],
  [Block.INN]: [9, 5, 5],
  [Block.SMITHY]: [8, 5, 5],
  [Block.SHOP_POTION]: [5, 5, 4],
  [Block.SHOP_GOODS]: [5, 5, 5],
  [Block.SHOP_TOOLS]: [5, 5, 4],
  [Block.HOUSE]: [5, 5, 4],
  [Block.HOUSE_TALL]: [5, 5, 5],
  [Block.WATCHTOWER]: [4, 6, 6],
  [Block.WELL]: [2, 2, 2],
  [Block.FOUNTAIN]: [5, 5, 5],
  [Block.STALL]: [2, 1, 1],
  [Block.BENCH]: [2, 1, 1],
  [Block.BENCH_LONG]: [3, 1, 1],
};

/** Largura e profundidade do lote. */
export function townSize(id: BlockId): [number, number] {
  const s = TOWN_SIZES[id];
  return s ? [s[0], s[1]] : [1, 1];
}

/** Fileiras bloqueadas (a partir da frente). */
export function townSolid(id: BlockId): number {
  return TOWN_SIZES[id]?.[2] ?? 1;
}

/** Textos das placas de orientação (tocar mostra o texto). */
const SIGNS = [
  'Cidade do Despertar — o Castelo fica ao norte; o portão, ao sul',
  'Praça Central: Guilda a oeste, Hospedaria a leste',
  'Ferreiro e Lojas: siga as ruas a partir da Praça Central',
];

// Uso de cada célula durante a geração.
const FREE = 0;
const STREET = 1;
const PLAZA = 2;
const WALLED = 3;
const BUILT = 4;
const RESERVED = 5;
const WALKWAY = 6;
const DECOR = 7;
/** Quintal atrás de casa térrea: não recebe outra construção; vira jardim andável. */
const YARD = 8;

let cached: TownLayout | null = null;

/** A cidade (sempre a mesma; calculada uma vez). Com a grade fina (ADR 0032) é a mesma cidade, ampliada `SUBDIV` × `SUBDIV`. */
export function townLayout(): TownLayout {
  return (cached ??= SUBDIV > 1 ? upsampleTown(buildTown(), SUBDIV) : buildTown());
}

/**
 * Cidade na grade fina (ADR 0032, F3): cada célula vira `s` × `s`, então a cidade tem os mesmos pixels de hoje. Chão, camada de
 * cima, ruas, muralha, partes de construção (`TOWN_PART`) e sebes repetem em todas as células; o id da construção fica só na
 * célula do canto inferior esquerdo da sua; objetos soltos (árvores, flores, postes, barris…) ficam numa célula só (tronco 1 × 1).
 * A área, o portão, as construções e os pontos de referência ganham as coordenadas novas. `s = 1` devolve o mapa como está.
 */
export function upsampleTown(l: TownLayout, s: number): TownLayout {
  if (s === 1) return l;
  const W = l.w * s;
  const H = l.h * s;
  const ground = new Uint8Array(W * H);
  const objects = new Uint8Array(W * H);
  const upper = new Uint8Array(W * H);
  const street = new Uint8Array(W * H);
  const buildingAt = new Int16Array(W * H).fill(-1);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const cx = Math.floor(x / s);
      const cy = Math.floor(y / s);
      const j = cy * l.w + cx;
      const i = y * W + x;
      ground[i] = l.ground[j];
      upper[i] = l.upper[j];
      street[i] = l.street[j];
      buildingAt[i] = l.buildingAt[j];
      const o = l.objects[j] as BlockId;
      if (o === Block.AIR) continue;
      const corner = x % s === 0 && y % s === s - 1; // canto inferior esquerdo da célula antiga
      if (o === Block.TOWN_PART || o === Block.HEDGE || blockDef(o).shape === 'cube') objects[i] = o;
      else if (l.buildingAt[j] >= 0) objects[i] = corner ? o : Block.TOWN_PART; // âncora de construção: o resto do lote é parte sólida
      else if (corner) objects[i] = o;
    }
  }
  const a = l.area;
  const sc = (r: Rect): Rect => ({ x0: r.x0 * s, y0: r.y0 * s, x1: (r.x1 + 1) * s - 1, y1: (r.y1 + 1) * s - 1 });
  const pt = ([x, y]: [number, number]): [number, number] => [x * s, y * s];
  return {
    w: W, h: H,
    area: sc(a),
    gate: sc(l.gate),
    start: pt(l.start),
    doorstep: pt(l.doorstep),
    castleDoor: pt(l.castleDoor),
    buildings: l.buildings.map((b) => ({
      ...b,
      x: b.x * s,
      y: (b.y + 1) * s - 1,
      w: b.w * s,
      d: b.d * s,
      door: b.door ? pt(b.door) : null,
    })),
    ground, objects, upper, buildingAt, street,
  };
}

function buildTown(): TownLayout {
  const W = TOWN_W;
  const H = TOWN_H;
  const rand = mulberry32(TOWN_SEED);
  const ri = (n: number) => Math.floor(rand() * n);
  const idx = (x: number, y: number) => y * W + x;
  const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H;
  const ground = new Uint8Array(W * H).fill(Block.GRASS);
  /** Piso de toda a parte pavimentada (ruas, praças, pátio, calçadas, base da muralha): Tijolo de Pedra (dono do produto, 07/11). */
  const FLOOR = Block.STONE_BRICK;
  const objects = new Uint8Array(W * H);
  const upper = new Uint8Array(W * H);
  const use = new Uint8Array(W * H);
  /** Margem das construções obrigatórias: casas não encostam (ruas podem). */
  const keepOff = new Uint8Array(W * H);
  const main = new Uint8Array(W * H);
  const buildingAt = new Int16Array(W * H).fill(-1);
  const buildings: TownBuilding[] = [];
  const h = (x: number, y: number, salt: number) => hash2(TOWN_SEED, x * 31 + salt, y * 17 - salt);

  // --- 2) Muralha (2 de espessura, 2 cubos de altura) com o portão no meio do lado sul ---
  const GX0 = W / 2 - 2;
  const GX1 = W / 2 + 1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (x >= WALL && y >= WALL && x < W - WALL && y < H - WALL) continue;
      const i = idx(x, y);
      ground[i] = FLOOR;
      if (y >= H - WALL && x >= GX0 && x <= GX1) { use[i] = STREET; continue; }
      use[i] = WALLED;
      objects[i] = Block.STONE_BRICK;
      upper[i] = Block.STONE_BRICK;
    }
  }

  /**
   * Coloca uma construção com o canto superior esquerdo do LOTE em (x, y) (relativo). Só as `townSolid` fileiras da
   * frente bloqueiam; as de trás viram quintal. `d` do registro = fileiras bloqueadas.
   */
  const place = (id: BlockId, x: number, y: number, name: string, door: boolean): TownBuilding => {
    const [w, lot] = townSize(id);
    const d = townSolid(id);
    const b: TownBuilding = {
      id, name, x: TOWN_X0 + x, y: TOWN_Y0 + y + lot - 1, w, d,
      door: door ? [TOWN_X0 + x + Math.floor(w / 2), TOWN_Y0 + y + lot] : null,
    };
    const k = buildings.push(b) - 1;
    for (let yy = y; yy < y + lot - d; yy++) {
      for (let xx = x; xx < x + w; xx++) if (use[idx(xx, yy)] === FREE || use[idx(xx, yy)] === RESERVED) use[idx(xx, yy)] = YARD;
    }
    y += lot - d;
    for (let yy = y; yy < y + d; yy++) {
      for (let xx = x; xx < x + w; xx++) {
        const i = idx(xx, yy);
        // Grama sob a construção (cantos transparentes da arte mostram jardim); sobre muralha, rua ou praça
        // (poço, fonte, bancos, barracas) o piso continua o mesmo.
        if (use[i] !== WALLED && use[i] !== PLAZA && use[i] !== STREET) ground[i] = Block.GRASS;
        use[i] = BUILT;
        objects[i] = Block.TOWN_PART;
        upper[i] = Block.AIR;
        buildingAt[i] = k;
      }
    }
    objects[idx(x, y + d - 1)] = id;
    return b;
  };
  const rect = (x0: number, y0: number, x1: number, y1: number, fn: (x: number, y: number, i: number) => void) => {
    for (let y = Math.max(0, y0); y <= Math.min(H - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(W - 1, x1); x++) fn(x, y, idx(x, y));
  };

  // Guaritas (4×6): cantos e as duas que ladeiam o portão.
  const TW = 4;
  const TD = 6;
  place(Block.WATCHTOWER, 0, 0, 'Guarita', false);
  place(Block.WATCHTOWER, W - TW, 0, 'Guarita', false);
  place(Block.WATCHTOWER, 0, H - TD, 'Guarita', false);
  place(Block.WATCHTOWER, W - TW, H - TD, 'Guarita', false);
  place(Block.WATCHTOWER, GX0 - TW, H - TD, 'Guarita', false);
  place(Block.WATCHTOWER, GX1 + 1, H - TD, 'Guarita', false);

  // --- 3) Castelo (26×17) no fundo (norte), oposto ao portão, com pátio na frente ---
  const CX0 = W / 2 - 13;
  const CY1 = 3 + 17; // primeira fileira abaixo do castelo
  const COURT_Y1 = CY1 + 7; // última fileira do pátio
  rect(CX0 - 2, WALL, CX0 + 27, COURT_Y1, (_x, _y, i) => { if (use[i] === FREE) use[i] = RESERVED; });
  const castle = place(Block.CASTLE, CX0, 3, 'Castelo', true);
  const plaza = (x0: number, y0: number, x1: number, y1: number, floor: BlockId) =>
    rect(x0, y0, x1, y1, (_x, _y, i) => { use[i] = PLAZA; ground[i] = floor; });
  const MID = 70; // linha central da praça central
  const START_Y = H - 12;
  plaza(CX0 + 2, CY1, CX0 + 23, COURT_Y1, FLOOR); // pátio do castelo (Setor 6)
  plaza(W / 2 - 9, MID - 6, W / 2 + 9, MID + 6, FLOOR); // praça central (Setor 4)
  plaza(W / 2 - 9, H - 17, W / 2 + 8, H - TD - 1, FLOOR); // praça inicial (Setor 1)
  rect(GX0, H - TD, GX1, H - 1, (_x, _y, i) => { use[i] = STREET; ground[i] = FLOOR; }); // vão do portão

  // --- 5a) Construções obrigatórias reservadas ANTES das ruas (Setores 3, 4 e 5) ---
  const required: TownBuilding[] = [
    place(Block.GUILD, W / 2 - 28, MID - 8, 'Guilda dos Aventureiros', true),
    place(Block.INN, W / 2 + 20, MID - 4, 'Hospedaria', true),
    place(Block.SMITHY, 30, MID + 18, 'Ferreiro', true),
    place(Block.SHOP_POTION, W / 2 + 22, MID + 18, 'Mercado', true),
    place(Block.SHOP_GOODS, W / 2 + 27, MID + 18, 'Mercado', true),
    place(Block.SHOP_TOOLS, W / 2 + 32, MID + 18, 'Mercado', true),
  ];
  for (const b of required) {
    const x0 = b.x - TOWN_X0;
    const y1 = b.y - TOWN_Y0;
    rect(x0 - 1, y1 - townSize(b.id)[1], x0 + b.w, y1 + 1, (_x, _y, i) => { keepOff[i] = 1; });
    // A frente da porta fica livre para a rua chegar.
    const [dx, dy] = b.door!;
    rect(dx - TOWN_X0 - 1, dy - TOWN_Y0, dx - TOWN_X0 + 1, dy - TOWN_Y0, (_x, _y, i) => { if (use[i] === FREE) use[i] = RESERVED; });
  }

  // --- 4) Labirinto de ruas: grade de nós com deslocamento, árvore + laços, caminho principal largo ---
  const carvable = (x: number, y: number) => inside(x, y) && (use[idx(x, y)] === FREE || use[idx(x, y)] === STREET
    || use[idx(x, y)] === PLAZA || (use[idx(x, y)] === RESERVED && y > COURT_Y1));
  /** Células do trecho entre dois pontos em Z (dobra no meio), com a largura dada. */
  const segment = (ax: number, ay: number, bx: number, by: number, width: number, jog: number): Array<[number, number]> => {
    const out: Array<[number, number]> = [];
    const lo = -Math.floor((width - 1) / 2);
    const hi = lo + width - 1;
    const line = (x0: number, y0: number, x1: number, y1: number) => {
      for (let y = Math.min(y0, y1) + lo; y <= Math.max(y0, y1) + hi; y++) {
        for (let x = Math.min(x0, x1) + lo; x <= Math.max(x0, x1) + hi; x++) out.push([x, y]);
      }
    };
    if (Math.abs(bx - ax) >= Math.abs(by - ay)) {
      const mx = Math.round((ax + bx) / 2) + jog;
      line(ax, ay, mx, ay); line(mx, ay, mx, by); line(mx, by, bx, by);
    } else {
      const my = Math.round((ay + by) / 2) + jog;
      line(ax, ay, ax, my); line(ax, my, bx, my); line(bx, my, bx, by);
    }
    return out;
  };
  // Passo 15 × 13: entre ruas cabem duas casas 5×5 lado a lado e uma fileira de lotes com quintal.
  const SX = 15;
  const SY = 13;
  const GW = Math.floor((W - 16) / SX) + 1;
  const GH = Math.floor((H - 28) / SY) + 1;
  type Node = { x: number; y: number; ok: boolean };
  const nodes: Node[] = [];
  for (let j = 0; j < GH; j++) {
    for (let i = 0; i < GW; i++) {
      const x = 8 + SX * i + ri(5) - 2;
      const y = 8 + SY * j + ri(5) - 2;
      nodes.push({ x, y, ok: carvable(x, y) && carvable(x + 1, y + 1) && use[idx(x, y)] !== RESERVED });
    }
  }
  // Nó virtual do pátio do castelo (ligado aos nós logo abaixo dele).
  const COURT = nodes.push({ x: W / 2, y: COURT_Y1, ok: true }) - 1;
  /** Aresta: células com largura 3 (caminho principal) e 2 (ruas secundárias), mesma dobra. */
  type Edge = { a: number; b: number; cells: Array<[number, number]>; narrow: Array<[number, number]> };
  const edges: Edge[] = [];
  const tryEdge = (a: number, b: number, width: number) => {
    const A = nodes[a];
    const B = nodes[b];
    if (!A.ok || !B.ok) return;
    const jog = ri(3) - 1;
    const cells = segment(A.x, A.y, B.x, B.y, width, jog);
    if (cells.every(([x, y]) => carvable(x, y))) edges.push({ a, b, cells, narrow: segment(A.x, A.y, B.x, B.y, 2, jog) });
  };
  for (let j = 0; j < GH; j++) {
    for (let i = 0; i < GW; i++) {
      const n = j * GW + i;
      if (i + 1 < GW) tryEdge(n, n + 1, 3);
      if (j + 1 < GH) tryEdge(n, n + GW, 3);
    }
  }
  for (let n = 0; n < GW * GH; n++) {
    if (nodes[n].ok && nodes[n].y > COURT_Y1 && nodes[n].y < COURT_Y1 + 10 && Math.abs(nodes[n].x - W / 2) <= 14) tryEdge(COURT, n, 3);
  }
  const adj = new Map<number, Edge[]>();
  for (const e of edges) {
    adj.set(e.a, [...(adj.get(e.a) ?? []), e]);
    adj.set(e.b, [...(adj.get(e.b) ?? []), e]);
  }
  const other = (e: Edge, n: number) => (e.a === n ? e.b : e.a);
  const nearestNode = (x: number, y: number) => {
    let best = -1;
    let bd = Infinity;
    nodes.forEach((n, k) => {
      if (!n.ok || !adj.has(k)) return;
      const d = Math.hypot(n.x - x, n.y - y);
      if (d < bd) { bd = d; best = k; }
    });
    return best;
  };
  // Caminho principal: menor caminho com pesos sorteados (sinuoso) portão → praça central → pátio do castelo.
  const weight = new Map<Edge, number>(edges.map((e) => [e, 1 + rand() * 5]));
  const route = (from: number, to: number): Edge[] => {
    const dist = new Map<number, number>([[from, 0]]);
    const prev = new Map<number, Edge>();
    const open = new Set<number>([from]);
    while (open.size) {
      let cur = -1;
      let cd = Infinity;
      for (const n of open) { const d = dist.get(n)!; if (d < cd) { cd = d; cur = n; } }
      open.delete(cur);
      if (cur === to) break;
      for (const e of adj.get(cur) ?? []) {
        const n = other(e, cur);
        const nd = cd + weight.get(e)!;
        if (nd < (dist.get(n) ?? Infinity)) { dist.set(n, nd); prev.set(n, e); open.add(n); }
      }
    }
    const out: Edge[] = [];
    for (let n = to; n !== from;) {
      const e = prev.get(n);
      if (!e) break;
      out.push(e);
      n = other(e, n);
    }
    return out.reverse();
  };
  const startNode = nearestNode(W / 2, H - 18);
  const plazaNode = nearestNode(W / 2, MID);
  const mainEdges = [...route(startNode, plazaNode), ...route(plazaNode, COURT)];
  const inTree = new Set<number>();
  const chosen = new Set<Edge>(mainEdges);
  for (const e of mainEdges) { inTree.add(e.a); inTree.add(e.b); }
  // Ruas secundárias: árvore aleatória a partir do caminho principal (becos nas folhas) + laços (atalhos).
  for (let guard = 0; guard < 10000; guard++) {
    const frontier = edges.filter((e) => inTree.has(e.a) !== inTree.has(e.b));
    if (!frontier.length) break;
    const e = frontier[ri(frontier.length)];
    chosen.add(e);
    inTree.add(e.a);
    inTree.add(e.b);
  }
  for (const e of edges) if (!chosen.has(e) && rand() < 0.16) chosen.add(e);
  const carve = (cells: Array<[number, number]>, isMain: boolean) => {
    for (const [x, y] of cells) {
      if (!carvable(x, y)) continue;
      const i = idx(x, y);
      if (use[i] !== PLAZA) use[i] = STREET;
      if (isMain) main[i] = 1;
    }
  };
  for (const e of chosen) {
    const isMain = mainEdges.includes(e);
    carve(isMain ? e.cells : e.narrow, isMain);
  }
  /** Ligação da porta até a rua mais próxima (busca em largura pelas células livres), largura 2. */
  const connect = (x: number, y: number) => {
    const sx = x - TOWN_X0;
    const sy = y - TOWN_Y0;
    const prev = new Int32Array(W * H).fill(-1);
    const q = [idx(sx, sy)];
    prev[q[0]] = q[0];
    let found = -1;
    for (let k = 0; k < q.length && found < 0; k++) {
      const c = q[k];
      const cx = c % W;
      const cy = Math.floor(c / W);
      for (const [ox, oy] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) {
        const nx = cx + ox;
        const ny = cy + oy;
        if (!inside(nx, ny)) continue;
        const n = idx(nx, ny);
        if (prev[n] >= 0) continue;
        if (use[n] === STREET || use[n] === PLAZA) { prev[n] = c; found = n; break; }
        if (use[n] !== FREE && use[n] !== RESERVED) continue;
        prev[n] = c;
        q.push(n);
      }
    }
    for (let c = found; c >= 0 && prev[c] !== c; c = prev[c]) {
      const p = prev[c];
      for (const k of [p, p + 1]) if (use[k] === FREE || use[k] === RESERVED) use[k] = STREET;
    }
    if (use[idx(sx, sy)] !== PLAZA) use[idx(sx, sy)] = STREET;
  };
  for (const b of required) connect(b.door![0], b.door![1]);
  connect(castle.door![0], castle.door![1]);
  // Becos sem saída extras: pequenas ruelas a partir das ruas, terminando em caixotes/barris.
  const alleyEnds: Array<[number, number]> = [];
  for (let n = 0; n < 400 && alleyEnds.length < 10; n++) {
    const x = 4 + ri(W - 8);
    const y = COURT_Y1 + 2 + ri(H - COURT_Y1 - 22);
    if (use[idx(x, y)] !== STREET || main[idx(x, y)]) continue;
    const [ox, oy] = [[1, 0], [-1, 0], [0, 1], [0, -1]][ri(4)];
    const len = 3 + ri(3);
    const cells: Array<[number, number]> = [];
    let ok = true;
    for (let k = 1; k <= len + 1 && ok; k++) {
      const cx = x + ox * k;
      const cy = y + oy * k;
      // O beco e suas laterais precisam estar livres (não encosta em outra rua).
      for (const s of [-1, 0, 1]) {
        const tx = cx + (oy !== 0 ? s : 0);
        const ty = cy + (ox !== 0 ? s : 0);
        if (!inside(tx, ty) || use[idx(tx, ty)] !== FREE || keepOff[idx(tx, ty)]) ok = false;
      }
      if (k <= len) cells.push([cx, cy]);
    }
    if (!ok) continue;
    for (const [cx, cy] of cells) use[idx(cx, cy)] = STREET;
    alleyEnds.push(cells[cells.length - 1]);
  }
  rect(0, 0, W - 1, H - 1, (_x, _y, i) => { if (use[i] === RESERVED && i > idx(0, COURT_Y1)) use[i] = FREE; });

  // Pavimento: as ruas no mesmo piso das praças.
  rect(0, 0, W - 1, H - 1, (_x, _y, i) => {
    if (use[i] === STREET) ground[i] = FLOOR;
  });

  const isFree = (x: number, y: number) => inside(x, y) && use[idx(x, y)] === FREE && !keepOff[idx(x, y)];
  const isWalk = (x: number, y: number) => inside(x, y) && (use[idx(x, y)] === STREET || use[idx(x, y)] === PLAZA);
  // --- 6a) Praças decoradas antes das casas (nenhuma porta fica atrás de um enfeite) ---
  const setDecor = (x: number, y: number, id: BlockId) => {
    const i = idx(x, y);
    objects[i] = id;
    use[i] = DECOR;
  };
  const nearStreet = (x: number, y: number) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([ox, oy]) => isWalk(x + ox, y + oy));
  // Praças: fonte, poço, bancos, placas, postes de luz e barracas.
  const fx = W / 2 - 1;
  place(Block.FOUNTAIN, W / 2 - 2, MID - 2, 'Fonte', false); // 5×5 no centro da praça
  place(Block.WELL, W / 2 + 4, H - 15, 'Poço', false);
  place(Block.STALL, W / 2 - 7, MID - 4, 'Barraca', false);
  place(Block.STALL, W / 2 + 5, MID + 4, 'Barraca', false);
  place(Block.BENCH, fx - 4, MID + 1, 'Banco', false);
  place(Block.BENCH, fx + 5, MID + 1, 'Banco', false);
  place(Block.BENCH_LONG, W / 2 - 8, H - 11, 'Banco', false);
  place(Block.BENCH_LONG, W / 2 + 5, H - 9, 'Banco', false);
  place(Block.BENCH_LONG, CX0 + 5, CY1 + 4, 'Banco', false);
  place(Block.BENCH_LONG, CX0 + 18, CY1 + 4, 'Banco', false);
  for (const [x, y] of [[W / 2 - 9, MID - 6], [W / 2 + 9, MID - 6], [W / 2 - 9, MID + 6], [W / 2 + 9, MID + 6], [W / 2 - 9, H - 17],
    [W / 2 + 8, H - 17], [CX0 + 2, CY1], [CX0 + 23, CY1], [CX0 + 2, COURT_Y1], [CX0 + 23, COURT_Y1], [GX0 - 1, H - TD - 1],
    [GX1 + 1, H - TD - 1]]) setDecor(x, y, Block.LAMP);
  for (const x of [CX0 + 3, CX0 + 4, CX0 + 21, CX0 + 22]) for (const y of [CY1 + 1, CY1 + 2]) setDecor(x, y, Block.HEDGE);
  for (const x of [CX0 + 7, CX0 + 9, CX0 + 16, CX0 + 18]) setDecor(x, CY1 + 1, Block.FLOWER);
  const signs: Array<[number, number, string]> = [[W / 2 - 5, H - 15, SIGNS[0]], [W / 2 - 9, MID + 2, SIGNS[1]], [W / 2 + 8, MID + 7, SIGNS[2]]];
  for (const [x, y, text] of signs) {
    const k = buildings.push({ id: Block.SIGNPOST, name: text, x: TOWN_X0 + x, y: TOWN_Y0 + y, w: 1, d: 1, door: null }) - 1;
    setDecor(x, y, Block.SIGNPOST);
    buildingAt[idx(x, y)] = k;
  }
  // --- 5b) Casas: encaixadas junto às ruas, porta voltada para a rua (ou por um caminho curto do quintal) ---
  // Casas 5×5: térrea (quintal atrás) ou de 2 andares, sorteada por lote.
  const order: number[] = [];
  for (let y = WALL + 1; y < H - WALL - 1; y++) for (let x = WALL + 1; x < W - WALL - 1; x++) order.push(idx(x, y));
  for (let k = order.length - 1; k > 0; k--) { const j = ri(k + 1); [order[k], order[j]] = [order[j], order[k]]; }
  {
    const [w, d] = townSize(Block.HOUSE);
    for (const c of order) {
      const x = c % W;
      const y = Math.floor(c / W);
      const id = h(x, y, 11) < 0.5 ? Block.HOUSE : Block.HOUSE_TALL;
      let ok = true;
      for (let yy = y - 1; yy <= y + d && ok; yy++) {
        for (let xx = x - 1; xx <= x + w && ok; xx++) {
          const inner = xx >= x && xx < x + w && yy >= y && yy < y + d;
          if (inner ? !isFree(xx, yy) : inside(xx, yy) && (use[idx(xx, yy)] === BUILT || use[idx(xx, yy)] === YARD)) ok = false;
        }
      }
      if (!ok) continue;
      const dx = x + Math.floor(w / 2);
      let path = 0;
      while (path < 4 && !isWalk(dx, y + d + path)) {
        if (!isFree(dx, y + d + path)) { path = 99; break; }
        path++;
      }
      if (path >= 4 || rand() < 0.12) continue;
      for (let k = 0; k < path; k++) {
        const i = idx(dx, y + d + k);
        use[i] = WALKWAY;
        ground[i] = FLOOR;
      }
      place(id, x, y, 'Casa', true);
    }
  }

  // --- 6b) Decoração do resto ---
  // Lampiões ao longo do caminho principal (na calçada, fora da rua).
  const lamps: Array<[number, number]> = [];
  rect(0, 0, W - 1, H - 1, (x, y, i) => {
    if (use[i] !== FREE || keepOff[i] || !nearStreet(x, y)) return;
    if (![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([ox, oy]) => inside(x + ox, y + oy) && main[idx(x + ox, y + oy)])) return;
    if (lamps.some(([lx, ly]) => Math.abs(lx - x) + Math.abs(ly - y) < 7)) return;
    lamps.push([x, y]);
    setDecor(x, y, Block.LAMP);
  });
  // Becos: caixotes/barris no fim; oficinas e lojas com barris e caixotes em volta.
  alleyEnds.forEach(([x, y], k) => setDecor(x, y, k % 2 ? Block.BARREL : Block.CRATES));
  for (const b of required.filter((r) => r.id === Block.SMITHY || r.id === Block.SHOP_TOOLS || r.id === Block.SHOP_POTION)) {
    const x0 = b.x - TOWN_X0;
    const y1 = b.y - TOWN_Y0;
    for (const [x, y] of [[x0 - 1, y1], [x0 + b.w, y1], [x0 - 1, y1 - 1], [x0 + b.w, y1 - 1]]) {
      if (inside(x, y) && use[idx(x, y)] === FREE) setDecor(x, y, h(x, y, 9) < 0.5 ? Block.BARREL : Block.CRATES);
    }
  }
  // Jardins: cerca viva na beira das ruas (com falhas = atalhos), árvores, flores e capim.
  rect(WALL, WALL, W - WALL - 1, H - WALL - 1, (x, y, i) => {
    if (use[i] !== FREE) return;
    const r = h(x, y, 5);
    if (nearStreet(x, y)) {
      if (r < 0.62) setDecor(x, y, Block.HEDGE);
      else if (r < 0.75) setDecor(x, y, Block.FLOWER);
      return;
    }
    const roomy = [-1, 0, 1].every((oy) => [-1, 0, 1].every((ox) => inside(x + ox, y + oy) && (use[idx(x + ox, y + oy)] === FREE)));
    if (roomy && r < 0.2 && y > 3) {
      // Árvores da cidade misturadas (cerejeira, bétula e carvalho; sem macieira: na cidade protegida não dá para colher).
      objects[i] = h(x, y, 6) < 0.3 ? Block.SAKURA_TREE : h(x, y, 7) < 0.4 ? Block.BIRCH_TREE : Block.OAK_TREE;
      use[i] = DECOR;
      rect(x - 1, y - 1, x + 1, y + 1, (_x, _y, j) => { if (use[j] === FREE) use[j] = RESERVED; });
    } else if (r < 0.34) objects[i] = Block.FLOWER;
    else if (r < 0.42) objects[i] = Block.TALL_GRASS;
  });
  rect(0, 0, W - 1, H - 1, (_x, _y, i) => { if (use[i] === RESERVED) use[i] = FREE; });
  // Quintais atrás das casas/lojas térreas: jardim andável (flores e capim, sem bloquear).
  rect(0, 0, W - 1, H - 1, (x, y, i) => {
    if (use[i] !== YARD) return;
    const r = h(x, y, 12);
    objects[i] = r < 0.2 ? Block.FLOWER : r < 0.32 ? Block.TALL_GRASS : Block.AIR;
  });

  const street = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) street[i] = use[i] === STREET || use[i] === PLAZA || use[i] === WALKWAY ? 1 : 0;
  return {
    w: W, h: H,
    area: { x0: TOWN_X0, y0: TOWN_Y0, x1: TOWN_X0 + W - 1, y1: TOWN_Y0 + H - 1 },
    gate: { x0: TOWN_X0 + GX0, y0: TOWN_Y0 + H - WALL, x1: TOWN_X0 + GX1, y1: TOWN_Y0 + H - 1 },
    start: [TOWN_X0 + W / 2, TOWN_Y0 + START_Y],
    doorstep: [TOWN_X0 + W / 2, TOWN_Y0 + H + 4],
    castleDoor: castle.door!,
    buildings, ground, objects, upper, buildingAt, street,
  };
}

/** Retângulo inclusivo expandido em `m` células. */
export function grow(r: Rect, m: number): Rect {
  return { x0: r.x0 - m, y0: r.y0 - m, x1: r.x1 + m, y1: r.y1 + m };
}

/**
 * Terreno com a cidade sobreposta: dentro da área usa o mapa da cidade; no anel em volta, terra firme
 * (água vira grama) e, junto à muralha, sem objetos; estrada de terra saindo do portão. Fora disso, o terreno base.
 */
export class TownTerrain implements TerrainSource {
  /** Tudo o que a cidade altera (área + anel + estrada). */
  readonly touched: Rect;

  constructor(private readonly base: TerrainSource, readonly layout: TownLayout) {
    const a = grow(layout.area, TOWN_MARGIN);
    this.touched = { ...a, y1: Math.max(a.y1, layout.area.y1 + ROAD_LEN) };
  }

  get seed(): number {
    return this.base.seed;
  }

  private surround(x: number, y: number, c: Cell): Cell {
    const l = this.layout;
    const a = l.area;
    if (x >= l.gate.x0 && x <= l.gate.x1 && y > a.y1 && y <= a.y1 + ROAD_LEN) return { ground: Block.PATH, object: Block.AIR, upper: Block.AIR };
    const d = Math.max(a.x0 - x, x - a.x1, a.y0 - y, y - a.y1);
    if (d > TOWN_MARGIN) return c;
    const g = blockDef(c.ground);
    const ground = g.liquid || c.ground === Block.HOLE ? Block.GRASS : c.ground;
    if (d <= TOWN_CLEAR) return { ground, object: Block.AIR, upper: Block.AIR };
    return { ground, object: c.object, upper: c.upper };
  }

  cellAt(x: number, y: number): Cell {
    const l = this.layout;
    if (inRect(l.area, x, y)) {
      const i = (y - l.area.y0) * l.w + (x - l.area.x0);
      return { ground: l.ground[i] as BlockId, object: l.objects[i] as BlockId, upper: l.upper[i] as BlockId };
    }
    const c = this.base.cellAt(x, y);
    return inRect(this.touched, x, y) ? this.surround(x, y, c) : c;
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

  generateChunk(cx: number, cy: number, ground: Uint8Array, objects: Uint8Array, upper: Uint8Array): void {
    this.base.generateChunk(cx, cy, ground, objects, upper);
    const t = this.touched;
    const S = Math.round(Math.sqrt(ground.length));
    const x0 = cx * S;
    const y0 = cy * S;
    if (x0 > t.x1 || x0 + S - 1 < t.x0 || y0 > t.y1 || y0 + S - 1 < t.y0) return;
    const l = this.layout;
    for (let ly = 0; ly < S; ly++) {
      for (let lx = 0; lx < S; lx++) {
        const x = x0 + lx;
        const y = y0 + ly;
        if (!inRect(t, x, y)) continue;
        const i = ly * S + lx;
        let c: Cell;
        if (inRect(l.area, x, y)) {
          const k = (y - l.area.y0) * l.w + (x - l.area.x0);
          c = { ground: l.ground[k] as BlockId, object: l.objects[k] as BlockId, upper: l.upper[k] as BlockId };
        } else {
          c = this.surround(x, y, { ground: ground[i] as BlockId, object: objects[i] as BlockId, upper: upper[i] as BlockId });
        }
        ground[i] = c.ground;
        objects[i] = c.object;
        upper[i] = c.upper;
      }
    }
  }
}
