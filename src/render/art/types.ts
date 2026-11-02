import type { ActorKind } from '../../game/entities';
import type { MonsterKind } from '../../world/dungeon';
import type { ItemId, ToolId } from '../../world/items';

/**
 * Pacote de arte de um mundo: URLs (embutidas, `?inline`) só do que aquele mundo usa.
 * Cada mundo tem o seu (`principal.ts`, `santuario.ts`); o build do artefato de um mundo só leva o pacote dele.
 * Campos ausentes = o mundo não tem aquilo (o render pula o que não veio).
 */
export interface ArtPack {
  /** Folhas dos atores (personagem, animais, monstros). */
  actors: Partial<Record<ActorKind, string>>;
  /** Atlas 3/4 dos 8 materiais (`extract-blocks.py`) e ícones da hotbar por bloco. */
  blockAtlas?: string;
  materialIcons: Partial<Record<number, string>>;
  /** Atlas e ícones dos blocos celestiais (Santuário). */
  celestialAtlas?: string;
  celestialIcons: Partial<Record<number, string>>;
  /** Porta de Carvalho (8 quadros). */
  oakDoor?: string;
  /** Dungeon (`extract-dungeon.py`). */
  dungeon?: { ground: string; mountains: string; rocks: string; props: string; walls: string };
  /** Folhas de morte dos monstros (`extract-dungeon.py`); sem elas, morte provisória procedural. */
  monsterDeaths?: Partial<Record<MonsterKind, string>>;
  /** Trigo (16 estágios) e ícones de itens/ferramentas. */
  wheatCrop?: string;
  itemIcons: Partial<Record<ItemId, string>>;
  /** Água (`extract-water.py`): topo do bloco (chão de água) e quadros de enchimento (4 direções × 4). */
  water?: { top: string; flow: string };
  /** Tenda (ponto de renascer): ícone da grade e sprite do mundo. */
  tent?: { icon: string; sprite: string };
  /** Ícones de interface (bolsa do inventário). */
  uiIcons?: { bag: string; character: string; skills: string; builder: string };
  toolIcons: Partial<Record<ToolId, string>>;
}
