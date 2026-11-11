/**
 * External camera controls for the ephemeral Five-Level Santuário editor.
 * In either projection the Walker receives the exact same WORLD coordinates
 * and therefore the exact same stair/support rules as the FPS camera.
 */
export function externalFreeBuildMovement(
  screenX: number, screenY: number, isometric: boolean,
): [number, number] {
  if (!isometric) return [screenX, screenY];
  return [(screenX + screenY) * Math.SQRT1_2, (screenY - screenX) * Math.SQRT1_2];
}

/**
 * A fixed overview hides the avatar's elevation changes. The first deliberate
 * step in the free-build editor switches to following the avatar across all
 * five levels; the user can still select the overview button explicitly.
 */
export function shouldFollowFreeBuildOnMove(
  inEditor: boolean, isFirstPerson: boolean, overview: boolean,
  screenX: number, screenY: number,
): boolean {
  return inEditor && !isFirstPerson && overview && Math.hypot(screenX, screenY) > 0.08;
}
