import { SUBDIV } from '../config';
import { describe, expect, it } from 'vitest';
import { Block } from '../world/blocks';
import { mulberry32 } from '../world/random';
import { World } from '../world/world';
import { Entities } from './entities';
import { Inventory } from './inventory';
import { Player } from './player';
import { Exploration } from './exploration';
import { applySave, captureSave, migrate, rescaleSave, SAVE_VERSION, SaveStore } from './save';
import { Sheep } from './sheep';

function session(seed = 42) {
  const world = new World(seed);
  const [sx, sy] = world.outsideGate();
  const player = new Player(sx + 0.5, sy + 0.6);
  const entities = new Entities(player, mulberry32(1));
  entities.spawnMonsters(world);
  const inventory = new Inventory();
  const exploration = new Exploration();
  return { world, player, entities, inventory, exploration, sx, sy };
}

/** Células de grama livres perto do spawn (para as edições do teste). */
function grassCells(w: World, sx: number, sy: number, n: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  const soil = new Set<number>([Block.GRASS, Block.DIRT]);
  for (let r = 2; r < 40 && out.length < n; r++) {
    for (let dy = -r; dy <= r && out.length < n; dy++) {
      for (let dx = -r; dx <= r && out.length < n; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const [x, y] = [sx + dx, sy + dy];
        if (!soil.has(w.getGround(x, y)) || w.getObject(x, y) !== Block.AIR || w.isProtected(x, y)) continue;
        if (!out.some(([ox, oy]) => Math.abs(ox - x) + Math.abs(oy - y) < 3)) out.push([x, y]);
      }
    }
  }
  return out;
}

/** Storage em memória (o do navegador não existe no Node). */
function memoryStorage(): Storage {
  const m = new Map<string, string>();
  return {
    get length() { return m.size; },
    clear: () => m.clear(),
    getItem: (k) => m.get(k) ?? null,
    key: (i) => [...m.keys()][i] ?? null,
    removeItem: (k) => void m.delete(k),
    setItem: (k, v) => void m.set(k, String(v)),
  };
}

