/**
 * Acabamento visual das texturas de terreno do Santuário.
 *
 * As artes 6-faces têm molduras pintadas dentro de cada quadrado. O render 3D
 * reproduzia essa moldura em TODO bloco, desenhando uma grade artificial na
 * superfície. Retiramos essa borda AO CARREGAR a textura e aproximamos
 * suavemente as margens opostas do mesmo tile.
 *
 * A geometria, o picking, as alturas e a seed não são alterados.
 */

/** A fonte é RGBA em linhas consecutivas; retorna novos pixels sem alterar a imagem original. */
export function seamlessPixelEdges(
  source: Uint8ClampedArray,
  width: number,
  height: number,
  axes: 'both' | 'horizontal' = 'both',
  blendFraction = 0.16,
): Uint8ClampedArray {
  if (width < 2 || height < 2 || source.length !== width * height * 4) {
    return new Uint8ClampedArray(source);
  }
  const dest = new Uint8ClampedArray(source);
  const spanX = Math.min(Math.floor(width / 2), Math.max(1, Math.round(width * blendFraction)));

  // Para cada linha, as extremidades esquerda e direita passam a ter a
  // MESMA cor. A faixa de correção some progressivamente até o miolo.
  for (let y = 0; y < height; y++) {
    const base = y * width * 4;
    for (let channel = 0; channel < 4; channel++) {
      const target = (source[base + channel] + source[base + (width - 1) * 4 + channel]) / 2;
      for (let d = 0; d < spanX; d++) {
        const weight = (1 - d / spanX) ** 2;
        const left = base + d * 4 + channel;
        const right = base + (width - 1 - d) * 4 + channel;
        dest[left] = source[left] * (1 - weight) + target * weight;
        dest[right] = source[right] * (1 - weight) + target * weight;
      }
    }
  }

  if (axes === 'horizontal') return dest;

  // O mesmo processo une norte/sul. As faces laterais da grama usam apenas
  // a horizontal para NÃO misturar a franja verde superior com o barro inferior.
  const horizontal = new Uint8ClampedArray(dest);
  const spanY = Math.min(Math.floor(height / 2), Math.max(1, Math.round(height * blendFraction)));
  for (let x = 0; x < width; x++) for (let channel = 0; channel < 4; channel++) {
    const target = (horizontal[x * 4 + channel]
      + horizontal[((height - 1) * width + x) * 4 + channel]) / 2;
    for (let d = 0; d < spanY; d++) {
      const weight = (1 - d / spanY) ** 2;
      const top = (d * width + x) * 4 + channel;
      const bottom = ((height - 1 - d) * width + x) * 4 + channel;
      dest[top] = horizontal[top] * (1 - weight) + target * weight;
      dest[bottom] = horizontal[bottom] * (1 - weight) + target * weight;
    }
  }
  return dest;
}

/** Recorta a moldura ilustrada (~7% de cada lado) e prepara um tile contínuo 128×128. */
export function seamlessCubeFace(
  atlas: HTMLImageElement,
  sx: number,
  sy: number,
  sourceSide: number,
  axes: 'both' | 'horizontal' = 'both',
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const inset = sourceSide * 0.07;
  ctx.drawImage(
    atlas, sx + inset, sy + inset, sourceSide - 2 * inset, sourceSide - 2 * inset,
    0, 0, 128, 128,
  );
  const current = ctx.getImageData(0, 0, 128, 128);
  current.data.set(seamlessPixelEdges(current.data, 128, 128, axes));
  ctx.putImageData(current, 0, 0);
  return canvas;
}
