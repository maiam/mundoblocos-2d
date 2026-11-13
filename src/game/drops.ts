import { SUBDIV } from '../config';
import type { Drop, StackId } from '../world/items';
import type { Inventory } from './inventory';
import type { Walker } from './walker';

/** Distância (células) a partir da qual o item voa até o personagem. */
const MAGNET = 1.6 * SUBDIV;
const COLLECT = 0.35 * SUBDIV;
/** Tempo antes de poder ser coletado (deixa ver o item "pular" para fora). */
const PICKUP_DELAY = 0.45;
const LIFETIME = 300;

export interface ItemDrop {
  item: StackId;
  x: number;
  y: number;
  age: number;
  /** Item da sala (multiplayer): pegar é pedido ao servidor, que decide quem leva. */
  netId?: number;
}

/** Itens caídos no chão (colheita, espólios, materiais quebrados). O personagem coleta ao chegar perto. */
export class Drops {
  readonly list: ItemDrop[] = [];
  /**
   * Multiplayer: com isto, chegar num item da sala não o põe na bolsa — pede ao servidor (`claim`) e o item some da
   * tela; ele só entra na bolsa quando a sala confirma que fui eu (`taken`). Sem isto, coleta local como sempre.
   */
  claim: ((netId: number) => void) | null = null;

  /** Itens que a sala mandou (já espalhados lá; aqui só aparecem). */
  addShared(list: Array<{ id: number; item: string; x: number; y: number }>): void {
    for (const d of list) {
      if (this.list.some((o) => o.netId === d.id)) continue;
      this.list.push({ item: d.item as StackId, x: d.x, y: d.y, age: 0, netId: d.id });
    }
  }

  /** Alguém pegou o item da sala: some (para quem pegou, já tinha sumido ao pedir). */
  removeShared(netId: number): ItemDrop | null {
    const i = this.list.findIndex((d) => d.netId === netId);
    return i < 0 ? null : this.list.splice(i, 1)[0];
  }

  spawn(x: number, y: number, drops: Drop[], rand: () => number = Math.random): void {
    for (const d of drops) {
      for (let i = 0; i < d.count; i++) {
        this.list.push({ item: d.item, x: x + (rand() - 0.5) * 0.6, y: y + (rand() - 0.5) * 0.4, age: 0 });
      }
    }
  }

  /** Itens da sala pedidos e ainda sem resposta. */
  private readonly pending = new Map<number, ItemDrop>();

  /** A sala respondeu: era meu (entra na bolsa) ou de outro (some de vez). Devolve o item se era meu. */
  resolveClaim(netId: number, mine: boolean): StackId | null {
    const d = this.pending.get(netId) ?? (mine ? this.removeShared(netId) : null);
    this.pending.delete(netId);
    if (!mine) this.removeShared(netId);
    return mine && d ? d.item : null;
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
          if (d.netId !== undefined && this.claim) {
            // Da sala: pede e espera a confirmação (fica parado, invisível, até a resposta).
            if (!this.pending.has(d.netId)) { this.pending.set(d.netId, d); this.claim(d.netId); }
            this.list.splice(i, 1);
            continue;
          }
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
