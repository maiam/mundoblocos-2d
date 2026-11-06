import { TILE } from '../config';
import type { Actor } from '../game/entities';
import { modularFrame, type ModularManifest } from './modular';

/**
 * Desenha o personagem modular (ADR 0017): cada parte é uma folha do exportador, empilhada pela ordem do manifesto.
 * O quadro é desenhado no tamanho dele × `escalaMundo` × zoom, com a âncora no ponto do chão — nunca esticado para
 * uma altura fixa. As imagens só carregam quando o personagem aparece (fora do orçamento de início).
 */
/**
 * Ajuste de tamanho no jogo: o chibi v02 (com cabelo) mede ~72 px de mundo de altura e a heroína ~68 px; igualados,
 * os dois personagens jogáveis e os moradores ficam na mesma escala. Só o desenho muda — a âncora continua no chão.
 */
export const MODULAR_FIT = 0.94;

export class ModularSprites {
  private readonly images = new Map<string, HTMLImageElement>();

  constructor(private readonly manifest: ModularManifest, private readonly urls: Record<string, string>) {}

  private image(file: string): HTMLImageElement | undefined {
    let img = this.images.get(file);
    if (!img) {
      const url = this.urls[file];
      if (!url) return undefined;
      img = new Image();
      img.src = url;
      this.images.set(file, img);
    }
    return img;
  }

  /** Desenha com a raiz em (fx, fy) da tela. `false` = ainda carregando ou sem peças (o render usa a heroína). */
  draw(ctx: CanvasRenderingContext2D, fx: number, fy: number, zoom: number, a: Actor, elapsed: number): boolean {
    if (!a.look) return false;
    const f = modularFrame(this.manifest, a.look, a.facing, a.moving, a.walkTime, elapsed);
    if (!f) return false;
    const imgs = f.layers.map((l) => this.image(l.arquivo));
    // Só desenha com todas as partes prontas: nada de corpo sem roupa piscando na primeira vez.
    if (imgs.some((im) => !im?.complete || !im.naturalWidth)) return false;
    ctx.fillStyle = 'rgba(30, 20, 70, 0.3)';
    ctx.beginPath();
    ctx.ellipse(fx, fy, 0.32 * TILE * zoom, 0.12 * TILE * zoom, 0, 0, Math.PI * 2);
    ctx.fill();
    if (a.hurt && Math.floor(elapsed * 14) % 2 === 1) return true;
    const [fw, fh] = f.action.quadro;
    const s = f.action.escalaMundo * MODULAR_FIT * zoom;
    const dx = Math.round(fx - f.action.ancora[0] * s);
    const dy = Math.round(fy - f.action.ancora[1] * s);
    const w = Math.round(fw * s);
    const h = Math.round(fh * s);
    for (const im of imgs) ctx.drawImage(im!, f.col * fw, f.row * fh, fw, fh, dx, dy, w, h);
    return true;
  }
}
