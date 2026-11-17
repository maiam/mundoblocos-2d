import { Block, type BlockId, HOTBAR_BLOCKS, WALL_BLOCKS, WALL_DOOR_BLOCKS } from './blocks';
import type { ChunkRect } from './world';

/**
 * Perfil de mundo — fonte de verdade do que existe em cada mundo do jogo.
 * O motor (World, Game, Renderer) é o mesmo; o perfil decide terreno, limites,
 * personagem, blocos disponíveis e sistemas ativos.
 */
export type WorldId = 'principal' | 'santuario';

/** Personagens jogáveis (folhas de sprite em `render/character.ts`). */
export type CharacterId = 'heroine' | 'goddess';

export interface WorldProfile {
  id: WorldId;
  name: string;
  /** Terreno: procedural (mundo principal) ou plano coberto por um bloco. */
  terrain: { kind: 'procedural' } | { kind: 'flat'; ground: BlockId };
  /** Retângulo de chunks permitido (inclusivo); null = sem limites. */
  bounds: ChunkRect | null;
  character: CharacterId;
  /** Blocos de construção da hotbar (os únicos que podem ser colocados neste mundo). */
  blocks: BlockId[];
  /** Ferramentas, sementes/trigo e inventário de itens. */
  tools: boolean;
  farming: boolean;
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
    sky: ['#1b1838', '#1b1838'],
  },
  santuario: {
    id: 'santuario',
    name: 'Santuário de Orvalis',
    // Santuário refeito do zero (ADR 0036, v0.93.134): solo, **terreno plano vazio** (grama), vista isométrica. Cubos cheios (1 nível = 1 célula).
    terrain: { kind: 'flat', ground: Block.GRASS },
    // 16 chunks: 4 × 4, centrados na origem (cx −2..1, cy −2..1).
    bounds: { cx0: -2, cy0: -2, cx1: 1, cy1: 1 },
    character: 'goddess',
    // Materiais de construção do Mundo (lista única, na ordem aprovada pelo dono do produto); o chão (grama) não precisa estar na hotbar para existir.
    blocks: [
      Block.DIRT, Block.GRASS, Block.TILLED, Block.SAND,
      Block.STONE, Block.STONE_SMOOTH, Block.OAK_LOG, Block.OAK_PLANKS,
    ],
    tools: false,
    farming: false,
    sheep: false,
    wolves: false,
    dungeon: false,
    town: false,
    collectBlocks: false,
    minimap: false,
    progression: false,
    hunger: false,
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
