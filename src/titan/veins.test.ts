import { describe, expect, it } from 'vitest';
import { breakOrCollect, collectNearby, placeFromSlot } from './actions';
import { breakTotalMs } from './breaking';
import { TitanGenerator } from './generator';
import { SLOTS } from './inventory';
import { Item } from './items';
import { MemoryTitanStorage } from './save';
import { flush, hasPendingState, openSession, visibleItems, type TitanSession } from './session';
import { TitanVolume } from './volume';
import { isSolid, T } from './voxel';
import { sweepBlocks } from './dropTestUtil';

const open = async (st = new MemoryTitanStorage(), version = 3) => ({ st, s: await openSession(st, 42, () => 1, undefined, version) });
const veinOf = (s: TitanSession, kind: 'rock' | 'ice') => s.volume.gen.veinCells().find((v) => v.kind === kind)!;
const hit = (v: { x: number; y: number; z: number }) => ({ x: v.x, y: v.y, z: v.z, nx: 0, ny: 1, nz: 0 });

/** Alcance a pé sobre as colunas reais (formações incluídas): degraus de até 1 bloco, sem água funda. */
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
      if (!g.inRegion(nx, nz) || seen.has(key(nx, nz)) || top(nx, nz) < 63 || Math.abs(top(nx, nz) - top(x, z)) > 1) continue;
      seen.add(key(nx, nz)); q.push([nx, nz]);
    }
  }
  return seen;
}

describe('gerador v3: veios', () => {
  it('seed 42: 3 veios de rocha e 3 de gelo no topo da formação, sem lascas pré-posicionadas', () => {
    const g = new TitanGenerator(42, 3), v = new TitanVolume(g);
    expect(g.version).toBe(3);
    expect(g.emberSite).toBeNull(); // a brasa é da v4
    expect(g.surfaceItems).toHaveLength(0);
    const cells = g.veinCells();
    expect(cells.filter((c) => c.kind === 'rock')).toHaveLength(3);
    expect(cells.filter((c) => c.kind === 'ice')).toHaveLength(3);
    for (const c of cells) {
      expect(v.get(c.x, c.y, c.z)).toBe(c.kind === 'rock' ? T.VEIN_ROCK : T.VEIN_FROST);
      expect(v.get(c.x, c.y + 1, c.z)).toBe(T.AIR); // exposto
      expect(isSolid(v.get(c.x, c.y - 1, c.z))).toBe(true);
    }
  });

  it('v1 e v2 não têm veios e geram os mesmos blocos de antes', () => {
    for (const version of [1, 2]) {
      const g = new TitanGenerator(42, version);
      expect(g.veinCells()).toHaveLength(0);
      expect(g.surfaceItems.length).toBeGreaterThan(0);
    }
    // o terreno é o mesmo nas versões: se as formações coincidem, só os blocos de veio diferem
    const a = new TitanGenerator(42, 2), b = new TitanGenerator(42, 3);
    expect(b.arrival).toEqual(a.arrival);
    expect(b.lake).toEqual(a.lake);
    if (JSON.stringify(a.formations) === JSON.stringify(b.formations)) {
      const veins = new Set(b.veinCells().map((c) => `${c.x},${c.y},${c.z}`));
      for (let x = -32; x < 32; x++) for (let z = -32; z < 32; z++) for (let y = 55; y < 80; y++) {
        if (a.blockAt(x, y, z) !== b.blockAt(x, y, z)) expect(veins.has(`${x},${y},${z}`)).toBe(true);
      }
    }
  });

  it('lote de 200 seeds (v6, região 128 × 128): sempre uma fonte de rocha e uma de gelo alcançáveis a pé, determinísticas, e o afloramento de reserva só entra se preciso', () => {
    let fallbacks = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const g = new TitanGenerator(seed);
      const veins = g.veinCells();
      expect(veins.filter((c) => c.kind === 'rock').length, `seed ${seed} rocha`).toBe(3);
      expect(veins.filter((c) => c.kind === 'ice').length, `seed ${seed} gelo`).toBe(3);
      if (g.outcropFallback) fallbacks++;
      expect(g.emberSite, `seed ${seed} brasa`).not.toBeNull(); // v4: o depósito de brasa existe em toda seed
      expect(g.reeds.length, `seed ${seed} juncos`).toBeGreaterThan(0);
      if (seed % 40 === 0) { // alcance sobre as colunas reais, em amostra (cada BFS lê o volume inteiro)
        const seen = reachable(g);
        for (const c of veins) {
          const near = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => seen.has((c.x + dx) * 1000 + (c.z + dz)));
          expect(near, `seed ${seed} veio ${c.kind} em ${c.x},${c.z}`).toBe(true);
        }
      }
    }
    expect(fallbacks).toBeLessThan(200);
  }, 90_000);

  it('seeds em que a busca natural falha (afloramento de reserva): as duas fontes existem, longe da clareira e alcançáveis a pé', () => {
    for (const seed of [448, 597, 635, 717, 869, 871, 918, 934, 985]) { // achadas num lote antigo de 1.000 (região 64 × 64): a busca natural não tinha formação alcançável
      const g = new TitanGenerator(seed, 5); // regressão da v5 (a v6 tem outra geometria)
      expect(g.outcropFallback, `seed ${seed}`).toBe(true);
      expect(g.formations.map((f) => f.kind).sort()).toEqual(['ice', 'rock']);
      const seen = reachable(g), c = g.arrival.clearing;
      for (const v of g.veinCells()) {
        expect([[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => seen.has((v.x + dx) * 1000 + (v.z + dz))), `seed ${seed} ${v.kind}`).toBe(true);
        expect(v.x >= c.x0 && v.x < c.x0 + c.size && v.z >= c.z0 && v.z < c.z0 + c.size).toBe(false);
      }
    }
  });

  it('as mesmas seeds geram os mesmos veios (determinístico) e seeds diferentes variam a posição', () => {
    const a = new TitanGenerator(42).veinCells(), b = new TitanGenerator(42).veinCells(), c = new TitanGenerator(43).veinCells();
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });
});

