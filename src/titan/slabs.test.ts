import { describe, expect, it } from 'vitest';
import { breakOrCollect, placeFromSlot } from './actions';
import { breakTotalMs } from './breaking';
import { TitanGenerator } from './generator';
import { SLOTS } from './inventory';
import { Item, itemOfBlock } from './items';
import { meshSection } from './mesher';
import { canPlaceAt, collides, newBody, raycast, stepBody } from './physics';
import { MemoryTitanStorage } from './save';
import { flush, openSession } from './session';
import { resolveSlabPlacement } from './slabs';
import { surfaceOf } from './sounds';
import { TitanVolume } from './volume';
import { blockSpan, isFull, isSlab, isSolid, T } from './voxel';

const FLAT_Y = 200;
function arena(): TitanVolume {
  const v = new TitanVolume(new TitanGenerator(42, 5));
  for (let x = 4; x <= 20; x++) for (let z = 4; z <= 20; z++) v.place(x, FLAT_Y - 1, z, T.DARK_ROCK);
  return v;
}
const walk = (v: TitanVolume, b: ReturnType<typeof newBody>, dirX: number, dirZ: number, secs: number, jump = false): void => { for (let k = 0; k < secs * 40; k++) stepBody(v, b, { dirX, dirZ, jump }, 1 / 40); };

describe('laje superior e dupla: regras de colocação (ADR 0056)', () => {
  it('topo de laje inferior ou base de laje superior funde em laje dupla; senão a metade vem da face e da altura clicadas', () => {
    expect(resolveSlabPlacement(T.SLAB, 1, 0.5)).toEqual({ merge: true, block: T.SLAB_DOUBLE });
    expect(resolveSlabPlacement(T.SLAB_TOP, -1, 0.5)).toEqual({ merge: true, block: T.SLAB_DOUBLE });
    expect(resolveSlabPlacement(T.DARK_ROCK, 1, 1)).toEqual({ merge: false, block: T.SLAB }); // topo de um bloco → inferior
    expect(resolveSlabPlacement(T.DARK_ROCK, -1, 0)).toEqual({ merge: false, block: T.SLAB_TOP }); // teto → superior
    expect(resolveSlabPlacement(T.DARK_ROCK, 0, 0.49)).toEqual({ merge: false, block: T.SLAB }); // metade de baixo da lateral → inferior
    expect(resolveSlabPlacement(T.DARK_ROCK, 0, 0.5)).toEqual({ merge: false, block: T.SLAB_TOP }); // metade de cima → superior
    expect(resolveSlabPlacement(T.DARK_ROCK, 0, undefined)).toEqual({ merge: false, block: T.SLAB }); // sem altura: inferior
    expect(resolveSlabPlacement(T.SLAB, -1, 0.2)).toEqual({ merge: false, block: T.SLAB_TOP }); // embaixo de uma laje inferior: não funde (face de baixo)
    expect(resolveSlabPlacement(T.SLAB_TOP, 1, 0.9)).toEqual({ merge: false, block: T.SLAB }); // em cima de laje superior: laje inferior na célula de cima
  });

  it('faixas: inferior [0, 0,5], superior [0,5, 1], dupla e cubo [0, 1]; só a dupla e o cubo são cheios', () => {
    expect(blockSpan(T.SLAB)).toEqual([0, 0.5]); expect(blockSpan(T.SLAB_TOP)).toEqual([0.5, 1]);
    expect(blockSpan(T.SLAB_DOUBLE)).toEqual([0, 1]); expect(blockSpan(T.DARK_ROCK)).toEqual([0, 1]); expect(blockSpan(T.AIR)).toEqual([0, 0]);
    for (const id of [T.SLAB, T.SLAB_TOP, T.SLAB_DOUBLE]) { expect(isSolid(id)).toBe(true); expect(surfaceOf(id)).toBe('rock'); expect(itemOfBlock(id)).toBe(Item.SLAB); }
    expect(isSlab(T.SLAB) && isSlab(T.SLAB_TOP)).toBe(true); expect(isSlab(T.SLAB_DOUBLE)).toBe(false);
    expect(isFull(T.SLAB_DOUBLE)).toBe(true); expect(isFull(T.SLAB)).toBe(false); expect(isFull(T.SLAB_TOP)).toBe(false);
    expect(breakTotalMs('block', T.SLAB_TOP)).toBe(1000); expect(breakTotalMs('block', T.SLAB_DOUBLE)).toBe(1600);
  });
});

