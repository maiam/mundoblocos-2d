import { describe, expect, it } from 'vitest';
import { collectNearby, placeFromSlot, restDrop } from './actions';
import { DROP_GRAVITY, DROP_TERMINAL, applyDisplace, heightOf, planDisplace, restY, settleDrops, stepDrops } from './drops';
import { Item } from './items';
import { MemoryTitanStorage } from './save';
import { openSession, visibleItems } from './session';
import { T } from './voxel';

/** Física dos itens soltos (ADR 0098): gravidade com queda real e deslocamento ao colocar bloco. */
const open = async () => openSession(new MemoryTitanStorage(), 42, () => 1, undefined, 2);
type S = Awaited<ReturnType<typeof openSession>>;
const Y = 150;
/** Plataforma de rocha 9 × 9 em Y − 1 (o chão) e ar em volta até Y + 8; devolve o centro. */
const arena = (s: S) => {
  const a = s.volume.gen.arrival, x = Math.floor(a.x) + 6, z = Math.floor(a.z) + 6;
  for (let dx = -4; dx <= 4; dx++) for (let dz = -4; dz <= 4; dz++) { s.volume.set(x + dx, Y - 1, z + dz, T.DARK_ROCK); for (let yy = Y; yy < Y + 9; yy++) s.volume.set(x + dx, yy, z + dz, T.AIR); }
  return { x, z };
};
const hold = (s: S, item: number): number => { s.inventory.add(item, 5); const k = [...Array(36).keys()].find((i) => s.inventory.get(i)?.item === item)!; s.inventory.move(k, 0); s.selected = 0; return 0; };
const farBody = (s: S, x: number, z: number): void => { s.body.x = x + 20.5; s.body.z = z + 20.5; s.body.y = Y; };

describe('gravidade dos itens soltos', () => {
  it('um item no ar cai acelerando e pousa no apoio; repousando, não tem estado de queda', async () => {
    const s = await open(); const { x, z } = arena(s);
    restDrop(s, 'g:1', Item.EMBER, x, Y + 6, z, 1);
    expect(s.drops.get('g:1')!.y).toBe(Y + 6); // nasce no ar: não aparece no chão
    expect(restY(s, x, Y + 6, z)).toBe(Y);
    stepDrops(s, 0.2); const h1 = heightOf(s, s.drops.get('g:1')!);
    stepDrops(s, 0.2); const h2 = heightOf(s, s.drops.get('g:1')!);
    expect(h1).toBeLessThan(Y + 6); expect(h2).toBeLessThan(h1);
    expect(Math.abs(Y + 6 - h1 - 0.5 * DROP_GRAVITY * 0.04)).toBeLessThan(0.15); // a queda acelera (d ≈ ½ g t²; o passo discreto passa um pouco)
    expect(h1 - h2).toBeGreaterThan(Y + 6 - h1); // o segundo intervalo cobre mais chão que o primeiro
    for (let i = 0; i < 20; i++) stepDrops(s, 0.1);
    expect(s.drops.get('g:1')!.y).toBe(Y); expect(s.dropFx.get('g:1')?.fy).toBeUndefined(); expect(heightOf(s, s.drops.get('g:1')!)).toBe(Y);
    expect(stepDrops(s, 0.5)).toBe(false); // pousado: nada mais se mexe
  });
  it('a velocidade de queda tem teto e uma queda longa dura o esperado', async () => {
    const s = await open(); const { x, z } = arena(s);
    restDrop(s, 'g:2', Item.EMBER, x, Y + 8, z, 1);
    let t = 0; while (s.drops.get('g:2')!.y > Y && t < 5) { stepDrops(s, 0.05); t += 0.05; }
    expect(t).toBeGreaterThan(0.7); expect(t).toBeLessThan(1); // ≈ √(2·8/22) = 0,85 s
    expect(DROP_TERMINAL).toBeGreaterThan(DROP_GRAVITY);
  });
  it('tirar o apoio de um item que repousa o faz cair; na água ele afunda bem mais devagar', async () => {
    const s = await open(); const { x, z } = arena(s);
    restDrop(s, 'g:3', Item.EMBER, x, Y, z, 1); settleDrops(s);
    s.volume.set(x, Y - 1, z, T.AIR); s.volume.set(x, Y - 2, z, T.AIR); s.volume.set(x, Y - 3, z, T.AIR); s.volume.set(x, Y - 4, z, T.DARK_ROCK);
    expect(stepDrops(s, 0.1)).toBe(true); expect(heightOf(s, s.drops.get('g:3')!)).toBeLessThan(Y);
    let dry = 0; while (s.drops.get('g:3')!.y > Y - 3 && dry < 5) { stepDrops(s, 0.05); dry += 0.05; }
    // o mesmo vão cheio de líquido: o item afunda mais devagar
    s.volume.set(x + 1, Y - 1, z, T.AIR); s.volume.set(x + 1, Y - 2, z, T.AIR); s.volume.set(x + 1, Y - 3, z, T.AIR); s.volume.set(x + 1, Y - 4, z, T.DARK_ROCK);
    for (let yy = Y - 3; yy <= Y; yy++) s.volume.set(x + 1, yy, z, T.LAKE);
    restDrop(s, 'g:4', Item.EMBER, x + 1, Y, z, 1);
    let wet = 0; while (s.drops.get('g:4')!.y > Y - 3 && wet < 10) { stepDrops(s, 0.05); wet += 0.05; }
    expect(wet).toBeGreaterThan(dry * 1.8);
  });
  it('o item em queda é desenhado na altura real e a coleta (sem dt) pousa tudo de uma vez', async () => {
    const s = await open(); const { x, z } = arena(s); farBody(s, x, z);
    restDrop(s, 'g:5', Item.EMBER, x, Y + 5, z, 1);
    stepDrops(s, 0.15);
    const v = visibleItems(s).find((i) => i.id === 'g:5')!;
    expect(v.y).toBeLessThan(Y + 5); expect(v.y).toBeGreaterThan(Y);
    collectNearby(s, x + 20.5, Y, z + 20.5); // dt = 0: pousa na hora (testes e leitura de partida)
    expect(s.drops.get('g:5')!.y).toBe(Y);
  });
  it('quando o item cai e chega perto do jogador ele ainda pode ser recolhido depois de pousar', async () => {
    const s = await open(); const { x, z } = arena(s);
    restDrop(s, 'g:6', Item.EMBER, x, Y + 4, z, 1);
    for (let i = 0; i < 40; i++) collectNearby(s, x + 0.5, Y, z + 0.5, 0.05);
    expect(s.drops.has('g:6')).toBe(false); expect(s.inventory.total(Item.EMBER)).toBeGreaterThanOrEqual(1);
  });
});

