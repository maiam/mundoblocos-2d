/**
 * Orthographic elevated top-down camera experiment inspired by Core Keeper's
 * visual language. The exact original game's camera angle is not public.
 *
 * World Z+ faces forward. No azimuth rotation: only one frontal block face.
 * The goddess's XY billboard is vertical and never tilts with this pitch.
 */
export const SANCTUARY_CAMERA_ELEVATION_DEG = 67;
export const SANCTUARY_CAMERA_HEIGHT = 37;

export function sanctuaryCameraOffset():{height:number;depth:number}{
  const radians=SANCTUARY_CAMERA_ELEVATION_DEG*Math.PI/180;
  return {height:SANCTUARY_CAMERA_HEIGHT,
    depth:SANCTUARY_CAMERA_HEIGHT/Math.tan(radians)};
}
