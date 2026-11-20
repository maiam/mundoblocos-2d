import { describe, expect, it } from 'vitest';
import { breakOrCollect, collectItem, collectNearby, placeFromSlot } from './actions';
import { raycast } from './physics';
import { breakTotalMs } from './breaking';
import { TitanGenerator } from './generator';
import { CRAFT_START, SLOTS } from './inventory';
import { Item } from './items';
import { craft, recipeById } from './recipes';
import { MemoryTitanStorage, TITAN_SAVE_VERSION } from './save';
import { discoverRecipes, flush, hasPendingState, openSession, standingReeds, type TitanSession } from './session';
import { inRegion, isSolid, isWorkbench, T, workbenchId, workbenchTurn, workbenchTurnFacing } from './voxel';
import { TitanVolume } from './volume';

const open = async (st = new MemoryTitanStorage(), version?: number) => ({ st, s: await openSession(st, 42, () => 1, undefined, version) });
const hit = (c: { x: number; y: number; z: number }) => ({ x: c.x, y: c.y, z: c.z, nx: 0, ny: 1, nz: 0 });
const veins = (s: TitanSession, kind: 'rock' | 'ice') => s.volume.gen.veinCells().filter((v) => v.kind === kind);

/** Alcance a pé sobre as colunas reais. */
function reachable(g: TitanGenerator): Set<number> {
  const v = new TitanVolume(g);
  const top = (x: number, z: number): number => { for (let y = 200; y > 0; y--) if (isSolid(v.get(x, y, z))) return y; return -1; };
  const key = (x: number, z: number): number => x * 1000 + z;
  const a = g.arrival, seen = new Set<number>([key(Math.floor(a.x), Math.floor(a.z))]);
  const q: Array<[number, number]> = [[Math.floor(a.x), Math.floor(a.z)]];
  while (q.length) {
    const [x, z] = q.pop()!;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, nz = z + dz;
      if (!inRegion(nx, nz) || seen.has(key(nx, nz)) || top(nx, nz) < 63 || Math.abs(top(nx, nz) - top(x, z)) > 1) continue;
      seen.add(key(nx, nz)); q.push([nx, nz]);
    }
  }
  return seen;
}

describe('gerador v4: depósito de brasa e junco de vidro', () => {
  it('seed 42: brasa no topo de uma coluna de areia úmida alcançável; juncos em volta, com a passagem livre', () => {
    const g = new TitanGenerator(42), v = new TitanVolume(g);
    expect(g.version).toBe(4);
    const e = g.emberSite!;
    expect(v.get(e.x, e.y, e.z)).toBe(T.EMBER);
    expect(v.get(e.x, e.y + 1, e.z)).toBe(T.AIR);
    expect(g.column(e.x, e.z).surface).toBe(T.DAMP_SAND);
    const seen = reachable(g);
    expect([[1, 0], [-1, 0], [0, 1], [0, -1]].every(([dx, dz]) => seen.has((e.x + dx) * 1000 + (e.z + dz)))).toBe(true); // acessível por qualquer lado
    expect(g.reeds.length).toBeGreaterThan(3);
    for (const r of g.reeds) {
      expect(v.get(r.x, r.y, r.z)).toBe(T.AIR);
      expect(v.get(r.x, r.y - 1, r.z)).toBe(T.DAMP_SAND); // sobre areia úmida
      expect(Math.abs(r.x - e.x) <= 1 && Math.abs(r.z - e.z) <= 1).toBe(false); // sem juncos na célula da brasa nem nos 8 vizinhos
    }
  });

  it('v1, v2 e v3 não têm brasa nem juncos; o terreno é o mesmo fora do depósito', () => {
    for (const version of [1, 2, 3]) { const g = new TitanGenerator(42, version); expect(g.emberSite).toBeNull(); expect(g.reeds).toHaveLength(0); }
    const a = new TitanGenerator(42, 3), b = new TitanGenerator(42, 4), e = b.emberSite!;
    for (let x = -32; x < 32; x++) for (let z = -32; z < 32; z++) for (let y = 55; y < 80; y++) {
      if (a.blockAt(x, y, z) !== b.blockAt(x, y, z)) expect([x, y, z]).toEqual([e.x, e.y, e.z]);
    }
  });

  it('é determinístico e varia pela seed; o depósito de reserva (relaxado) existe e fica fora das formações', () => {
    expect(new TitanGenerator(42).emberSite).toEqual(new TitanGenerator(42).emberSite);
    expect(new TitanGenerator(42).emberSite).not.toEqual(new TitanGenerator(43).emberSite);
    for (const seed of [1, 7, 42, 448, 985]) {
      const g = new TitanGenerator(seed), r = g.planEmber(false);
      expect(r.length, `seed ${seed}`).toBeGreaterThan(0);
      expect(g.formations.some((f) => Math.hypot(f.x - r[0].x, f.z - r[0].z) < 5)).toBe(false);
    }
  });
});

