import type { Drop } from './save';
import type { TitanSession } from './session';
import { isLiquidCell, isSolid, Y_MIN } from './voxel';

/**
 * Física dos itens soltos (ADR 0098), pura e sem DOM: (1) **gravidade** — o item cai para o "baixo" do mundo (−Y, o centro do planeta/lua), acelerando, em vez de aparecer no apoio; na água afunda devagar;
 * (2) **deslocamento** — se um bloco é colocado na célula do item, ele é empurrado para uma célula vizinha livre (e cai de lá). O estado de queda é só de execução (`session.dropFx`, fora do save): um item
 * que repousa não tem estado; um que acaba de perder o apoio ganha `fy` (altura real, em células) e `vy` (velocidade para baixo, m/s). `Drop.y` é sempre a **célula** onde o item está.
 */
/** Aceleração da gravidade sobre o item (m/s²) e velocidade máxima de queda (m/s); na água, uma fração bem menor (afunda). */
export const DROP_GRAVITY = 22, DROP_TERMINAL = 38, LIQUID_GRAVITY = 4, LIQUID_TERMINAL = 2.2;
const SUBSTEP = 0.05, EPS = 1e-6;

/** Altura em que um item solto repousa: desce enquanto não há sólido embaixo (nunca abaixo da rocha-mãe). */
export function restY(s: TitanSession, x: number, y: number, z: number): number {
  let yy = y;
  while (yy > Y_MIN + 1 && !isSolid(s.volume.get(x, yy - 1, z))) yy--;
  return yy;
}

/** Altura real do item (célula + fração durante a queda). */
export const heightOf = (s: TitanSession, d: Drop): number => s.dropFx.get(d.id)?.fy ?? d.y;

/** Um passo (≤ 1 s, em subpassos de 50 ms) de gravidade para todos os itens soltos. Devolve se alguma célula mudou **ou** algum item ainda está caindo (o jogo redesenha). */
export function stepDrops(s: TitanSession, dt: number): boolean {
  let active = false, left = Math.min(Math.max(dt, 0), 1);
  while (left > EPS) {
    const h = Math.min(SUBSTEP, left);
    left -= h;
    for (const d of [...s.drops.values()]) {
      const ry = restY(s, d.x, d.y, d.z), fx = s.dropFx.get(d.id);
      let fy = fx?.fy ?? d.y;
      if (fy <= ry + EPS && d.y <= ry) { if (fx && fx.fy !== undefined) { delete fx.fy; delete fx.vy; active = true; } continue; } // repousa (ou acabou de pousar)
      const state = fx ?? { delay: 0, age: 0 };
      if (!fx) s.dropFx.set(d.id, state);
      const wet = isLiquidCell(s.volume.get(d.x, Math.floor(fy + EPS), d.z)); // água com ou sem planta aquática (ADR 0135)
      const vy = Math.min(wet ? LIQUID_TERMINAL : DROP_TERMINAL, (state.vy ?? 0) + (wet ? LIQUID_GRAVITY : DROP_GRAVITY) * h);
      fy -= vy * h;
      if (fy <= ry + EPS) { fy = ry; delete state.fy; delete state.vy; } else { state.fy = fy; state.vy = vy; }
      const cell = Math.max(ry, Math.floor(fy + EPS));
      if (cell !== d.y) { s.drops.set(d.id, { ...d, y: cell }); s.dropsRev++; }
      active = true;
    }
  }
  return active;
}

/** Pousa todos os itens no apoio já, sem animação (testes e leitura de partida). Devolve se algum mudou. */
export function settleDrops(s: TitanSession): boolean {
  let moved = false;
  for (const d of [...s.drops.values()]) {
    const ry = restY(s, d.x, d.y, d.z), fx = s.dropFx.get(d.id);
    if (fx) { delete fx.fy; delete fx.vy; }
    if (ry !== d.y) { s.drops.set(d.id, { ...d, y: ry }); s.dropsRev++; moved = true; }
  }
  return moved;
}

const DIRS: ReadonlyArray<readonly [number, number]> = [[1, 0], [0, 1], [-1, 0], [0, -1]];
const hashId = (id: string): number => { let h = 2166136261; for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619); return h >>> 0; };

/**
 * Plano de deslocamento ao colocar bloco(s) nas `cells`: cada item solto numa delas vai para a primeira célula **livre** (não sólida, dentro da região, fora das células que recebem bloco) entre as quatro
 * vizinhas no mesmo nível (a ordem gira por um hash do id, para dois itens não irem sempre ao mesmo lado) e, se nenhuma serve, para cima (1 e 2 células). `null` = algum item não tem para onde ir (a
 * colocação deve ser recusada). Não muda nada: aplique com `applyDisplace`.
 */
export function planDisplace(s: TitanSession, cells: ReadonlyArray<readonly [number, number, number]>): Map<string, { x: number; y: number; z: number }> | null {
  const taken = new Set(cells.map(([x, y, z]) => `${x},${y},${z}`)), plan = new Map<string, { x: number; y: number; z: number }>();
  const free = (x: number, y: number, z: number): boolean => y > Y_MIN && s.volume.gen.inRegion(x, z) && !taken.has(`${x},${y},${z}`) && !isSolid(s.volume.get(x, y, z));
  for (const [x, y, z] of cells) {
    for (const d of s.drops.values()) {
      if (d.x !== x || d.y !== y || d.z !== z) continue;
      const r = hashId(d.id) % 4;
      let spot: { x: number; y: number; z: number } | null = null;
      for (let i = 0; i < 4 && !spot; i++) { const [dx, dz] = DIRS[(i + r) % 4]; if (free(x + dx, y, z + dz)) spot = { x: x + dx, y, z: z + dz }; }
      for (let up = 1; up <= 2 && !spot; up++) if (free(x, y + up, z)) spot = { x, y: y + up, z };
      if (!spot) return null;
      plan.set(d.id, spot);
    }
  }
  return plan;
}

/** Aplica o plano de `planDisplace`: o item muda de célula (e cai de lá, se não houver apoio). */
export function applyDisplace(s: TitanSession, plan: ReadonlyMap<string, { x: number; y: number; z: number }>): void {
  for (const [id, to] of plan) {
    const d = s.drops.get(id);
    if (!d) continue;
    s.drops.set(id, { ...d, x: to.x, y: to.y, z: to.z });
    const fx = s.dropFx.get(id);
    if (fx) { delete fx.fy; delete fx.vy; }
  }
  if (plan.size) s.dropsRev++;
}
