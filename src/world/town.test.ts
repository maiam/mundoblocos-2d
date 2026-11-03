import { describe, expect, it } from 'vitest';
import { Block, blockDef } from './blocks';
import { inRect } from './dungeon';
import { TOWN_H, TOWN_W, townLayout } from './town';
import { World } from './world';

/** Células andáveis da cidade alcançáveis a partir de (x, y) sem sair da área. */
function reach(w: World, x: number, y: number): Set<string> {
  const a = w.town!.area;
  const seen = new Set<string>([`${x},${y}`]);
  const q: Array<[number, number]> = [[x, y]];
  while (q.length) {
    const [cx, cy] = q.pop()!;
    for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + ox;
      const ny = cy + oy;
      const k = `${nx},${ny}`;
      if (seen.has(k) || !inRect(a, nx, ny) || !w.isWalkable(nx, ny)) continue;
      seen.add(k);
      q.push([nx, ny]);
    }
  }
  return seen;
}

describe('Cidade do Despertar', () => {
  it('é igual em qualquer seed (semente própria) e tem 164 × 132 blocos', () => {
    const a = new World(1);
    const b = new World(987654);
    const t = a.town!;
    expect(t.w * t.h).toBe(TOWN_W * TOWN_H);
    expect(t.w * t.h).toBe(21648);
    for (let y = t.area.y0; y <= t.area.y1; y += 3) {
      for (let x = t.area.x0; x <= t.area.x1; x += 3) {
        expect(a.getGround(x, y)).toBe(b.getGround(x, y));
        expect(a.getObject(x, y)).toBe(b.getObject(x, y));
      }
    }
  });

  it('início e renascer sem tenda na praça inicial, dentro da cidade', () => {
    const w = new World(42);
    const t = w.town!;
    expect(w.findSpawn()).toEqual(t.start);
    expect(w.respawnPoint()).toEqual(t.start);
    expect(inRect(t.area, ...t.start)).toBe(true);
    expect(w.isWalkable(...t.start)).toBe(true);
  });

  it('muralha fechada com um único portão (sul); ruas de Pedra Irregular/Rachada e muralha de Tijolo', () => {
    const w = new World(3);
    const t = w.town!;
    const a = t.area;
    const exits: Array<[number, number]> = [];
    for (let x = a.x0; x <= a.x1; x++) for (const y of [a.y0, a.y1]) if (w.isWalkable(x, y)) exits.push([x, y]);
    for (let y = a.y0; y <= a.y1; y++) for (const x of [a.x0, a.x1]) if (w.isWalkable(x, y)) exits.push([x, y]);
    expect(exits.length).toBeGreaterThan(0);
    for (const [x, y] of exits) expect(inRect(t.gate, x, y)).toBe(true);
    // Muralha: tijolo de pedra (inteiro ou rachado), 2 de altura.
    const wallIds = new Set<number>([Block.STONE_BRICK, Block.STONE_BRICK_CRACKED]);
    expect(wallIds.has(w.getObject(a.x0 + 10, a.y0))).toBe(true);
    expect(wallIds.has(w.getLevel(a.x0 + 10, a.y0, 1))).toBe(true);
    // Ruas: só pedra irregular e rachada.
    const L = townLayout();
    const streetIds = new Set<number>();
    for (let i = 0; i < L.street.length; i++) {
      if (L.street[i] && L.ground[i] !== Block.STONE_FLOOR && L.ground[i] !== Block.STONE_POLISHED) streetIds.add(L.ground[i]);
    }
    expect([...streetIds].sort()).toEqual([Block.STONE_COBBLE, Block.STONE_CRACKED].sort());
  });

  it('castelo no fundo, oposto ao portão, e alcançável a pé; todas as portas também', () => {
    const w = new World(5);
    const t = w.town!;
    const castle = t.buildings.find((b) => b.id === Block.CASTLE)!;
    expect(castle.y).toBeLessThan(t.area.y0 + 25);
    expect([castle.w, castle.d]).toEqual([26, 17]);
    expect(t.gate.y1).toBe(t.area.y1);
    const ok = reach(w, ...t.start);
    expect(ok.has(`${t.castleDoor[0]},${t.castleDoor[1]}`)).toBe(true);
    for (const id of [Block.GUILD, Block.INN, Block.SMITHY, Block.SHOP_POTION, Block.SHOP_GOODS, Block.SHOP_TOOLS]) {
      expect(t.buildings.filter((b) => b.id === id)).toHaveLength(1);
    }
    for (const b of t.buildings.filter((x) => x.door)) expect(ok.has(`${b.door![0]},${b.door![1]}`), b.name).toBe(true);
    const houses = t.buildings.filter((b) => b.name === 'Casa');
    expect(houses.length).toBeGreaterThan(40);
    // Casas com no mínimo 5×5 (térrea: 4 fileiras bloqueadas + quintal andável atrás).
    for (const b of houses) {
      expect(b.w).toBeGreaterThanOrEqual(5);
      if (b.id === Block.HOUSE) expect(w.isWalkable(b.x + 2, b.y - b.d)).toBe(true);
    }
  });

  it('nada quebra nem é colocado dentro da cidade; fora do portão, sim', () => {
    const w = new World(9);
    const t = w.town!;
    for (const [x, y] of [t.start, [t.area.x0, t.area.y0], t.castleDoor] as Array<[number, number]>) {
      expect(w.isProtected(x, y)).toBe(true);
      expect(w.canBreak(x, y)).toBe(false);
      expect(w.breakBlock(x, y)).toBeNull();
      expect(w.canPlace(x, y, Block.STONE)).toBe(false);
    }
    const tree = t.buildings.find((b) => b.id === Block.GUILD)!;
    expect(w.breakBlock(tree.x, tree.y)).toBeNull();
    const [ox, oy] = w.outsideGate();
    expect(w.isProtected(ox, oy)).toBe(false);
    expect(w.canPlace(ox, oy, Block.STONE)).toBe(true);
  });

  it('construções: id no canto inferior esquerdo, o resto bloqueia; tocar mostra o nome', () => {
    const w = new World(11);
    const inn = w.town!.buildings.find((b) => b.id === Block.INN)!;
    expect(w.getObject(inn.x, inn.y)).toBe(Block.INN);
    expect(w.getObject(inn.x + 3, inn.y - 2)).toBe(Block.TOWN_PART);
    expect(blockDef(Block.TOWN_PART).solid).toBe(true);
    expect(w.townBuildingAt(inn.x + 3, inn.y - 2)?.name).toBe('Hospedaria');
  });

  it('a dungeon fica fora da cidade e longe da muralha', () => {
    for (const seed of [1, 42, 777]) {
      const w = new World(seed);
      const t = w.town!.area;
      const d = w.dungeon!.area;
      const apart = d.x0 > t.x1 + 8 || d.x1 < t.x0 - 8 || d.y0 > t.y1 + 8 || d.y1 < t.y0 - 8;
      expect(apart).toBe(true);
    }
  });

  it('salvamento antigo com terreno na área da cidade volta à cidade ao carregar', () => {
    const w = new World(13);
    const [x, y] = w.town!.start;
    const cx = Math.floor(x / 16);
    const cy = Math.floor(y / 16);
    const g = new Uint8Array(256).fill(Block.WATER);
    w.restoreChunk(cx, cy, g, [new Uint8Array(256), new Uint8Array(256), new Uint8Array(256)]);
    expect(w.getGround(x, y)).not.toBe(Block.WATER);
    expect(w.isWalkable(x, y)).toBe(true);
  });
});
