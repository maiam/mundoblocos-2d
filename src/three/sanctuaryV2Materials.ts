import * as THREE from 'three';
import { cloudSeamErrors } from './cloudTop512';

export const SANCTUARY_V2_IDS = [80, 81, 82, 83, 84, 85] as const;
export type SanctuaryV2Id = (typeof SANCTUARY_V2_IDS)[number];

export const SANCTUARY_V2_NAMES: Record<SanctuaryV2Id, string> = {
  80: 'Nuvem Sólida',
  81: 'Nuvem Etérea',
  82: 'Mármore Celestial',
  83: 'Mármore Ornamentado',
  84: 'Pedra Celestial',
  85: 'Pedra Dourada',
};

export interface SanctuaryV2Materials {
  textures: Map<number, any>;
  seams: Map<number, { horizontal: number; vertical: number }>;
  dispose(): void;
}

export function sanctuaryTextureId(filename: string): SanctuaryV2Id | null {
  const match = /^(80|81|82|83|84|85)(?:[-_ .]|$)/.exec(filename);
  return match ? Number(match[1]) as SanctuaryV2Id : null;
}

/** Browser-only: reads six PNGs from a file dialog, does not upload or save. */
export async function loadSanctuaryV2Materials(files: readonly File[], anisotropy: number): Promise<SanctuaryV2Materials> {
  const source = new Map<number, File>();
  for (const file of files) {
    const id = sanctuaryTextureId(file.name);
    if (id !== null) {
      if (source.has(id)) throw new Error('Arquivo duplicado do bloco ' + id);
      source.set(id, file);
    }
  }
  const missing = SANCTUARY_V2_IDS.filter((id) => !source.has(id));
  if (missing.length) throw new Error('Faltam os arquivos dos IDs ' + missing.join(', ') + '. Selecione os seis PNGs do ZIP.');
  const textures = new Map<number, any>();
  const seams = new Map<number, { horizontal: number; vertical: number }>();
  try {
    for (const id of SANCTUARY_V2_IDS) {
      const file = source.get(id)!;
      const url = URL.createObjectURL(file);
      try {
        const image = new Image();
        image.src = url;
        await image.decode();
        if (image.naturalWidth !== 512 || image.naturalHeight !== 512)
          throw new Error('A textura ' + id + ' precisa ter 512×512 pixels.');
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 512;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) throw new Error('Canvas 2D indisponível.');
        ctx.drawImage(image, 0, 0);
        const seam = cloudSeamErrors(ctx.getImageData(0, 0, 512, 512).data, 512);
        if (seam.horizontal !== 0 || seam.vertical !== 0)
          throw new Error('O material ' + id + ' não é seamless (diferença ' + seam.horizontal + '/' + seam.vertical + '). Utilize o PNG preparado.');
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.magFilter = THREE.LinearFilter;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.anisotropy = Math.min(4, anisotropy);
        textures.set(id, texture);
        seams.set(id, seam);
      } finally { URL.revokeObjectURL(url); }
    }
    return {
      textures,
      seams,
      dispose(): void { for (const texture of textures.values()) texture.dispose(); },
    };
  } catch (err) {
    for (const texture of textures.values()) texture.dispose();
    throw err;
  }
}
