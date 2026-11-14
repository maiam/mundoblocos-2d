import type { Player } from './player';
import type { WorldId } from '../world/profiles';

/**
 * The legacy 2D world lets the player auto-step over a full cube.
 * In Three.js that looks like walking THROUGH solid blocks, because
 * the whole cube is a visible obstacle rather than a stylized 18px face.
 *
 * Santuário WebGL deve permitir subir um único cubo (degraus de 1), mas nunca atravessar pilhas de 2 ou mais.
 * O Mundo 3D experimental conserva colisão sólida sem degraus.
 * The official Santuário WebGL session always changes this rule. The Mundo no longer has a "solid" mode (v0.93.75, ADR 0033): its blocks
 * are 1/4 of a cell tall and a stack of 1–3 is walkable, the full stack of 4 blocks; `solidWorld` is kept only for call compatibility.
 */
export function configureSanctuaryThreeCollision(
  player: Player, worldId: WorldId, threeRendererActive: boolean, _solidWorld = false,
): void {
  if (!threeRendererActive) return;
  if (worldId === 'santuario') player.spec.stepHeight = 1;
  // Mundo principal (ADR 0033, v0.93.75): sem física "sólida". Todo bloco tem 1/4 de célula e o jogador sobe até 3 empilhados (`World.stepLevels`:
  // 1 cubo → 3 blocos); a pilha de 4 (célula cheia) bloqueia. Antes (`?fisica=solida`, M5/M6) ele não subia em nada.
}