describe('Mesa de Trabalho no mundo', () => {
  it('fabricar → colocar → colide e some da malha → recolher devolve a mesa inteira; sem espaço, fica no lugar', async () => {
    const { s } = await open();
    const a = s.volume.gen.arrival, bx = Math.floor(a.x) + 2, bz = Math.floor(a.z);
    s.inventory.add(Item.DARK_ROCK, 4);
    expect(craft(s.inventory, recipeById('mesa')!, null).ok).toBe(true);
    const slot = [...Array(SLOTS).keys()].find((i) => s.inventory.get(i)?.item === Item.WORKBENCH)!;
    s.inventory.move(slot, 1);
    s.yaw = Math.PI; // olhando ao sul: a frente fica ao norte, o giro original (ADR 0052)
    expect(placeFromSlot(s, { x: bx, y: 64, z: bz, nx: 0, ny: 1, nz: 0 }, 1).ok).toBe(true);
    expect(s.volume.get(bx, 65, bz)).toBe(T.WORKBENCH);
    expect(s.volume.workbenchCells()).toEqual([[bx, 65, bz, 0]]);
    expect(isSolid(T.WORKBENCH)).toBe(true);
    expect(breakTotalMs('block', T.WORKBENCH)).toBe(1600);
    // inventário cheio: a quebra falha e a mesa fica
    let n = 0; while (s.inventory.canAdd(Item.SAND) && n++ < 5000) s.inventory.add(Item.SAND, 1);
    expect(breakOrCollect(s, hit({ x: bx, y: 65, z: bz }))).toEqual({ ok: false, msg: 'Mochila cheia' });
    expect(s.volume.get(bx, 65, bz)).toBe(T.WORKBENCH);
    for (let k = 0; k < 64; k++) s.inventory.consume(5); // esvazia uma pilha de areia inteira: agora há espaço para a mesa
    expect(breakOrCollect(s, hit({ x: bx, y: 65, z: bz })).ok).toBe(true);
    expect(s.inventory.total(Item.WORKBENCH)).toBe(1);
    expect(s.volume.workbenchCells()).toEqual([]);
  });

  it('a mesa persiste ao reabrir (edição de chunk) e volta à lista de instâncias', async () => {
    const { st, s } = await open();
    const a = s.volume.gen.arrival, bx = Math.floor(a.x) + 2, bz = Math.floor(a.z);
    s.volume.place(bx, 65, bz, T.WORKBENCH);
    await flush(st, s);
    const r = await openSession(st, null, () => 1);
    expect(r.volume.get(bx, 65, bz)).toBe(T.WORKBENCH);
    expect(r.volume.workbenchCells()).toEqual([[bx, 65, bz, 0]]);
    expect(r.volume.modelVersion).toBeGreaterThan(0);
  });
});

describe('descoberta de receitas', () => {
  it('a mesa aparece com a primeira rocha; é derivada do estado e não repete o aviso', async () => {
    const { s } = await open();
    expect(discoverRecipes(s)).toEqual([]);
    s.inventory.add(Item.DARK_ROCK, 1);
    expect(discoverRecipes(s)).toEqual(['mesa']);
    expect(discoverRecipes(s)).toEqual([]);
  });
  it('save antigo com rocha ou com mesa já abre com a receita reconhecida', async () => {
    const { st, s } = await open(new MemoryTitanStorage(), 3);
    s.inventory.add(Item.DARK_ROCK, 2);
    await flush(st, s);
    const h = st.games.get(42)!; h.v = 3; delete h.recipes;
    const r = await openSession(st, null, () => 1);
    expect(r.known.has('mesa')).toBe(true);
    const { st: st2, s: s2 } = await open(new MemoryTitanStorage(), 3);
    s2.volume.place(Math.floor(s2.volume.gen.arrival.x) + 2, 65, Math.floor(s2.volume.gen.arrival.z), T.WORKBENCH);
    await flush(st2, s2);
    st2.games.get(42)!.v = 3; delete st2.games.get(42)!.recipes;
    const r2 = await openSession(st2, null, () => 1);
    expect(r2.known.has('mesa') && r2.known.has('bancada')).toBe(true);
  });
});

