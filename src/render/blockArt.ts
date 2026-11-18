import { Block, type BlockId } from '../world/blocks';
import type { FxKind } from './three/spriteFx';
import { art } from './art';
import { setMaterialsV2 } from './materialsV2';
import type { IsoSetImages } from './isoSet';
import type { IsoFenceArt } from './three/isoFences';
import type { IsoCauldronModel } from './three/isoCauldrons';
import type { IsoGoblinArt } from './three/isoGoblins';

/**
 * Imagens de blocos carregadas antes do jogo começar (para chão e cubos já nascerem com a arte), a partir do
 * pacote de arte do mundo (`render/art`): atlas dos materiais (scripts/extract-blocks.py),
 * folha da porta, água, tenda, baú e cidade. A arte da dungeon vem depois, em segundo plano (`loadDungeonArt`).
 * Só o que o pacote traz é carregado; o resto fica null.
 * Layout de cada atlas: linha 0 = topo do cubo (64×64), linha 1 = frente (64×36),
 * linha 2 = topo contínuo para o chão (64×64); uma coluna por bloco.
 */
let atlas: HTMLImageElement | null = null;
/** Porta de Carvalho: 8 quadros (4×2) — 0..3 abrindo, 4..7 fechando (scripts/process-sprite.py). */
let oakDoor: HTMLImageElement | null = null;
/** Conjunto isométrico do Santuário (null nos outros mundos). */
let isoSet: { images: IsoSetImages; icons: Record<string, string> } | null = null;
/** Goblin 3D do Vale (malha e imagem da cor base), ou null. */
export function getIsoGoblin(): IsoGoblinArt | null {
  return isoGoblin;
}

/** Caldeirão 3D do Santuário (malha e ícone), ou null. */
export function getIsoCauldron(): { model: IsoCauldronModel; icon: string } | null {
  return isoCauldron;
}

/** Cerca e portão 3D do Santuário (null nos outros mundos). */
let isoFence: { art: IsoFenceArt; icons: Partial<Record<number, string>> } | null = null;
let isoGoblin: IsoGoblinArt | null = null;
let isoCauldron: { model: IsoCauldronModel; icon: string } | null = null;
/** Dungeon (scripts/extract-dungeon.py): topos do chão, montanhas, pedras, blocos decorados e paredes. */
export interface DungeonArt {
  ground: HTMLImageElement;
  mountains: HTMLImageElement;
  rocks: HTMLImageElement;
  props: HTMLImageElement;
  walls: HTMLImageElement;
  /** Entrada da caverna no mundo (null se o pacote não tem). */
  cave: HTMLImageElement | null;
}
let dungeon: DungeonArt | null = null;
/** Água: topo do bloco e quadros de enchimento (null = água procedural, ex.: mundos sem a arte). */
let water: { top: HTMLImageElement; flow: HTMLImageElement } | null = null;
/** Tenda (sprite do mundo). */
let tent: HTMLImageElement | null = null;
/** Baú (sprite do mundo). */
let chest: HTMLImageElement | null = null;
/** Objetos fabricados (fogueira, caldeirão, forno), por nome da arte. */
const craftables = new Map<string, HTMLImageElement>();
/** Pranchas de crescimento (carvalho, macieira, cacto). */
export interface TreeArt { oak: HTMLImageElement; apple: HTMLImageElement; appleBare: HTMLImageElement; cherry: HTMLImageElement; birch: HTMLImageElement; cactus: HTMLImageElement }
let trees: TreeArt | null = null;
/** Tira de pedregulhos. */
let rocks: HTMLImageElement | null = null;
let flowers: HTMLImageElement | null = null;
let fx: Record<FxKind, HTMLImageElement> | null = null;
/** Cerca de tábuas: peças emendáveis e portão (fechado, aberto). */
let fence: { pieces: Map<BlockId, HTMLImageElement>; gates: Map<BlockId, HTMLImageElement>; gatesSide: Map<BlockId, HTMLImageElement> } | null = null;
/** Cidade: imagens por nome (`town-<nome>`). */
const townImages = new Map<string, HTMLImageElement>();

function load(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Falha ao carregar a arte dos blocos'));
    img.src = url;
  });
}

const maybe = (url: string | undefined) => (url ? load(url) : Promise.resolve(null));

