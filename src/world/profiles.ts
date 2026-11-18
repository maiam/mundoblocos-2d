import { RIO_BRUSHES } from './rio';
import { Block, type BlockId, HOTBAR_BLOCKS, ISO_BLOCKS, WALL_BLOCKS, WORLD_BLOCKS_IN_SANCTUARY, WALL_DOOR_BLOCKS } from './blocks';
import type { ChunkRect } from './world';

/**
 * Perfil de mundo — fonte de verdade do que existe em cada mundo do jogo.
 * O motor (World, Game, Renderer) é o mesmo; o perfil decide terreno, limites,
 * personagem, blocos disponíveis e sistemas ativos.
 */
export type WorldId = 'principal' | 'santuario';

/** Personagens jogáveis (folhas de sprite em `render/character.ts`). */
/** `goddess` = Deusa flutuante (Sala 2 online); `goddess-iso` = Deusa isométrica do Santuário solo (ADR 0036). */
export type CharacterId = 'heroine' | 'goddess' | 'goddess-iso';

export interface WorldProfile {
  id: WorldId;
  name: string;
  /** Terreno: procedural (mundo principal) ou plano coberto por um bloco. */
  terrain: { kind: 'procedural' } | { kind: 'flat'; ground: BlockId; /** Camadas de cubo sobre o chão, de baixo para cima (nível 0 e 1 da pilha), em toda célula. */ layers?: readonly BlockId[]; /** Seeds com paisagem fixa (`world/sanctuaryLandscape.ts`) em vez do terreno plano. */ landscape?: boolean };
  /** Retângulo de chunks permitido (inclusivo); null = sem limites. */
  bounds: ChunkRect | null;
  character: CharacterId;
  /** Blocos de construção da hotbar (os únicos que podem ser colocados neste mundo). */
  blocks: BlockId[];
  /** Ferramentas, sementes/trigo e inventário de itens. */
  tools: boolean;
  farming: boolean;
  /** Sementes e vegetais (trigo, batata, tomate, cenoura) na grade fixa, em quantidade infinita (Santuário; no Mundo vêm do inventário). */
  crops?: boolean;
  /** Rebanho de ovelhas no início. */
  sheep: boolean;
  /** Bandos de lobos soltos pelo mapa (só mundos com cidade; v0.91.0). */
  wolves: boolean;
  /** Dungeon das aranhas perto do spawn (área protegida com monstros). */
  dungeon: boolean;
  /** Cidade do Despertar: início e renascer sem tenda (área protegida, igual em toda seed). */
  town: boolean;
  /**
   * Materiais precisam ser coletados (quebrar devolve o bloco, colocar gasta) e a grade tem 8 espaços + bolsa.
   * false = construção infinita com a grade fixa do perfil (Santuário).
   */
  collectBlocks: boolean;
  /** Fome e comida (barra de fome, comer alimentos). false no Santuário (sem cultivo). */
  hunger: boolean;
  /** Minimapa com névoa de exploração no canto da tela (mundo grande); false no Santuário (cabe na tela). */
  minimap: boolean;
  /** Progressão da jogadora: missões do Capítulo 1, carteira (Moedas de Cobre) e painel do personagem. false no Santuário (Sala 2, criação). */
  progression: boolean;
  /** Quanto segurar para quebrar um bloco (s), qualquer que seja a mão/ferramenta; null = pela ferramenta (ferramenta 1 s, mão 2 s). */
  breakSeconds: number | null;
  /** Objetos que não são cubo (árvore, cerca, casa…) ficam **em cima** da pilha de cubos da célula, não no nível 0 (Santuário: terreno em camadas, ADR 0036). */
  surfaceObjects: boolean;
  /** Vista: `oblique` (3/4, o Mundo) ou `isometric` (45°, o Santuário solo, ADR 0036) — decide a câmera e o sentido das teclas/joystick (em tela). */
  view: 'oblique' | 'isometric';
  /** Cores do fundo além das bordas do mundo (céu). */
  sky: [string, string];
}