describe('laje superior: física e mira', () => {
  it('colisão pela faixa: o corpo passa sob a laje superior só se sobra espaço (1,5 m não basta para 1,8 m); sobre ela, pisa no topo (y + 1)', () => {
    const v = arena();
    v.place(8, FLAT_Y + 1, 8, T.SLAB_TOP); // teto de meia célula a 1,5 m do piso
    expect(collides(v, 8.5, FLAT_Y, 8.5)).toBe(true); // 1,8 m de corpo não cabe sob 1,5 m
    expect(collides(v, 8.5, FLAT_Y + 1, 8.5)).toBe(true); // com os pés em y + 1 a faixa da laje [y + 1,5, y + 2] ainda corta o corpo
    expect(collides(v, 8.5, FLAT_Y + 2, 8.5)).toBe(false); // em cima dela (pés no topo, y + 2): livre
  });

  it('o teto da laje superior barra a cabeça no meio da célula (não no fundo dela) ao pular', () => {
    const v = arena();
    v.place(8, FLAT_Y + 2, 8, T.SLAB_TOP); // faixa [FLAT_Y + 2,5, FLAT_Y + 3]
    const b = newBody(8.5, FLAT_Y, 8.5); walk(v, b, 0, 0, 0.4);
    let peak = b.y;
    for (let k = 0; k < 40; k++) { stepBody(v, b, { dirX: 0, dirZ: 0, jump: true }, 1 / 40); peak = Math.max(peak, b.y); }
    expect(peak + 1.8).toBeLessThanOrEqual(FLAT_Y + 2.5 + 1e-3); // a cabeça encosta no fundo da laje (meio da célula)
    expect(peak + 1.8).toBeGreaterThan(FLAT_Y + 2.3); // e sobe até lá (não para meio metro antes)
  });

  it('caindo sobre uma laje superior, pousa no topo dela (y + 1) e o corpo anda por cima', () => {
    const v = arena();
    v.place(8, FLAT_Y, 8, T.SLAB_TOP);
    const b = newBody(8.5, FLAT_Y + 3, 8.5); walk(v, b, 0, 0, 1.2);
    expect(b.onGround).toBe(true); expect(b.y).toBeCloseTo(FLAT_Y + 1, 3);
  });

  it('a mira acerta a metade de cima da célula da laje superior e devolve a altura do ponto (hy)', () => {
    const v = arena();
    v.place(8, FLAT_Y, 8, T.SLAB_TOP);
    // do lado +x, olhando para −x, na altura do meio da metade de cima (y + 0,75): acerta
    const hit = raycast(v, 11, FLAT_Y + 0.75, 8.5, -1, 0, 0);
    expect(hit).toMatchObject({ x: 8, y: FLAT_Y, z: 8, nx: 1 });
    expect(hit!.hy).toBeCloseTo(0.75, 3);
    expect(hit!.box).toEqual([8, FLAT_Y + 0.5, 8, 9, FLAT_Y + 1, 9]);
    // na altura da metade de baixo o raio passa vazio por baixo da laje
    expect(raycast(v, 11, FLAT_Y + 0.25, 8.5, -1, 0, 0)).toBeNull();
  });

  it('a mira num cubo devolve o ponto clicado: topo → hy 1, lateral na metade de cima → hy ≥ 0,5', () => {
    const v = arena();
    v.place(8, FLAT_Y, 8, T.DARK_ROCK);
    const lateralAlta = raycast(v, 11, FLAT_Y + 0.8, 8.5, -1, 0, 0)!;
    expect(lateralAlta.hy).toBeGreaterThanOrEqual(0.5); expect(lateralAlta.ny).toBe(0);
    const lateralBaixa = raycast(v, 11, FLAT_Y + 0.2, 8.5, -1, 0, 0)!;
    expect(lateralBaixa.hy).toBeLessThan(0.5);
  });

  it('colocar: a faixa da laje superior não invade o corpo logo abaixo dela', () => {
    const v = arena();
    const b = newBody(8.5, FLAT_Y, 8.5);
    expect(canPlaceAt(v, b, 8, FLAT_Y, 8, undefined, [0.5, 1])).toBe(false); // faixa [y+0,5, y+1] corta o corpo de pé na célula
    expect(canPlaceAt(v, b, 8, FLAT_Y + 2, 8, undefined, [0.5, 1])).toBe(true); // bem acima da cabeça (1,8 m)
  });
});

