import type { World } from '../world/world';
import type { Renderer } from './renderer';

/** Only rendering differs between official worlds; gameplay remains shared. */
export type GameRenderer = Pick<Renderer, 'draw' | 'pick' | 'addDamage' | 'iconFor'> & {
  dispose?(): void;
};

export type RendererFactory = (canvas: HTMLCanvasElement, world: World) => GameRenderer;
