import type { PlayerInfo } from '../net/protocol';
import { cleanLook, type ModularLook, type ModularManifest } from '../render/modular';
import type { World } from '../world/world';
import type { ToolId } from '../world/items';
import { type Actor, canSit, HERO_BODIES, type HeroBody, heroActorKind, type SitBody } from './entities';
import { ATTACK_FRAMES, ATTACK_SECONDS } from './player';
import type { Facing } from './walker';

interface Remote {
  name: string;
  x: number;
  y: number;
  tx: number;
  ty: number;
  z: number;
  facing: Facing;
  moving: boolean;
  walkTime: number;
  /** Como aparece: personagem pronto ou chibi (peças já conferidas no manifesto deste jogo). */
  body: HeroBody;
  look: ModularLook | null;
  /** Ferramenta na mão (null = mãos vazias). */
  tool: ToolId | null;
  /** Último número de golpes visto; quando muda, toca o golpe aqui (`attackTime`). */
  swing: number;
  attackTime: number;
  /** Sentado: quadro da folha de sentar (null = de pé). */
  sit: number | null;
}

/** Acima disso (células) o outro jogador é teleportado em vez de deslizar (entrou num interior, renasceu…). */
const SNAP = 6;

/**
 * Outros jogadores da sala (multiplayer, ADR 0016): bonecos que seguem a posição que cada um manda, suavizada. Não
 * são `Walker` de propósito — quem anda e colide é o jogo de cada um; aqui só se desenha onde ele está. Não bloqueiam
 * nem são atingidos (sem combate entre jogadores).
 */
export class RemotePlayers {
  private readonly list = new Map<number, Remote>();

  /** `manifest` = peças do chibi neste jogo (sem ele, quem veio de chibi aparece como personagem pronto). */
  constructor(private readonly manifest?: ModularManifest) {}

  /** Acompanha a lista da sessão (entrou, saiu, nova posição). */
  sync(others: ReadonlyMap<number, PlayerInfo>): void {
    for (const id of [...this.list.keys()]) if (!others.has(id)) this.list.delete(id);
    for (const [id, p] of others) {
      if (!p.state) continue;
      const r = this.list.get(id);
      if (!r) {
        const look = p.appearance?.look && this.manifest ? cleanLook(this.manifest, p.appearance.look) : null;
        this.list.set(id, {
          name: p.name, x: p.state.x, y: p.state.y, tx: p.state.x, ty: p.state.y, z: 0, facing: p.state.facing,
          moving: p.state.moving, walkTime: 0, body: HERO_BODIES.includes(p.appearance?.body) ? p.appearance.body : 'heroine', look,
          tool: p.state.tool ?? null, swing: p.state.swing ?? 0, attackTime: 0, sit: p.state.sit ?? null,
        });
        continue;
      }
      r.tx = p.state.x;
      r.ty = p.state.y;
      r.facing = p.state.facing;
      r.moving = p.state.moving;
      r.tool = p.state.tool ?? null;
      r.sit = p.state.sit ?? null;
      const swing = p.state.swing ?? 0;
      if (swing !== r.swing) {
        r.swing = swing;
        r.attackTime = ATTACK_SECONDS; // golpe novo: a mesma animação do jogador local
      }
    }
  }

  update(dt: number, world: World): void {
    const k = 1 - Math.exp(-12 * dt);
    for (const r of this.list.values()) {
      if (Math.hypot(r.tx - r.x, r.ty - r.y) > SNAP) { r.x = r.tx; r.y = r.ty; } else { r.x += (r.tx - r.x) * k; r.y += (r.ty - r.y) * k; }
      r.walkTime = r.moving ? r.walkTime + dt : 0;
      r.attackTime = Math.max(0, r.attackTime - dt);
      const h = world.standHeight(Math.floor(r.x), Math.floor(r.y)) ?? 0;
      r.z += (h - r.z) * k;
    }
  }

  get size(): number {
    return this.list.size;
  }

  get actors(): Actor[] {
    return [...this.list.values()].map((r) => {
      const attacking = r.attackTime > 0;
      const sitting = r.sit !== null && canSit(r.body);
      return {
        kind: sitting ? `${r.body as SitBody}-sit` as const : heroActorKind(r.body, r.tool, r.tool, attacking), x: r.x, y: r.y, visualZ: r.z, facing: r.facing, moving: r.moving,
        walkTime: r.walkTime, label: r.name, look: r.look ?? undefined,
        frame: sitting ? r.sit! : attacking ? Math.min(ATTACK_FRAMES - 1, Math.floor((1 - r.attackTime / ATTACK_SECONDS) * ATTACK_FRAMES)) : undefined,
      };
    });
  }
}
