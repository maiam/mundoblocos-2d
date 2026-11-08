import { Block, type BlockId } from '../world/blocks';

/**
 * Padrão de Materiais V2 (ADR 0023): texturas planas 128×128 por material (`assets-src/materiais/`), reduzidas pelo
 * `scripts/build-materials.py` para um atlas (`materials-v2.webp` + manifesto). O motor monta a geometria: topo 32×32
 * e frente de `CUBE_FRONT` (18, decidido em 2026-11-07) — a arte não traz o cubo pronto. Sem frente própria, a frente
 * repete o topo (o pipeline resolve).
 *
 * Fase de validação: só areia, terra, grama, Pedra Bruta, Caminho de Terra e Terra Arada, e só com `?blocos=v2` (jogo) ou na cena `?materiais=1`. Sem a chave nada
 * muda (atlas legado). Aparência é do render; regras de bloco continuam em `world/blocks.ts`.
 */
export interface MaterialsV2Manifest {
  cell: number;
  /** Linha do atlas → [y, altura]: topo, frente (textura inteira, fatiada por nível) e franja da frente. */
  rows: Record<'top' | 'front' | 'overlay', [number, number]>;
  materials: string[];
  overlay: string[];
}

/** Sombra da frente (luz vem de cima): a frente é um pouco mais escura que o topo. */
export const FRONT_SHADE = 'rgba(30, 20, 60, 0.18)';

/** Composição de um bloco: topo de um material, frente de outro e franja opcional (ex.: grama sobre terra). */
interface V2Block { top: string; front: string; overlay?: string }

/** Blocos-piloto (contrato § 4: Bloco A areia, B grama sobre terra, C terra). */
export const V2_BLOCKS: Partial<Record<BlockId, V2Block>> = {
  [Block.SAND]: { top: 'areia', front: 'areia' },
  [Block.DIRT]: { top: 'terra', front: 'terra' },
  [Block.GRASS]: { top: 'grama', front: 'terra', overlay: 'grama' },
  [Block.STONE]: { top: 'pedra', front: 'pedra' },
  // Caminho de Terra e Terra Arada: a frente é sempre terra (regra do dono do produto), com a franja do próprio topo.
  [Block.PATH]: { top: 'caminho', front: 'terra', overlay: 'caminho' },
  [Block.TILLED]: { top: 'arada', front: 'terra', overlay: 'arada' },
};

/** `?blocos=v2` liga o caminho V2 no jogo (desenvolvimento; padrão desligado). */
export function blocksV2FromSearch(search: string): boolean {
  return new URLSearchParams(search).get('blocos') === 'v2';
}

let enabled = false;
let atlas: HTMLImageElement | null = null;
let manifest: MaterialsV2Manifest | null = null;

/** Liga o caminho V2 com o atlas já carregado (`loadMaterialsV2` em blockArt). */
export function setMaterialsV2(img: HTMLImageElement, m: MaterialsV2Manifest, useInWorld: boolean): void {
  atlas = img;
  manifest = m;
  enabled = useInWorld;
}

/** O mundo deve usar V2 para os blocos-piloto? */
export function materialsV2InWorld(): boolean {
  return enabled && !!atlas;
}