describe('Salvamento automático', () => {
  it('limita a altura do personagem ao máximo da pilha (4 níveis = 1 célula)', () => {
    const a = session();
    const [x,y] = grassCells(a.world,a.sx,a.sy,1)[0];
    expect(a.world.placeBlock(x,y,Block.STONE)).toBe(true);
    expect(a.world.placeBlock(x,y,Block.STONE)).toBe(true);
    a.player.x = x + 0.5;
    a.player.y = y + 0.5;
    a.player.z = 2;
    const save = captureSave({...a,time:0.5,selected:null,hotbar:null});
    save.player.z = 9; // altura impossível (save adulterado/antigo)
    const b = session();
    applySave(save,{...b,time:0,selected:null,hotbar:null},mulberry32(7));
    expect(b.world.stackHeight(x,y)).toBe(2);
    expect(b.player.z).toBe(2); // fica na altura da pilha (2 blocos)
    expect(b.player.visualZ).toBe(0.5); // 2 níveis = meia célula
  });

  it('ida e volta: mapa editado, plantação, heroína, inventário, ovelhas, monstros e hora do dia', () => {
    const a = session();
    const { world, player, entities, inventory, exploration, sx, sy } = a;
    // Edições: cubo empilhado, buraco, trigo plantado e um bloco num chunk distante.
    const [[ax, ay], [hx, hy], [px, py]] = grassCells(world, sx, sy, 3);
    expect(world.placeBlock(ax, ay, Block.STONE)).toBe(true);
    expect(world.placeBlock(ax, ay, Block.OAK_LOG)).toBe(true);
    world.breakBlock(hx, hy);
    expect(world.till(px, py)).toBe(true);
    expect(world.plant(px, py)).toBe(true);
    const far = grassCells(world, sx + 40, sy + 40, 1)[0];
    world.placeBlock(far[0], far[1], Block.SAND);
    player.x += 1.25;
    player.hp = 6;
    player.hunger = 42;
    player.facing = 'left';
    inventory.add('silk', 4);
    inventory.take('wheat_seed');
    entities.npcs.push(new Sheep(sx + 1.5, sy + 1.5, sx, sy, mulberry32(2), true));
    entities.npcs[0].love = 12;
    const hurt = entities.monsters[1];
    hurt.hp -= 1;
    const killedKind = entities.monsters[2].kind;
    while (entities.monsters[2].kind === killedKind && entities.monsters[2].hp > 0) {
      entities.monsters[2].hp = 1;
      player.x = entities.monsters[2].x; player.y = entities.monsters[2].y - 1; player.facing = 'down';
      entities.strike('down', world);
    }
    player.x = sx + 0.5; player.y = sy + 0.6; player.facing = 'left';
    exploration.revealAround(sx, sy, 5);
    entities.body = 'mila';
    const data = JSON.parse(JSON.stringify(captureSave({ world, player, entities, inventory, exploration, time: 0.62, selected: 3, hotbar: ['tool:sword', null, 'block:20', null, null, null, null, 'silk'] })));
    expect(data.v).toBe(SAVE_VERSION);

    const b = session();
    const r = applySave(data, { world: b.world, player: b.player, entities: b.entities, inventory: b.inventory, exploration: b.exploration, time: 0, selected: null, hotbar: null }, mulberry32(5));
    expect(r).toEqual({ time: 0.62, selected: 3, droppedBlocks: 0 });
    expect(b.world.stackHeight(ax, ay)).toBe(2);
    expect(b.world.getLevel(ax, ay, 1)).toBe(Block.OAK_LOG);
    expect(b.world.getGround(hx, hy)).toBe(Block.HOLE);
    expect(b.world.getObject(px, py)).toBe(Block.WHEAT_0);
    expect(b.world.cropCount).toBe(1); // plantação volta a crescer
    expect(b.world.getObject(far[0], far[1])).toBe(Block.SAND);
    expect([b.player.x, b.player.y, b.player.hp, b.player.facing]).toEqual([sx + 0.5, sy + 0.6, 6, 'left']);
    expect(b.inventory.count('silk')).toBe(4);
    expect(b.entities.body).toBe('mila');
    expect(b.player.hunger).toBe(42);
    expect(b.exploration.count).toBe(exploration.count);
    expect(b.exploration.isExplored(sx, sy)).toBe(true);
    expect(b.inventory.count('wheat_seed')).toBe(inventory.count('wheat_seed'));
    expect(b.entities.npcs).toHaveLength(entities.npcs.length);
    expect(b.entities.npcs.some((s) => s.baby)).toBe(true);
    expect(b.entities.monsters).toHaveLength(entities.monsters.length);
    expect(b.entities.monsters.find((m) => m.x === hurt.x && m.y === hurt.y)?.hp).toBe(hurt.hp);
    expect(b.entities.respawns).toHaveLength(entities.respawns.length);
    expect(b.entities.respawns[0].kind).toBe(killedKind);
  });

  it('SaveStore: um salvamento por seed, ponteiro para a última e tolerância a armazenamento bloqueado', () => {
    const storage = memoryStorage();
    const store = new SaveStore('principal', storage);
    expect(store.available).toBe(true);
    expect(store.lastSeed()).toBeNull();
    const s1 = session(42);
    const s2 = session(7);
    const d1 = captureSave({ ...s1, time: 0.3, selected: null, hotbar: null });
    const d2 = captureSave({ ...s2, time: 0.5, selected: 1, hotbar: null });
    expect(store.save(d1)).toBe(true);
    expect(store.save(d2)).toBe(true);
    expect(store.lastSeed()).toBe(7);
    expect(store.load(42)?.time).toBe(0.3);
    expect(store.load(7)?.selected).toBe(1);
    expect(new SaveStore('titan', storage).load(42)).toBeNull(); // outro mundo
    store.clear(42);
    expect(store.load(42)).toBeNull();
    expect(store.load(7)).not.toBeNull();
    // v1 (antes da coleta) → v2: ganha ferramentas, 1 porta e a grade inicial.
    const v1 = migrate({ ...d2, v: 1, hotbar: undefined, inventory: { wheat: 3 } })!;
    expect(v1.v).toBe(SAVE_VERSION);
    expect(v1.inventory['tool:axe']).toBe(1);
    expect(v1.inventory['block:28']).toBe(1);
    expect(v1.inventory.wheat).toBe(3);
    expect(v1.hotbar?.slice(0, 2)).toEqual(['tool:sword', 'tool:hoe']);
    // v4 → v5 (vida com números): heroína de meios corações para pontos; monstros de golpes para pontos.
    const v4 = migrate({
      ...d2, v: 4, player: { ...d2.player, hp: 6 },
      dungeon: { monsters: [{ kind: 'spider-big', x: 0, y: 0, homeX: 0, homeY: 0, hp: 2 }], respawns: [] },
    })!;
    expect(v4.v).toBe(SAVE_VERSION);
    expect(v4.player.hp).toBe(60);
    expect('look' in v4).toBe(false); // v11 → v12: o chibi saiu, o campo some
    expect(v4.explored).toEqual([]); // v6 → v7: minimapa começa coberto (v5 → v6: quem já jogava continua com a heroína)
    expect(v4.dungeon).toBeNull();
    expect(v4.player.hunger).toBe(100); // v8 → v9: quem já jogava começa satisfeito // v7 → v8: covil mudou de lugar, as aranhas voltam completas
    // Versão desconhecida → começa do zero; armazenamento bloqueado → jogo segue sem salvar.
    expect(migrate({ ...d2, v: 999 })).toBeNull();
    storage.setItem('mundoblocos:save:principal:9', '{quebrado');
    expect(store.load(9)).toBeNull();
    const blocked = new SaveStore('principal', null);
    expect(blocked.available).toBe(false);
    expect(blocked.save(d1)).toBe(false);
    expect(blocked.load(42)).toBeNull();
  });

  it('ao carregar, heroína presa dentro de um objeto (salvamento antigo) vai para a célula livre mais perto', () => {
    const a = session();
    const { world, player } = a;
    const [cx, cy] = [Math.floor(player.x), Math.floor(player.y)];
    world.setObject(cx, cy, Block.STONE); // objeto sob os pés
    const data = JSON.parse(JSON.stringify(captureSave({ ...a, time: 0.3, selected: null, hotbar: null })));
    const b = session();
    applySave(data, { world: b.world, player: b.player, entities: b.entities, inventory: b.inventory, time: 0, selected: null, hotbar: null });
    expect(b.player.isStuck(b.world)).toBe(false);
  });

  it('baús e tenda vão e voltam no salvamento', () => {
    const a = session();
    const [x, y] = grassCells(a.world, a.sx, a.sy, 1)[0];
    expect(a.world.placeBlock(x, y, Block.CHEST)).toBe(true);
    a.world.chestAt(x, y)![0] = { item: 'fang', count: 2 };
    a.world.tent = [x + 5, y];
    const data = JSON.parse(JSON.stringify(captureSave({ ...a, time: 0.3, selected: null, hotbar: null })));
    const b = session();
    applySave(data, { world: b.world, player: b.player, entities: b.entities, inventory: b.inventory, time: 0, selected: null, hotbar: null });
    expect(b.world.chestAt(x, y)![0]).toEqual({ item: 'fang', count: 2 });
    expect(b.world.tent).toEqual([x + 5, y]);
  });
});

