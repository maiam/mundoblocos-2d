import * as THREE from 'three';

export const GODDESS_ISO_FILES = {
  idle: 'deusa_iso_idle_4x4.png',
  walk: 'deusa_iso_walk_4x4.png',
  sit: 'deusa_iso_sit_4x4.png',
} as const;

export type GoddessIsoAction = keyof typeof GODDESS_ISO_FILES;
export type GoddessIsoDirection = 'down' | 'left' | 'right' | 'up';
export const GODDESS_ISO_PUBLIC_PATH = '/assets/characters/deusa-iso/';

export const GODDESS_ISO_DIRECTIONS: Readonly<Record<GoddessIsoDirection, number>> = {
  down: 0, left: 1, right: 2, up: 3,
};

export interface GoddessIsoSpriteSet {
  idle: any;
  walk: any;
  sit: any;
  dispose(): void;
}

export function goddessIsoDirectionByInput(
  screenX: number, screenY: number, fallback: GoddessIsoDirection,
): GoddessIsoDirection {
  if (Math.hypot(screenX, screenY) < 0.08) return fallback;
  return Math.abs(screenX) > Math.abs(screenY)
    ? (screenX < 0 ? 'left' : 'right')
    : (screenY < 0 ? 'up' : 'down');
}

export function goddessIsoAnimationFrame(
  action: GoddessIsoAction, time: number, motionTime: number, sittingFrame = 0,
): number {
  if (action === 'sit') return Math.min(3, Math.max(0, Math.floor(sittingFrame)));
  if (action === 'walk') return Math.floor(Math.max(0, motionTime) * 9) % 4;
  const cycle = ((Math.max(0, time) % 4.8) + 4.8) % 4.8;
  return cycle < 3.9 ? 0 : Math.min(3, 1 + Math.floor((cycle - 3.9) / 0.3));
}

/** Set one of 16 sprites in a 4×4 RGBA atlas (row 0 is at the top). */
export function setGoddessIsoFrame(
  atlas: any, direction: GoddessIsoDirection, frame: number,
): void {
  const row = GODDESS_ISO_DIRECTIONS[direction];
  const col = Math.min(3, Math.max(0, Math.floor(frame)));
  atlas.repeat.set(0.25, 0.25);
  atlas.offset.set(col * 0.25, 1 - (row + 1) * 0.25);
}

function prepareTexture(image: HTMLImageElement): any {
  if (image.naturalWidth !== 1280 || image.naturalHeight !== 1280)
    throw new Error('A prancha deve ter 1280×1280 pixels, em grade 4×4.');
  const texture = new THREE.Texture(image);
  texture.needsUpdate = true;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.premultiplyAlpha = false;
  setGoddessIsoFrame(texture, 'down', 0);
  return texture;
}

async function decodeImageFile(file: File): Promise<HTMLImageElement> {
  if (!file.name.toLowerCase().endsWith('.png'))
    throw new Error('Envie arquivos PNG com fundo transparente.');
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return image;
  } finally {
    // Image.decode has already made pixel data available.
    URL.revokeObjectURL(url);
  }
}

export async function loadGoddessIsoFromFiles(files: readonly File[]): Promise<GoddessIsoSpriteSet> {
  const mapping = new Map<GoddessIsoAction, File>();
  for (const file of files) {
    const action = (Object.keys(GODDESS_ISO_FILES) as GoddessIsoAction[])
      .find(key => GODDESS_ISO_FILES[key] === file.name.toLowerCase());
    if (!action) continue;
    if (mapping.has(action)) throw new Error('Arquivo duplicado: ' + GODDESS_ISO_FILES[action]);
    mapping.set(action, file);
  }
  const missing = (Object.keys(GODDESS_ISO_FILES) as GoddessIsoAction[])
    .filter(action => !mapping.has(action));
  if (missing.length) throw new Error('Selecione as três pranchas: ' + missing.map(x => GODDESS_ISO_FILES[x]).join(', '));
  const textures: any[] = [];
  try {
    const set = {} as Record<GoddessIsoAction, any>;
    for (const action of Object.keys(GODDESS_ISO_FILES) as GoddessIsoAction[]) {
      const image = await decodeImageFile(mapping.get(action)!);
      const texture = prepareTexture(image);
      textures.push(texture);
      set[action] = texture;
    }
    return { ...set, dispose(): void { for (const texture of textures) texture.dispose(); } };
  } catch (err) {
    textures.forEach(texture => texture.dispose());
    throw err;
  }
}

/**
 * Automatic load when the PNGs are copied into public/assets/characters/deusa-iso.
 * Returns null on a clean checkout without those images; the old art remains.
 */
export async function loadGoddessIsoFromPublicAssets(): Promise<GoddessIsoSpriteSet | null> {
  const textures: any[] = [];
  try {
    const result = {} as Record<GoddessIsoAction, any>;
    for (const action of Object.keys(GODDESS_ISO_FILES) as GoddessIsoAction[]) {
      const url = GODDESS_ISO_PUBLIC_PATH + GODDESS_ISO_FILES[action];
      const image = new Image();
      image.src = url;
      await image.decode();
      const texture = prepareTexture(image);
      textures.push(texture);
      result[action] = texture;
    }
    return { ...result, dispose(): void { textures.forEach(t => t.dispose()); } };
  } catch {
    textures.forEach(t => t.dispose());
    return null;
  }
}
