import atlasUrl from '../assets/blocks-atlas.webp?inline';

/**
 * Atlas dos materiais (scripts/extract-blocks.py). Carregado uma vez antes do jogo
 * começar, para que chão e cubos já nasçam com a arte (sem trocar de visual depois).
 */
let atlas: HTMLImageElement | null = null;

export function loadBlockArt(): Promise<void> {
  if (atlas) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      atlas = img;
      resolve();
    };
    img.onerror = () => reject(new Error('Falha ao carregar a arte dos blocos'));
    img.src = atlasUrl;
  });
}

export function getBlockAtlas(): HTMLImageElement {
  if (!atlas) throw new Error('loadBlockArt() precisa terminar antes de criar as texturas');
  return atlas;
}
