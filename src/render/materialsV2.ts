import { Block, type BlockId } from '../world/blocks';

/**
 * Padrão de Materiais V2 (ADR 0023): texturas planas 128×128 por material (`assets-src/materiais/`), reduzidas pelo
 * `scripts/build-materials.py` para um atlas (`materials-v2.webp` + manifesto). O motor monta a geometria: topo 32×32
 * e frente de `CUBE_FRONT` (18, decidido em 2026-11-07) — a arte não traz o cubo pronto. Sem frente própria, a frente
 * repete o topo (o pipeline resolve).
 *
 * É o padrão do jogo (2026-11-08): areia, terra, grama, as cinco pedras, Caminho de Terra, Terra Arada, Tora e Tábuas de
 * Carvalho — os 15 materiais de construção, menos as três pedras aposentadas. `?blocos=legado` volta ao atlas antigo (só
 * para comparar). Aparência é do render; regras de bloco continuam em `world/blocks.ts`.
 */
export interface MaterialsV2Manifest {
  cell: number;
  /** Linha do atlas → [y, altura]: topo, frente (textura inteira, fatiada por nível) e franja da frente. */
  rows: Record<'top' | 'front' | 'overlay', [number, number]>;
  materials: string[];
  overlay: string[];
  /** Atlas de máscaras de transição (`transitions-v2.webp`): uma linha por forma, uma célula por peça (`TRANSITION_PIECES`). */
  masks?: { cell: number; order: string[]; shapes: string[]; overlay?: string[] };
}

/** Sombra da frente (luz vem de cima): a frente é um pouco mais escura que o topo. */
export const FRONT_SHADE = 'rgba(30, 20, 60, 0.18)';

/** Composição de um bloco: topo de um material, frente de outro e franja opcional (ex.: grama sobre terra). */
interface V2Block { top: string; front: string; overlay?: string }

/** Blocos-piloto (contrato § 4: Bloco A areia, B grama sobre terra, C terra). */
export const V2_BLOCKS: Partial<Record<BlockId, V2Block>> = {
  [Block.SAND]: { top: 'areia', front: 'areia' },
  [Block.DIRT]: { top: 'terra', front: 'terra' },
  [Block.GRASS]: { top: 'grama', front: 'grama' }, // topo e face próprios (v0.93.79), sem franja
  // As cinco pedras do jogo (as outras três foram aposentadas, `RETIRED_STONES`); sem frente própria, a frente é o topo.
  [Block.STONE]: { top: 'pedra', front: 'pedra' },
  [Block.STONE_BRICK]: { top: 'tijolo-de-pedra', front: 'tijolo-de-pedra' },
  [Block.STONE_FLOOR]: { top: 'chao-de-pedra', front: 'chao-de-pedra' },
  [Block.STONE_SMOOTH]: { top: 'pedra-lisa', front: 'pedra-lisa' },
  [Block.STONE_POLISHED]: { top: 'pedra-polida', front: 'pedra-polida' },
  // Madeira de carvalho: a Tora tem topo (anéis) e frente (casca) próprios; as Tábuas, só o topo (teste do dono do produto).
  [Block.OAK_LOG]: { top: 'tora-de-carvalho', front: 'tora-de-carvalho' },
  [Block.OAK_PLANKS]: { top: 'tabuas-de-carvalho', front: 'tabuas-de-carvalho' },
  // Madeira de cerejeira (v0.88.0): tora com topo e frente próprios; tábuas só com o topo (a frente repete o topo).
  [Block.CHERRY_LOG]: { top: 'tora-de-cerejeira', front: 'tora-de-cerejeira' },
  [Block.CHERRY_PLANKS]: { top: 'tabuas-de-cerejeira', front: 'tabuas-de-cerejeira' },
  // Madeira de bétula (v0.89.0): mesma regra — tora com topo e frente, tábuas só com o topo.
  [Block.BIRCH_LOG]: { top: 'tora-de-betula', front: 'tora-de-betula' },
  [Block.BIRCH_PLANKS]: { top: 'tabuas-de-betula', front: 'tabuas-de-betula' },
  // Caminho de Terra e Terra Arada: a frente é sempre terra (regra do dono do produto), com a franja do próprio topo.
  [Block.PATH]: { top: 'caminho', front: 'terra', overlay: 'caminho' },
  [Block.TILLED]: { top: 'arada', front: 'terra', overlay: 'arada' },
};

/**
 * O V2 é o padrão do jogo (dono do produto, 2026-11-08). `?blocos=legado` volta ao atlas antigo — só para comparar em
 * desenvolvimento. As pedras aposentadas (mundos antigos) seguem com a arte antiga de qualquer forma.
 */
export function blocksV2FromSearch(search: string): boolean {
  return new URLSearchParams(search).get('blocos') !== 'legado';
}