describe('malha das lajes superior e dupla', () => {
  it('laje superior: base a y + 0,5 e topo a y + 1; lajes superior e inferior na mesma coluna escondem a face que se encosta; dupla é cubo', () => {
    const v = arena();
    v.place(8, FLAT_Y, 8, T.SLAB_TOP); v.place(10, FLAT_Y, 8, T.SLAB); v.place(12, FLAT_Y, 8, T.SLAB_DOUBLE);
    const cx = 0, sy = Math.floor((FLAT_Y + 64) / 16);
    const m = meshSection(v, cx, sy, 0).opaque!;
    const ys = new Set<number>();
    for (let i = 1; i < m.pos.length; i += 3) ys.add(Math.round(m.pos[i] * 1000) / 1000);
    expect(ys.has(FLAT_Y + 0.5)).toBe(true); expect(ys.has(FLAT_Y + 1)).toBe(true);
    // alturas dos vértices da coluna (x0..x0+1, z 8..9) acima do piso (o piso de teste fica em y = FLAT_Y e abaixo)
    const yAt = (x0: number): number[] => { const out: number[] = []; for (let i = 0; i < m.pos.length; i += 3) if (m.pos[i] >= x0 && m.pos[i] <= x0 + 1 && m.pos[i + 2] >= 8 && m.pos[i + 2] <= 9 && m.pos[i + 1] > FLAT_Y + 0.01) out.push(Math.round(m.pos[i + 1] * 1000) / 1000); return out; };
    expect(Math.min(...yAt(8))).toBeCloseTo(FLAT_Y + 0.5, 3); expect(Math.max(...yAt(8))).toBeCloseTo(FLAT_Y + 1, 3); // superior: de y + 0,5 a y + 1
    expect(Math.max(...yAt(10))).toBeCloseTo(FLAT_Y + 0.5, 3); // inferior: não passa de y + 0,5
    expect(Math.max(...yAt(12))).toBeCloseTo(FLAT_Y + 1, 3); // dupla: cubo inteiro
  });
});

