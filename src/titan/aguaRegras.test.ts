import { describe, expect, it } from 'vitest';
import { breakOrCollect } from './actions';
import { newBody, stepBody, waterLedge, LEDGE_REACH, type Body } from './physics';
import { MemoryTitanStorage } from './save';
import { openSession } from './session';
import { T } from './voxel';

/** Regras da água (ADR 0099): pular encostado num bloco até 1 nível acima tira o jogador da água; quebrar bloco ao lado da água enche o espaço. */
const open = async () => openSession(new MemoryTitanStorage(), 42, () => 1, undefined, 2);
type S = Awaited<ReturnType<typeof openSession>>;
const Y = 150;
/** Poço de água (2 células de fundo, superfície em Y) cercado por um paredão; no lado +x há um degrau de `up` blocos acima da água. Devolve a célula do poço. */
const pool = (s: S, up: number) => {
  const a = s.volume.gen.arrival, x = Math.floor(a.x) + 6, z = Math.floor(a.z) + 6, v = s.volume;
  for (let dx = -3; dx <= 4; dx++) for (let dz = -3; dz <= 3; dz++) for (let yy = Y - 4; yy < Y + 6; yy++) v.set(x + dx, yy, z + dz, yy < Y - 3 ? T.DARK_ROCK : T.AIR);
  for (let dx = -3; dx <= 0; dx++) for (let dz = -3; dz <= 3; dz++) { v.set(x + dx, Y - 3, z + dz, T.DARK_ROCK); v.set(x + dx, Y - 2, z + dz, T.LAKE); v.set(x + dx, Y - 1, z + dz, T.LAKE); }
  for (let dx = 1; dx <= 4; dx++) for (let dz = -3; dz <= 3; dz++) for (let yy = Y - 3; yy < Y + up; yy++) v.set(x + dx, yy, z + dz, T.DARK_ROCK); // a margem (4 de largura): sobe `up` acima da água (topo em Y + up)
  return { x, z };
};
const inWater = (s: S, x: number, z: number, px = 0.69, py = Y - 0.6): Body => { const b = newBody(x + px, py, z + 0.5); stepBody(s.volume, b, { dirX: 0, dirZ: 0, jump: false }, 0.02); return b; };
/** Aperta pular só no começo (um toque) e segue empurrando `secs` segundos. */
const run = (s: S, b: Body, dirX: number, dirZ: number, jump: boolean, secs: number): void => { for (let t = 0; t < secs; t += 0.025) stepBody(s.volume, b, { dirX, dirZ, jump: jump && t < 0.1 }, 0.025); };

describe('sair da água pulando encostado num bloco até 1 nível acima', () => {
  it('na superfície, encostado num degrau 1 acima da água, pular + empurrar põe o jogador em cima', async () => {
    const s = await open(); const { x, z } = pool(s, 1); const b = inWater(s, x, z);
    expect(b.inLiquid).toBe(true);
    expect(waterLedge(s.volume, b, 1, 0)).toMatchObject({ dx: 1, dz: 0, ledge: Y + 1 });
    let up = false; for (let t = 0; t < 1.5; t += 0.025) { stepBody(s.volume, b, { dirX: 1, dirZ: 0, jump: t < 0.1 }, 0.025); if (b.onGround && !b.inLiquid && b.x > x + 1 && Math.abs(b.y - (Y + 1)) < 0.05) up = true; }
    expect(up).toBe(true); // em algum momento pousou na margem (depois seguiu andando por ela)
  });
  it('pular sem empurrar também funciona (o pulo leva o corpo para o degrau ao lado)', async () => {
    const s = await open(); const { x, z } = pool(s, 1); const b = inWater(s, x, z);
    run(s, b, 0, 0, true, 2);
    expect(b.onGround).toBe(true); expect(b.x).toBeGreaterThan(x + 1); expect(b.y).toBeCloseTo(Y + 1, 1);
  });
  it('mais de 1 nível acima da célula dos pés, ou com os pés uma célula mais fundo, não alcança', async () => {
    const s = await open(); const { x, z } = pool(s, 1);
    const fundo = inWater(s, x, z, 0.69, Y - 1.3); // pés uma célula abaixo da superfície: o topo do degrau (Y + 1) fica 2 níveis acima da célula deles
    expect(waterLedge(s.volume, fundo, 1, 0)).toBeNull();
    const t = await open(); const c = pool(t, 2); const b = inWater(t, c.x, c.z); // degrau com topo em Y + 2: 2 níveis acima da célula dos pés
    expect(waterLedge(t.volume, b, 1, 0)).toBeNull();
    run(t, b, 1, 0, true, 2);
    expect(b.x).toBeLessThan(c.x + 1); expect(b.y).toBeLessThan(Y + 1);
    expect(LEDGE_REACH).toBe(1);
  });
  it('sem encostar na parede, o pulo é o de nadar (sem pulo de saída); sem espaço em cima do degrau, também não', async () => {
    const s = await open(); const { x, z } = pool(s, 1);
    const longe = inWater(s, x, z, 0.4); // a 0,3 m da parede: não encostou
    expect(waterLedge(s.volume, longe, 1, 0)).toBeNull();
    s.volume.set(x + 1, Y + 1, z, T.DARK_ROCK); s.volume.set(x + 1, Y + 2, z, T.DARK_ROCK); // degrau de 3 acima: sem alcance
    const b = inWater(s, x, z);
    expect(waterLedge(s.volume, b, 1, 0)).toBeNull();
    const t = await open(); const c = pool(t, 1);
    t.volume.set(c.x + 1, Y + 1, c.z, T.DARK_ROCK); // um bloco a mais: o topo vira Y + 2 (fora do alcance)
    expect(waterLedge(t.volume, inWater(t, c.x, c.z), 1, 0)).toBeNull();
  });
  it('fora da água não há pulo de saída', async () => {
    const s = await open(); const { x, z } = pool(s, 1);
    const b = newBody(x + 0.69, Y + 3, z + 0.5); b.inLiquid = false;
    expect(waterLedge(s.volume, b, 1, 0)).toBeNull();
  });
});