/** Carrega as imagens de bloco do pacote de arte já carregado (`loadArtPack`). */
export async function loadBlockArt(): Promise<void> {
  const a = art();
  [atlas, oakDoor] = await Promise.all([maybe(a.blockAtlas), maybe(a.oakDoor)]);
  isoSet = null;
  isoFence = null;
  isoCauldron = a.isoCauldron ?? null;
  isoGoblin = a.isoGoblin ? { model: a.isoGoblin.model, image: await load(a.isoGoblin.texture) } : null;
  if (a.isoFence) isoFence = { art: { model: a.isoFence.model, wood: await load(a.isoFence.wood) }, icons: a.isoFence.icons };
  if (a.isoSet) {
    const [ground, cube, props, stone, rio, trees] = await Promise.all([load(a.isoSet.ground), load(a.isoSet.cube), load(a.isoSet.props), load(a.isoSet.stone), load(a.isoSet.rio), maybe(a.isoSet.trees)]);
    isoSet = { images: { ground, cube, props, stone, rio, ...(trees ? { trees } : {}) }, icons: a.isoSet.icons };
  }
  if (a.tent) tent = await load(a.tent.sprite);
  if (a.chest) chest = await load(a.chest.sprite);
  for (const [name, c] of Object.entries(a.craftables ?? {})) if (c) craftables.set(name, await load(c.sprite));
  if (a.rocks) rocks = await load(a.rocks);
  if (a.flowers) flowers = await load(a.flowers);
  if (a.fx) {
    const kinds = Object.keys(a.fx) as FxKind[];
    const imgs = await Promise.all(kinds.map((k) => load(a.fx![k])));
    fx = Object.fromEntries(kinds.map((k, i) => [k, imgs[i]])) as Record<FxKind, HTMLImageElement>;
  }
  if (a.fence) {
    const f = a.fence;
    const [oak, birch, cherry, gOak, gBirch, gCherry, sOak, sBirch, sCherry] = await Promise.all([f.pieces, f.birch.pieces, f.cherry.pieces, f.gate, f.birch.gate, f.cherry.gate, f.gateSide, f.birch.gateSide, f.cherry.gateSide].map(load));
    fence = {
      pieces: new Map<BlockId, HTMLImageElement>([[Block.FENCE, oak], [Block.FENCE_BIRCH, birch], [Block.FENCE_CHERRY, cherry]]),
      gates: new Map<BlockId, HTMLImageElement>([[Block.FENCE, gOak], [Block.FENCE_BIRCH, gBirch], [Block.FENCE_CHERRY, gCherry]]),
      gatesSide: new Map<BlockId, HTMLImageElement>([[Block.FENCE, sOak], [Block.FENCE_BIRCH, sBirch], [Block.FENCE_CHERRY, sCherry]]),
    };
  }
  if (a.trees) {
    const [oak, apple, appleBare, cherry, birch, cactus] = await Promise.all([load(a.trees.oak), load(a.trees.apple), load(a.trees.appleBare), load(a.trees.cherry), load(a.trees.birch), load(a.trees.cactus)]);
    trees = { oak, apple, appleBare, cherry, birch, cactus };
  }
  if (a.town) {
    const entries = Object.entries(a.town);
    const imgs = await Promise.all(entries.map(([, url]) => load(url)));
    entries.forEach(([name], i) => townImages.set(name, imgs[i]));
  }
  if (a.water) {
    const [top, flow] = await Promise.all([load(a.water.top), load(a.water.flow)]);
    water = { top, flow };
  }
}

/**
 * Atlas do Padrão de Materiais V2 (ADR 0023) e o das máscaras de transição: carregados antes do jogo (o V2 é o padrão;
 * `useInWorld` false = `?blocos=legado`, só para comparar). Sem o atlas no pacote (ex.: Santuário), nada acontece.
 */
export async function loadMaterialsV2(useInWorld: boolean): Promise<boolean> {
  const m = art().materialsV2;
  if (!m) return false;
  const [atlas, masks] = await Promise.all([load(m.atlas), m.masks ? load(m.masks) : Promise.resolve(null)]);
  setMaterialsV2(atlas, m.manifest, useInWorld, masks);
  return true;
}

/**
 * Arte da dungeon, carregada DEPOIS do início (fora do caminho crítico, ADR 0013): o jogo abre na cidade e a
 * dungeon fica longe; quando chega, o render injeta as texturas (`addDungeonTextures`) e redesenha o chão.
 * Resolve null se o mundo não tem dungeon.
 */
export async function loadDungeonArt(): Promise<DungeonArt | null> {
  const d = art().dungeon;
  if (!d || dungeon) return dungeon;
  const [ground, mountains, rocks, props, walls] = await Promise.all([d.ground, d.mountains, d.rocks, d.props, d.walls].map(load));
  const cave = d.cave ? await load(d.cave) : null;
  dungeon = { ground, mountains, rocks, props, walls, cave };
  return dungeon;
}

/** Atlas dos materiais (null se o mundo não tem materiais). */
export function getBlockAtlas(): HTMLImageElement | null {
  return atlas;
}

/** Cerca e portão 3D do Santuário (modelo, tábuas e ícones), ou null. */
export function getIsoFence(): { art: IsoFenceArt; icons: Partial<Record<number, string>> } | null {
  return isoFence;
}

/** Conjunto isométrico do Santuário (imagens e ícones), ou null. */
export function getIsoSet(): { images: IsoSetImages; icons: Record<string, string> } | null {
  return isoSet;
}

export function getOakDoorSheet(): HTMLImageElement | null {
  return oakDoor;
}

export function getDungeonArt(): DungeonArt | null {
  return dungeon;
}

export function getWaterArt(): { top: HTMLImageElement; flow: HTMLImageElement } | null {
  return water;
}

export function getTentSprite(): HTMLImageElement | null {
  return tent;
}

export function getChestSprite(): HTMLImageElement | null {
  return chest;
}

/** Tira de pedregulhos (null fora do mundo principal). */
export function getRockArt(): HTMLImageElement | null {
  return rocks;
}

/** Efeitos de golpe em quadros (null fora do mundo principal). */
export function getFxArt(): Record<FxKind, HTMLImageElement> | null {
  return fx;
}

/** Tira de flores fofas (null fora do mundo principal). */
export function getFlowerArt(): HTMLImageElement | null {
  return flowers;
}

/** Peças da cerca e do portão (null fora do mundo principal). */
export function getFenceArt(): { pieces: Map<BlockId, HTMLImageElement>; gates: Map<BlockId, HTMLImageElement>; gatesSide: Map<BlockId, HTMLImageElement> } | null {
  return fence;
}

/** Árvores adultas (tiras de variantes) e prancha do cacto (null fora do mundo principal). */
export function getTreeArt(): TreeArt | null {
  return trees;
}

/** Sprite de um objeto fabricado pelo nome da arte (`campfire`, `cauldron`, `oven`). */
export function getCraftableSprite(name: string): HTMLImageElement | null {
  return craftables.get(name) ?? null;
}

/** Imagens da cidade por nome (vazio fora do mundo principal). */
export function getTownImages(): Map<string, HTMLImageElement> {
  return townImages;
}
