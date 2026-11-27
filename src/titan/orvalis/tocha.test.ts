import { describe, expect, it } from 'vitest';
import { breakOrCollect, placeFromSlot } from '../actions';
import { breakTotalMs, HOLD_MS } from '../breaking';
import { blockOfItem, isItem, Item, itemOfBlock, ITEM_NAMES, maxStack } from '../items';
import { modelBox, TORCH_BOX } from '../models';
import { craft, recipeById } from '../recipes';
import { MemoryTitanStorage } from '../save';
import { openSession } from '../session';
import { surfaceOf } from '../sounds';
import { blocksLight, isFull, isSolid, isTarget, isTorch, isWallTorch, ladderFacing, lightLevelOf, modelOf, T, wallTorchId, wallTorchTurn } from '../voxel';
import { tochaModels } from '../../render/tochaModel';
import { ORVALIS_GENERATOR_VERSION, OrvalisGenerator, orvalisGeneratorFor } from './generator';

/** Tocha do Orvalis (ADR 0121, auditoria #33): em pé ou presa à parede, luz 14, quebra instantânea, solta-se sem apoio. */
const open = async () => ({ s: await openSession(new MemoryTitanStorage(), 42, () => 1, orvalisGeneratorFor, ORVALIS_GENERATOR_VERSION, (sd, v) => new OrvalisGenerator(sd, v)) });
const Y = 150;
const spot = (s: Awaited<ReturnType<typeof open>>['s']) => {
  const a = s.volume.gen.arrival, x = Math.floor(a.x) + 6, z = Math.floor(a.z) + 6;
  for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) { s.volume.set(x + dx, Y, z + dz, T.STONE); for (let yy = Y + 1; yy < Y + 5; yy++) s.volume.set(x + dx, yy, z + dz, T.AIR); }
  s.body.x = x + 20.5; s.body.z = z + 20.5; s.body.y = Y + 1; // o corpo longe do caminho
  return { x, z };
};
const hold = (s: Awaited<ReturnType<typeof open>>['s'], n = 4): void => { s.inventory.add(Item.TOCHA, n); s.inventory.move([...Array(36).keys()].find((i) => s.inventory.get(i)?.item === Item.TOCHA)!, 0); s.selected = 0; };

describe('Tocha: ids, item e regras do bloco', () => {
  it('5 ids (145 em pé, 146–149 de parede com o giro no id); não sólida, alvo da mira, não bloqueia luz, luz 14, modelos próprios', () => {
    expect(T.TORCH).toBe(145); expect(isTorch(T.TORCH) && !isWallTorch(T.TORCH)).toBe(true);
    for (let t = 0; t < 4; t++) {
      const id = wallTorchId(t);
      expect(id).toBe(T.TORCH_WALL + t); expect(isWallTorch(id) && isTorch(id)).toBe(true); expect(wallTorchTurn(id)).toBe(t); expect(modelOf(id)).toEqual({ kind: 'tochaParede', turn: t });
    }
    expect(modelOf(T.TORCH)).toEqual({ kind: 'tocha', turn: 0 }); expect(isTorch(T.TORCH_WALL_270 + 1) || isTorch(T.TORCH - 1)).toBe(false);
    for (let id = T.TORCH; id <= T.TORCH_WALL_270; id++) {
      expect(isSolid(id)).toBe(false); expect(isTarget(id)).toBe(true); expect(isFull(id) || blocksLight(id)).toBe(false);
      expect(lightLevelOf(id)).toBe(14); expect(surfaceOf(id)).toBe('sand'); expect(itemOfBlock(id)).toBe(Item.TOCHA);
    }
    expect(blockOfItem(Item.TOCHA)).toBe(T.TORCH);
  });
  it('item 85 "Tocha" em pilha de 64; 86 é só a textura da Tocha de parede; quebra instantânea (dureza 0, só o gesto de 200 ms)', () => {
    expect(Item.TOCHA).toBe(85); expect(isItem(85)).toBe(true); expect(isItem(86)).toBe(false); expect(ITEM_NAMES[85]).toBe('Tocha'); expect(maxStack(85)).toBe(64);
    expect(breakTotalMs('block', T.TORCH)).toBe(HOLD_MS); expect(breakTotalMs('block', T.TORCH_WALL_90, 'rock')).toBe(HOLD_MS);
  });
  it('receita da Wiki: 1 Carvão Vegetal + 1 Haste rendem 4 Tochas, na fabricação pessoal; só no Orvalis', async () => {
    const r = recipeById('tocha')!;
    expect(r.ingredients).toEqual([{ item: Item.CARVAO_VEGETAL, count: 1 }, { item: Item.HASTE, count: 1 }]); expect(r.result).toEqual({ item: Item.TOCHA, count: 4 }); expect(r.station).toBe('personal'); expect(r.world).toBe('orvalis');
    const { s } = await open(); s.inventory.add(Item.CARVAO_VEGETAL, 1); s.inventory.add(Item.HASTE, 1);
    expect(craft(s.inventory, r, null).ok).toBe(true); expect(s.inventory.total(Item.TOCHA)).toBe(4); expect(s.inventory.total(Item.CARVAO_VEGETAL)).toBe(0);
  });
});

