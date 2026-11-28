import { describe, expect, it } from 'vitest';
import { TITAN_ROOMS, TITAN_PROTOCOL_VERSION } from '../../net/titan/protocol';
import { TitanRoom } from '../../net/titan/room';
import { collides } from '../physics';
import { faunaSpecs } from '../fauna';
import { MemoryTitanStorage } from '../save';
import { openSession } from '../session';
import { FENCE_KINDS, GATE_KINDS, fenceId, gateId, isFence, isGate, T, WALL_E, WALL_W } from '../voxel';
import { meshSection } from '../mesher';
import { CAMP_TREE_R, COSTA_CAMP_SITES, COSTA_GENERATOR_VERSION, COSTA_LEGACY_VERSION, CostaGenerator, ORVALIS_GENERATOR_VERSION, OrvalisGenerator, orvalisGeneratorFor } from './generator';
import { COSTA_PLAN } from './costaData';

/** Aldeia da Costa (ADR 0142): o mapa feito à mão da sala 102. */
const gen = new CostaGenerator(128064);
const top = (x: number, z: number): number => gen.column(x, z).top;

describe('aldeia da costa (ADR 0142)', () => {
  it('as versões 101 e 100 abrem o mapa da aldeia; as versões 1–6 seguem o relevo por ruído (a partida individual não muda)', () => {
    expect(orvalisGeneratorFor(1, COSTA_GENERATOR_VERSION)).toBeInstanceOf(CostaGenerator); expect(orvalisGeneratorFor(1, COSTA_LEGACY_VERSION)).toBeInstanceOf(CostaGenerator);
    expect(orvalisGeneratorFor(1, ORVALIS_GENERATOR_VERSION)).not.toBeInstanceOf(CostaGenerator);
    expect(orvalisGeneratorFor(1, ORVALIS_GENERATOR_VERSION)).toBeInstanceOf(OrvalisGenerator);
    expect(orvalisGeneratorFor(1, 7)).toBeNull(); expect(orvalisGeneratorFor(1, 99)).toBeNull(); expect(orvalisGeneratorFor(1, 103)).toBeNull();
    expect(new OrvalisGenerator(1).version).toBe(ORVALIS_GENERATOR_VERSION);
    expect(gen.version).toBe(COSTA_GENERATOR_VERSION); expect(gen.world).toBe('orvalis');
  });

  it('terreno do heightmap: mar em Y 63 em volta, platô da aldeia em Y 70, borda submersa, pedra ao norte, areia e trilha', () => {
    const [x0, z0, x1, z1] = [-15, -1, 29, 35];
    for (let z = z0 + 1; z < z1; z += 5) for (let x = x0 + 1; x < x1; x += 5) expect(top(x, z)).toBe(COSTA_PLAN.soloY);
    for (let i = -64; i < 64; i++) for (const [x, z] of [[i, -64], [i, 63], [-64, i], [63, i]] as const) { expect(top(x, z)).toBeLessThanOrEqual(63); expect(gen.blockAt(x, 63, z)).toBe(T.LAKE); }
    expect(gen.blockAt(0, -64, 0)).toBe(T.BEDROCK);
    expect(gen.column(-30, -30).surface).toBe(T.STONE); // encostas de pedra ao norte
    expect(gen.column(7, 36).surface).toBe(T.PATH); expect(gen.column(7, 49).surface).toBe(T.BEACH); // trilha até a praia
    expect(gen.column(-9, 6).surface).toBe(T.FARMLAND_DRY); // talhão 1
    expect(gen.column(-8, 26).surface).toBe(T.PLANKS_OAK); // base da Casa 1: só piso
    expect(gen.blockAt(-8, 71, 26)).toBe(T.AIR); // e nada em cima
    expect(gen.inRegion(-64, -64) && gen.inRegion(63, 63) && !gen.inRegion(64, 0)).toBe(true);
  });

  it('muro de pedra lisa (cubos, Y 71–74) com os dois vãos livres dos portões', () => {
    for (const [x, z] of COSTA_PLAN.muro.celulas) for (let y = 71; y <= 74; y++) expect(gen.blockAt(x, y, z)).toBe(T.STONE_SMOOTH);
    expect(gen.blockAt(-15, 70, 10)).not.toBe(T.AIR); expect(gen.blockAt(-15, 75, 10)).not.toBe(T.STONE_SMOOTH); // o muro tem 4 blocos
    for (const g of COSTA_PLAN.portoes) for (let x = g.x[0]; x <= g.x[1]; x++) for (let y = 71; y <= 74; y++) expect(gen.blockAt(x, y, g.z)).toBe(T.AIR);
  });

  it('cercas de carvalho ligadas entre si e porteiras (portão de carvalho fechado) nos vãos dos cercados', () => {
    for (const [x, z] of COSTA_PLAN.cercas.celulas) { const id = gen.blockAt(x, 71, z); expect(isFence(id) && id >= T.FENCE_OAK && id < T.FENCE_OAK + 16).toBe(true); }
    expect(gen.blockAt(13, 71, 25)).toBe(fenceId(0, WALL_E | WALL_W)); // trecho reto leste–oeste do cercado A
    const [px, pz] = COSTA_PLAN.cercados[0].porteira, g = gen.blockAt(px, 71, pz);
    expect(isGate(g) && g === gateId(0, 0, false)).toBe(true); // porteira no vão da cerca, painel em X
    expect(gen.blockAt(px - 1, 71, pz)).toBe(fenceId(0, WALL_E | WALL_W)); // a cerca ao lado liga à porteira
    expect(gen.blockAt(12, 71, 26)).toBe(fenceId(0, 1 | 4)); // lateral oeste do cercado A: norte e sul
  });

  it('árvores: só carvalho, nas posições do mapa (nenhuma cerejeira nem bétula)', () => {
    let logs = 0, other = 0;
    for (let z = -64; z < 64; z += 1) for (let x = -64; x < 64; x += 1) for (let y = top(x, z) + 1; y <= top(x, z) + 10; y++) {
      const b = gen.blockAt(x, y, z);
      if (b === T.LOG_OAK) logs++;
      else if (b === T.LOG_CHERRY || b === T.LOG_BIRCH || b === T.LEAVES_CHERRY || b === T.LEAVES_BIRCH) other++;
    }
    const kept = COSTA_PLAN.arvores.filter(([x, z]) => !COSTA_CAMP_SITES.some((c) => Math.hypot(x - c.x, z - c.z) <= CAMP_TREE_R)); // sem árvore em volta dos acampamentos (ADR 0147)
    expect(kept.length).toBeLessThan(COSTA_PLAN.arvores.length); expect(kept.length).toBeGreaterThan(COSTA_PLAN.arvores.length - 30);
    expect(logs).toBeGreaterThanOrEqual(kept.length * 4); expect(other).toBe(0);
    for (const [x, z] of kept.slice(0, 10)) expect(gen.blockAt(x, top(x, z) + 1, z)).toBe(T.LOG_OAK);
  });

  it('chegada no portão da praia, de pé sobre o chão e voltada para o norte', () => {
    const a = gen.arrival;
    expect(a.x).toBe(7.5); expect(a.z).toBe(35.5); expect(a.y).toBe(71); expect(a.yaw).toBe(0);
    expect(gen.blockAt(7, 70, 35)).not.toBe(T.AIR); expect(gen.blockAt(7, 71, 35)).toBe(T.AIR); expect(gen.blockAt(7, 72, 35)).toBe(T.AIR);
  });

  it('o jogador nasce em pé no portão, sem colidir, e cai no chão se o portão for atravessado', async () => {
    const sess = await openSession(new MemoryTitanStorage(), 128064, () => 1, orvalisGeneratorFor, COSTA_GENERATOR_VERSION, (sd) => new CostaGenerator(sd)), a = sess.volume.gen.arrival;
    expect(collides(sess.volume, a.x, a.y, a.z)).toBe(false); expect(collides(sess.volume, a.x, a.y - 0.5, a.z)).toBe(true);
  });

  it('fauna: a criação dos cercados (3 galinhas + 1 porco; 2 vacas + 2 ovelhas) e os grupos espalhados pelo pasto', () => {
    const specs = faunaSpecs(gen), farm = specs.filter((s) => s.id.startsWith('fc'));
    expect(farm.length).toBe(8);
    expect(farm.filter((s) => s.kind === 'galinha').length).toBe(3); expect(farm.filter((s) => s.kind === 'vaca').length).toBe(2);
    for (const f of farm) { const pen = f.id.startsWith('fc0') ? COSTA_PLAN.cercados[0].caixa : COSTA_PLAN.cercados[1].caixa; expect(f.x > pen[0] && f.x < pen[2] && f.z > pen[1] && f.z < pen[3]).toBe(true); expect(gen.blockAt(f.x, f.y - 1, f.z)).toBe(T.GRASS); }
    expect(specs.length).toBeGreaterThan(8); // além dos da criação, os grupos espalhados pela regra atual
  });

  it('sala 102: Aldeia da Costa (seed 128064, protocolo 7); só abre o próprio arquivo; a partida individual não muda', async () => {
    const def = TITAN_ROOMS.find((r) => r.id === 102)!;
    expect(def).toMatchObject({ seed: 128064, world: 'orvalis', terrain: 'costa' }); expect(TITAN_PROTOCOL_VERSION).toBeGreaterThanOrEqual(6);
    const room = new TitanRoom(def.id, def.name, def.seed, () => 0.5, def.world, def.terrain);
    expect(room.world.volume.gen.version).toBe(COSTA_GENERATOR_VERSION);
    const snap = JSON.parse(JSON.stringify(room.snapshot()));
    expect(snap.header.generatorVersion).toBe(COSTA_GENERATOR_VERSION);
    const v100 = JSON.parse(JSON.stringify(snap)); v100.header.generatorVersion = COSTA_LEGACY_VERSION; // o arquivo salvo da sala 102 sem acampamentos: recusado, a sala começa de novo (descarte aprovado pelo dono; o servidor guarda cópia .bak)
    expect(new TitanRoom(102, 'x', 128064, () => 0.5, 'orvalis', 'costa').restore(v100)).toBe(false);
    expect(new TitanRoom(102, 'x', 128064, () => 0.5, 'orvalis', 'costa').restore(snap)).toBe(true);
    expect(new TitanRoom(102, 'x', 128064, () => 0.5, 'orvalis').restore(snap)).toBe(false); // sala por ruído não abre arquivo da aldeia
    const old = new TitanRoom(102, 'x', 20261127, () => 0.5, 'orvalis'); // o arquivo antigo da sala 102 (relevo por ruído) não abre na aldeia
    expect(new TitanRoom(102, 'x', 128064, () => 0.5, 'orvalis', 'costa').restore(JSON.parse(JSON.stringify(old.snapshot())))).toBe(false);
    const s = await openSession(new MemoryTitanStorage(), 42, () => 1, orvalisGeneratorFor, ORVALIS_GENERATOR_VERSION, (sd, v) => new OrvalisGenerator(sd, v));
    expect(s.volume.gen.version).toBe(ORVALIS_GENERATOR_VERSION); expect(s.volume.gen).not.toBeInstanceOf(CostaGenerator);
  });
});