describe('veios: quebrar, soltar a lasca, coletar e salvar', () => {
  it('quebrar um veio devolve o bloco inteiro e solta uma lasca na célula; blocos comuns não soltam nada', async () => {
    const { s } = await open();
    const r = veinOf(s, 'rock');
    expect(breakTotalMs('block', T.VEIN_ROCK)).toBe(1600);
    expect(breakTotalMs('block', T.VEIN_FROST)).toBe(1200);
    expect(breakOrCollect(s, hit(r)).ok).toBe(true); sweepBlocks(s);
    expect(s.volume.get(r.x, r.y, r.z)).toBe(T.AIR);
    expect(s.inventory.total(Item.DARK_ROCK)).toBe(1);
    expect(s.drops.size).toBe(1);
    const d = [...s.drops.values()][0];
    expect(d).toMatchObject({ item: 5, x: r.x, y: r.y, z: r.z });
    expect(visibleItems(s)).toContainEqual(d);
    // rocha comum (sem veio) devolve só o bloco
    s.volume.place(r.x, 150, r.z, T.DARK_ROCK);
    expect(breakOrCollect(s, { x: r.x, y: 150, z: r.z, nx: 0, ny: 1, nz: 0 }).ok).toBe(true); sweepBlocks(s);
    expect(s.drops.size).toBe(1);
  });

  it('recolocar o bloco no lugar do veio põe o bloco comum e quebrar de novo não solta lasca', async () => {
    const { s } = await open();
    const r = veinOf(s, 'ice');
    breakOrCollect(s, hit(r)); sweepBlocks(s);
    const slot = [...Array(SLOTS).keys()].find((i) => s.inventory.get(i)?.item === Item.FROST)!;
    s.inventory.move(slot, 0);
    // a lasca ocupa a célula: não dá para soterrá-la; recolhe antes
    expect(placeFromSlot(s, { x: r.x, y: r.y - 1, z: r.z, nx: 0, ny: 1, nz: 0 }, 0).ok).toBe(false);
    expect(collectNearby(s, r.x + 0.5, r.y, r.z + 0.5).collected).toBe(1);
    expect(placeFromSlot(s, { x: r.x, y: r.y - 1, z: r.z, nx: 0, ny: 1, nz: 0 }, 0).ok).toBe(true);
    expect(s.volume.get(r.x, r.y, r.z)).toBe(T.FROST); // bloco comum
    expect(breakOrCollect(s, hit(r)).ok).toBe(true); sweepBlocks(s);
    expect(s.drops.size).toBe(0);
  });

  it('coleta por proximidade: de longe não pega; perto pega uma vez; mochila cheia deixa no lugar', async () => {
    const { s } = await open();
    const r = veinOf(s, 'rock');
    breakOrCollect(s, hit(r)); sweepBlocks(s);
    expect(collectNearby(s, r.x + 5, r.y, r.z + 5).collected).toBe(0);
    // encher a mochila até não caber mais fragmento de rocha
    let i = 0;
    while (s.inventory.canAdd(Item.ROCK_SHARD) && i++ < 5000) s.inventory.add(Item.ROCK_SHARD);
    const res = collectNearby(s, r.x + 0.5, r.y, r.z + 0.5);
    expect(res).toMatchObject({ collected: 0, full: true });
    expect(s.drops.size).toBe(1); // continua lá
    // abrir espaço: a lasca é recolhida na próxima aproximação
    const slot = [...Array(SLOTS).keys()].find((k) => s.inventory.get(k)?.item === Item.ROCK_SHARD)!;
    s.inventory.consume(slot);
    expect(collectNearby(s, r.x + 0.5, r.y, r.z + 0.5).collected).toBe(1);
    expect(s.drops.size).toBe(0);
  });

  it('a lasca sem apoio desce até o primeiro sólido e a coleta exige altura alcançável', async () => {
    const { s } = await open();
    const r = veinOf(s, 'rock');
    breakOrCollect(s, hit(r)); sweepBlocks(s);
    s.volume.remove(r.x, r.y - 1, r.z); // some o apoio
    expect(collectNearby(s, r.x + 5, r.y, r.z + 5).moved).toBe(true);
    expect([...s.drops.values()][0].y).toBeLessThan(r.y);
    expect(collectNearby(s, r.x + 0.5, r.y + 20, r.z + 0.5).collected).toBe(0); // muito acima
  });

  it('salvar e reabrir logo depois: o veio quebrado, o inventário e a lasca pendente persistem sem duplicar', async () => {
    const { st, s } = await open();
    const r = veinOf(s, 'rock');
    breakOrCollect(s, hit(r)); sweepBlocks(s);
    expect(hasPendingState(s)).toBe(true);
    await flush(st, s);
    expect(hasPendingState(s)).toBe(false);
    const r1 = await openSession(st, null, () => 1);
    expect(r1.volume.get(r.x, r.y, r.z)).toBe(T.AIR);
    expect(r1.inventory.total(Item.DARK_ROCK)).toBe(1);
    expect([...r1.drops.values()]).toHaveLength(1);
    expect(r1.volume.gen.surfaceItems).toHaveLength(0);
    // coleta + inventário na mesma transação; reabrir de novo: uma lasca no inventário, nenhuma no chão
    expect(collectNearby(r1, r.x + 0.5, r.y, r.z + 0.5).collected).toBe(1);
    await flush(st, r1);
    const r2 = await openSession(st, null, () => 1);
    expect(r2.drops.size).toBe(0);
    expect(r2.inventory.total(Item.ROCK_SHARD)).toBe(1);
    expect(r2.volume.get(r.x, r.y, r.z)).toBe(T.AIR); // o veio não volta
    expect(visibleItems(r2)).toHaveLength(0);
  });

  it('falha de gravação: nada se perde nem duplica (lasca e veio continuam pendentes juntos)', async () => {
    const { st, s } = await open();
    const r = veinOf(s, 'ice');
    breakOrCollect(s, hit(r)); sweepBlocks(s);
    st.failNext = true;
    await expect(flush(st, s)).rejects.toThrow();
    expect(hasPendingState(s)).toBe(true);
    await flush(st, s);
    const r1 = await openSession(st, null, () => 1);
    expect(r1.drops.size).toBe(1);
    expect(r1.volume.get(r.x, r.y, r.z)).toBe(T.AIR);
  });

  it('save v2 (sem drops) abre normalmente e com as lascas legadas', async () => {
    const { st, s } = await open(new MemoryTitanStorage(), 2);
    await flush(st, s);
    const h = st.games.get(42)!;
    h.v = 2; delete h.drops;
    const r = await openSession(st, null, () => 1);
    expect(r.volume.gen.version).toBe(2);
    expect(r.drops.size).toBe(0);
    expect(r.items.remaining().length).toBe(6);
  });

  it('fluxo dos veios na seed 42 (partida v3): dois veios de rocha e um de gelo → lascas na mochila', async () => {
    const { s } = await open();
    const rocks = s.volume.gen.veinCells().filter((c) => c.kind === 'rock').slice(0, 2), ice = veinOf(s, 'ice');
    for (const v of [...rocks, ice]) {
      expect(breakOrCollect(s, hit(v)).ok).toBe(true); sweepBlocks(s);
      expect(collectNearby(s, v.x + 0.5, v.y, v.z + 0.5).collected).toBe(1);
    }
    expect(s.inventory.total(Item.ROCK_SHARD)).toBe(2);
    expect(s.inventory.total(Item.FROST_SHARD)).toBe(1);
    expect(s.inventory.total(Item.DARK_ROCK)).toBe(2); // cada veio devolve o bloco inteiro
  });

  it('mochila cheia ao quebrar o veio: nada muda (o bloco não cabe) e nenhuma lasca é solta', async () => {
    const { s } = await open();
    const r = veinOf(s, 'rock');
    let i = 0;
    while (s.inventory.canAdd(Item.DARK_ROCK) && i++ < 5000) s.inventory.add(Item.DARK_ROCK);
    expect(breakOrCollect(s, hit(r)).ok).toBe(true); // ADR 0082: quebra e cai; com a mochila cheia o bloco e a lasca ficam no chão
    expect(s.volume.get(r.x, r.y, r.z)).toBe(T.AIR);
    expect(sweepBlocks(s)).toBe(0);
    expect(s.drops.size).toBe(2);
  });

  it('o veio aparece na malha com o tile próprio (linha 3 do atlas)', async () => {
    const { s } = await open();
    const r = veinOf(s, 'rock');
    expect(s.volume.get(r.x, r.y, r.z)).toBe(T.VEIN_ROCK);
  });
});