describe('depósito de brasa: quebrar, soltar, coletar, não recriar', () => {
  it('quebrar rende só a brasa solta no chão; coleta por proximidade; recolocar bloco comum não recria o minério; persiste', async () => {
    const { st, s } = await open();
    const e = s.volume.gen.emberSite!;
    expect(breakTotalMs('block', T.EMBER)).toBe(1200);
    expect(breakOrCollect(s, hit(e)).ok).toBe(true);
    expect(s.volume.get(e.x, e.y, e.z)).toBe(T.AIR);
    expect(s.inventory.total(Item.EMBER)).toBe(0); // vai para o chão, como a lasca do veio
    expect([...s.drops.values()]).toEqual([{ id: `v:${e.x},${e.y},${e.z}`, item: Item.EMBER, x: e.x, y: e.y, z: e.z }]);
    await flush(st, s);
    const r = await openSession(st, null, () => 1);
    expect(r.drops.size).toBe(1); // a brasa pendente sobrevive à reabertura
    expect(collectNearby(r, e.x + 0.5, e.y, e.z + 0.5).collected).toBe(1);
    expect(r.inventory.total(Item.EMBER)).toBe(1);
    r.inventory.add(Item.SAND, 1);
    const slot = [...Array(SLOTS).keys()].find((i) => r.inventory.get(i)?.item === Item.SAND)!;
    expect(placeFromSlot(r, { x: e.x, y: e.y - 1, z: e.z, nx: 0, ny: 1, nz: 0 }, slot).ok).toBe(true);
    expect(r.volume.get(e.x, e.y, e.z)).toBe(T.SAND); // bloco comum
    expect(breakOrCollect(r, hit(e)).ok).toBe(true);
    expect(r.drops.size).toBe(0); // a fonte não se recria
    await flush(st, r);
    const r2 = await openSession(st, null, () => 1);
    expect(r2.inventory.total(Item.EMBER)).toBe(1); expect(r2.drops.size).toBe(0);
  });

  it('o junco some onde se constrói (não há planta dentro do bloco) e não bloqueia nada', async () => {
    const { s } = await open();
    const list = standingReeds(s), r = list[0];
    expect(list.length).toBe(s.volume.gen.reeds.length);
    s.volume.place(r.x, r.y, r.z, T.SAND);
    expect(standingReeds(s).length).toBe(list.length - 1);
  });
});