describe('horta da aldeia e planta imatura (ADR 0144)', () => {
  it('a partida nova da aldeia traz cenoura no talhão 1 e batata no talhão 2, em xadrez, com idades sorteadas; o talhão 3 fica livre', async () => {
    const crops = gen.startCrops, [t1, t2, t3] = COSTA_PLAN.talhoes.map((t) => t.caixa);
    const inBox = (c: { x: number; z: number }, b: readonly number[]): boolean => c.x >= b[0] && c.x <= b[2] && c.z >= b[1] && c.z <= b[3];
    expect(crops.length).toBeGreaterThan(20);
    expect(crops.every((c) => (c.x + c.z) % 2 === 0 && c.age >= 0 && c.age <= 7 && gen.column(c.x, c.z).surface === T.FARMLAND_DRY && c.y === gen.column(c.x, c.z).top + 1)).toBe(true);
    expect(crops.filter((c) => inBox(c, t1)).every((c) => c.species === 'cenoura') && crops.filter((c) => inBox(c, t2)).every((c) => c.species === 'batata')).toBe(true);
    expect(crops.some((c) => inBox(c, t3))).toBe(false);
    expect(new Set(crops.map((c) => c.age)).size).toBeGreaterThan(3); // umas maduras, outras crescendo
    const s = await openSession(new MemoryTitanStorage(), 128064, () => 1, orvalisGeneratorFor, COSTA_GENERATOR_VERSION, (sd) => new CostaGenerator(sd));
    expect(s.crops.size).toBe(crops.length);
    const room = new TitanRoom(102, 'x', 128064, () => 0.5, 'orvalis', 'costa'); expect(room.world.crops.size).toBe(crops.length);
    expect((new OrvalisGenerator(1) as { startCrops?: unknown }).startCrops).toBeUndefined(); // a partida individual não traz horta pronta
  });
});

