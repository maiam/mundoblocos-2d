import { Block, type BlockId } from '../world/blocks';

/**
 * Padrão de Materiais V2 (ADR 0023): texturas planas 128×128 por material (`assets-src/materiais/`), reduzidas pelo
 * `scripts/build-materials.py` para um atlas (`materials-v2.webp` + manifesto). O motor monta a geometria: topo 32×32
 * e frente de `CUBE_FRONT` (18, decidido em 2026-11-07) — a arte não traz o cubo pronto. Sem frente própria, a frente
 * repete o topo (o pipeline resolve).
 *
 * Fase de validação: só areia, terra, grama e Pedra Bruta, e só com `?blocos=v2` (jogo) ou na cena `?materiais=1`. Sem a chave nada
 * muda (atlas legado). Aparência é do render; regras de bloco continuam em `world/blocks.ts`.
 */
export interface MaterialsV2Manifest {
  cell: number;
  /** Linha do atlas → [y, altura]: topo, frente e franja da frente. */
  rows: Record<'top' | 'front' | 'overlay', [number, number]>;
  materials: string[];
  overlay: string[];
}

/** Composição de um bloco: topo de um material, frente de outro e franja opcional (ex.: grama sobre terra). */
interface V2Block { top: string; front: string; overlay?: string }

/** Blocos-piloto (contrato § 4: Bloco A areia, B grama sobre terra, C terra). */
export const V2_BLOCKS: Partial<Record<BlockId, V2Block>> = {
  [Block.SAND]: { top: 'areia', front: 'areia' },
  [Block.DIRT]: { top: 'terra', front: 'terra' },
  [Block.GRASS]: { top: 'grama', front: 'terra', overlay: 'grama' },
  [Block.STONE]: { top: 'pedra', front: 'pedra' },
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
 * Faces de um bloco V2 para `composeCube` (topo em [0, T), frente em [T, T + front)): frente-base, depois franja
 * (contrato de geometria § 5, passos 1–2). Null se o bloco não é piloto ou o material falta no atlas.
 */
export function v2Faces(id: BlockId, T: number, front: number): { top: (ctx: Ctx) => void; front: (ctx: Ctx) => void } | null {
  const b = V2_BLOCKS[id];
  if (!b || !manifest || col(b.top) < 0 || col(b.front) < 0) return null;
  const overlay = b.overlay && manifest.overlay.includes(b.overlay) ? b.overlay : null;
  return {
    top: (ctx) => paint(ctx, b.top, 'top', 0, 0, T, T),
    front: (ctx) => {
      paint(ctx, b.front, 'front', 0, T, T, front);
      if (overlay) paint(ctx, overlay, 'overlay', 0, T, T, front);
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
