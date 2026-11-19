import { describe, expect, it } from 'vitest';
import { Block, blockDef } from './blocks';
import { inRect } from './dungeon';
import { TOWN_H, TOWN_W, townLayout, upsampleTown } from './town';
import { SUBDIV } from '../config';
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
    expect(t.w * t.h).toBe(TOWN_W * TOWN_H * SUBDIV * SUBDIV);
    expect(t.w * t.h).toBe(21648 * SUBDIV * SUBDIV);
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

  it('muralha fechada com um único portão (sul); ruas, praças e muralha de Tijolo de Pedra', () => {
    const w = new World(3);
    const t = w.town!;
    const a = t.area;
    const exits: Array<[number, number]> = [];
    for (let x = a.x0; x <= a.x1; x++) for (const y of [a.y0, a.y1]) if (w.isWalkable(x, y)) exits.push([x, y]);
    for (let y = a.y0; y <= a.y1; y++) for (const x of [a.x0, a.x1]) if (w.isWalkable(x, y)) exits.push([x, y]);
    expect(exits.length).toBeGreaterThan(0);
    for (const [x, y] of exits) expect(inRect(t.gate, x, y)).toBe(true);
    // Muralha: só Tijolo de Pedra (o rachado foi aposentado, 08/11), 2 de altura.
    expect(w.getObject(a.x0 + 10, a.y0)).toBe(Block.STONE_BRICK);
    expect(w.getLevel(a.x0 + 10, a.y0, 1)).toBe(Block.STONE_BRICK);
    // Piso pavimentado (ruas, praças, pátio, calçadas): só Tijolo de Pedra (dono do produto, 07/11).
    const L = townLayout();
    const streetIds = new Set<number>();
    for (let i = 0; i < L.street.length; i++) if (L.street[i]) streetIds.add(L.ground[i]);
    expect([...streetIds]).toEqual([Block.STONE_BRICK]);
  });

  it('castelo no fundo, oposto ao portão, e alcançável a pé; todas as portas também', () => {
    const w = new World(5);
    const t = w.town!;
    const castle = t.buildings.find((b) => b.id === Block.CASTLE)!;
    expect(castle.y).toBeLessThan(t.area.y0 + 25 * SUBDIV);
    expect([castle.w, castle.d]).toEqual([26 * SUBDIV, 17 * SUBDIV]);
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

  it('a dungeon nunca ocupa a estrada do portão nem o campo do rebanho; a entrada dela fica livre', () => {
    for (let k = 1; k <= 40; k++) {
      const seed = k * 7919;
      const w = new World(seed);
      const d = w.dungeon!.area;
      const t = w.town!;
      const [gx] = w.outsideGate();
      for (let y = t.area.y1 + 1; y <= t.area.y1 + 22; y++) {
        for (let x = gx - 8; x <= gx + 8; x++) expect(inRect(d, x, y), `seed ${seed}`).toBe(false);
      }
      expect(w.isWalkable(...w.dungeon!.doorstep), `seed ${seed}`).toBe(true);
    }
  }, 30_000); // gera 40 mundos (~2 s sozinho, mais de 5 s no runner com os outros arquivos em paralelo): o limite padrão era apertado

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

  it('não se constrói no chunk onde está a muralha: protege o chunk inteiro, mesmo fora dos limites da cidade', () => {
    const w = new World(42);
    const a = w.town!.area;
    // Célula logo fora da cidade (oeste da muralha), no mesmo chunk de um pedaço do muro.
    const x = a.x0 - 3;
    const y = a.y0 + 50;
    expect(inRect(a, x, y)).toBe(false);
    expect(Math.floor(x / 16) * 16 + 15 >= a.x0).toBe(true); // o chunk tem células da muralha
    expect(w.isProtected(x, y)).toBe(true);
    expect(w.canPlace(x, y, Block.STONE)).toBe(false);
    expect(w.canBreak(x, y)).toBe(false);
    // Longe da cidade (mais de um chunk além da muralha) segue livre; o miolo da cidade já era protegido.
    expect(w.isProtected(a.x0 - 40, y)).toBe(false);
    expect(w.isProtected(...w.town!.start)).toBe(true);
    // O ponto de testes "fora do portão" já fica fora do chunk do muro.
    const [gx, gy] = w.outsideGate();
    expect(w.isProtected(gx, gy)).toBe(false);
    expect(gy).toBeGreaterThan(a.y1);
  });
});

