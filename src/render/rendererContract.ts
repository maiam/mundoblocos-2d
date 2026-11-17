import type { Camera } from '../game/camera';
import type { ItemDrop } from '../game/drops';
import type { Actor } from '../game/entities';
import type { Player } from '../game/player';
import type { Rect } from '../world/dungeon';
import type { InteriorLayout } from '../world/interiors';
import type { Hit } from '../world/progression';
import type { BlockId } from '../world/blocks';
import type { World } from '../world/world';

/** O que o jogo entrega ao renderer a cada quadro (antes vivia no `renderer.ts` do Canvas 2D, removido na v0.93.105). */
export interface RenderOptions {
  player: Player;
  /** Todos os atores (personagem + NPCs), desenhados com ordenação por profundidade. */
  actors: Actor[];
  showChunkBorders: boolean;
  hover: { x: number; y: number; valid: boolean; level?: number } | null;
  /** Quebra em andamento (segurando): célula e progresso 0..1. */
  breaking: { x: number; y: number; progress: number } | null;
  /** Itens caídos no chão (colheita). */
  drops: ItemDrop[];
  /** Alvo à frente da personagem parada (botão de ação): contorno de seleção. */
  focus: { x: number; y: number; valid: boolean; level?: number } | null;
  /** Ovelha sob o cursor quando o trigo está selecionado (posição dos pés, em células). */
  hoverSheep: { x: number; y: number; valid: boolean; attack?: boolean } | null;
  time: number;
  elapsed: number;
  dt: number;
  /** Flash vermelho de dano (1 → 0). */
  hurtFlash: number;
  /** Personagem dentro da dungeon: penumbra com luz ao redor dela. */
  inDungeon: boolean;
  /** Célula diante da entrada da dungeon (farol + seta na borda da tela), ou null. */
  entrance: [number, number] | null;
  /** Dentro do covil: área do labirinto (o resto da tela fica escuro — de dentro não se vê o mundo). */
  dungeonArea?: Rect | null;
  /** Cômodo onde a personagem está (ADR 0014): desenha só a arte dele e os atores, sem mundo em volta. */
  interior?: InteriorLayout | null;
  /** Escurecer ao passar por uma porta (1 → 0). */
  fade?: number;
  /** Terrenos marcados por missão (contorno dourado no chão, em células inclusivas). */
  zones?: Rect[];
}


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
export type GameRenderer = {
  draw(cam: Camera, opts: RenderOptions): void;
  /** Célula (e se há objeto nela) sob o ponto da tela. */
  pick(cam: Camera, sx: number, sy: number): { x: number; y: number; hasObject: boolean };
  /**
   * Face de cubo sob o ponto da tela (3D): a célula e o nível do cubo atingido e para onde a face aponta (`nx`, `ny` = passo em células; `up` = o topo). Base do
   * "colocar na face" da vista isométrica. null = nenhum cubo ali (chão, sprite ou fora).
   */
  pickFace?(cam: Camera, sx: number, sy: number): { x: number; y: number; level: number; nx: number; ny: number; up: boolean } | null;
  /** Número de dano flutuante em (x, y) (células). */
  addDamage(x: number, y: number, hit: Hit, target: 'enemy' | 'player'): void;
  /** Ícone (URL) do bloco na grade e na bolsa. */
  iconFor(id: BlockId): string;
  dispose?(): void;
  /**
   * Célula de CHÃO que se vê sob o ponto da tela, ignorando objetos altos de sprite (árvores…) mas não os cubos: no 3D com K = 1 o topo
   * de um cubo cobre o chão da célula ao norte, então o mapeamento do 2D (`Camera.screenToWorld`) apontaria para a célula errada.
   * Opcional: sem ele, quem usa cai no mapeamento do 2D (que já é exato lá).
   */
  pickGround?(cam: Camera, sx: number, sy: number): { x: number; y: number } | null;
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
  zones: 'ignored',
};

/**
 * Mapa de paridade do `WorldThreeRenderer` (Mundo em 2.5D, ADR 0031): o que cada campo de `RenderOptions` já faz. Fatia M2.1.
 * Cada marco (M5) vira `honored` o que passar a desenhar; o `Record` obriga a classificar todo campo novo.
 */
export const WORLD_THREE_OPTIONS: Record<keyof RenderOptions, OptionSupport> = {
  player: 'honored',          // M3.4: a célula do jogador escolhe as partículas do bioma (o personagem em si vem de `actors[0]`)
  actors: 'honored',          // M3.1: todos os atores visíveis (teto de 48 por quadro; o jogador sempre)
  showChunkBorders: 'ignored',
  hover: 'honored',
  breaking: 'honored',
  drops: 'honored',           // M3.1
  focus: 'honored',
  hoverSheep: 'honored',      // M3.1: anel sob a ovelha
  time: 'honored',            // M3.3: ciclo dia/noite e luzes (só à noite e na dungeon)
  elapsed: 'honored',
  dt: 'ignored',
  hurtFlash: 'honored',       // M3.2: vinheta na camada 2D
  inDungeon: 'honored',       // M3.3: penumbra (a dungeon em si, M4)
  entrance: 'honored',        // M4.2: farol e seta, na camada 2D
  dungeonArea: 'honored',     // M4.2: escuro fora do labirinto, na camada 2D
  interior: 'honored',        // M4.1: o cômodo isolado substitui o mundo
  fade: 'honored',            // M3.2: escurecer de porta na camada 2D
  zones: 'honored',           // contorno dourado de terreno de missão
};