describe('migração do save (v4)', () => {
  /** Grava uma partida do gerador antigo e a rebaixa para o formato anterior (sem receitas/adições), com o inventário dado. */
  async function legacy(version: number, bag: Array<[number, number] | null>, craftRow: Array<[number, number] | null> = []) {
    const st = new MemoryTitanStorage();
    const s = await openSession(st, 42, () => 1, undefined, version);
    await flush(st, s);
    const h = st.games.get(42)!;
    h.v = 3; delete h.recipes; delete h.grants;
    h.inventory = { bag: { v: 1, slots: bag, craft: craftRow }, collected: [] };
    return st;
  }

  it('save com cápsula: vira 1 brasa uma única vez; reabrir não converte de novo', async () => {
    const st = await legacy(3, [[Item.SAND, 5], [Item.CAPSULE, 1]]);
    const r = await openSession(st, null, () => 1);
    expect(r.inventory.total(Item.CAPSULE)).toBe(0);
    expect(r.inventory.total(Item.EMBER)).toBe(1);
    expect(r.inventory.total(Item.SAND)).toBe(5);
    expect(hasPendingState(r)).toBe(true); // há o que gravar (o save passa a v4)
    await flush(st, r);
    expect(st.games.get(42)!.v).toBe(TITAN_SAVE_VERSION);
    const r2 = await openSession(st, null, () => 1);
    expect(r2.inventory.total(Item.EMBER)).toBe(1); // não dobrou
    expect(hasPendingState(r2)).toBe(false);
  });

  it('cápsula já posta na grade 2 × 2 (receita antiga iniciada) também vira brasa, e os fragmentos voltam para a mochila', async () => {
    const st = await legacy(2, [], [[Item.CAPSULE, 1], [Item.ROCK_SHARD, 1], [Item.FROST_SHARD, 1]]);
    const r = await openSession(st, null, () => 1);
    expect(r.inventory.total(Item.EMBER)).toBe(1);
    expect(r.inventory.total(Item.ROCK_SHARD)).toBe(1);
    expect(r.inventory.total(Item.FROST_SHARD)).toBe(1);
    expect(r.inventory.get(CRAFT_START)).toBeNull();
  });

  it('save sem cápsula: nada é convertido; a partida de gerador antigo ganha o depósito de brasa localizado (uma vez)', async () => {
    const st = await legacy(3, [[Item.SAND, 5]]);
    const r = await openSession(st, null, () => 1);
    expect(r.inventory.total(Item.EMBER)).toBe(0);
    const g = r.grants.ember!;
    expect(g).toBeDefined();
    expect(r.volume.get(g[0], g[1], g[2])).toBe(T.EMBER);
    expect(r.volume.gen.version).toBe(3); // continua na geração em que foi gravada
    expect(standingReeds(r).length).toBeGreaterThan(0); // os juncos em volta da brasa
    await flush(st, r);
    expect(st.games.get(42)!.grants!.ember).toEqual(g);
    const r2 = await openSession(st, null, () => 1);
    expect(r2.grants.ember).toEqual(g); expect(r2.volume.get(g[0], g[1], g[2])).toBe(T.EMBER);
  });

  it('brasa já consumida não volta; voxel editado ou construído na posição faz a adição usar outro candidato', async () => {
    const st = await legacy(3, []);
    const a = await openSession(st, null, () => 1);
    const g = a.grants.ember!;
    breakOrCollect(a, hit({ x: g[0], y: g[1], z: g[2] })); // o jogador consome o depósito
    await flush(st, a);
    const b = await openSession(st, null, () => 1);
    expect(b.volume.get(g[0], g[1], g[2])).toBe(T.AIR); // não foi recriado
    expect(b.grants.ember).toEqual(g);
    // outra partida: o primeiro candidato já tem uma construção do jogador
    const gen = new TitanGenerator(42, 3), first = gen.planEmber()[0], second = gen.planEmber()[1];
    const st3 = new MemoryTitanStorage();
    const s3 = await openSession(st3, 42, () => 1, undefined, 3);
    s3.volume.place(first.x, gen.column(first.x, first.z).top + 1, first.z, T.SAND); // construção em cima do primeiro candidato
    await flush(st3, s3);
    const h = st3.games.get(42)!; h.v = 3; delete h.recipes; delete h.grants;
    const c = await openSession(st3, null, () => 1);
    expect(c.grants.ember).toBeDefined();
    expect(c.grants.ember![0] === first.x && c.grants.ember![2] === first.z).toBe(false);
    expect(c.grants.ember![0] === second.x && c.grants.ember![2] === second.z).toBe(true);
    expect(c.volume.get(first.x, gen.column(first.x, first.z).top + 1, first.z)).toBe(T.SAND); // a construção está intacta
  });

  it('lanterna instalada antes da atualização continua no lugar, acesa e recuperável', async () => {
    const st = new MemoryTitanStorage();
    const s = await openSession(st, 42, () => 1, undefined, 3);
    const a = s.volume.gen.arrival, bx = Math.floor(a.x) + 2, bz = Math.floor(a.z);
    s.volume.place(bx, 65, bz, T.LANTERN);
    await flush(st, s);
    const h = st.games.get(42)!; h.v = 3; delete h.recipes; delete h.grants;
    const r = await openSession(st, null, () => 1);
    expect(r.volume.get(bx, 65, bz)).toBe(T.LANTERN);
    expect(r.volume.light(bx, 65, bz)).toBe(15);
    expect(r.volume.lanternCells()).toEqual([[bx, 65, bz]]);
    expect(breakOrCollect(r, hit({ x: bx, y: 65, z: bz })).ok).toBe(true);
    expect(r.inventory.total(Item.LANTERN)).toBe(1);
  });
});

