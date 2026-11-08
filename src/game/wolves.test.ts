import { describe, expect, it } from 'vitest';
import { isWolf, WOLF_KINDS } from '../world/dungeon';
import { MONSTER_STATS } from '../world/progression';
import { Item, ITEMS, monsterDrops } from '../world/items';
import { mulberry32 } from '../world/random';
import { grow } from '../world/town';
import { WORLD_PROFILES } from '../world/profiles';
import { World } from '../world/world';
import { WOLF_ROAM, WOLF_TOWN_CLEARANCE, wolfPacks } from '../world/wolves';
import { Entities } from './entities';
import { Monster, MONSTERS, WOLF_SIGHT } from './monster';
import { Player } from './player';
import { applySave, captureSave, migrate } from './save';
import { Exploration } from './exploration';
import { Inventory } from './inventory';

/** Lobo solto em chão aberto perto do portão, com a personagem a `dist` células dele (em x). */
function arena(dist: number, kind: 'wolf-brown' | 'wolf-gray' | 'wolf-white' = 'wolf-gray') {
  const w = new World(42);
  const [gx, gy] = w.outsideGate();
  // Faixa livre (8 células em x, 3 em y, sem objeto e sem desnível) logo ao sul do portão.
  let x = gx + 0.5, y = gy + 6.5;
  search: for (let dy = 5; dy < 60; dy++) {
    for (let dx = -12; dx <= 12; dx++) {
      let ok = true;
      for (let ox = 0; ox < 8 && ok; ox++) for (let oy = -1; oy <= 1 && ok; oy++) ok = w.standHeight(gx + dx + ox, gy + dy + oy) === 0 && w.getObject(gx + dx + ox, gy + dy + oy) === 0;
      if (ok) { x = gx + dx + 0.5; y = gy + dy + 0.5; break search; }
    }
  }
  const p = new Player(x + dist, y);
  const e = new Entities(p, mulberry32(3));
  const wolf = new Monster(kind, x, y, { x0: x - 30, y0: y - 30, x1: x + 30, y1: y + 30 }, mulberry32(5));
  e.monsters.push(wolf);
  return { w, e, p, wolf };
}

describe('Lobos: bandos pelo mapa', () => {
  const packs = wolfPacks(new World(42));

  it('há bandos de 1 a 3 lobos da mesma cor, nas três cores, e o mapa é sempre o mesmo', () => {
    expect(packs.length).toBeGreaterThan(15);
    const byDen = new Map<string, typeof packs>();
    for (const s of packs) byDen.set(`${s.homeX},${s.homeY}`, [...(byDen.get(`${s.homeX},${s.homeY}`) ?? []), s]);
    for (const members of byDen.values()) {
      expect(members.length).toBeGreaterThanOrEqual(1);
      expect(members.length).toBeLessThanOrEqual(3);
      expect(new Set(members.map((m) => m.kind)).size).toBe(1); // bando de uma cor só
    }
    const sizes = new Set([...byDen.values()].map((m) => m.length));
    expect(sizes).toEqual(new Set([1, 2, 3]));
    expect(new Set(packs.map((s) => s.kind))).toEqual(new Set(WOLF_KINDS));
    expect(wolfPacks(new World(42))).toEqual(packs); // determinístico
    expect(wolfPacks(new World(43))).not.toEqual(packs); // outra seed, outros bandos
  });

  it('nenhum nasce na cidade, na estrada do portão, no campo do rebanho, em água, árvore ou área protegida', () => {
    const w = new World(42);
    const t = w.town!;
    const keep = grow({ ...t.area, y1: t.area.y1 + 28 }, WOLF_TOWN_CLEARANCE - 1);
    for (const s of packs) {
      const [cx, cy] = [Math.floor(s.x), Math.floor(s.y)];
      expect(cx >= keep.x0 && cx <= keep.x1 && cy >= keep.y0 && cy <= keep.y1, `${cx},${cy}`).toBe(false);
      expect(w.isProtected(cx, cy)).toBe(false);
      expect(w.isWalkable(cx, cy), `${cx},${cy}`).toBe(true);
      expect(Math.hypot(s.x - s.homeX, s.y - s.homeY)).toBeLessThan(4);
    }
  });

  it('lobos soltam pelagem (sempre, 1 ou 2) e, às vezes, uma presa; os itens são espólios', () => {
    expect(ITEMS.wolf_fang.name).toBe('Presa de Lobo');
    expect(ITEMS.wolf_pelt.name).toBe('Pelagem de Lobo');
    expect(ITEMS.wolf_fang.loot && ITEMS.wolf_pelt.loot).toBe(true);
    for (const k of WOLF_KINDS) {
      expect(monsterDrops(k, () => 0)).toEqual([{ item: Item.WOLF_PELT, count: 2 }, { item: Item.WOLF_FANG, count: 1 }]);
      expect(monsterDrops(k, () => 0.99)).toEqual([{ item: Item.WOLF_PELT, count: 1 }]);
    }
  });

  it('mundo sem cidade (Santuário) não tem lobos', () => {
    expect(wolfPacks(new World(1, WORLD_PROFILES.santuario))).toEqual([]);
  });

  it('o jogo põe todos no mapa (e nenhum na dungeon); lobo é monstro com ficha e comportamento', () => {
    const w = new World(42);
    const e = new Entities(new Player(0, 0), mulberry32(1));
    e.spawnWildlife(w);
    expect(e.monsters.filter((m) => isWolf(m.kind))).toHaveLength(packs.length);
    for (const k of WOLF_KINDS) {
      expect(MONSTER_STATS[k].hp).toBeGreaterThan(0);
      expect(MONSTERS[k].sight).toBe(WOLF_SIGHT);
    }
    expect(WOLF_SIGHT).toBe(3);
    expect(WOLF_ROAM).toBeGreaterThan(WOLF_SIGHT);
  });
});

