import * as THREE from 'three';
import { synthesizeCloudPattern } from './cloudPattern';

/** Atlas técnico RGBA: quatro colunas por duas linhas, 128x128 por célula. */
export interface CloudKit {
  top: any;
  side: any;
  macroTop: any;
  macroSide: any;
  frontEdge: any;
  sideEdge: any;
  cornerOut: any;
  cornerIn: any;
  underside: any;
  ornament: any;
  seamMax: { top: number; side: number };
  dispose(): void;
}

/** Mede diferença dos pixels extremos, sem confundir com repetição do padrão desenhado. */
function seamDifference(canvas: HTMLCanvasElement): number {
  const pixels = canvas.getContext('2d')!.getImageData(0, 0, 128, 128).data;
  const at = (x: number, y: number, channel: number) => pixels[(y * 128 + x) * 4 + channel];
  let max = 0;
  for (let i = 0; i < 128; i++) for (let c = 0; c < 3; c++) {
    max = Math.max(max, Math.abs(at(0, i, c) - at(127, i, c)));
    max = Math.max(max, Math.abs(at(i, 0, c) - at(i, 127, c)));
  }
  return max;
}

/**
 * Lê o arquivo no próprio navegador, sem upload nem persistência.
 * A fonte aprovada pelo usuário é distribuída separadamente no kit técnico.
 */
export async function loadCloudKit(file: File, maxAnisotropy: number): Promise<CloudKit> {
  const url = URL.createObjectURL(file);
  const image = new Image();
  try {
    image.src = url;
    await image.decode();
    if (image.naturalWidth !== 512 || image.naturalHeight !== 256) {
      throw new Error('Selecione atlas-4x2-rgba.png (512×256, 8 peças de 128×128).');
    }
    const textures: any[] = [];
    const canvases: HTMLCanvasElement[] = [];
    for (let i = 0; i < 8; i++) {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 128;
      canvas.getContext('2d')!.drawImage(image, (i % 4) * 128, Math.floor(i / 4) * 128, 128, 128, 0, 0, 128, 128);
      canvases.push(canvas);
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = Math.min(maxAnisotropy, 4);
      textures.push(tex);
    }
    // A single macro painting is sampled with world-space UVs across all cells.
    // Unlike per-cell texture mapping, this does not restart the cloud motif per block.
    function macro(canvas: HTMLCanvasElement, salt: number): any {
      const ctx = canvas.getContext('2d')!;
      const bytes = ctx.getImageData(0, 0, 128, 128).data;
      const pixels = synthesizeCloudPattern(bytes, 768, salt);
      const big = document.createElement('canvas');
      big.width = big.height = 768;
      const imageData = new ImageData(768, 768);
      imageData.data.set(pixels);
      big.getContext('2d')!.putImageData(imageData, 0, 0);
      const result = new THREE.CanvasTexture(big);
      result.colorSpace = THREE.SRGBColorSpace;
      result.wrapS = result.wrapT = THREE.RepeatWrapping;
      result.anisotropy = Math.min(maxAnisotropy, 4);
      textures.push(result);
      return result;
    }
    const macroTop = macro(canvases[0], 91);
    const macroSide = macro(canvases[1], 429);
    return {
      top: textures[0],
      side: textures[1],
      macroTop,
      macroSide,
      frontEdge: textures[2],
      sideEdge: textures[3],
      cornerOut: textures[4],
      cornerIn: textures[5],
      underside: textures[6],
      ornament: textures[7],
      seamMax: { top: seamDifference(canvases[0]), side: seamDifference(canvases[1]) },
      dispose(): void { textures.forEach((texture) => texture.dispose()); },
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}
