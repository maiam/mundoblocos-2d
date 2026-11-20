import { mulberry32 } from '../world/random';

/**
 * Veios subterrâneos do Titã (gerador v9, ADR 0070), no modelo do Minecraft 1.18: altura sorteada por **distribuição triangular** (pico em `peakY`) ou
 * uniforme, veio como **caminhada aleatória** curta e **descarte por exposição ao ar** (a água não conta como ar). Puro e determinístico: só recebe um
 * sorteador e funções de leitura; quem chama (o gerador) guarda o resultado.
 */
export interface OreRule {
  /** Id do bloco do veio (`T.VEIN_*`). */
  blockId: number;
  /** Tentativas de veio por chunk de 16 × 16 (a parte fracionária é sorteada). */
  veinsPerChunk: number;
  /** Blocos por veio (passos da caminhada; passos fora da rocha não contam). Com `veinSizeMax`, o tamanho sai sorteado entre `veinSize` e `veinSizeMax`. */
  veinSize: number;
  veinSizeMax?: number;
  minY: number;
  maxY: number;
  /** Com valor: distribuição triangular com pico nessa altura; sem: uniforme. */
  peakY?: number;
  /** 0–1: chance de cancelar um bloco que encosta em ar. */
  airDiscardChance: number;
}

/** Altura com pico triangular em `peakY` (igual ao `TriangleRange` do Minecraft). */
export function sampleTriangleY(rng: () => number, minY: number, maxY: number, peakY: number): number {
  const u = rng(), c = (peakY - minY) / (maxY - minY);
  const v = u < c ? minY + Math.sqrt(u * (maxY - minY) * (peakY - minY)) : maxY - Math.sqrt((1 - u) * (maxY - minY) * (maxY - peakY));
  return Math.round(v);
}

/** Altura de início de um veio da regra. */
export function sampleOreY(rng: () => number, rule: OreRule): number {
  return rule.peakY === undefined ? rule.minY + Math.floor(rng() * (rule.maxY - rule.minY + 1)) : sampleTriangleY(rng, rule.minY, rule.maxY, rule.peakY);
}

/**
 * Células de um veio a partir de `(x, y, z)`. `replaceable` diz se a célula pode virar minério (só a rocha profunda); `exposed` se encosta em ar.
 * Um passo ortogonal aleatório por bloco, como no Minecraft.
 */
export function veinCells(rng: () => number, x: number, y: number, z: number, rule: OreRule, replaceable: (x: number, y: number, z: number) => boolean, exposed: (x: number, y: number, z: number) => boolean): Array<[number, number, number]> {
  const out: Array<[number, number, number]> = [];
  const size = rule.veinSizeMax !== undefined ? rule.veinSize + Math.floor(rng() * (rule.veinSizeMax - rule.veinSize + 1)) : rule.veinSize;
  for (let i = 0; i < size; i++) {
    if (replaceable(x, y, z) && !(exposed(x, y, z) && rng() < rule.airDiscardChance)) out.push([x, y, z]);
    const axis = Math.floor(rng() * 3), dir = rng() < 0.5 ? -1 : 1;
    if (axis === 0) x += dir; else if (axis === 1) y += dir; else z += dir;
  }
  return out;
}

/** Tentativas de um chunk: a parte inteira sempre, a fração por sorteio. */
export const attemptsFor = (rng: () => number, perChunk: number): number => Math.floor(perChunk) + (rng() < perChunk - Math.floor(perChunk) ? 1 : 0);

export { mulberry32 };
