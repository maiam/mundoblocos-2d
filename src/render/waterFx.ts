/**
 * Superfície da água (v0.93.86): o que decide onde a camada animada aparece. Puro. O desenho é `three/waterSurface.ts`.
 * A água continua sendo pixels do chão do chunk (arte V2 `agua`); a camada animada só cobre as células de água aberta,
 * decididas pelo mapa (`World`), nunca lendo pixels.
 */

/** Lado (em células) da máscara de um chunk: o chunk mais 1 célula de vizinhança em cada lado (a margem fica suave entre chunks). */
export const WATER_MASK_SIZE = 18;

/** `?agua=0` desliga a superfície animada (volta à água parada de antes). */
export function waterFxOn(search: string = typeof window !== 'undefined' ? window.location.search : ''): boolean {
  return new URLSearchParams(search).get('agua') !== '0';
}

/**
 * Máscara de água do chunk com origem em (x0, y0): `WATER_MASK_SIZE²` bytes (255 = água aberta, 0 = outra coisa), da célula
 * (x0 − 1, y0 − 1) à (x0 + size, y0 + size). Devolve quantas células de água há na parte do chunk (0 = a camada nem aparece).
 */
export function buildWaterMask(isOpenWater: (x: number, y: number) => boolean, x0: number, y0: number, size: number, out: Uint8Array): number {
  let inChunk = 0;
  for (let j = 0; j < WATER_MASK_SIZE; j++) {
    for (let i = 0; i < WATER_MASK_SIZE; i++) {
      const water = isOpenWater(x0 + i - 1, y0 + j - 1);
      out[j * WATER_MASK_SIZE + i] = water ? 255 : 0;
      if (water && i >= 1 && j >= 1 && i <= size && j <= size) inChunk++;
    }
  }
  return inChunk;
}
