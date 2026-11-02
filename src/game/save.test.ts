import { describe, expect, it } from 'vitest';
import { Block } from '../world/blocks';
import { mulberry32 } from '../world/random';
import { World } from '../world/world';
import { Entities } from './entities';
import { Inventory } from './inventory';
import { Player } from './player';
import { applySave, captureSave, migrate, SAVE_VERSION, SaveStore } from './save';
import { Sheep } from './sheep';

function session(seed = 42) {
  const world = new World(seed);
  const [sx, sy] = world.findSpawn();
  const player = new Player(sx + 0.5, sy + 0.6);
  const entities = new Entities(player, mulberry32(1));
  entities.spawnMonsters(world);
  const inventory = new Inventory();
  return { world, player, entities, inventory, sx, sy };
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
  it('ida e volta: mapa editado, plantação, heroína, inventário, ovelhas, monstros e hora do dia', () => {
    const a = session();
    const { world, player, entities, inventory, sx, sy } = a;
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
    const data = JSON.parse(JSON.stringify(captureSave({ world, player, entities, inventory, time: 0.62, selected: 3, hotbar: ['tool:sword', null, 'block:20', null, null, null, null, 'silk'] })));
    expect(data.v).toBe(SAVE_VERSION);

    const b = session();
    const r = applySave(data, { world: b.world, player: b.player, entities: b.entities, inventory: b.inventory, time: 0, selected: null, hotbar: null }, mulberry32(5));
    expect(r).toEqual({ time: 0.62, selected: 3 });
    expect(b.world.stackHeight(ax, ay)).toBe(2);
    expect(b.world.getLevel(ax, ay, 1)).toBe(Block.OAK_LOG);
    expect(b.world.getGround(hx, hy)).toBe(Block.HOLE);
    expect(b.world.getObject(px, py)).toBe(Block.WHEAT_0);
    expect(b.world.cropCount).toBe(1); // plantação volta a crescer
    expect(b.world.getObject(far[0], far[1])).toBe(Block.SAND);
    expect([b.player.x, b.player.y, b.player.hp, b.player.facing]).toEqual([sx + 0.5, sy + 0.6, 6, 'left']);
    expect(b.inventory.count('silk')).toBe(4);
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
    expect(new SaveStore('santuario', storage).load(42)).toBeNull(); // outro mundo
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