describe('Tocha: colocar, luz, quebrar e perder o apoio', () => {
  it('em pé no topo de um cubo; presa à lateral com a chama para fora; nunca por baixo nem em folhas', async () => {
    const { s } = await open(); const p = spot(s); hold(s, 8);
    expect(placeFromSlot(s, { x: p.x, y: Y, z: p.z, nx: 0, ny: 1, nz: 0 }, 0).ok).toBe(true); expect(s.volume.get(p.x, Y + 1, p.z)).toBe(T.TORCH);
    s.volume.set(p.x + 1, Y + 1, p.z, T.STONE); // um cubo para a lateral
    for (const [nx, nz] of [[0, 1], [1, 0], [0, -1], [-1, 0]] as const) {
      s.volume.set(p.x + 1, Y + 1, p.z, T.STONE); s.volume.set(p.x + 1 + nx, Y + 1, p.z + nz, T.AIR);
      expect(placeFromSlot(s, { x: p.x + 1, y: Y + 1, z: p.z, nx, ny: 0, nz }, 0).ok).toBe(true);
      const id = s.volume.get(p.x + 1 + nx, Y + 1, p.z + nz); expect(isWallTorch(id)).toBe(true); expect(ladderFacing(wallTorchTurn(id))).toEqual([nx, nz]);
      s.volume.set(p.x + 1 + nx, Y + 1, p.z + nz, T.AIR);
    }
    expect(placeFromSlot(s, { x: p.x, y: Y + 1, z: p.z, nx: 0, ny: -1, nz: 0 }, 0)).toMatchObject({ ok: false }); // pela face de baixo, não
    s.volume.set(p.x, Y + 3, p.z, T.LEAVES_OAK); s.volume.set(p.x, Y + 4, p.z, T.AIR);
    expect(placeFromSlot(s, { x: p.x, y: Y + 3, z: p.z, nx: 0, ny: 1, nz: 0 }, 0)).toMatchObject({ ok: false }); // sobre folhas, não
    expect(placeFromSlot(s, { x: p.x, y: Y + 3, z: p.z, nx: 1, ny: 0, nz: 0 }, 0)).toMatchObject({ ok: false }); // nem na lateral de folhas
    s.volume.set(p.x + 2, Y + 1, p.z, T.STONE_STAIR); // lateral de degrau: não é bloco inteiro
    expect(placeFromSlot(s, { x: p.x + 2, y: Y + 1, z: p.z, nx: 0, ny: 0, nz: 1 }, 0)).toMatchObject({ ok: false });
  });
  it('a luz é 14 na célula e cai 1 por bloco; sai ao quebrar', async () => {
    const { s } = await open(); const p = spot(s); hold(s);
    expect(s.volume.light(p.x, Y + 1, p.z)).toBe(0); // liga o motor de luz
    placeFromSlot(s, { x: p.x, y: Y, z: p.z, nx: 0, ny: 1, nz: 0 }, 0);
    expect(s.volume.light(p.x, Y + 1, p.z)).toBe(14); expect(s.volume.light(p.x + 1, Y + 1, p.z)).toBe(13); expect(s.volume.light(p.x + 3, Y + 1, p.z)).toBe(11);
    expect(breakOrCollect(s, { x: p.x, y: Y + 1, z: p.z, nx: 0, ny: 1, nz: 0 }).ok).toBe(true);
    expect(s.volume.light(p.x, Y + 1, p.z)).toBe(0); expect(s.volume.get(p.x, Y + 1, p.z)).toBe(T.AIR);
    expect([...s.drops.values()].some((d) => d.item === Item.TOCHA)).toBe(true); // solta a própria tocha
  });
  it('quebrar o apoio solta a tocha em pé de cima e só as de parede presas a ele', async () => {
    const { s } = await open(); const p = spot(s);
    s.volume.set(p.x, Y + 1, p.z, T.STONE); s.volume.set(p.x, Y + 2, p.z, T.TORCH); // em pé sobre o cubo
    s.volume.set(p.x + 1, Y + 1, p.z, T.TORCH_WALL_90); // de parede, chama para +x: presa ao cubo em (x, Y+1)
    s.volume.set(p.x - 1, Y + 1, p.z, wallTorchId(1)); // de parede, chama para +x: presa ao bloco de (x−2), não ao cubo de (x)
    s.volume.set(p.x, Y + 1, p.z + 1, wallTorchId(0)); // chama para +z: fica na célula z+1 e está presa ao cubo em z → cai
    expect(breakOrCollect(s, { x: p.x, y: Y + 1, z: p.z, nx: 0, ny: 1, nz: 0 }).ok).toBe(true);
    expect(s.volume.get(p.x, Y + 2, p.z)).toBe(T.AIR); expect(s.volume.get(p.x + 1, Y + 1, p.z)).toBe(T.AIR); expect(s.volume.get(p.x, Y + 1, p.z + 1)).toBe(T.AIR);
    expect(s.volume.get(p.x - 1, Y + 1, p.z)).toBe(wallTorchId(1)); // a que estava presa a outro bloco fica
    expect([...s.drops.values()].filter((d) => d.item === Item.TOCHA).length).toBe(3);
  });
});

