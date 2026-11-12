import type { World } from '../world/world';
import type { Renderer, RenderOptions } from './renderer';

/** Contadores de desempenho do renderer (linha de base da Fase 1, ADR 0026). Só o WebGL tem. */
export interface RendererStats {
  /** Chamadas de desenho do último quadro. */
  calls: number;
  /** Triângulos do último quadro. */
  triangles: number;
  /** Geometrias e texturas vivas na GPU. */
  geometries: number;
  textures: number;
  /** O contexto WebGL está perdido (aparelho tirou a GPU do jogo)? */
  contextLost: boolean;
}

/** Only rendering differs between official worlds; gameplay remains shared. */
export type GameRenderer = Pick<Renderer, 'draw' | 'pick' | 'addDamage' | 'iconFor'> & {
  dispose?(): void;
  /** Células visíveis na vertical que o renderer prefere (padrão do Mundo 2D: 10). */
  readonly preferredCellsTall?: number;
  /** Só no WebGL: contadores para medir desempenho (dev e testes no navegador). */
  stats?(): RendererStats;
};

export type RendererFactory = (canvas: HTMLCanvasElement, world: World) => GameRenderer;

/**
 * O que cada renderer faz com cada campo de `RenderOptions` (mapa de paridade da migração, ADR 0026). O `Record` obriga a
 * classificar todo campo novo: o compilador acusa o esquecimento. `ignored` = o renderer não desenha isso ainda.
 */
export type OptionSupport = 'honored' | 'ignored';
export const SANCTUARY_THREE_OPTIONS: Record<keyof RenderOptions, OptionSupport> = {
  player: 'honored',          // a Deusa (plano vertical) e a sombra
  actors: 'ignored',          // o Santuário não tem NPCs/monstros/animais (Fase 3)
  showChunkBorders: 'ignored',
  hover: 'honored',
  breaking: 'honored',
  drops: 'ignored',           // itens caídos (Fase 3)
  focus: 'honored',
  hoverSheep: 'ignored',
  time: 'ignored',            // dia/noite e luzes (Fase 3)
  elapsed: 'honored',         // animação da Deusa
  dt: 'ignored',
  hurtFlash: 'ignored',
  inDungeon: 'ignored',       // dungeon (Fase 4)
  entrance: 'ignored',
  dungeonArea: 'ignored',
  interior: 'ignored',        // interiores (Fase 4)
  fade: 'ignored',
};
