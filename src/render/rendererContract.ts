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
  dt: 'honored',              // M3.2: anima os números de dano
  hurtFlash: 'ignored',
  inDungeon: 'ignored',       // dungeon (Fase 4)
  entrance: 'ignored',
  dungeonArea: 'ignored',
  interior: 'ignored',        // interiores (Fase 4)
  fade: 'ignored',
};

/**
 * Mapa de paridade do `WorldThreeRenderer` (Mundo em 2.5D, ADR 0031): o que cada campo de `RenderOptions` já faz. Fatia M2.1.
 * Cada marco (M3.3…M4) vira `honored` o que passar a desenhar; o `Record` obriga a classificar todo campo novo.
 */
export const WORLD_THREE_OPTIONS: Record<keyof RenderOptions, OptionSupport> = {
  player: 'ignored',          // o personagem vem de `actors[0]`
  actors: 'honored',          // M3.1: todos os atores visíveis (teto de 48 por quadro; o jogador sempre)
  showChunkBorders: 'ignored',
  hover: 'honored',
  breaking: 'honored',
  drops: 'honored',           // M3.1
  focus: 'honored',
  hoverSheep: 'honored',      // M3.1: anel sob a ovelha
  time: 'ignored',            // dia/noite e luzes (M3)
  elapsed: 'honored',
  dt: 'ignored',
  hurtFlash: 'honored',       // M3.2: vinheta na camada 2D
  inDungeon: 'ignored',       // M4
  entrance: 'ignored',        // M4
  dungeonArea: 'ignored',     // M4
  interior: 'ignored',        // M4
  fade: 'honored',            // M3.2: escurecer de porta na camada 2D
};
