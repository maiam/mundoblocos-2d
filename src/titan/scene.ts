import { Item } from './items';
import type { TitanSession } from './session';
import { T } from './voxel';

/**
 * Cena de desenvolvimento do Titã (`?cena=lanternas`, v0.95.1): várias lanternas ao redor da chegada para medir o custo da luz e das malhas, já que a
 * partida normal só tem uma cápsula (e a receita a consome). **Nada é gravado**: `titanGame` usa armazenamento em memória nesta cena. Sem DOM.
 */

/** Posição (x, z) e Y da primeira célula livre acima do solo de um anel de `n` pontos em volta da chegada (ordem fixa; pula lago e fora da região). */
export function lanternSpots(s: TitanSession, n: number): Array<[number, number, number]> {
  const a = s.volume.gen.arrival, out: Array<[number, number, number]> = [];
  for (let k = 0; out.length < n && k < n * 6; k++) {
    const ang = (k / n) * Math.PI * 2 + k * 0.17, rad = 4 + (k % 5) * 2.2;
    const x = Math.floor(a.x + Math.cos(ang) * rad), z = Math.floor(a.z + Math.sin(ang) * rad);
    if (!s.volume.editable(x, 70, z)) continue;
    const col = s.volume.gen.column(x, z);
    if (s.volume.get(x, col.top + 1, z) !== T.AIR || out.some(([ox, , oz]) => ox === x && oz === z)) continue;
    out.push([x, col.top + 1, z]);
  }
  return out;
}

/** Coloca `n` lanternas (e uma parede de areia ao lado de cada uma, para a luz ter com o que contornar). Devolve as posições. */
export function buildLanternScene(s: TitanSession, n = 12): Array<[number, number, number]> {
  const spots = lanternSpots(s, n);
  for (const [x, y, z] of spots) {
    s.volume.place(x, y, z, T.LANTERN);
    s.volume.place(x + 1, y, z, T.SAND);
  }
  return spots;
}

/**
 * Um passo da "edição sem parar" (estresse de luz + malha): passos pares colocam um bloco ao lado da lanterna `i`, os ímpares o retiram, de modo
 * que depois de um número par de passos o volume volta ao que era. Devolve a célula editada.
 */
export function autoEditStep(s: TitanSession, spots: Array<[number, number, number]>, step: number): [number, number, number] | null {
  if (!spots.length) return null;
  const [x, y, z] = spots[Math.floor(step / 2) % spots.length];
  const cell: [number, number, number] = [x, y + 1, z + 1];
  if (step % 2 === 0) s.volume.place(cell[0], cell[1], cell[2], T.DARK_ROCK); else s.volume.remove(cell[0], cell[1], cell[2]);
  return cell;
}

/** Itens para o teste: nada muda no inventário (a cena é só mundo). */
export const SCENE_NOTE = `Cena de teste: nada é gravado · cápsula única (${Item.CAPSULE})`;
