import { art } from './art';

/**
 * Imagens de blocos carregadas antes do jogo começar (para chão e cubos já nascerem com a arte), a partir do
 * pacote de arte do mundo (`render/art`): atlas dos materiais (scripts/extract-blocks.py), atlas celestial,
 * folha da porta, água, tenda, baú e cidade. A arte da dungeon vem depois, em segundo plano (`loadDungeonArt`).
 * Só o que o pacote traz é carregado; o resto fica null.
 * Layout de cada atlas: linha 0 = topo do cubo (64×64), linha 1 = frente (64×36),
 * linha 2 = topo contínuo para o chão (64×64); uma coluna por bloco.
 */
let atlas: HTMLImageElement | null = null;
let celestial: HTMLImageElement | null = null;
/** Porta de Carvalho: 8 quadros (4×2) — 0..3 abrindo, 4..7 fechando (scripts/process-sprite.py). */
let oakDoor: HTMLImageElement | null = null;
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
let trees: { oak: HTMLImageElement; apple: HTMLImageElement; cactus: HTMLImageElement } | null = null;
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
  [atlas, celestial, oakDoor] = await Promise.all([maybe(a.blockAtlas), maybe(a.celestialAtlas), maybe(a.oakDoor)]);
  if (a.tent) tent = await load(a.tent.sprite);
  if (a.chest) chest = await load(a.chest.sprite);
  for (const [name, c] of Object.entries(a.craftables ?? {})) if (c) craftables.set(name, await load(c.sprite));
  if (a.trees) {
    const [oak, apple, cactus] = await Promise.all([load(a.trees.oak), load(a.trees.apple), load(a.trees.cactus)]);
    trees = { oak, apple, cactus };
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

export function getCelestialAtlas(): HTMLImageElement | null {
  return celestial;
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

/** Pranchas de crescimento das árvores e cactos (null fora do mundo principal). */
export function getTreeArt(): { oak: HTMLImageElement; apple: HTMLImageElement; cactus: HTMLImageElement } | null {
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
