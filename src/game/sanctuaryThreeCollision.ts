import type { Player } from './player';
import type { WorldId } from '../world/profiles';

/**
 * The legacy 2D world lets the player auto-step over a full cube.
 * In Three.js that looks like walking THROUGH solid blocks, because
 * the whole cube is a visible obstacle rather than a stylized 18px face.
 *
 * Only the official Santuário WebGL session changes this rule.
 * All other worlds, including the Santuário ?render=2d fallback,
 * keep their existing STEP_HEIGHT navigation unchanged.
 */
export function configureSanctuaryThreeCollision(
  player: Player, worldId: WorldId, threeRendererActive: boolean,
): void {
  if (worldId === 'santuario' && threeRendererActive) {
    player.spec.stepHeight = 0;
  }
}