describe('lajes na sessão: colocar, fundir, quebrar e persistir', () => {
  it('inferior no chão, superior no teto/na lateral alta, dupla ao fundir; a dupla devolve 2 lajes; tudo persiste ao reabrir', async () => {
    const st = new MemoryTitanStorage();
    const s = await openSession(st, 42, () => 1, undefined, 5);
    s.inventory.add(Item.SLAB, 10);
    const slot = [...Array(SLOTS).keys()].find((i) => s.inventory.get(i)?.item === Item.SLAB)!;
    s.inventory.move(slot, 0);
    const a = s.volume.gen.arrival, bx = Math.floor(a.x) + 3, bz = Math.floor(a.z);
    s.yaw = 0;
    // 1) topo do chão → inferior em y 65
    expect(placeFromSlot(s, { x: bx, y: 64, z: bz, nx: 0, ny: 1, nz: 0, hy: 1 }, 0).ok).toBe(true);
    expect(s.volume.get(bx, 65, bz)).toBe(T.SLAB);
    // 2) clicando no topo da laje inferior → funde em laje dupla na mesma célula
    expect(placeFromSlot(s, { x: bx, y: 65, z: bz, nx: 0, ny: 1, nz: 0, hy: 0.5 }, 0).ok).toBe(true);
    expect(s.volume.get(bx, 65, bz)).toBe(T.SLAB_DOUBLE);
    expect(s.inventory.total(Item.SLAB)).toBe(8);
    // 3) lateral alta da laje dupla (hy 0,8) → laje superior na célula vizinha
    expect(placeFromSlot(s, { x: bx, y: 65, z: bz, nx: 1, ny: 0, nz: 0, hy: 0.8 }, 0).ok).toBe(true);
    expect(s.volume.get(bx + 1, 65, bz)).toBe(T.SLAB_TOP);
    // 4) lateral baixa (hy 0,2) → inferior
    expect(placeFromSlot(s, { x: bx, y: 65, z: bz, nx: 0, ny: 0, nz: 1, hy: 0.2 }, 0).ok).toBe(true);
    expect(s.volume.get(bx, 65, bz + 1)).toBe(T.SLAB);
    // 5) face de baixo de um bloco → superior na célula de baixo; e fundir por baixo na laje superior
    expect(placeFromSlot(s, { x: bx + 1, y: 65, z: bz, nx: 0, ny: -1, nz: 0, hy: 0 }, 0).ok).toBe(true); // por baixo da laje superior: funde
    expect(s.volume.get(bx + 1, 65, bz)).toBe(T.SLAB_DOUBLE);
    expect(s.inventory.total(Item.SLAB)).toBe(5);
    await flush(st, s);
    const r = await openSession(st, null, () => 1);
    expect(r.volume.get(bx, 65, bz)).toBe(T.SLAB_DOUBLE); expect(r.volume.get(bx + 1, 65, bz)).toBe(T.SLAB_DOUBLE); expect(r.volume.get(bx, 65, bz + 1)).toBe(T.SLAB);
    // quebrar a dupla devolve 2 lajes
    const antes = r.inventory.total(Item.SLAB);
    expect(breakOrCollect(r, { x: bx, y: 65, z: bz, nx: 0, ny: 1, nz: 0 }).ok).toBe(true);
    expect(r.inventory.total(Item.SLAB)).toBe(antes + 2);
    expect(breakOrCollect(r, { x: bx, y: 65, z: bz + 1, nx: 0, ny: 1, nz: 0 }).ok).toBe(true);
    expect(r.inventory.total(Item.SLAB)).toBe(antes + 3);
  });

  it('não funde por cima do corpo do jogador, e a laje dupla com a mochila sem espaço para 2 fica no lugar', async () => {
    const s = await openSession(new MemoryTitanStorage(), 42, () => 1, undefined, 5);
    s.inventory.add(Item.SLAB, 2);
    const slot = [...Array(SLOTS).keys()].find((i) => s.inventory.get(i)?.item === Item.SLAB)!;
    s.inventory.move(slot, 0);
    const a = s.volume.gen.arrival, bx = Math.floor(a.x) + 3, bz = Math.floor(a.z);
    s.volume.place(bx, 65, bz, T.SLAB);
    s.body.x = bx + 0.5; s.body.z = bz + 0.5; s.body.y = 65.5; // de pé sobre a laje inferior
    expect(placeFromSlot(s, { x: bx, y: 65, z: bz, nx: 0, ny: 1, nz: 0, hy: 0.5 }, 0).ok).toBe(false); // a metade de cima invadiria o corpo
    expect(s.volume.get(bx, 65, bz)).toBe(T.SLAB);
    s.body.x = bx + 5.5; // fora do caminho
    s.volume.set(bx, 65, bz, T.SLAB_DOUBLE);
    s.inventory.consume(0); s.inventory.consume(0); // esvazia as lajes que sobraram
    s.inventory.add(Item.SLAB, 63);
    let n = 0; while (s.inventory.canAdd(Item.SAND) && n++ < 5000) s.inventory.add(Item.SAND, 1); // o resto da mochila cheio de areia
    expect(s.inventory.canAdd(Item.SLAB, 1)).toBe(true); expect(s.inventory.canAdd(Item.SLAB, 2)).toBe(false); // cabe 1 laje, não 2
    expect(breakOrCollect(s, { x: bx, y: 65, z: bz, nx: 0, ny: 1, nz: 0 })).toEqual({ ok: false, msg: 'Mochila cheia' }); // a dupla devolve 2: fica no lugar
    expect(s.volume.get(bx, 65, bz)).toBe(T.SLAB_DOUBLE);
  });
});
