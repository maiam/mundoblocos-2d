import type { Drop, StackId } from '../world/items';
import type { Inventory } from './inventory';
import type { Walker } from './walker';

/** Distância (células) a partir da qual o item voa até o personagem. */
const MAGNET = 1.6;
const COLLECT = 0.35;
/** Tempo antes de poder ser coletado (deixa ver o item "pular" para fora). */
const PICKUP_DELAY = 0.45;
const LIFETIME = 300;

export interface ItemDrop {
  item: StackId;
  x: number;
  y: number;
  age: number;
}

/** Itens caídos no chão (colheita, espólios, materiais quebrados). O personagem coleta ao chegar perto. */
export class Drops {
  readonly list: ItemDrop[] = [];

  spawn(x: number, y: number, drops: Drop[], rand: () => number = Math.random): void {
    for (const d of drops) {
      for (let i = 0; i < d.count; i++) {
        this.list.push({ item: d.item, x: x + (rand() - 0.5) * 0.6, y: y + (rand() - 0.5) * 0.4, age: 0 });
      }
    }
  }

  /** Atualiza e coleta; `onCollect` avisa o que entrou no inventário (a grade decide se ocupa um espaço). */
  /** `canTake`: há lugar para este item (mão/bolsa)? Senão ele fica no chão até liberar espaço. */
  update(dt: number, collector: Walker, inventory: Inventory, onCollect?: (id: StackId) => void, canTake: (id: StackId) => boolean = () => true): void {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const d = this.list[i];
      d.age += dt;
      const dx = collector.x - d.x;
      const dy = collector.y - d.y;
      const dist = Math.hypot(dx, dy);
      if (d.age > PICKUP_DELAY && dist < MAGNET && canTake(d.item)) {
        const speed = Math.min(dist, dt * 6 * (1 + (MAGNET - dist) * 2));
        d.x += (dx / (dist || 1)) * speed;
        d.y += (dy / (dist || 1)) * speed;
        if (Math.hypot(collector.x - d.x, collector.y - d.y) < COLLECT) {
          inventory.add(d.item);
          onCollect?.(d.item);
          this.list.splice(i, 1);
          continue;
        }
      }
      if (d.age > LIFETIME) this.list.splice(i, 1);
    }
  }
}
