import * as THREE from 'three';

/**
 * Topo 512×512 pintado para o Santuário Celestial.
 * Não altera, sintetiza, repinta ou mistura os pixels da imagem selecionada.
 * Three.js repetirá essa textura uma vez a cada 4×4 células do mundo.
 */
export interface CloudTop512 {
  texture: any;
  seamMax: { horizontal: number; vertical: number };
  dispose(): void;
}

/** Maior diferença RGB entre lados opostos (0 = bordas exatamente iguais). */
export function cloudSeamErrors(data: Uint8ClampedArray, size: number): { horizontal: number; vertical: number } {
  if (data.length !== size * size * 4) throw new Error('Dados RGBA inconsistentes.');
  let horizontal = 0;
  let vertical = 0;
  for (let i = 0; i < size; i++) {
    for (let c = 0; c < 3; c++) {
      horizontal = Math.max(horizontal, Math.abs(data[(i * size) * 4 + c] - data[(i * size + size - 1) * 4 + c]));
      vertical = Math.max(vertical, Math.abs(data[i * 4 + c] - data[((size - 1) * size + i) * 4 + c]));
    }
  }
  return { horizontal, vertical };
}

/**
 * Carrega a arte original somente no navegador local: o arquivo não é enviado
 * a nenhum servidor. A imagem 512×512 ocupa 4×4 células, em todas as faces.
 */
export async function loadCloudTop512(file: File, maxAnisotropy: number): Promise<CloudTop512> {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    if (image.naturalWidth !== 512 || image.naturalHeight !== 512) {
      throw new Error('Selecione a nova textura quadrada 512×512 da Nuvem Sólida.');
    }
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 512;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Canvas 2D indisponível para leitura de textura.');
    context.drawImage(image, 0, 0);
    const seamMax = cloudSeamErrors(context.getImageData(0, 0, 512, 512).data, 512);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = Math.min(4, maxAnisotropy);
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    return { texture, seamMax, dispose() { texture.dispose(); } };
  } finally {
    URL.revokeObjectURL(url);
  }
}
