/**
 * Camera-only first-person experiment. World positions remain X/Y (horizontal),
 * Z is height in Walker; Three.js uses X/Z (horizontal), Y (height).
 * Never modifies World, saves, block geometry, step height or artwork.
 */
export const FP_EYE_HEIGHT = 1.55;
export const FP_REACH = 6;
export const FP_FOV_DEGREES = 74;
export const FP_MOUSE_SENSITIVITY = 0.0024;
export const FP_PITCH_LIMIT = Math.PI / 2 - 0.09;

export interface FirstPersonAngles { yaw: number; pitch: number }

export function firstPersonLook(
  yaw: number, pitch: number, deltaX: number, deltaY: number, sensitivity = FP_MOUSE_SENSITIVITY,
): FirstPersonAngles {
  return {
    yaw: yaw + deltaX * sensitivity,
    pitch: Math.max(-FP_PITCH_LIMIT, Math.min(FP_PITCH_LIMIT, pitch - deltaY * sensitivity)),
  };
}

/**
 * Inputs: sx positive = strafe right, sy negative = forward.
 * Yaw zero faces world -Z; yaw PI/2 faces world +X.
 * Return world X/Z movement (passed to Walker as x/y).
 */
export function firstPersonMovement(sx: number, sy: number, yaw: number): [number, number] {
  return [sx * Math.cos(yaw) - sy * Math.sin(yaw),
    sx * Math.sin(yaw) + sy * Math.cos(yaw)];
}

/** Camera looks down -Z at yaw 0, up/down with pitch positive/negative. */
export function firstPersonForward(yaw: number, pitch: number): [number, number, number] {
  const cp = Math.cos(pitch);
  return [Math.sin(yaw) * cp, Math.sin(pitch), -Math.cos(yaw) * cp];
}

/**
 * Face hit: the signed offset picks the existing cube (remove) or the
 * immediately adjacent empty cell (place). This works for horizontal faces,
 * vertical walls, and the UNDERSIDE of an elevated slab.
 */
export function firstPersonHitCell(
  point: {x: number; y: number; z: number},
  normal: {x: number; y: number; z: number},
  worldX0: number, worldY0: number, remove: boolean,
): {x: number; y: number; z: number} {
  const sign = remove ? -1 : 1, eps = 0.005 * sign;
  return {
    x: Math.floor(point.x + normal.x * eps) - worldX0,
    y: Math.floor(point.z + normal.z * eps) - worldY0,
    z: Math.floor(point.y + normal.y * eps),
  };
}

/** Position of an outlined face on the EXISTING cube, not on the ground. */
export function firstPersonFaceOverlay(
  point: {x: number; y: number; z: number},
  normal: {x: number; y: number; z: number},
  worldX0: number, worldY0: number,
): {cell: {x: number; y: number; z: number}; center: [number, number, number]; normal: [number, number, number]; label: string} {
  const cell = firstPersonHitCell(point, normal, worldX0, worldY0, true);
  const nx = Math.round(normal.x), ny = Math.round(normal.y), nz = Math.round(normal.z);
  const cx = worldX0 + cell.x + 0.5 + nx * 0.508;
  const cy = cell.z + 0.5 + ny * 0.508;
  const cz = worldY0 + cell.y + 0.5 + nz * 0.508;
  const label = nx ? (nx > 0 ? 'lateral direita (+X)' : 'lateral esquerda (-X)')
    : ny ? (ny > 0 ? 'topo (+Y)' : 'face inferior (-Y)')
    : nz > 0 ? 'lateral frontal (+Z)' : 'lateral traseira (-Z)';
  return {cell, center: [cx, cy, cz], normal: [nx, ny, nz], label};
}