describe('Tocha: caixa de mira e modelo', () => {
  it('a caixa em pé fica no centro da célula; a de parede encosta no apoio e se estende para fora', () => {
    const v = modelBox(T.TORCH, 4, 7, 9), w = modelBox(T.TORCH_WALL_90, 4, 7, 9); // chama para +x: parede em x = 4
    expect(v[0]).toBeCloseTo(4.5 - TORCH_BOX.w / 2, 5); expect(v[4]).toBeCloseTo(7 + TORCH_BOX.h, 5);
    expect(w[0]).toBe(4); expect(w[3]).toBeCloseTo(4 + TORCH_BOX.reach, 5);
    const n = modelBox(modelOf(T.TORCH_WALL_270) ? T.TORCH_WALL_270 : T.TORCH, 4, 7, 9); expect(n[3]).toBe(5); // chama para −x: parede em x = 5
  });
  it('o modelo em pé tem dois planos cruzados pousados na célula; o de parede cola o sprite à parede (z local −0,5)', () => {
    const { standing, wall } = tochaModels(22);
    const rng = (a: number[], k: number): [number, number] => { let lo = Infinity, hi = -Infinity; for (let i = k; i < a.length; i += 3) { lo = Math.min(lo, a[i]); hi = Math.max(hi, a[i]); } return [lo, hi]; };
    expect(rng(standing.pos, 1)[0]).toBeCloseTo(0, 5); expect(rng(standing.pos, 1)[1]).toBeLessThan(0.8);
    expect(Math.abs(rng(standing.pos, 0)[0] + rng(standing.pos, 0)[1])).toBeLessThan(0.05); expect(Math.abs(rng(standing.pos, 2)[0] + rng(standing.pos, 2)[1])).toBeLessThan(0.05); // centrada
    expect(rng(wall.pos, 2)[0]).toBeGreaterThanOrEqual(-0.5); expect(rng(wall.pos, 2)[0]).toBeLessThan(-0.4); expect(rng(wall.pos, 2)[1]).toBeLessThan(0);
    expect(rng(wall.pos, 1)[0]).toBeGreaterThan(0.1); expect(rng(wall.pos, 1)[1]).toBeLessThan(1);
    for (const m of [standing, wall]) { expect(m.idx.length % 3).toBe(0); expect(m.uv.length / 2).toBe(m.pos.length / 3); expect(Math.max(...m.idx)).toBeLessThan(m.pos.length / 3); }
    expect(standing.idx.length).toBeGreaterThan(wall.idx.length); // dois planos contra um
  });
});