describe('partida nova (v4), seed 42: do primeiro bloco à lanterna', () => {
  it('rocha → mesa → colocar → lente → brasa → lanterna → colocar → salvar → reabrir → recolher', async () => {
    const { st, s } = await open();
    expect(s.inventory.total(Item.CAPSULE)).toBe(0); // de mãos vazias
    const rocks = veins(s, 'rock'), ice = veins(s, 'ice')[0];
    // 3 veios de rocha (3 blocos + 3 lascas) + 1 bloco de rocha comum abaixo de um deles = 4 blocos
    for (const v of rocks) { expect(breakOrCollect(s, hit(v)).ok).toBe(true); expect(collectNearby(s, v.x + 0.5, v.y, v.z + 0.5).collected).toBe(1); }
    expect(discoverRecipes(s)).toContain('mesa');
    expect(breakOrCollect(s, hit({ x: rocks[0].x, y: rocks[0].y - 1, z: rocks[0].z })).ok).toBe(true);
    expect(s.inventory.total(Item.DARK_ROCK)).toBe(4);
    expect(craft(s.inventory, recipeById('mesa')!, null).ok).toBe(true);
    // colocar a mesa perto da chegada
    const a = s.volume.gen.arrival, bx = Math.floor(a.x) + 2, bz = Math.floor(a.z);
    const mslot = [...Array(SLOTS).keys()].find((i) => s.inventory.get(i)?.item === Item.WORKBENCH)!;
    s.inventory.move(mslot, 1);
    s.yaw = Math.PI; // giro original (ADR 0052)
    expect(placeFromSlot(s, { x: bx, y: 64, z: bz, nx: 0, ny: 1, nz: 0 }, 1).ok).toBe(true);
    expect(discoverRecipes(s)).toContain('bancada');
    // lente: fragmento de gelo, na mesa
    expect(breakOrCollect(s, hit(ice)).ok).toBe(true);
    expect(collectNearby(s, ice.x + 0.5, ice.y, ice.z + 0.5).collected).toBe(1);
    expect(craft(s.inventory, recipeById('lente')!, 'workbench').ok).toBe(true);
    // brasa: depósito perto do junco
    const e = s.volume.gen.emberSite!;
    expect(breakOrCollect(s, hit(e)).ok).toBe(true);
    expect(collectNearby(s, e.x + 0.5, e.y, e.z + 0.5).collected).toBe(1);
    // lanterna: 2 fragmentos de rocha + lente + brasa, na mesa; longe da mesa a receita não fabrica
    expect(craft(s.inventory, recipeById('lanterna')!, null)).toEqual({ ok: false, reason: 'station' });
    expect(craft(s.inventory, recipeById('lanterna')!, 'workbench').ok).toBe(true);
    expect(s.inventory.total(Item.LANTERN)).toBe(1);
    const lslot = [...Array(SLOTS).keys()].find((i) => s.inventory.get(i)?.item === Item.LANTERN)!;
    s.inventory.move(lslot, 2);
    expect(placeFromSlot(s, { x: bx, y: 64, z: bz + 2, nx: 0, ny: 1, nz: 0 }, 2).ok).toBe(true);
    await flush(st, s);
    const r = await openSession(st, null, () => 1);
    expect(r.volume.get(bx, 65, bz)).toBe(T.WORKBENCH);
    expect(r.volume.get(bx, 65, bz + 2)).toBe(T.LANTERN);
    expect(r.volume.light(bx, 65, bz + 2)).toBe(15);
    expect(breakOrCollect(r, hit({ x: bx, y: 65, z: bz + 2 })).ok).toBe(true);
    expect(r.inventory.total(Item.LANTERN)).toBe(1);
    expect(r.known.has('mesa') && r.known.has('bancada')).toBe(true);
  });
});