let enabled = false;
let atlas: HTMLImageElement | null = null;
let manifest: MaterialsV2Manifest | null = null;
let maskAtlas: HTMLImageElement | null = null;

/** Liga o caminho V2 com o atlas (e o das máscaras) já carregado(s) (`loadMaterialsV2` em blockArt). */
export function setMaterialsV2(img: HTMLImageElement, m: MaterialsV2Manifest, useInWorld: boolean, masks: HTMLImageElement | null = null): void {
  atlas = img;
  manifest = m;
  enabled = useInWorld;
  maskAtlas = masks;
}

/** Atlas das máscaras de transição, ou null (sem máscaras no pacote, ou V2 desligado). */
export function transitionMasks(): { img: HTMLImageElement; cell: number; order: string[]; shapes: string[]; overlay: string[] } | null {
  return enabled && maskAtlas && manifest?.masks ? { img: maskAtlas, overlay: [], ...manifest.masks } : null;
}

/** O mundo deve usar V2 para os blocos-piloto? */
export function materialsV2InWorld(): boolean {
  return enabled && !!atlas;
}

type Ctx = CanvasRenderingContext2D;

function col(name: string): number {
  return manifest ? manifest.materials.indexOf(name) : -1;
}

/** Pinta a linha `row` do material `name` no retângulo dado (nada se faltar). */
function paint(ctx: Ctx, name: string, row: keyof MaterialsV2Manifest['rows'], x: number, y: number, w: number, h: number): void {
  const i = col(name);
  if (!atlas || !manifest || i < 0) return;
  const [sy, sh] = manifest.rows[row];
  ctx.drawImage(atlas, i * manifest.cell, sy, manifest.cell, sh, x, y, w, h);
}

/**
 * Pinta a frente do nível `level` de uma pilha em [T, T + front): a frente é uma textura seamless que o motor fatia —
 * o nível 0 (o de baixo) lê o começo da textura e cada nível acima lê a fatia anterior (que termina onde a de baixo
 * começa), voltando ao fim da textura quando passa do começo. Assim a parede é contínua na vertical, sem emenda entre
 * níveis, e colocar um bloco em cima não muda a textura dos de baixo. `yTop` = onde a fatia começa; `srcLevelH` = altura
 * de uma fatia no atlas (`front * TEX_RES`).
 */
function paintFront(ctx: Ctx, name: string, level: number, yTop: number, T: number, front: number, srcLevelH: number): void {
  const i = col(name);
  if (!atlas || !manifest || i < 0) return;
  const [sy, sh] = manifest.rows.front;
  let off = (((-level * srcLevelH) % sh) + sh) % sh;
  let done = 0;
  while (done < srcLevelH) {
    const take = Math.min(srcLevelH - done, sh - off);
    ctx.drawImage(atlas, i * manifest.cell, sy + off, manifest.cell, take, 0, yTop + (done / srcLevelH) * front, T, (take / srcLevelH) * front);
    done += take;
    off = (off + take) % sh;
  }
}

/** Franja da frente (grama etc.) em [T, T + front): só o nível mais alto da pilha usa. */
function paintOverlay(ctx: Ctx, b: V2Block, T: number, front: number): void {
  if (b.overlay && manifest?.overlay.includes(b.overlay)) paint(ctx, b.overlay, 'overlay', 0, T, T, front);
}

/**
 * Faces de um cubo V2 isolado para `composeCube` (topo em [0, T), frente em [T, T + front)): frente do nível 0, depois
 * franja (contrato de geometria § 5, passos 1–2). Null se o bloco não é piloto ou o material falta no atlas.
 */
export function v2Faces(id: BlockId, T: number, front: number, texRes: number): { top: (ctx: Ctx) => void; front: (ctx: Ctx) => void } | null {
  const b = V2_BLOCKS[id];
  if (!b || !manifest || col(b.top) < 0 || col(b.front) < 0) return null;
  return {
    top: (ctx) => paint(ctx, b.top, 'top', 0, 0, T, T),
    front: (ctx) => {
      paintFront(ctx, b.front, 0, T, T, front, front * texRes);
      paintOverlay(ctx, b, T, front);
    },
  };
}

/** Topo contínuo do chão (só o topo; chão plano não desenha frente — contrato § 6). */
export function v2GroundTop(id: BlockId, ctx: Ctx, w: number, h: number): boolean {
  const b = V2_BLOCKS[id];
  if (!b || col(b.top) < 0) return false;
  paint(ctx, b.top, 'top', 0, 0, w, h);
  return true;
}

/** Topo da água do V2 (`agua`): ladrilho contínuo do mar e dos rios, sempre na direção desenhada. False sem a arte. */
export function v2WaterTop(ctx: Ctx, w: number, h: number): boolean {
  if (col('agua') < 0) return false;
  paint(ctx, 'agua', 'top', 0, 0, w, h);
  return true;
}
