/**
 * Rio das Fadas (Santuário, ADR 0036, v0.93.147): peças de água modulares com **autotile** na hora de colocar/quebrar.
 *
 * Cada peça é um cubo com o topo pintado e o código das 4 bordas, na ordem **N L S O** (norte = −y, leste = +x, sul = +y, oeste = −x):
 * `D` seco, `C` canal, `F` lago. Duas peças vizinhas se encaixam quando as bordas em contato têm o mesmo código (as texturas não giram nem espelham).
 * O jogador coloca só dois pincéis (Canal e Lago) e o mapa guarda só eles; a peça certa é escolhida **na hora de desenhar**, conforme os vizinhos do mesmo
 * nível (`rioPieceAt`). Só dados e funções puras: sem DOM, sem `Math.random()` (a variação vem de um hash da posição).
 */
import type { BlockId } from './blocks';

export type RioKind = 'canal' | 'lago';
export type RioEdge = 'D' | 'C' | 'F';

export interface RioPiece {
  /** Posição na lista (e na folha `iso-rio.webp`). */
  readonly index: number;
  /** Chave da arte (`scripts/extract-iso-rio.py`, mesma ordem). */
  readonly key: string;
  /** Bordas N L S O. */
  readonly edges: string;
  /** Pincel que usa a peça: o canal (e as fozes) ou o lago. */
  readonly kind: RioKind;
  /** Peso na escolha entre peças de mesmo código (variações da água). */
  readonly weight: number;
  readonly name: string;
}

/** Pincéis: os ÚNICOS ids do rio no mapa (a barra de blocos e a pilha guardam só estes; a peça certa é escolhida na hora de desenhar). 166 e 253 estavam livres. */
export const RIO_CANAL = 253;
export const RIO_LAGO = 166;
export const RIO_BRUSHES: readonly BlockId[] = [RIO_CANAL, RIO_LAGO];
/** Id "virtual" da peça `i` (só existe no desenho: materiais e faces; nunca no mapa nem no salvamento). */
export const RIO_VIRTUAL_FIRST = 1000;

const P = (key: string, edges: string, kind: RioKind, name: string, weight = 1): Omit<RioPiece, 'index'> => ({ key, edges, kind, weight, name });
const DEFS: readonly Omit<RioPiece, 'index'>[] = [
  P('poca', 'DDDD', 'canal', 'Poça de fadas'),
  P('ninfeias', 'DDDD', 'lago', 'Lago das ninfeias'),
  P('calma', 'FFFF', 'lago', 'Água calma', 3),
  P('ondulada', 'FFFF', 'lago', 'Água ondulada', 3),
  P('espuma', 'FFFF', 'lago', 'Água com espuma', 2),
  P('canal_ns', 'CDCD', 'canal', 'Canal norte–sul'),
  P('canal_lo', 'DCDC', 'canal', 'Canal leste–oeste'),
  P('curva_nl', 'CCDD', 'canal', 'Curva norte–leste'),
  P('curva_no', 'CDDC', 'canal', 'Curva norte–oeste'),
  P('cruz', 'CCCC', 'canal', 'Encontro em cruz'),
  P('t_nlo', 'DCCC', 'canal', 'Encontro em T'),
  P('margem_l', 'FDFF', 'lago', 'Margem leste'),
  P('margem_o', 'FFFD', 'lago', 'Margem oeste'),
  P('foz_lago', 'CDFD', 'canal', 'Foz para lago'),
  P('baia', 'DDFD', 'lago', 'Baía abrigada'),
  P('margem_rasa', 'DDFF', 'lago', 'Margem rasa'),
  P('raso_espuma', 'DFFD', 'lago', 'Raso com espuma'),
  P('rochedos', 'FFFF', 'lago', 'Água com rochedos', 1),
  P('nascente_l', 'DCDD', 'canal', 'Nascente (leste)'),
  P('foz', 'DFDC', 'canal', 'Foz'),
  P('nascente_s', 'DDCD', 'canal', 'Nascente (sul)'),
  P('nascente_n', 'CDDD', 'canal', 'Nascente (norte)'),
  P('margem_n', 'DFFF', 'lago', 'Margem norte'),
  P('raso_so', 'DDFF', 'lago', 'Raso (sudoeste)'),
  P('raso_ne', 'FFDD', 'lago', 'Raso (nordeste)'),
  P('raso_no', 'FDDF', 'lago', 'Raso (noroeste)'),
];
export const RIO_PIECES: readonly RioPiece[] = DEFS.map((d, i) => ({ ...d, index: i }));