describe('junco de vidro: mira, recolher e cair sem o apoio', () => {
  it('o junco é alvo da mira (como as lascas) e se recolhe: 1 junco = 1 item, some do mundo e não volta ao reabrir', async () => {
    const { st, s } = await open();
    const r = standingReeds(s)[0], id = `reed:${r.x},${r.y},${r.z}`;
    expect(s.items.at(r.x, r.y, r.z)).toBe(id);
    const h = raycast(s.volume, r.x + 0.5, r.y + 3, r.z + 0.5, 0, -1, 0, 6, s.items)!; // de cima: a mira acerta o junco, não o bloco de baixo
    expect(h.item).toBe(id);
    expect(breakOrCollect(s, h).ok).toBe(true);
    expect(s.inventory.total(Item.GLASS_REED)).toBe(1);
    expect(s.items.at(r.x, r.y, r.z)).toBeNull();
    expect(standingReeds(s).some((q) => q.x === r.x && q.z === r.z)).toBe(false);
    expect(s.volume.get(r.x, r.y - 1, r.z)).toBe(T.DAMP_SAND); // o bloco de baixo ficou intacto
    await flush(st, s);
    const r2 = await openSession(st, null, () => 1);
    expect(r2.items.at(r.x, r.y, r.z)).toBeNull(); // não renasce
    expect(r2.inventory.total(Item.GLASS_REED)).toBe(1);
    expect(collectItem(r2, id)).toEqual({ ok: false }); // nem duplica
  });

  it('mochila cheia: o junco fica no lugar', async () => {
    const { s } = await open();
    const r = standingReeds(s)[0], id = `reed:${r.x},${r.y},${r.z}`;
    let n = 0; while (s.inventory.canAdd(Item.SAND) && n++ < 5000) s.inventory.add(Item.SAND, 1);
    expect(collectItem(s, id)).toEqual({ ok: false, msg: 'Mochila cheia' });
    expect(s.items.at(r.x, r.y, r.z)).toBe(id);
  });

  it('quebrar o bloco de baixo solta o junco como item no chão recolhido por proximidade e persistente', async () => {
    const { st, s } = await open();
    const r = standingReeds(s)[0];
    expect(breakOrCollect(s, hit({ x: r.x, y: r.y - 1, z: r.z })).ok).toBe(true);
    expect(s.volume.get(r.x, r.y - 1, r.z)).toBe(T.AIR);
    const d = [...s.drops.values()].find((q) => q.item === Item.GLASS_REED)!;
    expect(d).toBeDefined();
    expect(d.y).toBeLessThanOrEqual(r.y);
    await flush(st, s);
    const r2 = await openSession(st, null, () => 1);
    expect([...r2.drops.values()].filter((q) => q.item === Item.GLASS_REED)).toHaveLength(1); // a queda sobrevive à reabertura
    expect(r2.items.at(r.x, r.y, r.z)).toBeNull();
    expect(collectNearby(r2, d.x + 0.5, d.y, d.z + 0.5).collected).toBe(1);
    expect(r2.inventory.total(Item.GLASS_REED)).toBe(1);
  });

  it('partida legada com a brasa dada: os juncos em volta também são recolhíveis', async () => {
    const st = new MemoryTitanStorage();
    const s0 = await openSession(st, 42, () => 1, undefined, 3);
    await flush(st, s0);
    const h = st.games.get(42)!; h.v = 3; delete h.recipes; delete h.grants;
    const s = await openSession(st, null, () => 1);
    const r = standingReeds(s)[0];
    expect(r).toBeDefined();
    expect(collectItem(s, `reed:${r.x},${r.y},${r.z}`).ok).toBe(true);
    expect(s.inventory.total(Item.GLASS_REED)).toBe(1);
  });
});