describe('modelos do gerador na aldeia (cercas e porteiras visíveis)', () => {
  it('malhar as seções da aldeia registra cada cerca e porteira como instância de modelo (antes ficavam invisíveis)', async () => {
    const s = await openSession(new MemoryTitanStorage(), 128064, () => 1, orvalisGeneratorFor, COSTA_GENERATOR_VERSION, (sd) => new CostaGenerator(sd));
    for (let cx = -1; cx <= 2; cx++) for (let cz = 0; cz <= 2; cz++) for (let sy = 7; sy <= 8; sy++) meshSection(s.volume, cx, sy, cz); // as seções Y 64–95 em volta dos cercados (X −16…47, Z 0…47)
    const fences = FENCE_KINDS.flatMap((k) => s.volume.modelCells(k)), gates = GATE_KINDS.flatMap((k) => s.volume.modelCells(k));
    expect(fences.length).toBe(COSTA_PLAN.cercas.celulas.length); expect(gates.length).toBe(COSTA_PLAN.cercados.length);
    const [px, pz] = COSTA_PLAN.cercados[0].porteira; expect(gates.some((g) => g[0] === px && g[2] === pz)).toBe(true);
    s.volume.remove(COSTA_PLAN.cercas.celulas[0][0], 71, COSTA_PLAN.cercas.celulas[0][1]); // quebrar uma cerca tira a instância
    expect(FENCE_KINDS.flatMap((k) => s.volume.modelCells(k)).length).toBe(COSTA_PLAN.cercas.celulas.length - 1);
  });
});