export function isRioBrush(id: BlockId): boolean {
  return id === RIO_CANAL || id === RIO_LAGO;
}
/** Tipo de água de um id (pincel); null = não é do rio. */
export function rioKind(id: BlockId): RioKind | null {
  return id === RIO_CANAL ? 'canal' : id === RIO_LAGO ? 'lago' : null;
}
export function isRioVirtual(id: number): boolean {
  return id >= RIO_VIRTUAL_FIRST && id < RIO_VIRTUAL_FIRST + RIO_PIECES.length;
}
export function rioVirtualId(piece: RioPiece): BlockId {
  return (RIO_VIRTUAL_FIRST + piece.index) as BlockId;
}

/** Direções das bordas, na ordem do código: N (−y), L (+x), S (+y), O (−x). */
export const RIO_DIRS: readonly (readonly [number, number])[] = [[0, -1], [1, 0], [0, 1], [-1, 0]];

/** Borda entre duas células de água: lago se qualquer uma é lago, senão canal. Contra seco/vazio: seco. */
export function rioEdge(a: RioKind, b: RioKind | null): RioEdge {
  if (b === null) return 'D';
  return a === 'lago' || b === 'lago' ? 'F' : 'C';
}

/** Custo de usar uma borda `have` onde se queria `want`: 0 igual; 1 canal × lago; 3 água × seco. */
function edgeCost(want: string, have: string): number {
  if (want === have) return 0;
  return want === 'D' || have === 'D' ? 3 : 1;
}

function hash(x: number, y: number, level: number): number {
  return (Math.imul(x, 73856093) ^ Math.imul(y, 19349663) ^ Math.imul(level + 1, 83492791)) >>> 0;
}

/**
 * Peça do pincel `kind` para o código de bordas desejado (`want`, 4 letras N L S O). Sem peça exata, a de menor custo (arte que falta: NEXT_STEPS); entre
 * peças empatadas (as variações da água) a escolha é determinística pela posição.
 */
export function rioPieceFor(kind: RioKind, want: string, x: number, y: number, level: number): RioPiece {
  let best = Infinity;
  let pool: RioPiece[] = [];
  for (const p of RIO_PIECES) {
    if (p.kind !== kind) continue;
    let c = 0;
    for (let i = 0; i < 4; i++) c += edgeCost(want[i], p.edges[i]) * (i === 1 || i === 2 ? 2 : 1); // leste e sul pesam mais: são as laterais que a câmera mostra
    if (c < best) { best = c; pool = [p]; } else if (c === best) pool.push(p);
  }
  if (pool.length === 1) return pool[0];
  const total = pool.reduce((s, p) => s + p.weight, 0);
  let r = hash(x, y, level) % total;
  for (const p of pool) { if (r < p.weight) return p; r -= p.weight; }
  return pool[0];
}

/** Há peça exata para o código (no pincel dado)? Para os testes e para listar a arte que falta. */
export function rioHasExact(kind: RioKind, want: string): boolean {
  return RIO_PIECES.some((p) => p.kind === kind && p.edges === want);
}

/**
 * Peça que desenha a célula (x, y, nível) do rio: lê só os 4 vizinhos do mesmo nível (`get` = `World.getLevel`). A célula precisa ter um pincel; se não
 * tiver, devolve a peça de menor custo para um canal isolado (nunca falha).
 */
export function rioPieceAt(get: (x: number, y: number, level: number) => BlockId, x: number, y: number, level: number): RioPiece {
  const kind = rioKind(get(x, y, level)) ?? 'canal';
  let want = '';
  for (const [dx, dy] of RIO_DIRS) want += rioEdge(kind, rioKind(get(x + dx, y + dy, level)));
  return rioPieceFor(kind, want, x, y, level);
}
