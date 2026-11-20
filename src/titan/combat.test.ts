import { describe, expect, it } from 'vitest';
import { ATTACK_REACH, attackCreature, damageOf, FIST_DAMAGE, LOOT, RESPAWN_S, tickRespawn } from './combat';
import { creatureAim, hitSphere, hurtFarejador, KINDS, stepFarejador } from './creature';
import { COOK_TIME_S, newFurnace, tickFurnace } from './furnace';
import { foodOf, Item } from './items';
import { MemoryTitanStorage } from './save';
import { flush, openSession } from './session';

async function open() {
  const st = new MemoryTitanStorage();
  const s = await openSession(st, 42, () => 1);
  return { st, s };
}
const slotOf = (s: { inventory: { get(i: number): { item: number } | null } }, item: number): number => Array.from({ length: 9 }, (_, i) => i).find((i) => s.inventory.get(i)?.item === item)!;

describe('combate com os Farejadores (ADR 0069)', () => {
  it('dano por arma: adaga de cobre 6, de rocha 4, picareta 2/3, punho 1; vida 10 e 30', () => {
    expect(damageOf(Item.COPPER_DAGGER)).toBe(6); expect(damageOf(Item.STONE_DAGGER)).toBe(4); expect(damageOf(Item.STONE_PICK)).toBe(2); expect(damageOf(Item.COPPER_PICK)).toBe(3);
    expect(damageOf(undefined)).toBe(FIST_DAMAGE); expect(damageOf(Item.SAND)).toBe(FIST_DAMAGE);
    expect(KINDS.pequeno.hp).toBe(10); expect(KINDS.grande.hp).toBe(30); expect(LOOT.grande.meat).toBeGreaterThan(LOOT.pequeno.meat);
  });
  it('mira: acerta o animal na frente a até 3 m, não além, não atrás nem por trás de um bloco; o mais perto vence', async () => {
    const { s } = await open();
    const [g, q] = s.creatures; g.body.x = 10; g.body.y = 66; g.body.z = 0; q.body.x = 10; q.body.y = 66; q.body.z = 4;
    const ey = 66 + 1.62, sg = hitSphere(g);
    const aim = (ox: number, dist = Infinity, dz = 0) => creatureAim([g, q], ox, ey, 0, 1, (sg.y - ey) / 6, dz, ATTACK_REACH, dist);
    expect(aim(10 - 2.5)).toMatchObject({ index: 0 });
    expect(aim(10 - 6)).toBeNull(); // longe demais
    expect(aim(10 - 2.5, 1)).toBeNull(); // um bloco a 1 m na frente esconde
    expect(creatureAim([g], 10 - 2.5, ey, 0, -1, 0, 0, ATTACK_REACH)).toBeNull(); // de costas para ele
    const both = creatureAim([g, q], 10, ey, 0, 0, 0.0, 1, 4.5); // olhando ao longo de Z: o grande está colado e o pequeno a 4 m
    expect(both?.index).toBe(0);
  });
  it('golpe provoca: investe mesmo fora do alcance de visão por 8 s; a vida cai e não passa de zero', async () => {
    const { s } = await open();
    const f = s.creatures[0], hp0 = f.hp;
    const far = { x: f.home.x, y: f.body.y, z: f.home.z + 14 }; // além dos 11 m do grande
    for (let t = 0; t < 2; t += 0.05) stepFarejador(f, s.volume, far, 0.05); expect(f.phase).not.toBe('charge');
    expect(hurtFarejador(f, 4)).toEqual({ dead: false }); expect(f.hp).toBe(hp0 - 4); expect(f.aggro).toBe(8);
    stepFarejador(f, s.volume, far, 0.05); expect(f.phase).toBe('charge');
    expect(hurtFarejador(f, 999).dead).toBe(true); expect(f.hp).toBe(0);
  });
  it('3 golpes de adaga de rocha abatem o pequeno: espólio de 1 carne + 1 placa no chão, a adaga gasta 1 por golpe, e a volta é agendada e vai no save', async () => {
    const { st, s } = await open();
    s.inventory.add(Item.STONE_DAGGER); s.selected = slotOf(s, Item.STONE_DAGGER);
    const idx = s.creatures.findIndex((c) => c.kind === 'pequeno');
    expect(attackCreature(s, idx).dead).toBe(false); expect(attackCreature(s, idx).dead).toBe(false);
    const r = attackCreature(s, idx);
    expect(r.dead).toBe(true); expect(r.loot).toEqual(LOOT.pequeno); expect(r.msg).toBe('Farejador pequeno abatido: 1 porção de carne e 1 placa');
    expect(s.inventory.get(s.selected)!.wear).toBe(3); // −1 por golpe (uso correto)
    expect(s.creatures.map((c) => c.kind)).toEqual(['grande']); expect(s.respawn.get('pequeno')).toBe(RESPAWN_S);
    const meat = [...s.drops.values()].find((d) => d.item === Item.RAW_MEAT)!, plate = [...s.drops.values()].find((d) => d.item === Item.PLATE)!;
    expect(meat.count ?? 1).toBe(1); expect(plate.count ?? 1).toBe(1);
    await flush(st, s);
    const o = await openSession(st, null, () => 1); // reabrir: o abatido não reaparece de graça
    expect(o.creatures.map((c) => c.kind)).toEqual(['grande']); expect(o.respawn.get('pequeno')).toBe(RESPAWN_S);
    expect(tickRespawn(o, RESPAWN_S - 1)).toHaveLength(0); expect(o.creatures).toHaveLength(1);
    const back = tickRespawn(o, 2);
    expect(back.map((c) => c.kind)).toEqual(['pequeno']); expect(o.creatures).toHaveLength(2); expect(o.respawn.size).toBe(0); expect(back[0].hp).toBe(KINDS.pequeno.hp);
  });
  it('o grande leva 8 golpes de adaga de rocha (30 / 4) e solta 2 carnes; picareta golpeando gasta 2 e o punho vale 1; a arma quebra no meio da luta e avisa', async () => {
    const { s } = await open();
    s.inventory.add(Item.COPPER_PICK); s.selected = slotOf(s, Item.COPPER_PICK);
    const idx = s.creatures.findIndex((c) => c.kind === 'grande');
    attackCreature(s, idx); expect(s.inventory.get(s.selected)!.wear).toBe(2); expect(s.creatures[idx].hp).toBe(27);
    s.inventory.consume(s.selected); s.selected = 8; // mão vazia: punho
    attackCreature(s, idx); expect(s.creatures[idx].hp).toBe(26);
    s.inventory.add(Item.STONE_DAGGER); s.selected = slotOf(s, Item.STONE_DAGGER); s.inventory.damage(s.selected, 130); // falta 1 ponto
    const r = attackCreature(s, idx);
    expect(r.broken).toBe(true); expect(r.msg).toBe('Adaga de Rocha quebrou'); expect(s.inventory.get(s.selected)).toBeNull(); expect(s.creatures[idx].hp).toBe(22); // o golpe ainda vale
    s.creatures[idx].hp = 3;
    const k = attackCreature(s, idx); // punho (3 → 2)... mão vazia
    expect(k.dead).toBe(false);
    s.creatures[idx].hp = 1; expect(attackCreature(s, idx).dead).toBe(true);
    const meat = [...s.drops.values()].find((d) => d.item === Item.RAW_MEAT)!; expect(meat.count).toBe(2);
  });
  it('comida: carne crua 2, assada 8 (saturação 12,8); o braseiro assa 1 crua em 10 s com brasa', () => {
    expect(foodOf(Item.RAW_MEAT)).toEqual({ hunger: 2, saturation: 1.2 }); expect(foodOf(Item.COOKED_MEAT)).toEqual({ hunger: 8, saturation: 12.8 });
    const f = newFurnace(); f.input = { item: Item.RAW_MEAT, count: 2 }; f.fuel = { item: Item.EMBER, count: 1 };
    for (let t = 0; t < COOK_TIME_S + 0.5; t += 0.1) tickFurnace(f, 0.1);
    expect(f.output).toEqual({ item: Item.COOKED_MEAT, count: 1 }); expect(f.input!.count).toBe(1);
  });
  it('dois abates no mesmo instante não perdem o espólio (ids distintos)', async () => {
    const { s } = await open();
    const [a, b] = s.creatures; a.kind = b.kind = 'pequeno'; a.clock = b.clock = 5; a.hp = b.hp = 1;
    attackCreature(s, 0); attackCreature(s, 0);
    expect([...s.drops.values()].filter((d) => d.item === Item.RAW_MEAT)).toHaveLength(2);
  });
  it('mira: o pequeno colado no grande (nascem na mesma célula) é acertado quando se mira nele; a ajuda de mira pega o animal rente aos pés, na frente, e só ele', async () => {
    const { s } = await open();
    const [g, q] = s.creatures; expect([g.kind, q.kind]).toEqual(['grande', 'pequeno']);
    g.body.x = q.body.x = 10; g.body.y = q.body.y = 66; g.body.z = q.body.z = 0; // a toca: os dois no mesmo ponto
    const ey = 66 + 1.62, sq = hitSphere(q), len = Math.hypot(6, sq.y - ey);
    expect(creatureAim([g, q], 4, ey, 0, 6 / len, (sq.y - ey) / len, 0, ATTACK_REACH + 3)).toMatchObject({ index: 1 }); // mirando no centro do pequeno
    const sg = hitSphere(g), lg = Math.hypot(6, sg.y + 0.9 - ey);
    expect(creatureAim([g, q], 4, ey, 0, 6 / lg, (sg.y + 0.9 - ey) / lg, 0, ATTACK_REACH + 3)).toMatchObject({ index: 0 }); // mirando no alto do grande
    // rente aos pés: o pequeno a 0,5 m, olhar quase na horizontal para baixo (a esfera dele fica abaixo do raio)
    q.body.x = 10.5; q.body.z = 0; g.body.x = 40; const pitch = -0.55, d = [Math.cos(pitch), Math.sin(pitch), 0];
    expect(creatureAim([q], 10, ey, 0, d[0], d[1], d[2], ATTACK_REACH)).toMatchObject({ index: 0 });
    expect(creatureAim([q], 10, ey, 0, -d[0], d[1], d[2], ATTACK_REACH)).toBeNull(); // de costas para ele
    q.body.x = 14; expect(creatureAim([q], 10, ey, 0, d[0], d[1], d[2], ATTACK_REACH)).toBeNull(); // longe demais (nem esfera nem ajuda)
    q.body.x = 10.5; expect(creatureAim([q], 10, ey, 0, d[0], d[1], d[2], ATTACK_REACH, 0.3)).toBeNull(); // bloco na frente esconde
  });
});
