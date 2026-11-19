import { describe, expect, it } from 'vitest';
import { flush, generatorFor, openSession, UnsupportedVersionError } from './session';
import { MemoryTitanStorage, type ChunkRecord, type TitanHeader } from './save';
import { initialSections } from './sections';
import { meshSection } from './mesher';
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

  it('edição feita durante a gravação continua pendente e entra na próxima (sem perder o segundo bloco)', async () => {
    // armazenamento com a transação "pendurada" até o teste liberar
    class SlowStorage extends MemoryTitanStorage {
      release!: () => void;
      private readonly gate = new Promise<void>((r) => { this.release = r; });
      override async commit(h: TitanHeader, puts: ChunkRecord[], deletes: Array<{ cx: number; cz: number }>): Promise<void> {
        await this.gate;
        return super.commit(h, puts, deletes);
      }
    }
    const st = new SlowStorage();
    const s = await openSession(st, 42, () => 1);
    const a = s.volume.gen.arrival;
    const bx = Math.floor(a.x), bz = Math.floor(a.z);
    s.volume.place(bx, 65, bz, T.SAND); // bloco A
    const saving = flush(st, s); // transação pendente
    s.volume.place(bx + 1, 65, bz, T.DARK_ROCK); // bloco B, mesmo chunk, durante a gravação
    st.release();
    await saving;
    expect(s.volume.hasDirty).toBe(true); // o chunk NÃO foi marcado limpo: B ainda não foi confirmado
    // reabrir agora só tem o A (último estado confirmado)
    const mid = await openSession(st, 42, () => 1);
    expect(mid.volume.get(bx, 65, bz)).toBe(T.SAND);
    expect(mid.volume.get(bx + 1, 65, bz)).toBe(T.AIR);
    await flush(st, s); // próxima gravação automática
    expect(s.volume.hasDirty).toBe(false);
    const r = await openSession(st, 42, () => 1);
    expect(r.volume.get(bx, 65, bz)).toBe(T.SAND);
    expect(r.volume.get(bx + 1, 65, bz)).toBe(T.DARK_ROCK);
  });

  it('markClean só limpa a revisão confirmada', async () => {
    const s = await openSession(new MemoryTitanStorage(), 42, () => 1);
    const a = s.volume.gen.arrival, bx = Math.floor(a.x), bz = Math.floor(a.z);
    s.volume.place(bx, 65, bz, T.SAND);
    const snap = s.volume.dirtyChunks();
    s.volume.place(bx + 1, 65, bz, T.SAND);
    s.volume.markClean(snap);
    expect(s.volume.hasDirty).toBe(true);
    s.volume.markClean(s.volume.dirtyChunks());
    expect(s.volume.hasDirty).toBe(false);
  });

  it('construção alta (Y = 150) salva e reaberta entra na fila inicial, tem malha e colisão', async () => {
    const st = new MemoryTitanStorage();
    const s = await openSession(st, 42, () => 1);
    const a = s.volume.gen.arrival, bx = Math.floor(a.x), bz = Math.floor(a.z);
    // sem a edição, a seção do Y = 150 (seção 13) não está na fila do relevo natural
    const key = `${Math.floor(bx / 16)},13,${Math.floor(bz / 16)}`;
    expect(initialSections(s.volume)).not.toContain(key);
    expect(s.volume.place(bx, 150, bz, T.SAND)).toBe(true);
    await flush(st, s);
    const r = await openSession(st, 42, () => 1);
    expect(r.volume.get(bx, 150, bz)).toBe(T.SAND);
    expect(initialSections(r.volume)).toContain(key);
    const mesh = meshSection(r.volume, Math.floor(bx / 16), 13, Math.floor(bz / 16));
    expect(mesh.opaque?.idx.length).toBe(36); // 6 faces
    expect(collides(r.volume, bx + 0.5, 149.5, bz + 0.5)).toBe(true); // colisão ativa onde há malha
  });
});
