import type { ActorKind } from '../../game/entities';
import type { ModularManifest } from '../modular';
import type { MonsterKind } from '../../world/dungeon';
import type { ItemId, ToolId } from '../../world/items';
import type { ExpressionId, OutfitId, VillagerBase } from '../../game/villager';

/**
 * Pacote de arte de um mundo: URLs das imagens (arquivos separados no Artifact, ADR 0013) só do que aquele mundo usa.
 * Cada mundo tem o seu (`principal.ts`, `santuario.ts`); o build do artefato de um mundo só leva o pacote dele.
 * Campos ausentes = o mundo não tem aquilo (o render pula o que não veio).
 */
/** Nomes da arte dos objetos fabricados (ver `CRAFT_PROPS` em render/textures.ts). */
export type CraftableArt = 'campfire' | 'cauldron' | 'oven' | 'chair';

export interface ArtPack {
  /** Folhas dos atores (personagem, animais, monstros). */
  actors: Partial<Record<ActorKind, string>>;
  /** Roupas dos moradores (`extract-villagers.py`), desenhadas por cima da folha-base no mesmo quadro. */
  outfits?: Partial<Record<OutfitId, string>>;
  /** Expressões dos moradores: rosto (todas as direções na grade 4×4) e, em algumas, efeitos por cima do cabelo. */
  expressions?: Partial<Record<ExpressionId, { face: string; fx?: string }>>;
  /** Franja de cada personagem-base, redesenhada por cima da expressão. */
  bangs?: Partial<Record<VillagerBase, string>>;
  /** Atlas 3/4 dos 8 materiais (`extract-blocks.py`) e ícones da hotbar por bloco. */
  blockAtlas?: string;
  materialIcons: Partial<Record<number, string>>;
  /**
   * Padrão de Materiais V2 em validação (ADR 0023, `scripts/build-materials.py`): atlas + manifesto. Só baixa com
   * é o padrão do jogo e carrega antes dele começar (~110 kB, dentro do orçamento de início).
   */
  materialsV2?: { atlas: string; manifest: import('../materialsV2').MaterialsV2Manifest; masks?: string };
  /** Atlas e ícones dos blocos celestiais (Santuário). */
  celestialAtlas?: string;
  celestialIcons: Partial<Record<number, string>>;
  /** Porta de Carvalho (8 quadros). */
  oakDoor?: string;
  /** Dungeon (`extract-dungeon.py`). */
  /** Arte do covil (carrega em segundo plano); `cave` = entrada da caverna no mundo (`scripts/extract-landmarks.py`). */
  dungeon?: { ground: string; mountains: string; rocks: string; props: string; walls: string; cave?: string };
  /** Folhas de morte dos monstros (`extract-dungeon.py`); sem elas, morte provisória procedural. */
  monsterDeaths?: Partial<Record<MonsterKind, string>>;
  /** Trigo (16 estágios) e ícones de itens/ferramentas. */
  wheatCrop?: string;
  /** Folhas de crescimento 4×4 das hortaliças (`scripts/extract-crops.py`), mesmo formato do trigo. */
  crops?: Partial<Record<'potato' | 'tomato' | 'carrot', string>>;
  itemIcons: Partial<Record<ItemId, string>>;
  /** Água (`extract-water.py`): topo do bloco (chão de água) e quadros de enchimento (4 direções × 4). */
  water?: { top: string; flow: string };
  /** Tenda (ponto de renascer): ícone da grade e sprite do mundo. */
  tent?: { icon: string; sprite: string };
  /** Objetos fabricados (fogueira, caldeirão, forno): ícone e sprite do mundo (`scripts/extract-craftables.py`). */
  craftables?: Partial<Record<CraftableArt, { icon: string; sprite: string }>>;
  /** Baú de Carvalho: ícone (vista inclinada) e sprite do mundo (de frente). */
  chest?: { icon: string; sprite: string };
  /**
   * Cerca de tábuas (`scripts/extract-fence.py`): tira de peças (trecho horizontal, vertical, poste grande) que o
   * render emenda por vizinhos, portão (fechado, aberto) e os ícones da bolsa.
   */
  fence?: { pieces: string; gate: string; icon: string; gateIcon: string };
  /** Pedregulhos: tira de quadros iguais (`scripts/extract-rocks.py`), um sorteado por célula. */
  rocks?: string;
  /**
   * Árvores adultas (v0.88.0, sem crescimento): tiras de variantes carvalho/macieira/cerejeira (`scripts/process-trees.py`,
   * quadros iguais lado a lado) e a prancha 4 × 2 do cacto (`scripts/extract-trees.py`).
   */
  trees?: { oak: string; apple: string; cherry: string; cactus: string };
  /** Interiores (`scripts/extract-interiors.py`), por id de `world/interiors.ts`; carregam em segundo plano. */
  interiors?: Record<string, string>;
  /** Cidade do Despertar: construções em imagem (`scripts/extract-town.py`); o resto é pintado em código. */
  town?: Record<string, string>;
  /** Ícones de interface (bolsa do inventário). */
  uiIcons?: { bag: string; character: string; skills: string; builder: string };
  toolIcons: Partial<Record<ToolId, string>>;
  /** Personagem modular em teste (ADR 0017): manifesto do exportador e URL de cada folha (pelo nome no manifesto). */
  modular?: { manifest: ModularManifest; sheets: Record<string, string> };
}