describe('cidade na grade fina (ADR 0032, F3): upsampleTown', () => {
  const base = townLayout();
  const fine = upsampleTown(base, 2);
  const at = (x: number, y: number) => (y - fine.area.y0) * fine.w + (x - fine.area.x0);

  it('com 1 devolve a mesma cidade', () => {
    expect(upsampleTown(base, 1)).toBe(base);
  });

  it('dobra as dimensões, a área, o portão e os pontos de referência', () => {
    expect([fine.w, fine.h]).toEqual([base.w * 2, base.h * 2]);
    expect(fine.area).toEqual({ x0: base.area.x0 * 2, y0: base.area.y0 * 2, x1: (base.area.x1 + 1) * 2 - 1, y1: (base.area.y1 + 1) * 2 - 1 });
    expect(fine.gate.x1 - fine.gate.x0 + 1).toBe((base.gate.x1 - base.gate.x0 + 1) * 2);
    expect(fine.start).toEqual([base.start[0] * 2, base.start[1] * 2]);
    expect(fine.buildings).toHaveLength(base.buildings.length);
  });

  it('cada construção tem o mesmo retângulo em pixels (lado dobrado, canto inferior esquerdo igual) e um único id na âncora', () => {
    const anchors = new Map<number, number>();
    for (let i = 0; i < fine.objects.length; i++) {
      const k = fine.buildingAt[i];
      if (k >= 0 && fine.objects[i] !== Block.TOWN_PART) anchors.set(k, (anchors.get(k) ?? 0) + 1);
    }
    fine.buildings.forEach((b, k) => {
      const c = base.buildings[k];
      expect([b.w, b.d]).toEqual([c.w * 2, c.d * 2]);
      expect([b.x, b.y]).toEqual([c.x * 2, (c.y + 1) * 2 - 1]);
      expect(anchors.get(k)).toBe(1);
      expect(fine.objects[at(b.x, b.y)]).toBe(c.id);
    });
  });

  it('muralha e portão: sólidos onde havia muralha, vão onde havia portão; o início é andável', () => {
    const gx = fine.gate.x0 + 1;
    const gy = fine.gate.y1;
    expect(fine.objects[at(gx, gy)]).toBe(Block.AIR);
    // uma célula de muralha qualquer (cubo de 2 níveis): as quatro células novas também o são
    const w = base.objects.findIndex((o, i) => o === Block.STONE_BRICK && base.upper[i] === Block.STONE_BRICK);
    expect(w).toBeGreaterThanOrEqual(0);
    const [wx, wy] = [w % base.w, Math.floor(w / base.w)];
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
      const i = (wy * 2 + dy) * fine.w + wx * 2 + dx;
      expect([fine.objects[i], fine.upper[i]]).toEqual([Block.STONE_BRICK, Block.STONE_BRICK]);
    }
    const [sx, sy] = fine.start;
    expect(fine.objects[at(sx, sy)]).toBe(Block.AIR);
    expect(fine.street[at(sx, sy)]).toBe(1);
  });

  it('objetos soltos (árvores, flores, postes) não se repetem nas quatro células; sebes e muralha sim', () => {
    let singles = 0;
    let blocks = 0;
    for (let y = 0; y < base.h; y++) {
      for (let x = 0; x < base.w; x++) {
        const o = base.objects[y * base.w + x];
        if (o === Block.AIR || base.buildingAt[y * base.w + x] >= 0) continue;
        const n = [0, 1].flatMap((dy) => [0, 1].map((dx) => fine.objects[(y * 2 + dy) * fine.w + (x * 2 + dx)])).filter((v) => v === o).length;
        if (o === Block.HEDGE || o === Block.STONE_BRICK) { expect(n).toBe(4); blocks++; } else { expect(n).toBe(1); singles++; }
      }
    }
    expect(singles).toBeGreaterThan(50);
    expect(blocks).toBeGreaterThan(50);
  });
});
