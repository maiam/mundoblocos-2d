/**
 * Terreno indicado para arar (missão 07 "Terra para o futuro", v0.93.129): um retângulo de grama livre perto do portão da cidade, escolhido pela seed (função pura do
 * gerador, nunca das edições do jogador) para o contorno dourado no chão e a contagem de terra arada. Não altera o mapa.
 */
import { SUBDIV } from '../config';
import { Block, blockDef } from './blocks';
import type { Rect } from './dungeon';
import { inRect } from './dungeon';
import type { World } from './world';

/** Tamanho do terreno em células (24 células, das quais a missão pede 12 aradas). */
export const PLOT_W = 6, PLOT_H = 4;
const NEAR = 6 * SUBDIV, FAR = 70 * SUBDIV;

export function planFarmPlot(world: World): Rect | null {
  if (!world.town) return null;
  const [gx, gy] = world.outsideGate();
  const avoid: Rect[] = [];
  if (world.flowerPatch) avoid.push({ x0: world.flowerPatch.area.x0 - 2, y0: world.flowerPatch.area.y0 - 2, x1: world.flowerPatch.area.x1 + 2, y1: world.flowerPatch.area.y1 + 2 });
  const ok = (x: number, y: number): boolean => {
    if (world.isProtected(x, y) || avoid.some((r) => inRect(r, x, y))) return false;
    const c = world.generator.cellAt(x, y);
    if (c.ground !== Block.GRASS && c.ground !== Block.DIRT) return false;
    const o = blockDef(c.object);
    return c.upper === Block.AIR && (c.object === Block.AIR || o.shape === 'decoration');
  };
  // anéis de distância crescente em volta do portão; dentro de cada anel, ordem fixa (primeiro o que está mais ao sul, depois ao leste)
  for (let d = NEAR; d <= FAR; d += 2) {
    for (let dy = -d; dy <= d; dy++) {
      for (let dx = -d; dx <= d; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== d) continue;
        const x0 = gx + dx, y0 = gy + dy;
        let good = true;
        for (let y = y0 - 1; y <= y0 + PLOT_H && good; y++) for (let x = x0 - 1; x <= x0 + PLOT_W && good; x++) good = ok(x, y);
        if (good) return { x0, y0, x1: x0 + PLOT_W - 1, y1: y0 + PLOT_H - 1 };
      }
    }
  }
  return null;
}

/** Quantas células do terreno já são Terra Arada (o andamento da missão). */
export function tilledIn(world: World, plot: Rect): number {
  let n = 0;
  for (let y = plot.y0; y <= plot.y1; y++) for (let x = plot.x0; x <= plot.x1; x++) if (world.getGround(x, y) === Block.TILLED) n++;
  return n;
}
