import { hurtFarejador, KINDS, newFarejador, type Farejador, type Kind } from './creature';
import { Item } from './items';
import type { TitanSession } from './session';
import { restDrop, wearHeldTool } from './actions';

/**
 * Combate com os Farejadores de Duna (ADR 0069): o jogador golpeia o animal na mira (toque curto, alcance de 3 m, pausa de 0,6 s entre golpes). Dano pela arma na mão; a adaga é arma (desgasta −1), a
 * picareta serve mal (−2) e o punho vale 1. Abatido, o animal solta carne crua e placa no chão e **volta na toca depois de `RESPAWN_S` s de jogo ativo** (a pilha não some para sempre).
 * Números provisórios. Sem DOM, sem sorteio.
 */
export const ATTACK_REACH = 3;
export const ATTACK_COOLDOWN_S = 0.6;
/** Dano por golpe (pontos de vida do animal) por item na mão; sem arma = punho. */
export const FIST_DAMAGE = 1;
export const WEAPON_DAMAGE: Readonly<Record<number, number>> = { [Item.STONE_DAGGER]: 4, [Item.COPPER_DAGGER]: 6, [Item.STONE_PICK]: 2, [Item.COPPER_PICK]: 3 };
export const damageOf = (item: number | undefined | null): number => (item ? WEAPON_DAMAGE[item] ?? FIST_DAMAGE : FIST_DAMAGE);
/** O que cada tamanho solta ao ser abatido: porções de carne crua e placas de carapaça. */
export const LOOT: Readonly<Record<Kind, { meat: number; plate: number }>> = { pequeno: { meat: 1, plate: 1 }, grande: { meat: 2, plate: 1 } };
/** Segundos de jogo ativo até o animal abatido voltar à toca. */
export const RESPAWN_S = 600;

export interface AttackResult { ok: boolean; damage: number; dead: boolean; broken: boolean; toolName?: string; loot?: { meat: number; plate: number }; msg?: string }

/** Golpe no animal `index` com o item da mão: desgasta a arma, tira vida e, se morreu, solta o espólio e agenda a volta. */
export function attackCreature(s: TitanSession, index: number): AttackResult {
  const f = s.creatures[index];
  if (!f) return { ok: false, damage: 0, dead: false, broken: false };
  const damage = damageOf(s.inventory.get(s.selected)?.item);
  const w = wearHeldTool(s, { type: 'attack' });
  const r = hurtFarejador(f, damage);
  if (!r.dead) return { ok: true, damage, dead: false, broken: w.broken, toolName: w.name, msg: w.broken ? `${w.name} quebrou` : undefined };
  const loot = LOOT[f.kind];
  s.creatures.splice(index, 1);
  s.respawn.set(f.kind, RESPAWN_S);
  s.metaRev++;
  restDrop(s, `m:${f.kind}:${Math.floor(f.clock * 10)}:0`, Item.RAW_MEAT, f.body.x, f.body.y, f.body.z, loot.meat);
  restDrop(s, `m:${f.kind}:${Math.floor(f.clock * 10)}:1`, Item.PLATE, f.body.x, f.body.y, f.body.z, loot.plate);
  return { ok: true, damage, dead: true, broken: w.broken, toolName: w.name, loot, msg: `${KINDS[f.kind].name} abatido: ${loot.meat} ${loot.meat > 1 ? 'porções' : 'porção'} de carne e ${loot.plate} placa${w.broken ? `; ${w.name} quebrou` : ''}` };
}

/** Passa `dt` s de jogo ativo para as voltas dos animais abatidos; devolve os que voltaram à toca (na lista da sessão). */
export function tickRespawn(s: TitanSession, dt: number): Farejador[] {
  const back: Farejador[] = [];
  const den = s.volume.gen.den;
  for (const [kind, left] of [...s.respawn]) {
    const rest = left - dt;
    if (rest > 0) { s.respawn.set(kind, rest); continue; }
    s.respawn.delete(kind);
    if (den) { const f = newFarejador(kind, den, s.volume.gen.seed); s.creatures.push(f); back.push(f); }
    s.metaRev++;
  }
  return back;
}