export const WORLD_PROFILES: Record<WorldId, WorldProfile> = {
  principal: {
    id: 'principal',
    name: 'Orvalis',
    terrain: { kind: 'procedural' },
    bounds: null,
    character: 'heroine',
    // Paredes e porta de parede (W5): no Mundo desde a v0.93.56 (na grade fina: frente empilhada, `render/sanctuaryWallArt.ts`).
    blocks: [...HOTBAR_BLOCKS, ...WALL_BLOCKS, ...WALL_DOOR_BLOCKS],
    tools: true,
    farming: true,
    sheep: true,
    wolves: true,
    dungeon: true,
    town: true,
    collectBlocks: true,
    minimap: true,
    progression: true,
    hunger: true,
    breakSeconds: null,
    surfaceObjects: false,
    view: 'oblique',
    sky: ['#1b1838', '#1b1838'],
  },
  santuario: {
    id: 'santuario',
    name: 'Santuário de Orvalis',
    // Santuário refeito do zero (ADR 0036): solo, vista isométrica, cubos cheios (1 nível = 1 célula). Terreno plano em **camadas** (v0.93.143): chão de grama,
    // uma camada de Bloco de Pedra (nível 1) e uma de Grama (nível 2); a Deusa e tudo o mais ficam em cima (nível 3).
    terrain: { kind: 'flat', ground: Block.ISO_G_GRASS, layers: [Block.ISO_STONE_BLOCK, Block.ISO_G_GRASS], landscape: true },
    // 48 chunks: 12 × 4 (cx −2..9, cy −2..1): o Santuário original (cx −2..1), a leste a Fazenda do heightmap (cx 2..5) e, depois dela, o Vale Goblin (cx 6..9).
    bounds: { cx0: -2, cy0: -2, cx1: 9, cy1: 1 },
    character: 'goddess-iso',
    // Materiais de construção do Mundo (lista única, na ordem aprovada pelo dono do produto); o chão (grama) não precisa estar na hotbar para existir.
    blocks: [...ISO_BLOCKS, ...WORLD_BLOCKS_IN_SANCTUARY, ...RIO_BRUSHES],
    tools: false,
    farming: false,
    crops: true,
    sheep: false,
    wolves: false,
    dungeon: false,
    town: false,
    collectBlocks: false,
    minimap: false,
    progression: false,
    hunger: false,
    breakSeconds: 1, // quebrar qualquer bloco leva 1 s (pedido do dono do produto, 17/11/2026)
    surfaceObjects: true,
    view: 'isometric',
    sky: ['#8fb8ff', '#f6d9ff'],
  },
};

/** Subdomínio que abre cada mundo (ex.: santuario.<domínio>). */
export const SUBDOMAINS: Record<string, WorldId> = { santuario: 'santuario' };

/**
 * Escolhe o mundo: build fixo (VITE_WORLD, usado no artefato próprio) → subdomínio
 * do endereço → parâmetro `?mundo=` → mundo principal.
 */
export function resolveWorldId(hostname: string, search: string, fixed?: string): WorldId {
  if (fixed && fixed in WORLD_PROFILES) return fixed as WorldId;
  const sub = hostname.split('.')[0]?.toLowerCase() ?? '';
  if (hostname.split('.').length > 2 && sub in SUBDOMAINS) return SUBDOMAINS[sub];
  const param = new URLSearchParams(search).get('mundo')?.toLowerCase();
  if (param && param in WORLD_PROFILES) return param as WorldId;
  return 'principal';
}

/** Número de chunks dentro dos limites (null = ilimitado). */
export function chunkCount(bounds: ChunkRect | null): number | null {
  return bounds ? (bounds.cx1 - bounds.cx0 + 1) * (bounds.cy1 - bounds.cy0 + 1) : null;
}
