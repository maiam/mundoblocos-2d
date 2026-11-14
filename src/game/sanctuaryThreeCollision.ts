import type { Player } from './player';
import type { WorldId } from '../world/profiles';

/**
 * The legacy 2D world lets the player auto-step over a full cube.
 * In Three.js that looks like walking THROUGH solid blocks, because
 * the whole cube is a visible obstacle rather than a stylized 18px face.
 *
 * Santuário WebGL deve permitir subir um único cubo (degraus de 1), mas nunca atravessar pilhas de 2 ou mais.
 * O Mundo 3D experimental conserva colisão sólida sem degraus.
 * The official Santuário WebGL session always changes this rule. The Mundo (ADR 0031, M5) changes it only in the pilot, behind
 * `?fisica=solida` (`solidWorld`), with the 3D renderer active and offline: the room (server) still runs the old rule until
 * the switch to 3D. All other cases — the Santuário ?render=2d fallback, the Mundo in 2D, online — keep STEP_HEIGHT unchanged.
 * Only the player changes: wolves and goblins keep their own step height (decision pending).
 */
export function configureSanctuaryThreeCollision(
  player: Player, worldId: WorldId, threeRendererActive: boolean, solidWorld = false,
): void {
  if (!threeRendererActive) return;
  if (worldId === 'santuario') player.spec.stepHeight = 1;
  else if (worldId === 'principal' && solidWorld) player.spec.stepHeight = 0;
}
