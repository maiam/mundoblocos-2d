import { blockDef, type BlockId } from './blocks';
import { TOOLS, toolCanBreak, type ToolId } from './items';
import type { World } from './world';

/**
 * Ações do jogador que mudam o mapa, como dados (ADR 0016): o que o cliente manda ao servidor e o que o servidor
 * reaplica em todos. A validação e o efeito são SEMPRE os do `World` (fonte de verdade) — aqui só há o despacho.
 * Inventário e alcance ainda são checados no cliente (ActionController); o servidor só garante as regras do mapa.
 */
export type PlayerAction =
  | { kind: 'break'; x: number; y: number; tool: ToolId | null }
  | { kind: 'place'; x: number; y: number; block: BlockId }
  | { kind: 'till'; x: number; y: number }
  | { kind: 'flatten'; x: number; y: number }
  | { kind: 'plant'; x: number; y: number }
  | { kind: 'door'; x: number; y: number };

const KINDS = new Set<PlayerAction['kind']>(['break', 'place', 'till', 'flatten', 'plant', 'door']);
const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && Math.abs(v) < 2 ** 30;

/** Lê uma ação vinda de fora (rede): devolve a ação bem formada ou null. */
export function parseAction(v: unknown): PlayerAction | null {
  if (!v || typeof v !== 'object') return null;
  const a = v as Record<string, unknown>;
  if (!KINDS.has(a.kind as PlayerAction['kind']) || !isInt(a.x) || !isInt(a.y)) return null;
  const { x, y } = a as { x: number; y: number };
  switch (a.kind) {
    case 'break':
      if (a.tool !== null && !(typeof a.tool === 'string' && a.tool in TOOLS)) return null;
      return { kind: 'break', x, y, tool: a.tool as ToolId | null };
    case 'place':
      if (!isInt(a.block) || !blockDef(a.block).placeable) return null;
      return { kind: 'place', x, y, block: a.block as BlockId };
    default:
      return { kind: a.kind as 'till' | 'flatten' | 'plant' | 'door', x, y };
  }
}

/** Aplica a ação no mundo pelas regras do `World`. Retorna false (e não muda nada) se as regras não permitem. */
export function applyAction(world: World, a: PlayerAction): boolean {
  switch (a.kind) {
    case 'break': {
      const id = world.breakTargetId(a.x, a.y);
      if (id === null || !toolCanBreak(a.tool, id)) return false;
      return world.breakBlock(a.x, a.y) !== null;
    }
    case 'place':
      return world.placeBlock(a.x, a.y, a.block);
    case 'till':
      return world.till(a.x, a.y);
    case 'flatten':
      return world.flatten(a.x, a.y);
    case 'plant':
      return world.plant(a.x, a.y);
    case 'door':
      return world.toggleDoor(a.x, a.y);
  }
}
