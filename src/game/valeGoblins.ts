import { mulberry32 } from '../world/random';
import { valeGoblinHomes } from '../world/sanctuaryValeGoblin';
import type { World } from '../world/world';
import { Walker } from './walker';

/** O que o renderer precisa de cada goblin a cada quadro (posição dos pés em células, direção e pose de caminhada). */
export interface GoblinView {
  id: number;
  x: number;
  y: number;
  /** Altura dos pés (células). */
  z: number;
  /** Giro em y (rad): a frente do modelo (+z) aponta para (sen yaw, cos yaw) em (x leste, y sul). */
  yaw: number;
  /** 0 parado … 1 andando (mistura suave). */
  walk: number;
  /** Fase do ciclo de caminhada (rad), avança com a distância andada. */
  phase: number;
}

/** Quanto cada goblin se afasta do ponto de nascimento (células). */
const ROAM = 4;
/** Células andadas por um ciclo de caminhada (dois passos): ver `WALK_CYCLE_CELLS` no renderer. */
const CYCLE = 1.2;
const TURN_IDLE = 2.5; // rad/s ao se virar para a fogueira parado
const TURN_WALK = 7;   // rad/s ao andar

/** Menor diferença de ângulos, em (−π, π]. */
function angleDiff(a: number, b: number): number {
  let d = (a - b) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d <= -Math.PI) d += Math.PI * 2;
  return d;
}

/**
 * Um goblin do Vale (v0.93.161): vive em volta da fogueira — parado olhando para ela, de vez em quando escolhe um ponto a até `ROAM` células do nascimento e vai andando até lá,
 * parando se bater em algo (barraca, fogueira, árvore). Não sobe degraus (`stepHeight` 0). Estende `Walker`: a colisão com o mapa é sempre `World.standHeight`. Determinístico
 * pelo sorteio da semente (sem `Math.random`).
 */
export class ValeGoblin extends Walker {
  yaw: number;
  phase = 0;
  walkBlend = 0;
  private mode: 'idle' | 'walk' = 'idle';
  private timer: number;
  private tx = 0;
  private ty = 0;
  private stuck = 0;
  private readonly rand: () => number;

  constructor(readonly id: number, readonly homeX: number, readonly homeY: number, readonly fireX: number, readonly fireY: number, seed: number) {
    super(homeX, homeY, { speed: 0.7, halfW: 0.2, halfD: 0.15, stepHeight: 0 });
    this.rand = mulberry32(seed ^ (id * 0x9e3779b1));
    this.yaw = Math.atan2(fireX - homeX, fireY - homeY);
    this.timer = 0.5 + this.rand() * 2.5;
  }

  /** Escolhe um destino pisável perto do nascimento; sem achar, fica parado mais um tempo. */
  private pickTarget(world: World): boolean {
    for (let k = 0; k < 8; k++) {
      const a = this.rand() * Math.PI * 2, r = 1.2 + this.rand() * (ROAM - 1.2);
      const tx = this.homeX + Math.cos(a) * r, ty = this.homeY + Math.sin(a) * r;
      const h = world.standHeight(Math.floor(tx), Math.floor(ty));
      if (h !== null && Math.abs(h - this.z) <= 0) { this.tx = tx; this.ty = ty; return true; }
    }
    return false;
  }

  update(dt: number, world: World): void {
    let moved = 0;
    if (this.mode === 'idle') {
      this.move(dt, 0, 0, world);
      const want = Math.atan2(this.fireX - this.x, this.fireY - this.y);
      const d = angleDiff(want, this.yaw);
      this.yaw += Math.sign(d) * Math.min(Math.abs(d), TURN_IDLE * dt);
      this.timer -= dt;
      if (this.timer <= 0) {
        if (this.pickTarget(world)) { this.mode = 'walk'; this.stuck = 0; } else this.timer = 1 + this.rand() * 2;
      }
    } else {
      const dx = this.tx - this.x, dy = this.ty - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 0.25) { this.mode = 'idle'; this.timer = 1.2 + this.rand() * 3.5; this.move(dt, 0, 0, world); } else {
        moved = this.move(dt, dx / dist, dy / dist, world);
        const d = angleDiff(Math.atan2(dx, dy), this.yaw);
        this.yaw += Math.sign(d) * Math.min(Math.abs(d), TURN_WALK * dt);
        this.stuck = moved < this.spec.speed * dt * 0.25 ? this.stuck + dt : 0;
        if (this.stuck > 0.5) { this.mode = 'idle'; this.timer = 0.8 + this.rand() * 2; }
      }
    }
    this.phase += (moved / CYCLE) * Math.PI * 2;
    this.walkBlend += ((this.mode === 'walk' && moved > 0 ? 1 : 0) - this.walkBlend) * (1 - Math.exp(-9 * dt));
  }

  view(): GoblinView {
    return { id: this.id, x: this.x, y: this.y, z: this.visualZ, yaw: this.yaw, walk: this.walkBlend, phase: this.phase };
  }
}

/** Os 7 goblins do Vale Goblin (só no Santuário). Só andam os que estão em chunks carregados. */
export class ValeGoblins {
  readonly goblins: ValeGoblin[];
  private readonly list: GoblinView[] = [];

  constructor(world: World, seed = 0x60b11) {
    const { homes, fire } = valeGoblinHomes();
    this.goblins = homes.map(([x, y], i) => new ValeGoblin(i, x, y, fire[0], fire[1], seed));
    for (const g of this.goblins) { g.z = world.standHeight(Math.floor(g.x), Math.floor(g.y)) ?? 0; g.visualZ = g.z / world.cubeLevels; } // nascem em cima do chão do vale (o degrau 0 não os faria subir)
  }

  update(dt: number, world: World): void {
    for (const g of this.goblins) if (world.getChunk(Math.floor(g.x / 16), Math.floor(g.y / 16))) g.update(dt, world);
  }

  /** Visões para o renderer (a lista é reaproveitada a cada chamada). */
  views(world: World): readonly GoblinView[] {
    this.list.length = 0;
    for (const g of this.goblins) if (world.getChunk(Math.floor(g.x / 16), Math.floor(g.y / 16))) this.list.push(g.view());
    return this.list;
  }
}
