import type { TitanVolume } from './volume';
import { SECTIONS } from './voxel';

/**
 * Seções que o renderer põe na fila ao abrir (região 4 × 4 chunks, `"cx,sy,cz"`): as do relevo natural (do fundo até a coluna mais alta + 1) **mais**
 * as que têm edições restauradas — uma construção acima do relevo (ex.: Y = 150) não pode ficar fora da fila, senão existiria colisão sem malha.
 */
export function initialSections(vol: TitanVolume): string[] {
  const out = new Set<string>();
  const g = vol.gen;
  for (let cx = -2; cx <= 1; cx++) for (let cz = -2; cz <= 1; cz++) {
    let maxTop = 0;
    for (let z = 0; z < 16; z++) for (let x = 0; x < 16; x++) maxTop = Math.max(maxTop, g.column(cx * 16 + x, cz * 16 + z).top);
    const top = Math.min(SECTIONS - 1, Math.floor((maxTop + 64) / 16) + 1);
    for (let sy = 0; sy <= top; sy++) out.add(`${cx},${sy},${cz}`);
  }
  for (const k of vol.editedSections()) out.add(k);
  return [...out];
}