describe('quebrar bloco ao lado da água enche o espaço de água', () => {
  const hit = (x: number, y: number, z: number) => ({ x, y, z, nx: 0, ny: 1, nz: 0 });
  it('remover sólido com água num dos quatro lados do mesmo nível vira água; sem água ao lado, vira ar', async () => {
    const s = await open(); const { x, z } = pool(s, 1), v = s.volume;
    // o bloco do paredão em (x + 1, Y − 1, z) toca a água de (x, Y − 1, z): ao ser removido, enche
    expect(v.get(x, Y - 1, z)).toBe(T.LAKE);
    expect(v.remove(x + 1, Y - 1, z)).toBe(true); expect(v.get(x + 1, Y - 1, z)).toBe(T.LAKE);
    // e o próximo, agora ao lado desta água nova, também enche (cadeia ao escavar)
    v.remove(x + 2, Y - 1, z); expect(v.get(x + 2, Y - 1, z)).toBe(T.LAKE);
    // longe da água: ar
    v.set(x + 3, Y + 3, z, T.DARK_ROCK); v.remove(x + 3, Y + 3, z); expect(v.get(x + 3, Y + 3, z)).toBe(T.AIR);
  });
  it('só conta a água do mesmo nível: água só em cima ou embaixo não enche', async () => {
    const s = await open(); const { x, z } = pool(s, 1), v = s.volume;
    v.set(x - 1, Y, z, T.DARK_ROCK); // bloco em Y com água logo embaixo e nada ao lado no nível Y
    v.set(x - 1, Y, z + 1, T.AIR);
    v.remove(x - 1, Y, z); expect(v.get(x - 1, Y, z)).toBe(T.AIR);
    v.set(x - 1, Y - 2, z - 3, T.DARK_ROCK); // bloco no nível da água com água vizinha: enche
    v.remove(x - 1, Y - 2, z - 3); expect(v.get(x - 1, Y - 2, z - 3)).toBe(T.LAKE);
  });
  it('quebrar pelo jogo: o bloco some, o espaço enche e o item solto afunda na água', async () => {
    const s = await open(); const { x, z } = pool(s, 1), v = s.volume;
    s.body.x = x - 2.5; s.body.z = z + 20; s.body.y = Y + 5; // longe do poço
    const r = breakOrCollect(s, hit(x + 1, Y - 1, z));
    expect(r.ok).toBe(true); expect(v.get(x + 1, Y - 1, z)).toBe(T.LAKE);
    expect([...s.drops.values()].some((d) => d.x === x + 1 && d.z === z)).toBe(true); // o item caiu na célula agora cheia de água
  });
  it('lanterna e esteira ao lado da água não enchem o espaço ao serem removidas', async () => {
    const s = await open(); const { x, z } = pool(s, 1), v = s.volume;
    v.set(x + 1, Y, z + 1, T.LANTERN); v.remove(x + 1, Y, z + 1); expect(v.get(x + 1, Y, z + 1)).toBe(T.AIR);
  });
});
