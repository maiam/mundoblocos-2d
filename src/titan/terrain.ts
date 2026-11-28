import type { Arrival, Column } from './generator';
import type { GrunhoCamp } from './grunho';
import type { Region } from './voxel';

/**
 * Contrato do gerador de terreno voxel (ADR 0105): o que o motor (`TitanVolume`, sessão, sala, física, malha) lê de um mundo, seja a Margem Silenciosa (`TitanGenerator`) ou o
 * Orvalis em voxel (`OrvalisGenerator`). Função pura de seed + versão + coordenadas, sem DOM e sem `Math.random()`. Os campos de conteúdo próprio do Titã (lascas, juncos, nozes, toca,
 * brasa) existem em todo gerador e ficam **vazios** onde o mundo não os tem: assim o motor não ganha `if (mundo === …)`.
 */
/** Qual mundo voxel o gerador desenha: grava-se no save (`header.world`) e escolhe o banco, a arte da água e a paleta do céu. */
export type VoxelWorld = 'titan' | 'orvalis';

export interface TerrainGen {
  readonly world: VoxelWorld;
  readonly seed: number;
  readonly version: number;
  readonly region: Region;
  inRegion(x: number, z: number): boolean;
  column(x: number, z: number): Column;
  blockAt(x: number, y: number, z: number): number;
  readonly arrival: Arrival;
  readonly surfaceItems: ReadonlyArray<{ id: string; item: 5 | 6; x: number; y: number; z: number }>;
  readonly plates: ReadonlyArray<{ id: string; item: 25; x: number; y: number; z: number }>;
  readonly dryReeds: ReadonlyArray<{ id: string; item: 19; x: number; y: number; z: number }>;
  readonly reeds: ReadonlyArray<{ x: number; y: number; z: number }>;
  readonly nutPlants: ReadonlyArray<{ x: number; y: number; z: number }>;
  readonly den: { x: number; y: number; z: number } | null;
  /** Plantas que a partida nova já traz plantadas (o mapa feito à mão da Aldeia da Costa, ADR 0144); ausente = nenhuma. A leitura de um save usa as do save. */
  readonly startCrops?: ReadonlyArray<{ x: number; y: number; z: number; species: 'cenoura' | 'batata'; age: number }>;
  /** Acampamentos do Grunho (ADR 0147): a fogueira e os lugares dos goblins na roda (a Aldeia da Costa); ausente = nenhum. A partida individual não tem. */
  readonly camps?: ReadonlyArray<GrunhoCamp>;
  reedsFor(ex: number, ez: number): Array<{ x: number; y: number; z: number }>;
  planEmber(strict?: boolean): Array<{ x: number; z: number }>;
}
