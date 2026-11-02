import atlasUrl from '../assets/blocks-atlas.webp?inline';
import celestialAtlasUrl from '../assets/celestial-atlas.webp?inline';

/**
 * Atlas dos blocos (scripts/extract-blocks.py): materiais do mundo principal e blocos
 * celestiais do Santuário. Carregados uma vez antes do jogo começar, para que chão e
 * cubos já nasçam com a arte (sem trocar de visual depois).
 * Layout de cada atlas: linha 0 = topo do cubo (64×64), linha 1 = frente (64×36),
 * linha 2 = topo contínuo para o chão (64×64); uma coluna por bloco.
 */
let atlas: HTMLImageElement | null = null;
let celestial: HTMLImageElement | null = null;

function load(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Falha ao carregar a arte dos blocos'));
    img.src = url;
  });
}

export async function loadBlockArt(): Promise<void> {
  if (atlas && celestial) return;
  [atlas, celestial] = await Promise.all([load(atlasUrl), load(celestialAtlasUrl)]);
}

export function getBlockAtlas(): HTMLImageElement {
  if (!atlas) throw new Error('loadBlockArt() precisa terminar antes de criar as texturas');
  return atlas;
}

export function getCelestialAtlas(): HTMLImageElement {
  if (!celestial) throw new Error('loadBlockArt() precisa terminar antes de criar as texturas');
  return celestial;
}