export function materialsV2Ready(): boolean {
  return !!atlas && !!manifest;
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

/**
 * Faces de um cubo V2 dentro de uma massa (pilha/platô): frente do nível `level` e franja só se `top` (nível mais alto
 * da célula). Mesma forma de `v2Faces`, usada por `textures.cubeSpriteV2`.
 */
export function v2LevelFaces(id: BlockId, level: number, isTop: boolean, T: number, front: number, texRes: number): { top: (ctx: Ctx) => void; front: (ctx: Ctx) => void } | null {
  const b = V2_BLOCKS[id];
  if (!b || !manifest || col(b.top) < 0 || col(b.front) < 0) return null;
  return {
    top: (ctx) => {
      if (isTop) {
        paint(ctx, b.top, 'top', 0, 0, T, T);
        return;
      }
      // Nível coberto pelo de cima: o topo não aparece, mas a borda do de cima é meio transparente no arredondamento e
      // deixaria ver uma linha dele. Em vez do topo, a parede continua para cima (fatias seguintes da frente).
      for (let k = 1; k * front < T + front; k++) paintFront(ctx, b.front, level + k, T - k * front, T, front, front * texRes);
      ctx.fillStyle = FRONT_SHADE;
      ctx.fillRect(0, 0, T, T);
    },
    front: (ctx) => {
      paintFront(ctx, b.front, level, T, T, front, front * texRes);
      if (isTop) paintOverlay(ctx, b, T, front);
    },
  };
}

// ---------------------------------------------------------------- massa contínua (sem riscos entre cubos)

/**
 * O que o motor sabe do mapa para decidir os contornos de um cubo V2 (só leitura; o `Renderer` monta a partir do
 * `World`, a cena `?materiais=1` a partir do próprio layout):
 * - `height(x, y)`: quantos cubos empilhados há na célula (só cubos, 0..MAX_STACK);
 * - `v2(x, y, level)`: o cubo desse nível é de um bloco V2?
 */
export interface CubeView {
  height(x: number, y: number): number;
  v2(x: number, y: number, level: number): boolean;
}

/**
 * Onde o cubo tem contorno. Regra (ADR 0023): o contorno é da **silhueta da massa**, não de cada cubo — cubos V2 vizinhos,
 * de qualquer material, formam uma superfície só: sem risco entre eles, nem entre níveis empilhados.
 * - `top`: é o cubo mais alto da célula (só ele mostra o topo e a franja);
 * - `front`: a frente aparece (a célula ao sul não cobre este nível);
 * - `n`, `wt`, `et`: bordas do topo (norte, oeste, leste) que dão para fora do plano;
 * - `wf`, `ef`: bordas laterais da frente que dão para fora; `base`: pé da pilha no chão.
 */
export interface CubeEdges {
  top: boolean;
  front: boolean;
  n: boolean;
  wt: boolean;
  et: boolean;
  wf: boolean;
  ef: boolean;
  base: boolean;
}

export function cubeEdges(view: CubeView, x: number, y: number, level: number): CubeEdges {
  const top = view.height(x, y) === level + 1;
  const front = view.height(x, y + 1) <= level; // a célula ao sul cobriria a frente com o topo dela
  // Mesmo plano de topo: vizinho V2 cujo cubo mais alto está neste mesmo nível.
  const samePlane = (nx: number, ny: number) => view.height(nx, ny) === level + 1 && view.v2(nx, ny, level);
  // Frente contínua ao lado: vizinho V2 com este nível, também com a frente à mostra.
  const sameFront = (nx: number) => view.v2(nx, y, level) && view.height(nx, y) > level && view.height(nx, y + 1) <= level;
  return {
    top,
    front,
    n: top && !samePlane(x, y - 1),
    wt: top && !samePlane(x - 1, y),
    et: top && !samePlane(x + 1, y),
    wf: front && !sameFront(x - 1),
    ef: front && !sameFront(x + 1),
    base: front && level === 0,
  };
}

/** Chave numérica das bordas (cache de sprites). */
export function edgesKey(e: CubeEdges): number {
  return (e.top ? 1 : 0) | (e.front ? 2 : 0) | (e.n ? 4 : 0) | (e.wt ? 8 : 0) | (e.et ? 16 : 0) | (e.wf ? 32 : 0) | (e.ef ? 64 : 0) | (e.base ? 128 : 0);
}

/** Topo contínuo do chão (só o topo; chão plano não desenha frente — contrato § 6). */
export function v2GroundTop(id: BlockId, ctx: Ctx, w: number, h: number): boolean {
  const b = V2_BLOCKS[id];
  if (!b || col(b.top) < 0) return false;
  paint(ctx, b.top, 'top', 0, 0, w, h);
  return true;
}