describe('migração do inventário (save v4 → v5, hotbar de 9 e bolsa de 27)', () => {
  it('save anterior com a bolsa cheia de itens distintos em cada seção: cada seção vai para o lugar novo, a seleção e a grade seguem, e reabrir é estável', async () => {
    const st = new MemoryTitanStorage();
    const s0 = await openSession(st, 42, () => 1);
    await flush(st, s0);
    const h = st.games.get(42)!;
    const slots: Array<[number, number] | null> = Array.from({ length: 31 }, (_, i) => [(i % 11) + 1, (i % 11) + 1 === Item.CAPSULE || (i % 11) + 1 === Item.LANTERN || (i % 11) + 1 === Item.WORKBENCH ? 1 : (i % 4) + 1]);
    h.v = 4; h.selected = 5;
    h.inventory = { bag: { v: 1, slots, craft: [[Item.DARK_ROCK, 1], null, null, null] }, collected: [] };
    const r = await openSession(st, null, () => 1);
    // seções: hotbar antiga → 0–6, 7–8 vazios, bolsa antiga → 9–32, 33–35 novos vazios
    for (let i = 0; i < 7; i++) expect(r.inventory.get(i)?.item).toBe(slots[i]![0]);
    expect(r.inventory.get(7)).toBeNull(); expect(r.inventory.get(8)).toBeNull();
    for (let i = 0; i < 24; i++) expect(r.inventory.get(9 + i)).toEqual({ item: slots[7 + i]![0], count: slots[7 + i]![1] });
    for (let i = 33; i < SLOTS; i++) expect(r.inventory.get(i)).toBeNull();
    expect(r.selected).toBe(5); // a seleção continua no mesmo espaço
    expect(r.inventory.get(CRAFT_START)).toBeNull(); // a grade voltou para a bolsa ao abrir (como sempre); a rocha não se perdeu
    expect(r.inventory.total(Item.DARK_ROCK)).toBe(slots.reduce((n, e) => n + (e && e[0] === Item.DARK_ROCK ? e[1] : 0), 0) + 1);
    expect(hasPendingState(r)).toBe(true); // há o que gravar no formato novo
    await flush(st, r);
    expect(st.games.get(42)!.v).toBe(TITAN_SAVE_VERSION);
    expect(st.games.get(42)!.inventory!.bag.v).toBe(3);
    const r2 = await openSession(st, null, () => 1);
    for (let i = 0; i < SLOTS; i++) expect(r2.inventory.get(i)).toEqual(r.inventory.get(i)); // reabrir não muda nada nem duplica
    expect(hasPendingState(r2)).toBe(false);
  });
});

describe('orientação da Mesa de Trabalho (ADR 0052)', () => {
  it('a frente fica voltada para o jogador: olhando ao norte a frente vai ao sul, e assim nas quatro direções', () => {
    // giro 0 = frente ao norte (−Z); 1 = oeste; 2 = sul; 3 = leste. yaw 0 olha para −Z; π/2 para −X; π para +Z; −π/2 para +X.
    expect(workbenchTurnFacing(0)).toBe(2);
    expect(workbenchTurnFacing(Math.PI / 2)).toBe(3);
    expect(workbenchTurnFacing(Math.PI)).toBe(0);
    expect(workbenchTurnFacing(-Math.PI / 2)).toBe(1);
    expect(workbenchTurnFacing(0.3)).toBe(2); // arredonda ao eixo mais próximo
    expect(workbenchTurnFacing(-7 * Math.PI)).toBe(0); // voltas completas
    for (let t = 0; t < 4; t++) { expect(workbenchTurn(workbenchId(t))).toBe(t); expect(isWorkbench(workbenchId(t))).toBe(true); expect(isSolid(workbenchId(t))).toBe(true); }
    expect(isWorkbench(T.SLAB)).toBe(false);
  });
  it('colocada com o giro do olhar, persiste ao reabrir, vira item ao quebrar e continua sendo uma mesa', async () => {
    const { s, st } = await open();
    const a = s.volume.gen.arrival, bx = Math.floor(a.x) + 2, bz = Math.floor(a.z);
    for (const [k, yaw] of [0, Math.PI / 2].entries()) {
      s.inventory.add(Item.WORKBENCH, 1);
      const slot = [...Array(SLOTS).keys()].find((i) => s.inventory.get(i)?.item === Item.WORKBENCH)!;
      s.yaw = yaw;
      expect(placeFromSlot(s, { x: bx, y: 64, z: bz + k * 2, nx: 0, ny: 1, nz: 0 }, slot).ok).toBe(true);
    }
    expect(s.volume.workbenchCells()).toEqual([[bx, 65, bz, 2], [bx, 65, bz + 2, 3]]);
    expect(s.volume.place(bx, 65, bz + 4, workbenchId(1))).toBe(true); // giro 1 (frente a oeste) direto no volume
    expect(s.volume.isWorkbench(bx, 65, bz)).toBe(true);
    await flush(st, s);
    const r = await openSession(st, null, () => 1);
    expect(r.volume.workbenchCells().sort((p, q) => p[2] - q[2])).toEqual([[bx, 65, bz, 2], [bx, 65, bz + 2, 3], [bx, 65, bz + 4, 1]]);
    expect(breakOrCollect(r, hit({ x: bx, y: 65, z: bz })).ok).toBe(true);
    expect(r.inventory.total(Item.WORKBENCH)).toBe(1);
    expect(r.volume.workbenchCells().length).toBe(2);
  });
});
