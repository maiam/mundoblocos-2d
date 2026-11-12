/**
 * Orthographic elevated top-down camera experiment inspired by Core Keeper's
 * visual language. The exact original game's camera angle is not public.
 *
 * World Z+ faces forward. No azimuth rotation: only one frontal block face.
 * The goddess's XY billboard is vertical and never tilts with this pitch.
 */
export const SANCTUARY_CAMERA_ELEVATION_DEG = 67;
export const SANCTUARY_CAMERA_HEIGHT = 37;

/**
 * Altura de desenho da face V3. Sob uma câmera ortográfica inclinada,
 * uma altura H projeta H/tan(ângulo) células sobre o chão. Para a
 * face visual ocupar exatamente uma célula desde sua BASE inferior,
 * H deve ser tan(ângulo). Isso não altera a colisão física de 2 níveis.
 */
export function sanctuaryV3VisualHeight():number {
  return Math.tan(SANCTUARY_CAMERA_ELEVATION_DEG*Math.PI/180);
}

export function sanctuaryCameraOffset():{height:number;depth:number}{
  const radians=SANCTUARY_CAMERA_ELEVATION_DEG*Math.PI/180;
  return {height:SANCTUARY_CAMERA_HEIGHT,
    depth:SANCTUARY_CAMERA_HEIGHT/Math.tan(radians)};
}
