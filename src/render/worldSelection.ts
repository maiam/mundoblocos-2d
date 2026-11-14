import type { SelectionRect } from './selectionFx';

/** Câmera mínima para o cálculo (a `Camera` do jogo): células ↔ pixels de CSS. */
export interface SelectionCamera {
  worldToScreenX(px: number): number;
  worldToScreenY(px: number): number;
  zoom: number;
}
/** O que há no topo da célula (`World.topBlock`) e o que o render precisa saber dele. */
export interface SelectionTarget {
  x: number;
  y: number;
  /** Bloco do topo e seu nível, ou null (chão vazio). */
  top: { level: number; cube: boolean; levelsPerCube?: number } | null;
  /** Retângulo clicável do sprite do objeto (px relativos ao canto da célula), quando o topo é um objeto desenhado por sprite. */
  hit: { x: number; y: number; w: number; h: number } | null;
}

/**
 * Retângulo da seleção na tela para o render 3D (ADR 0031, M5), o que o jogador VÊ: na vista oblíqua (K) um cubo no nível L aparece
 * como o topo (um quadrado) em cima da frente (outro quadrado) — 1 célula de largura e 1 + K de altura, subindo K por nível —, não
 * como o ladrilho do chão; um objeto de sprite usa o retângulo clicável dele (a mesma âncora do 2D); o chão vazio, o ladrilho.
 */
export function selectionRect3d(cam: SelectionCamera, t: SelectionTarget, tile: number, k: number): SelectionRect {
  const cell = tile * cam.zoom;
  if (t.top?.cube) {
    // Blocos de 1/4 (`levelsPerCube` = 4, ADR 0033): o topo do bloco do nível `level` está `(level + 1) / 4` de célula acima do chão e a frente
    // dele tem 1/4 de altura; com 1 (padrão, Santuário) é o cubo inteiro, como antes.
    const q = t.top.levelsPerCube ?? 1;
    const lift = (k * (t.top.level + 1)) / q;
    return { sx: cam.worldToScreenX(t.x * tile), sy: cam.worldToScreenY((t.y - lift) * tile), w: cell, h: cell * (1 + k / q) };
  }
  if (t.top && t.hit) {
    return {
      sx: cam.worldToScreenX(t.x * tile + t.hit.x), sy: cam.worldToScreenY(t.y * tile + t.hit.y),
      w: t.hit.w * cam.zoom, h: t.hit.h * cam.zoom,
    };
  }
  return { sx: cam.worldToScreenX(t.x * tile), sy: cam.worldToScreenY(t.y * tile), w: cell, h: cell };
}
