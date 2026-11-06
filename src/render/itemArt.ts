import { TILE } from '../config';
import { CROP_STAGES, CROPS, type CropKind } from '../world/blocks';
import type { ItemId, StackId, ToolId } from '../world/items';
import { art } from './art';
import { TEX_RES, type Sprite } from './textures';

/** Ícone de um item (hotbar e itens caídos), do pacote de arte do mundo ('' se o mundo não tem o item). */
export function itemIconUrl(id: ItemId): string {
  return art().itemIcons[id] ?? '';
}

/** Ícone de uma ferramenta (hotbar), do pacote de arte do mundo. */
export function toolIconUrl(id: ToolId): string {
  return art().toolIcons[id] ?? '';
}

/** Lado do quadro das plantações em células (quadro quadrado; a planta madura ocupa ~1,2 célula). */
const CROP_W = 1.25;
/** Altura da base do caule dentro da célula (vista 3/4: um pouco abaixo do centro). */
const CROP_BASE = 0.8;

/**
 * Carrega as folhas de crescimento das plantações (trigo, batata, tomate, cenoura; 4×4 = 16 estágios cada) e registra
 * um sprite por estágio no mapa de objetos. Até carregar, a plantação simplesmente não aparece.
 */
export function loadCropSprites(objects: Map<number, Sprite>): void {
  const a = art();
  const sheets: Partial<Record<CropKind, string>> = { wheat: a.wheatCrop, ...a.crops };
  for (const [kind, url] of Object.entries(sheets) as Array<[CropKind, string | undefined]>) {
    if (url) loadCropSheet(url, CROPS[kind].first, objects); // mundo sem cultivo: sem folhas
  }
}

function loadCropSheet(url: string, first: number, objects: Map<number, Sprite>): void {
  const img = new Image();
  img.onload = () => {
    const fw = img.width / 4;
    const fh = img.height / 4;
    const w = TILE * CROP_W;
    const h = w * (fh / fw);
    for (let s = 0; s < CROP_STAGES; s++) {
      const c = document.createElement('canvas');
      c.width = Math.ceil(w * TEX_RES);
      c.height = Math.ceil(h * TEX_RES);
      const ctx = c.getContext('2d')!;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, (s % 4) * fw, Math.floor(s / 4) * fh, fw, fh, 0, 0, c.width, c.height);
      // Base do caule (fundo do quadro) um pouco abaixo do centro da célula, sobre a terra arada.
      const oy = TILE * CROP_BASE - h;
      objects.set(first + s, {
        canvas: c, ox: (TILE - w) / 2, oy, w, h,
        // Área clicável: do alto da planta (limitado) até a base da célula.
        hit: { x: 2, y: Math.max(oy + h * 0.3, -TILE * 0.5), w: TILE - 4, h: TILE - Math.max(oy + h * 0.3, -TILE * 0.5) },
      });
    }
  };
  img.src = url;
}

/** Imagens dos ícones para desenhar itens caídos no canvas (itens, espólios e materiais coletados). */
export class ItemIcons {
  private readonly imgs = new Map<StackId, HTMLImageElement>();

  /** `urlFor`: URL do ícone de uma pilha (itens do pacote; blocos pelo ícone da hotbar). */
  constructor(private readonly urlFor: (id: StackId) => string) {}

  get(id: StackId): HTMLImageElement | undefined {
    let img = this.imgs.get(id);
    if (!img) {
      img = new Image();
      const url = this.urlFor(id);
      if (url) img.src = url;
      this.imgs.set(id, img);
    }
    return img.complete && img.naturalWidth > 0 ? img : undefined;
  }
}
