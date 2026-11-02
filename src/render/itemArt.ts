import axeIconUrl from '../assets/icon-axe.webp?inline';
import hoeIconUrl from '../assets/icon-hoe.webp?inline';
import pickaxeIconUrl from '../assets/icon-pickaxe.webp?inline';
import shovelIconUrl from '../assets/icon-shovel.webp?inline';
import swordIconUrl from '../assets/icon-sword.webp?inline';
import seedIconUrl from '../assets/icon-wheat-seed.webp?inline';
import wheatIconUrl from '../assets/icon-wheat.webp?inline';
import cropUrl from '../assets/wheat-crop.webp?inline';
import { TILE } from '../config';
import { WHEAT_FIRST, WHEAT_STAGES } from '../world/blocks';
import type { ItemId, ToolId } from '../world/items';
import { TEX_RES, type Sprite } from './textures';

/** Ícones dos itens (hotbar e itens caídos). */
export const ITEM_ICON_URLS: Record<ItemId, string> = {
  wheat_seed: seedIconUrl,
  wheat: wheatIconUrl,
};

/** Ícones das ferramentas (hotbar). */
export const TOOL_ICON_URLS: Record<ToolId, string> = {
  sword: swordIconUrl,
  hoe: hoeIconUrl,
  pickaxe: pickaxeIconUrl,
  shovel: shovelIconUrl,
  axe: axeIconUrl,
};

/** Largura do canteiro de trigo em células (o monte de terra ocupa a célula toda). */
const CROP_W = 1.15;

/**
 * Carrega a folha de crescimento do trigo (4×4 = 16 estágios) e registra um
 * sprite por estágio no mapa de objetos. Até carregar, o trigo simplesmente não aparece.
 */
export function loadCropSprites(objects: Map<number, Sprite>): void {
  const img = new Image();
  img.onload = () => {
    const fw = img.width / 4;
    const fh = img.height / 4;
    const w = TILE * CROP_W;
    const h = w * (fh / fw);
    for (let s = 0; s < WHEAT_STAGES; s++) {
      const c = document.createElement('canvas');
      c.width = Math.ceil(w * TEX_RES);
      c.height = Math.ceil(h * TEX_RES);
      const ctx = c.getContext('2d')!;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, (s % 4) * fw, Math.floor(s / 4) * fh, fw, fh, 0, 0, c.width, c.height);
      // Base do canteiro levemente abaixo do centro da célula (vista 3/4).
      const oy = TILE - h + 2;
      objects.set(WHEAT_FIRST + s, {
        canvas: c, ox: (TILE - w) / 2, oy, w, h,
        // Área clicável: do alto da planta (limitado) até a base da célula.
        hit: { x: 2, y: Math.max(oy, -TILE * 0.7), w: TILE - 4, h: TILE - Math.max(oy, -TILE * 0.7) },
      });
    }
  };
  img.src = cropUrl;
}

/** Imagens dos ícones para desenhar itens caídos no canvas. */
export class ItemIcons {
  private readonly imgs = new Map<ItemId, HTMLImageElement>();

  constructor() {
    for (const [id, url] of Object.entries(ITEM_ICON_URLS) as [ItemId, string][]) {
      const img = new Image();
      img.src = url;
      this.imgs.set(id, img);
    }
  }

  get(id: ItemId): HTMLImageElement | undefined {
    const img = this.imgs.get(id);
    return img && img.complete && img.naturalWidth > 0 ? img : undefined;
  }
}
