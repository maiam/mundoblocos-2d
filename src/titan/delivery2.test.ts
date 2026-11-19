import { describe, expect, it } from 'vitest';
import { breakOrCollect, collectItem, placeFromSlot } from './actions';
import { craft, recipeById } from './recipes';
import { CRAFT_START, HOTBAR, SLOTS } from './inventory';
import { Item } from './items';
import { MemoryTitanStorage, TITAN_SAVE_VERSION } from './save';
import { flush, hasPendingState, openSession } from './session';
import { raycast } from './physics';
import { meshSection } from './mesher';
import { T } from './voxel';

/** Partida do legado (v2: lascas de superfície pré-posicionadas); o fluxo dos veios (v3) está em `veins.test.ts`. */
const open = async (st = new MemoryTitanStorage()) => ({ st, s: await openSession(st, 42, () => 1, undefined, 2) });
const spot = (s: Awaited<ReturnType<typeof openSession>>) => { const a = s.volume.gen.arrival; return { bx: Math.floor(a.x), bz: Math.floor(a.z) }; };

describe('coleta e inventário no mundo', () => {
  it('quebrar um bloco devolve o bloco (não fragmento); colocar gasta 1 da hotbar', async () => {
    const { s } = await open();
    const { bx, bz } = spot(s);
    expect(breakOrCollect(s, { x: bx, y: 64, z: bz, nx: 0, ny: 1, nz: 0 }).ok).toBe(true);
    expect(s.volume.get(bx, 64, bz)).toBe(T.AIR);
    expect(s.inventory.total(Item.SAND)).toBe(1);
    expect(s.inventory.total(Item.ROCK_SHARD)).toBe(0);
    const slot = [...Array(SLOTS).keys()].find((i) => s.inventory.get(i)?.item === Item.SAND)!;
    s.inventory.move(slot, 0); // para a hotbar
    expect(placeFromSlot(s, { x: bx + 2, y: 64, z: bz, nx: 0, ny: 1, nz: 0 }, 0).ok).toBe(true); // o corpo ocupa a célula da chegada
    expect(s.volume.get(bx + 2, 65, bz)).toBe(T.SAND);
    expect(s.inventory.total(Item.SAND)).toBe(0);
  });

  it('rocha-mãe e líquido não se quebram; cápsula (legada) e fragmento não se colocam', async () => {
    const { s } = await open();
    s.inventory.add(Item.CAPSULE, 1); // o id 7 segue reservado: um save antigo ainda pode trazer a peça
    expect(breakOrCollect(s, { x: 0, y: -64, z: 0, nx: 0, ny: 1, nz: 0 }).ok).toBe(false);
    const { bx, bz } = spot(s);
    const r = placeFromSlot(s, { x: bx, y: 64, z: bz, nx: 0, ny: 1, nz: 0 }, 0); // espaço 0 = cápsula
    expect(r).toEqual({ ok: false, msg: 'Este item não se coloca' });
    expect(s.volume.get(bx, 65, bz)).toBe(T.AIR);
    expect(s.inventory.total(Item.CAPSULE)).toBe(1); // nada se perde
    expect(HOTBAR).toBe(7);
  });

  it('fragmento de superfície: 1 lasca = 1 fragmento, some do mundo, o id recolhido vai no save', async () => {
    const { st, s } = await open();
    const it = s.volume.gen.surfaceItems.find((i) => i.item === 5)!;
    expect(s.items.at(it.x, it.y, it.z)).toBe(it.id);
    // a mira acerta o fragmento
    const hit = raycast(s.volume, it.x + 0.5, it.y + 3, it.z + 0.5, 0, -1, 0, 6, s.items);
    expect(hit).toMatchObject({ x: it.x, y: it.y, z: it.z, item: it.id });
    expect(breakOrCollect(s, hit!).ok).toBe(true);
    expect(s.inventory.total(Item.ROCK_SHARD)).toBe(1);
    expect(s.items.at(it.x, it.y, it.z)).toBeNull();
    expect(collectItem(s, it.id).ok).toBe(false); // não rende de novo
    await flush(st, s);
    const r = await openSession(st, null, () => 1);
    expect(r.inventory.total(Item.ROCK_SHARD)).toBe(1);
    expect(r.items.at(it.x, it.y, it.z)).toBeNull(); // continua recolhido
    const other = s.volume.gen.surfaceItems.find((i) => i.id !== it.id && i.item === 5)!;
    expect(r.items.at(other.x, other.y, other.z)).toBe(other.id);
  });

  it('mochila cheia: a lasca fica no lugar e o bloco não é quebrado', async () => {
    const { s } = await open();
    for (let n = 0; n < SLOTS; n++) s.inventory.add(Item.CAPSULE, 1); // enche (uma cápsula por espaço)
    const it = s.volume.gen.surfaceItems.find((i) => i.item === 6)!;
    expect(collectItem(s, it.id)).toEqual({ ok: false, msg: 'Mochila cheia' });
    expect(s.items.at(it.x, it.y, it.z)).toBe(it.id);
    const { bx, bz } = spot(s);
    expect(breakOrCollect(s, { x: bx, y: 64, z: bz, nx: 0, ny: 1, nz: 0 })).toEqual({ ok: false, msg: 'Mochila cheia' });
    expect(s.volume.get(bx, 64, bz)).toBe(T.SAND);
  });

  it('não dá para colocar bloco em cima de um fragmento ainda no mundo', async () => {
    const { s } = await open();
    const it = s.volume.gen.surfaceItems[0];
    s.inventory.add(Item.SAND, 1);
    const slot = [...Array(SLOTS).keys()].find((i) => s.inventory.get(i)?.item === Item.SAND)!;
    s.inventory.move(slot, 0);
    expect(placeFromSlot(s, { x: it.x, y: it.y - 1, z: it.z, nx: 0, ny: 1, nz: 0 }, 0).ok).toBe(false);
  });
});

