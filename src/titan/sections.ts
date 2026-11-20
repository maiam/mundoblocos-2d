import type { TitanVolume } from './volume';
import { SECTIONS } from './voxel';

/**
 * Seções que o renderer põe na fila ao abrir (toda a região da versão: 4 × 4 chunks na v1–v5, 8 × 8 na v6; `"cx,sy,cz"`): as do relevo natural (do fundo até a coluna mais alta + 1) **mais**
 * as que têm edições restauradas — uma construção acima do relevo (ex.: Y = 150) não pode ficar fora da fila, senão existiria colisão sem malha.
 */
export function initialSections(vol: TitanVolume): string[] {
  const out = new Set<string>();
  const g = vol.gen;
  const lo = Math.floor(g.region.min / 16), hi = Math.ceil(g.region.max / 16) - 1; // v1–v5: −2..1; v6: −4..3
  for (let cx = lo; cx <= hi; cx++) for (let cz = lo; cz <= hi; cz++) {
    let maxTop = 0;
    for (let z = 0; z < 16; z++) for (let x = 0; x < 16; x++) maxTop = Math.max(maxTop, g.column(cx * 16 + x, cz * 16 + z).top);
    const top = Math.min(SECTIONS - 1, Math.floor((maxTop + 64) / 16) + 1);
    for (let sy = 0; sy <= top; sy++) out.add(`${cx},${sy},${cz}`);
  }
  for (const k of vol.editedSections()) out.add(k);
  return [...out];
}
