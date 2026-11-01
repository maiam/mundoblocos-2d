import { STEP_HEIGHT } from '../config';
import type { ToolId } from '../world/items';
import type { World } from '../world/world';
import { type Blocker, Walker } from './walker';

export type { Facing } from './walker';

/**
 * Personagem jogável: anda pela entrada do jogador (teclado/joystick, em
 * direções de tela) e sobe até STEP_HEIGHT nível por passo; descer é livre.
 */
export class Player extends Walker {
  /** Ferramenta em mãos (muda o sprite); null = mãos livres. */
  equipped: ToolId | null = null;

  constructor(x: number, y: number) {
    super(x, y, { speed: 4.2, halfW: 0.27, halfD: 0.15, stepHeight: STEP_HEIGHT });
  }

  update(dt: number, ix: number, iy: number, world: World, blocked?: Blocker): void {
    this.move(dt, ix, iy, world, blocked);
  }
}