describe('lanterna: fabricar, colocar, iluminar, recuperar e salvar', () => {
  /** Fluxo do legado (v2, lascas pré-posicionadas) até a lanterna: 2 fragmentos de rocha, lente de gelo (do fragmento de gelo, na mesa) e brasa. */
  const craftLantern = (s: Awaited<ReturnType<typeof openSession>>): void => {
    for (const id of ['rock:0', 'rock:1', 'ice:0']) collectItem(s, id);
    expect(craft(s.inventory, recipeById('lente')!, 'workbench').ok).toBe(true);
    s.inventory.add(Item.EMBER, 1);
    expect(craft(s.inventory, recipeById('lanterna')!, 'workbench').ok).toBe(true);
  };

  it('coleta → fabricação → colocação → reabertura: tudo sobrevive junto, na mesma transação', async () => {
    const { st, s } = await open();
    craftLantern(s);
    const slot = [...Array(SLOTS).keys()].find((i) => s.inventory.get(i)?.item === Item.LANTERN)!;
    s.inventory.move(slot, 2);
    const { bx, bz } = spot(s);
    expect(placeFromSlot(s, { x: bx + 2, y: 64, z: bz, nx: 0, ny: 1, nz: 0 }, 2).ok).toBe(true);
    expect(s.volume.get(bx + 2, 65, bz)).toBe(T.LANTERN);
    expect(s.inventory.total(Item.LANTERN)).toBe(0);
    await flush(st, s);
    // um único commit levou inventário e lanterna: o cabeçalho e o chunk da lanterna estão no banco
    const saved = await st.load(42);
    expect(saved!.header.v).toBe(TITAN_SAVE_VERSION);
    expect(saved!.header.inventory!.collected.sort()).toEqual(['ice:0', 'rock:0', 'rock:1']);
    expect(saved!.chunks.length).toBeGreaterThan(0);
    const r = await openSession(st, null, () => 1);
    expect(r.volume.get(bx + 2, 65, bz)).toBe(T.LANTERN); // posição e estado
    expect(r.volume.light(bx + 2, 65, bz)).toBe(15);
    expect(r.inventory.total(Item.EMBER)).toBe(0);
    expect(r.inventory.total(Item.ROCK_SHARD)).toBe(0);
    expect(r.items.remaining()).toHaveLength(3);
    // recuperar devolve o item inteiro e apaga a luz
    expect(breakOrCollect(r, { x: bx + 2, y: 65, z: bz, nx: 0, ny: 1, nz: 0 }).ok).toBe(true);
    expect(r.inventory.total(Item.LANTERN)).toBe(1);
    expect(r.volume.light(bx + 2, 65, bz)).toBe(0);
    expect(r.volume.hasLanterns).toBe(false);
  });

  it('luz: 15 na fonte, −1 por célula, bloqueada por sólidos, e a malha vizinha é refeita', async () => {
    const { s } = await open();
    const { bx, bz } = spot(s);
    const y = 150;
    s.volume.place(bx, y, bz, T.LANTERN);
    expect([0, 1, 2, 5, 14].map((d) => s.volume.light(bx + d, y, bz))).toEqual([15, 14, 13, 10, 1]);
    expect(s.volume.light(bx + 15, y, bz)).toBe(0);
    const open13 = s.volume.light(bx + 2, y, bz);
    s.volume.place(bx + 1, y, bz, T.SAND); // parede ao lado: a luz contorna
    expect(s.volume.light(bx + 2, y, bz)).toBeLessThan(open13);
    s.volume.takeTouched();
    s.volume.remove(bx, y, bz);
    const touched = s.volume.takeTouched();
    expect(touched).toContain(`${Math.floor(bx / 16)},${Math.floor((y + 64) / 16)},${Math.floor(bz / 16)}`);
    expect(s.volume.light(bx + 2, y, bz)).toBe(0);
  });

  it('a lanterna sai da malha do terreno (é o modelo 3D do renderer) e os blocos vizinhos ficam mais claros', async () => {
    const { s } = await open();
    const { bx, bz } = spot(s);
    s.volume.place(bx, 150, bz, T.SAND); s.volume.place(bx, 151, bz, T.LANTERN);
    const m = meshSection(s.volume, Math.floor(bx / 16), 13, Math.floor(bz / 16)).opaque!;
    expect(m.idx.length / 6).toBe(6); // só as 6 faces do bloco; nenhuma da lanterna
    expect(Math.max(...m.glow)).toBeGreaterThan(1 - 1); // a face do bloco ao lado da lanterna recebeu brilho quente, no atributo próprio
    expect(Math.max(...m.col)).toBeLessThanOrEqual(1);
    expect(s.volume.lanternVersion).toBeGreaterThan(0);
  });

  it('save da v1 (sem inventário) abre de mãos vazias e passa a gravar a versão atual', async () => {
    const { st, s } = await open();
    await flush(st, s);
    const legacy = st.games.get(42)!;
    legacy.v = 1; legacy.inventory = null; legacy.generatorVersion = 1; // gravado pela entrega 1
    const r = await openSession(st, null, () => 1);
    expect(r.volume.gen.version).toBe(1); // continua na versão em que foi gravado
    expect(r.inventory.total(Item.CAPSULE)).toBe(0); // a cápsula saiu da abertura (ADR 0045)
    expect(hasPendingState(r)).toBe(true); // há o que gravar
    await flush(st, r);
    expect(hasPendingState(r)).toBe(false);
    expect(st.games.get(42)!.v).toBe(TITAN_SAVE_VERSION);
  });

  it('grade de fabricação com itens na hora de salvar: ao reabrir, voltam para a mochila', async () => {
    const { st, s } = await open();
    s.inventory.add(Item.DARK_ROCK, 4);
    for (let k = 0; k < 4; k++) s.inventory.move(0, CRAFT_START + k);
    expect(s.inventory.get(CRAFT_START)).not.toBeNull();
    await flush(st, s);
    const r = await openSession(st, null, () => 1);
    expect(r.inventory.total(Item.DARK_ROCK)).toBe(4);
    expect(r.inventory.get(CRAFT_START)).toBeNull();
  });

  it('inventário/coleta feitos durante a gravação continuam pendentes', async () => {
    class Slow extends MemoryTitanStorage {
      release!: () => void;
      private readonly gate = new Promise<void>((r) => { this.release = r; });
      override async commit(...a: Parameters<MemoryTitanStorage['commit']>): Promise<void> { await this.gate; return super.commit(...a); }
    }
    const st = new Slow();
    const s = await openSession(st, 42, () => 1, undefined, 2);
    const p = flush(st, s);
    collectItem(s, 'rock:0'); // durante a gravação
    st.release(); await p;
    expect(hasPendingState(s)).toBe(true);
    await flush(st, s);
    expect(hasPendingState(s)).toBe(false);
    expect((await openSession(st, null, () => 1)).inventory.total(Item.ROCK_SHARD)).toBe(1);
  });
});
