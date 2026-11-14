import { Block, type BlockId } from './blocks';

/**
 * Lajes de Carvalho (piloto `?tabua=laje`, v0.93.73): três blocos baixos — topo 16 × 16 px e face de 4, 6 e 8 px (1/4, 3/8 e 1/2 de
 * célula na grade 2, onde a célula tem 16 × 16 px). Só valem no piloto (Mundo principal, 3D, jogo offline): a laje é andável (lógica
 * no nível do chão) e o corpo sobe a altura dela por cima (só visual). Fora do piloto os blocos continuam existindo como cubos
 * comuns de tábua. Sem DOM.
 */
export interface SlabSpec {
  id: BlockId;
  /** Id da receita (`laje1`…`laje3`). */
  recipe: string;
  /** Altura da face em px (a célula tem 16). */
  facepx: number;
  /** Altura em células (facepx ÷ 16). */
  height: number;
}

export const SLABS: readonly SlabSpec[] = [
  { id: Block.OAK_SLAB_1, recipe: 'laje1', facepx: 4, height: 4 / 16 },
  { id: Block.OAK_SLAB_2, recipe: 'laje2', facepx: 6, height: 6 / 16 },
  { id: Block.OAK_SLAB_3, recipe: 'laje3', facepx: 8, height: 8 / 16 },
];

/** Altura de uma laje em células (0 se o id não é laje). */
export function slabHeightOf(id: number): number {
  return SLABS.find((s) => s.id === id)?.height ?? 0;
}

/** O bloco do qual a laje herda a textura (o topo e a frente são os da Tábua de Carvalho). */
export function slabBaseOf(id: number): number {
  return SLABS.some((s) => s.id === id) ? Block.OAK_PLANKS : id;
}

/** `?tabua=laje` liga o piloto: devolve os ids que viram laje (vazio sem o parâmetro). */
export function slabIdsFromSearch(search: string): readonly BlockId[] {
  return new URLSearchParams(search).get('tabua') === 'laje' ? SLABS.map((s) => s.id) : [];
}

/** O piloto está ligado neste jogo? (as receitas das lajes só aparecem então; o `Game` liga, só offline.) */
let pilotOn = false;
export function setSlabPilot(on: boolean): void {
  pilotOn = on;
}
export function slabPilotActive(): boolean {
  return pilotOn;
}
