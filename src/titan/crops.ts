import { Item } from './items';
import { NUT_YIELD } from './nuts';
import { T } from './voxel';

/**
 * Cultivo do Junco de Vidro (ADR 0083): regras puras, sem DOM e sem sorteio próprio (o `rng` entra de fora, para os testes serem determinísticos).
 * A planta guarda só um inteiro, `age`; cresce por **random ticks** (média de `CROP_TICK_MEAN_S` s por planta) com a chance do Minecraft
 * `1 / (⌊25 / pontos⌋ + 1)`, onde os pontos vêm da areia sob a planta e das oito vizinhas, e caem pela metade se houver planta da mesma espécie ao lado.
 */
/** `umido`/`seco` = a areia sob a planta; a espécie é o que se plantou: o junco de vidro (a areia decide a variante) ou a Noz de Duna (só na areia ocre). */
export type CropKind = 'umido' | 'seco';
export type Species = 'junco' | 'noz';
export interface Crop { x: number; y: number; z: number; age: number; species: Species }

/** Segundos de jogo ativo entre dois sorteios de uma planta, em média. */
export const CROP_TICK_MEAN_S = 30;
/** Só crescem plantas a até este raio (m) do viajante (as outras ficam paradas, como os animais). */
export const CROP_SIM_RADIUS = 56;
/** Luz mínima (0–15) no bloco de cima: céu aberto de dia (`ambient × 15`) ou lanterna. */
export const CROP_MIN_LIGHT = 9;
/** Colheita do adulto: quantas unidades e a fase para onde a planta volta (a planta-mãe nunca é arrancada). */
export const CROP_YIELD = 2;

export const cropKey = (x: number, y: number, z: number): string => `${x},${y},${z}`;
export const cropId = (x: number, y: number, z: number): string => `crop:${x},${y},${z}`;
export function parseCropId(id: string): [number, number, number] | null {
  const m = /^crop:(-?\d+),(-?\d+),(-?\d+)$/.exec(id);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

/** Que cultivo a areia sustenta: úmida = junco de vidro em 3 fases; ocre seca = junco ressecado em 2. Outro bloco não sustenta nada. */
export const soilKind = (block: number): CropKind | null => (block === T.DAMP_SAND ? 'umido' : block === T.SAND ? 'seco' : null);
/** Idade da planta adulta: muda (0) → crescendo (1) → adulta (2); o ressecado tem muda (0) → ressecado (1). */
export const maxAge = (kind: CropKind): number => (kind === 'umido' ? 2 : 1);
/** Idade da planta adulta da espécie sobre a areia `soil`: a Noz tem 3 fases (broto, planta sem frutos, com frutos). */
export const maxAgeOf = (species: Species, soil: CropKind): number => (species === 'noz' ? 2 : maxAge(soil));
export const isRipe = (species: Species, soil: CropKind, age: number): boolean => age >= maxAgeOf(species, soil);
/** O que a colheita entrega e a idade para onde a planta recua. */
export function harvestOf(species: Species, soil: CropKind): { item: number; count: number; backTo: number; label: string } {
  if (species === 'noz') return { item: Item.NOZ, count: NUT_YIELD, backTo: 1, label: 'nozes' };
  return soil === 'umido' ? { item: Item.GLASS_REED, count: CROP_YIELD, backTo: 1, label: 'mudas de junco' } : { item: Item.DRY_REED, count: CROP_YIELD, backTo: 0, label: 'hastes secas' };
}
/** O item que volta ao chão quando o apoio da planta é quebrado (a muda ou a noz plantada). */
export const seedOf = (species: Species): number => (species === 'noz' ? Item.NOZ : Item.GLASS_REED);
/** Onde a espécie se planta: o junco em qualquer areia; a Noz só na areia ocre (seca). */
export const plantableSoil = (species: Species, block: number): boolean => (species === 'noz' ? block === T.SAND : soilKind(block) !== null);
/** Aparência da Noz plantada: o broto é pequeno, depois a planta inteira, e os frutos só na adulta (o modelo é o da Noz de Duna silvestre). */
export const nutLook = (age: number): { scale: number; ripe: boolean } => ({ scale: age <= 0 ? 0.4 : 1, ripe: age >= 2 });
/** Coluna do atlas de cultivo (`titan-cultivo-32px.webp`): 0 muda, 1 crescendo, 2 adulto de duas mudas, 3 ressecado. */
export const spriteFrame = (kind: CropKind, age: number): number => (kind === 'umido' ? Math.min(2, age) : age >= 1 ? 3 : 0);
export const CROP_FRAMES = 4;

/** Pontos de fertilidade: a areia sob a planta vale 4 (úmida) ou 2 (seca) e cada vizinha soma 0,75 ou 0,25; sem areia sob a planta, 0. */
export function growthPoints(soilAt: (dx: number, dz: number) => CropKind | null): number {
  const c = soilAt(0, 0);
  if (!c) return 0;
  let p = c === 'umido' ? 4 : 2;
  for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
    if (!dx && !dz) continue;
    const k = soilAt(dx, dz);
    if (k) p += k === 'umido' ? 0.75 : 0.25;
  }
  return p;
}

/** Planta aglomerada: a mesma espécie nas diagonais ou nos dois eixos (como no Minecraft); metade dos pontos. */
export function crowded(sameAt: (dx: number, dz: number) => boolean): boolean {
  const ns = sameAt(0, -1) || sameAt(0, 1), ew = sameAt(-1, 0) || sameAt(1, 0);
  const diag = sameAt(-1, -1) || sameAt(1, -1) || sameAt(-1, 1) || sameAt(1, 1);
  return diag || (ns && ew);
}

/** Chance de subir uma fase num sorteio. */
export const growChance = (points: number): number => (points > 0 ? 1 / (Math.floor(25 / points) + 1) : 0);

export interface CropContext {
  /** Areia (ou outro bloco) na posição relativa `(dx, dz)` ao nível do chão da planta. */
  soilAt: (dx: number, dz: number) => CropKind | null;
  /** Há planta da mesma espécie na posição relativa? */
  sameAt: (dx: number, dz: number) => boolean;
  /** Luz (0–15) no bloco de cima, já somando o céu aberto de dia e a lanterna. */
  light: number;
}

/** Um random tick: devolve se a planta subiu de fase. Não passa da fase adulta nem cresce no escuro. */
export function randomTick(crop: Crop, ctx: CropContext, rng: () => number): boolean {
  const kind = ctx.soilAt(0, 0);
  if (!kind || (crop.species === 'noz' && kind !== 'seco') || crop.age >= maxAgeOf(crop.species, kind) || ctx.light < CROP_MIN_LIGHT) return false;
  let points = growthPoints(ctx.soilAt);
  if (crowded(ctx.sameAt)) points *= 0.5;
  if (rng() < growChance(points)) { crop.age++; return true; }
  return false;
}
