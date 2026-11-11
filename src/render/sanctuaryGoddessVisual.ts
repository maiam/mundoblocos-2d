/**
 * The goddess's floating artwork is already animated by SpriteSheet.draw().
 * World coordinates describe the SHADOW / collision point, never the feet
 * painted higher inside the sprite. Do not add the flying lift here again.
 *
 * Only the Santuário WebGL renderer uses these anchors.
 */
export const GODDESS_BILLBOARD_CANVAS = {
  width: 256,
  height: 320,
  drawX: 128,
  // Paint the logical ground anchor at the bottom of the billboard texture.
  // Previously it was drawn at y=300, leaving a spurious 20px gap.
  groundY: 320,
  zoom: 3,
} as const;

export const GODDESS_SHADOW_RADII = { x: 0.34, z: 0.11 } as const;
const SHADOW_ELEVATION = 0.018;
const BILLBOARD_ELEVATION = 0.03;

type GoddessFoot = { x: number; y: number; z: number; visualZ: number };

export function sanctuaryGoddessVisualPlacement(
  foot: GoddessFoot,
  elapsed: number,
): {
  billboard: { x: number; y: number; z: number };
  shadow: { x: number; y: number; z: number };
  shadowRadii: { x: number; z: number };
} {
  // Match the legacy goddess shadow shrinkage, but keep its POSITION static.
  const wave = Math.sin(elapsed * 2.4);
  const factor = 1 - 0.12 * (wave + 1) / 2;
  return {
    billboard: {
      x: foot.x,
      y: foot.visualZ + BILLBOARD_ELEVATION,
      // IMPORTANT: no forward (+Z) displacement relative to the collision point.
      z: foot.y,
    },
    shadow: {
      x: foot.x,
      // Real support level (not interpolated height or animation bob).
      y: foot.z + SHADOW_ELEVATION,
      z: foot.y,
    },
    shadowRadii: {
      x: GODDESS_SHADOW_RADII.x * factor,
      z: GODDESS_SHADOW_RADII.z * factor,
    },
  };
}
