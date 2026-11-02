import { art } from './art';

/**
 * Imagens de blocos carregadas antes do jogo começar (para chão e cubos já nascerem com a arte), a partir do
 * pacote de arte do mundo (`render/art`): atlas dos materiais (scripts/extract-blocks.py), atlas celestial,
 * folha da porta e arte da dungeon. Só o que o pacote traz é carregado; o resto fica null.
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
}
let dungeon: DungeonArt | null = null;
/** Água: topo do bloco e quadros de enchimento (null = água procedural, ex.: mundos sem a arte). */
let water: { top: HTMLImageElement; flow: HTMLImageElement } | null = null;
/** Tenda (sprite do mundo). */
let tent: HTMLImageElement | null = null;

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
  const d = a.dungeon;
  [atlas, celestial, oakDoor] = await Promise.all([maybe(a.blockAtlas), maybe(a.celestialAtlas), maybe(a.oakDoor)]);
  if (a.tent) tent = await load(a.tent.sprite);
  if (a.water) {
    const [top, flow] = await Promise.all([load(a.water.top), load(a.water.flow)]);
    water = { top, flow };
  }
  if (d) {
    const [ground, mountains, rocks, props, walls] = await Promise.all([d.ground, d.mountains, d.rocks, d.props, d.walls].map(load));
    dungeon = { ground, mountains, rocks, props, walls };
  }
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