describe('Salvamento na grade fina (ADR 0032, F6: v16)', () => {
  function saved() {
    const a = session();
    const [x, y] = grassCells(a.world, a.sx, a.sy, 1)[0];
    a.world.placeBlock(x, y, Block.STONE);
    a.world.placeBlock(x + 1, y, Block.CHEST);
    a.world.chests.set(`${x + 1},${y}`, Array.from({ length: 27 }, () => null));
    a.world.tent = [x + 2, y];
    a.exploration.reveal(x, y);
    a.entities.npcs.push(new Sheep(x + 0.5, y + 3.5));
    const d = captureSave({ ...a, time: 0.3, selected: null, hotbar: null });
    return { d, x, y };
  }

  it('o salvamento diz a grade (sub) e v15 migra para v16 como grade 1', () => {
    const { d } = saved();
    expect(SAVE_VERSION).toBe(22);
    expect(d.sub).toBe(SUBDIV);
    const { sub: _s, ...rest } = d;
    expect(migrate({ ...rest, v: 15 })?.sub).toBe(1);
  });

  it('rescaleSave dobra tudo o que tem lugar: chunks, jogador, tenda, baús, névoa, ovelhas', () => {
    const { d, x, y } = saved();
    const f = rescaleSave({ ...d, sub: 1 }, 2); // (a função é pura: serve qualquer salvamento de grade 1)
    expect(f.sub).toBe(2);
    expect(f.chunks.length).toBeGreaterThanOrEqual(d.chunks.length * 4);
    expect(f.player.x).toBe(d.player.x * 2);
    expect(f.player.y).toBe(d.player.y * 2);
    expect(f.tent).toEqual([(x + 2) * 2, y * 2 + 1]);
    expect(f.chests[0]).toMatchObject({ x: (x + 1) * 2, y: y * 2 + 1 });
    expect(f.explored.length).toBeGreaterThan(0);
    expect(f.sheep.at(-1)).toMatchObject({ x: (x + 0.5) * 2, y: (y + 3.5) * 2 });
    expect(f.inventory).toEqual(d.inventory);
    expect(f.hotbar).toEqual(d.hotbar);
  });

  it('mesma grade devolve o próprio salvamento; grade mais fina que a pedida é erro', () => {
    const { d } = saved();
    expect(rescaleSave(d, d.sub)).toBe(d);
    expect(() => rescaleSave({ ...d, sub: SUBDIV + 1 }, SUBDIV)).toThrow();
  });

  it('um arquivo de grade mais fina não é aberto nem sobrescrito por um jogo da grade antiga', () => {
    const { d } = saved();
    const storage = memoryStorage();
    const store = new SaveStore('principal', storage);
    const fine = JSON.stringify({ ...d, sub: SUBDIV + 1 }); // mais fina que a deste jogo
    storage.setItem(`mundoblocos:save:principal:${d.seed}`, fine);
    expect(store.load(d.seed)).toBeNull();
    expect(store.save(d)).toBe(false); // bloqueado: o arquivo fino continua intacto
    expect(storage.getItem(`mundoblocos:save:principal:${d.seed}`)).toBe(fine);
    // outra seed segue normal
    expect(store.save({ ...d, seed: d.seed + 1 })).toBe(true);
  });
});