describe('deslocamento do item quando um bloco é colocado na célula dele', () => {
  const place = (s: S, x: number, z: number) => placeFromSlot(s, { x, y: Y - 1, z, nx: 0, ny: 1, nz: 0 }, 0); // bloco na célula (x, Y, z)
  it('o bloco entra e o item vai para uma vizinha livre (e continua recolhível)', async () => {
    const s = await open(); const { x, z } = arena(s); farBody(s, x, z); hold(s, Item.DARK_ROCK);
    restDrop(s, 'g:7', Item.EMBER, x, Y, z, 1); settleDrops(s);
    expect(place(s, x, z).ok).toBe(true);
    expect(s.volume.get(x, Y, z)).toBe(T.DARK_ROCK);
    const d = s.drops.get('g:7')!;
    expect(d.y).toBe(Y); expect(Math.abs(d.x - x) + Math.abs(d.z - z)).toBe(1); // uma célula ao lado, no mesmo nível
    expect(s.inventory.total(Item.DARK_ROCK)).toBe(4); // gastou 1 bloco e não perdeu o item
    expect(collectNearby(s, d.x + 0.5, Y, d.z + 0.5).collected).toBe(1);
  });
  it('vários itens na célula saem para vizinhas livres, e o deslocado cai se não houver apoio', async () => {
    const s = await open(); const { x, z } = arena(s); farBody(s, x, z); hold(s, Item.DARK_ROCK);
    for (let i = 0; i < 4; i++) restDrop(s, `g:a${i}`, Item.EMBER, x, Y, z, 1);
    settleDrops(s);
    // abre um poço ao lado de um lado só: o item que for para lá cai
    s.volume.set(x + 1, Y - 1, z, T.AIR); s.volume.set(x + 1, Y - 2, z, T.AIR); s.volume.set(x + 1, Y - 3, z, T.DARK_ROCK);
    expect(place(s, x, z).ok).toBe(true);
    for (let i = 0; i < 4; i++) { const d = s.drops.get(`g:a${i}`)!; expect(d.x === x && d.z === z && d.y === Y).toBe(false); }
    for (let i = 0; i < 30; i++) stepDrops(s, 0.1);
    for (let i = 0; i < 4; i++) { const d = s.drops.get(`g:a${i}`)!; expect(d.y).toBe(restY(s, d.x, d.y, d.z)); }
  });
  it('com as quatro vizinhas ocupadas o item sobe para cima do bloco novo; sem nenhum lugar a colocação é recusada sem mudar nada', async () => {
    const s = await open(); const { x, z } = arena(s); farBody(s, x, z); hold(s, Item.DARK_ROCK);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) s.volume.set(x + dx, Y, z + dz, T.DARK_ROCK);
    restDrop(s, 'g:8', Item.EMBER, x, Y, z, 1); settleDrops(s);
    expect(place(s, x, z).ok).toBe(true);
    expect(s.drops.get('g:8')).toMatchObject({ x, z, y: Y + 1 }); // em cima do bloco que entrou
    // sem lugar: o teto também fechado
    const t = await open(); const c = arena(t); farBody(t, c.x, c.z); hold(t, Item.DARK_ROCK);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) t.volume.set(c.x + dx, Y, c.z + dz, T.DARK_ROCK);
    t.volume.set(c.x, Y + 1, c.z, T.DARK_ROCK); t.volume.set(c.x, Y + 2, c.z, T.DARK_ROCK);
    restDrop(t, 'g:9', Item.EMBER, c.x, Y, c.z, 1); settleDrops(t);
    const before = t.inventory.total(Item.DARK_ROCK);
    const r = place(t, c.x, c.z);
    expect(r.ok).toBe(false); expect(r.msg).toMatch(/item/); expect(t.volume.get(c.x, Y, c.z)).toBe(T.AIR);
    expect(t.inventory.total(Item.DARK_ROCK)).toBe(before); expect(t.drops.get('g:9')).toMatchObject({ x: c.x, y: Y, z: c.z });
  });
  it('o plano não muda nada até ser aplicado', async () => {
    const s = await open(); const { x, z } = arena(s);
    restDrop(s, 'g:10', Item.EMBER, x, Y, z, 1); settleDrops(s);
    const plan = planDisplace(s, [[x, Y, z]])!;
    expect(plan.has('g:10')).toBe(true); expect(s.drops.get('g:10')).toMatchObject({ x, y: Y, z });
    applyDisplace(s, plan); const to = plan.get('g:10')!; expect(s.drops.get('g:10')).toMatchObject(to);
  });
});
