import { describe, expect, it } from 'vitest';
import { flush, generatorFor, openSession, UnsupportedVersionError } from './session';
import { MemoryTitanStorage } from './save';
import { collides } from './physics';
import { T } from './voxel';
import { TitanGenerator } from './generator';

describe('sessão e save do Titã', () => {
  it('primeira visita sorteia a seed; sem ?seed= continua a última; ?seed= abre a partida daquela seed', async () => {
    const st = new MemoryTitanStorage();
    const a = await openSession(st, null, () => 555);
    expect(a.seed).toBe(555);
    expect(a.resumed).toBe(false);
    await flush(st, a);
    const b = await openSession(st, null, () => 999); // não sorteia de novo
    expect(b.seed).toBe(555);
    expect(b.resumed).toBe(true);
    const c = await openSession(st, 42, () => 999);
    expect(c.seed).toBe(42);
    expect(c.resumed).toBe(false);
  });

  it('reabrir preserva posição, direção, edições (remoção explícita e bloco colocado) e o líquido da bacia', async () => {
    const st = new MemoryTitanStorage();
    const s = await openSession(st, 42, () => 1);
    const a = s.volume.gen.arrival;
    const bx = Math.floor(a.x), bz = Math.floor(a.z);
    s.volume.remove(bx, 64, bz); // praia removida
    s.volume.place(bx + 1, 65, bz, T.DARK_ROCK);
    s.volume.place(15, 150, 0, T.FROST); // na divisa de chunks
    s.volume.place(16, 150, 0, T.SAND);
    s.body.x = a.x + 0.25; s.body.y = 65; s.body.z = a.z; s.yaw = 1.2; s.pitch = -0.3; s.selected = 2;
    await flush(st, s);
    const r = await openSession(st, null, () => 1);
    expect(r.resumed).toBe(true);
    expect(r.volume.get(bx, 64, bz)).toBe(T.AIR);
    expect(r.volume.get(bx + 1, 65, bz)).toBe(T.DARK_ROCK);
    expect(r.volume.get(15, 150, 0)).toBe(T.FROST);
    expect(r.volume.get(16, 150, 0)).toBe(T.SAND);
    expect(r.body.x).toBeCloseTo(a.x + 0.25);
    expect([r.yaw, r.pitch, r.selected]).toEqual([1.2, -0.3, 2]);
    expect(r.relocated).toBe(false);
    // coloca e retira na bacia, grava de novo: nenhum delta sobra e a célula é líquida
    let lx = 0, lz = 0, found = false;
    for (let z = -32; z < 32 && !found; z++) for (let x = -32; x < 32 && !found; x++) if (r.volume.get(x, 63, z) === T.LAKE) { lx = x; lz = z; found = true; }
    r.volume.place(lx, 63, lz, T.SAND); await flush(st, r);
    r.volume.remove(lx, 63, lz); await flush(st, r);
    const r2 = await openSession(st, null, () => 1);
    expect(r2.volume.get(lx, 63, lz)).toBe(T.LAKE);
    expect(r2.volume.get(bx, 64, bz)).toBe(T.AIR); // a remoção da praia permaneceu
  });

  it('posição gravada obstruída reabre em posição segura', async () => {
    const st = new MemoryTitanStorage();
    const s = await openSession(st, 42, () => 1);
    s.body.x = 3; s.body.y = 40; s.body.z = 3; // dentro da rocha
    await flush(st, s);
    const r = await openSession(st, null, () => 1);
    expect(r.relocated).toBe(true);
    expect(collides(r.volume, r.body.x, r.body.y, r.body.z)).toBe(false);
  });

  it('falha de gravação mantém o estado sujo e o último estado confirmado', async () => {
    const st = new MemoryTitanStorage();
    const s = await openSession(st, 42, () => 1);
    const a = s.volume.gen.arrival;
    s.volume.remove(Math.floor(a.x), 64, Math.floor(a.z));
    await flush(st, s);
    s.volume.place(Math.floor(a.x) + 1, 65, Math.floor(a.z), T.SAND);
    st.failNext = true;
    await expect(flush(st, s)).rejects.toThrow();
    expect(s.volume.hasDirty).toBe(true);
    const r = await openSession(st, 42, () => 1);
    expect(r.volume.get(Math.floor(a.x) + 1, 65, Math.floor(a.z))).toBe(T.AIR); // só a última gravação confirmada
    await flush(st, s); // a próxima tentativa grava
    expect((await openSession(st, 42, () => 1)).volume.get(Math.floor(a.x) + 1, 65, Math.floor(a.z))).toBe(T.SAND);
  });

  it('versão de gerador desconhecida não é reinterpretada', async () => {
    const st = new MemoryTitanStorage();
    const s = await openSession(st, 42, () => 1);
    await flush(st, s);
    st.games.get(42)!.generatorVersion = 99;
    await expect(openSession(st, 42, () => 1)).rejects.toBeInstanceOf(UnsupportedVersionError);
    expect(generatorFor(42, 1)).toBeInstanceOf(TitanGenerator);
  });
});
