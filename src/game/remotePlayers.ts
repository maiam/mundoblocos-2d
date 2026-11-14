import { SUBDIV } from '../config';
import type { PlayerInfo } from '../net/protocol';
import type { World } from '../world/world';
import type { ToolId } from '../world/items';
import { type Actor, canSit, HERO_BODIES, type HeroBody, heroActorKind, type SitBody } from './entities';
import { ATTACK_FRAMES } from './player';
import { attackTimingFor } from './attackTiming';
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
  /** Como aparece: personagem pronto. */
  body: HeroBody;
  /** Ferramenta na mão (null = mãos vazias). */
  tool: ToolId | null;
  /** Último número de golpes visto; quando muda, toca o golpe aqui (`attackTime`). */
  swing: number;
  attackTime: number;
  /** Duração do golpe em andamento (s): do personagem e da ferramenta do outro jogador. */
  attackDur: number;
  /** Sentado: quadro da folha de sentar (null = de pé). */
  sit: number | null;
  /** Posições recebidas com a hora local de chegada (interpolação entre amostras, v0.93.69). */
  buf: Array<{ t: number; x: number; y: number }>;
}

/** Atraso (s) com que o outro jogador é desenhado: cabe ~1,5 intervalos de 10 Hz, para sempre haver duas amostras entre as quais interpolar. */
export const INTERP_DELAY = 0.15;
/** Quanto (s) extrapola pela última velocidade quando a rede atrasa, antes de parar. */
const EXTRAPOLATE_MAX = 0.12;
const BUF_MAX = 8;

/**
 * Posição no instante `t` pelas amostras (ordenadas no tempo): interpola entre as duas que cercam `t`; antes da primeira fica nela; depois da
 * última segue a velocidade das duas últimas por até `EXTRAPOLATE_MAX`. Pura (testável).
 */
export function sampleAt(buf: ReadonlyArray<{ t: number; x: number; y: number }>, t: number): { x: number; y: number } | null {
  const n = buf.length;
  if (n === 0) return null;
  if (t <= buf[0].t) return { x: buf[0].x, y: buf[0].y };
  for (let i = 1; i < n; i++) {
    if (t <= buf[i].t) {
      const a = buf[i - 1], b = buf[i];
      const k = (t - a.t) / Math.max(1e-6, b.t - a.t);
      return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
    }
  }
  const last = buf[n - 1];
  if (n < 2) return { x: last.x, y: last.y };
  const prev = buf[n - 2];
  const dt = Math.max(1e-6, last.t - prev.t);
  const over = Math.min(t - last.t, EXTRAPOLATE_MAX);
  return { x: last.x + ((last.x - prev.x) / dt) * over, y: last.y + ((last.y - prev.y) / dt) * over };
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
  /** Relógio local (s) da interpolação: soma o `dt` de `update`. */
  private clock = 0;

  /** Acompanha a lista da sessão (entrou, saiu, nova posição). */
  sync(others: ReadonlyMap<number, PlayerInfo>): void {
    for (const id of [...this.list.keys()]) if (!others.has(id)) this.list.delete(id);
    for (const [id, p] of others) {
      if (!p.state) continue;
      const r = this.list.get(id);
      if (!r) {
        this.list.set(id, {
          name: p.name, x: p.state.x, y: p.state.y, tx: p.state.x, ty: p.state.y, z: 0, facing: p.state.facing,
          moving: p.state.moving, walkTime: 0, body: HERO_BODIES.includes(p.appearance?.body) ? p.appearance.body : 'heroine',
          tool: p.state.tool ?? null, swing: p.state.swing ?? 0, attackTime: 0, attackDur: attackTimingFor('heroine', null).seconds, sit: p.state.sit ?? null,
          buf: [{ t: this.clock, x: p.state.x, y: p.state.y }],
        });
        continue;
      }
      // Posição nova: vira uma amostra no buffer (salto grande = teletransporte: recomeça o buffer ali).
      if (p.state.x !== r.tx || p.state.y !== r.ty) {
        const last = r.buf[r.buf.length - 1];
        if (last && Math.hypot(p.state.x - last.x, p.state.y - last.y) > SNAP) r.buf.length = 0;
        r.buf.push({ t: this.clock, x: p.state.x, y: p.state.y });
        if (r.buf.length > BUF_MAX) r.buf.shift();
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
        r.attackDur = attackTimingFor(r.body, r.tool).seconds; // golpe novo: a mesma animação (e o mesmo tempo) do jogador local
        r.attackTime = r.attackDur;
      }
    }
  }

  update(dt: number, world: World): void {
    const k = 1 - Math.exp(-12 * dt);
    this.clock += dt;
    for (const r of this.list.values()) {
      const x0 = r.x, y0 = r.y;
      const at = sampleAt(r.buf, this.clock - INTERP_DELAY);
      if (Math.hypot(r.tx - r.x, r.ty - r.y) > SNAP && r.buf.length <= 1) { r.x = r.tx; r.y = r.ty; }
      else if (at) { r.x = at.x; r.y = at.y; }
      // Passo pela distância andada (o pé não desliza), como no jogador local.
      r.walkTime = r.moving ? r.walkTime + Math.max(Math.hypot(r.x - x0, r.y - y0) / (4.2 * SUBDIV), 0.25 * dt) : 0;
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
        walkTime: r.walkTime, label: r.name,
        frame: sitting ? r.sit! : attacking ? Math.min(ATTACK_FRAMES - 1, Math.floor((1 - r.attackTime / r.attackDur) * ATTACK_FRAMES)) : undefined,
        phase: !sitting && attacking ? 1 - r.attackTime / r.attackDur : undefined,
      };
    });
  }
}
