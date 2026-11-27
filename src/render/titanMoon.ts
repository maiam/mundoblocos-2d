import * as THREE from 'three';

/**
 * Lua do céu (ADR 0118): um sprite com 8 texturas de 32 × 32 px geradas em código (sem arquivos, sem ler canvas), uma por fase da Wiki
 * (0 cheia, 1 minguante gibosa, 2 quarto minguante, 3 minguante crescente, 4 nova, 5 crescente, 6 quarto crescente, 7 crescente gibosa).
 * A parte iluminada é o que fica à direita do terminador (crescente) ou à esquerda (minguante); a parte sombria fica quase apagada, como na noite da Wiki.
 */
const SIZE = 32;

/** Iluminado em (px, py) ∈ [−1, 1]² dentro do disco? `phase` 0–7. Puro (testado). */
export function moonLit(phase: number, px: number, py: number): boolean {
  const r2 = px * px + py * py;
  if (r2 > 1) return false;
  const c = Math.cos((2 * Math.PI * (((phase % 8) + 8) % 8)) / 8), side = phase >= 5 ? 1 : -1; // crescente: luz à direita; minguante: à esquerda
  return phase % 8 === 0 || (phase % 8 !== 4 && side * px > -c * Math.sqrt(1 - py * py)) ;
}

export function moonTexture(phase: number): THREE.DataTexture {
  const data = new Uint8Array(SIZE * SIZE * 4);
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++) {
      const px = ((x + 0.5) / SIZE) * 2 - 1, py = 1 - ((y + 0.5) / SIZE) * 2, i = (y * SIZE + x) * 4;
      if (px * px + py * py > 1) continue; // fora do disco: transparente
      const lit = moonLit(phase, px, py);
      data[i] = lit ? 232 : 36; data[i + 1] = lit ? 236 : 40; data[i + 2] = lit ? 246 : 58; data[i + 3] = lit ? 255 : 70;
    }
  const tex = new THREE.DataTexture(data, SIZE, SIZE, THREE.RGBAFormat);
  tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.colorSpace = THREE.SRGBColorSpace; tex.flipY = false; tex.needsUpdate = true;
  return tex;
}