describe('Lobos: só atacam a personagem a até 3 células', () => {
  it('a mais de 3 células o lobo a ignora: não vai atrás nem morde (nem passeando perto: só chega a 3 se passear até lá)', () => {
    const { w, e, p, wolf } = arena(3.6);
    let bites = 0;
    e.onBite = () => { bites++; };
    const [x0, y0] = [wolf.x, wolf.y];
    // O lobo começa parado (0,5 s no mínimo): em 0,4 s qualquer deslocamento seria perseguição.
    for (let t = 0; t < 12; t++) e.update(1 / 30, w);
    expect([wolf.x, wolf.y]).toEqual([x0, y0]);
    expect(bites).toBe(0);
    expect(p.hp).toBe(p.maxHp);
  });

  it('a até 3 células ele a persegue e morde (dano pela ficha)', () => {
    const { w, e, p, wolf } = arena(2.6, 'wolf-white');
    const hp = p.hp;
    const before = Math.hypot(p.x - wolf.x, p.y - wolf.y);
    for (let t = 0; t < 12; t++) e.update(1 / 30, w);
    expect(Math.hypot(p.x - wolf.x, p.y - wolf.y)).toBeLessThan(before); // já foi atrás (a partir do 1º instante)
    for (let t = 0; t < 120; t++) e.update(1 / 30, w);
    expect(p.hp).toBeLessThan(hp);
    expect(hp - p.hp).toBeLessThanOrEqual(Math.ceil(MONSTER_STATS['wolf-white'].attack * 1.1 * 1.5));
  });

  it('personagem que se afasta além de 3 células sai da mira (ele é mais lento: dá para fugir)', () => {
    const { w, e, p, wolf } = arena(2);
    expect(MONSTERS['wolf-gray'].spec.speed).toBeLessThan(p.spec.speed);
    for (let t = 0; t < 30; t++) e.update(1 / 30, w);
    p.x += 6; // corre
    const d0 = Math.hypot(p.x - wolf.x, p.y - wolf.y);
    for (let t = 0; t < 120; t++) e.update(1 / 30, w);
    expect(Math.hypot(p.x - wolf.x, p.y - wolf.y)).toBeGreaterThanOrEqual(d0 - 1.2); // não persegue de longe
  });

  it('lobo longe de todo jogador (> 48 células) fica parado: não é simulado', () => {
    const { w, e, wolf } = arena(60);
    const [x0, y0] = [wolf.x, wolf.y];
    for (let t = 0; t < 300; t++) e.update(1 / 30, w);
    expect([wolf.x, wolf.y]).toEqual([x0, y0]);
  });

  it('o bando não passa do limite de passeio em torno da toca', () => {
    const w = new World(42);
    const p = new Player(0, 0);
    const e = new Entities(p, mulberry32(2));
    e.spawnWolves(w);
    const m = e.monsters[0];
    p.x = m.x + 5; p.y = m.y; // perto, mas acima de 3 células: ele só passeia
    for (let t = 0; t < 1800; t++) e.update(1 / 30, w);
    expect(Math.hypot(m.x - m.homeX, m.y - m.homeY)).toBeLessThanOrEqual(WOLF_ROAM * 1.5);
  });
});

describe('Lobos e salvamento', () => {
  it('os lobos não vão para o salvamento: ao carregar, voltam todos pela seed e as aranhas continuam as salvas', () => {
    const w = new World(42);
    const p = new Player(1, 1);
    const e = new Entities(p, mulberry32(1));
    e.spawnWildlife(w);
    const wolves = e.monsters.filter((m) => isWolf(m.kind)).length;
    expect(wolves).toBeGreaterThan(0);
    const data = captureSave({ world: w, player: p, entities: e, inventory: new Inventory(), exploration: new Exploration(), time: 0.5, selected: null, hotbar: null });
    expect(data.dungeon!.monsters.every((m) => !isWolf(m.kind))).toBe(true);
    const w2 = new World(42);
    const p2 = new Player(1, 1);
    const e2 = new Entities(p2, mulberry32(1));
    e2.spawnWildlife(w2);
    applySave(migrate(JSON.parse(JSON.stringify(data)))!, { world: w2, player: p2, entities: e2, inventory: new Inventory() } as never);
    expect(e2.monsters.filter((m) => isWolf(m.kind))).toHaveLength(wolves);
    expect(e2.monsters.filter((m) => !isWolf(m.kind))).toHaveLength(data.dungeon!.monsters.length);
  });
});
