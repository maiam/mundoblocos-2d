import { describe, expect, it } from 'vitest';
import { Block } from './blocks';
import { inRect } from './dungeon';
import { exitDoorAt, INTERIOR_DEFS, interiorFloor, scaleInteriorDef, SMITHY_INTERIOR } from './interiors';
import { WORLD_PROFILES } from './profiles';
import { World } from './world';

describe('Interiores (ADR 0014)', () => {
  it('a Ferraria tem cômodo: porta na rua diante da Ferraria, entrada e capacho andáveis', () => {
    const w = new World(42);
    const room = w.interiors.find((l) => l.def.id === 'smithy')!;
    const smithy = w.town!.buildings.find((b) => b.id === Block.SMITHY)!;
    expect(room.outside).toEqual(smithy.door);
    expect(w.interiorEntrance(...smithy.door!)).toBe(room);
    expect(w.isWalkable(...room.entry)).toBe(true);
    expect(w.isWalkable(...room.exit)).toBe(true);
    expect(w.interiorAt(...room.entry)).toBe(room);
    expect(w.interiorAt(...w.town!.start)).toBeNull();
  });

  it('mapas retangulares, com um capacho por entrada, e o mapa lógico manda em onde se anda', () => {
    for (const d of INTERIOR_DEFS) {
      expect(new Set(d.map.map((r) => r.length)).size).toBe(1);
      const entradas = d.buildings?.length ?? 1;
      // cada capacho é uma faixa contínua de `E` numa fileira (a Ferraria tem 1; o Mercado, 3 — uma por loja)
      const faixas = d.map.flatMap((r) => r.match(/E+/g) ?? []);
      expect(faixas).toHaveLength(entradas);
    }
    const w = new World(7);
    const room = w.interiors[0];
    for (let y = room.area.y0; y <= room.area.y1; y++) {
      for (let x = room.area.x0; x <= room.area.x1; x++) expect(w.isWalkable(x, y)).toBe(interiorFloor(room, x, y));
    }
  });

  it('cômodo fechado: da entrada não se sai andando (só pelo capacho); tudo protegido', () => {
    const w = new World(3);
    const room = w.interiors[0];
    const seen = new Set<string>([room.entry.join()]);
    const q: Array<[number, number]> = [room.entry];
    while (q.length) {
      const [x, y] = q.pop()!;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const n: [number, number] = [x + dx, y + dy];
        if (seen.has(n.join()) || !w.isWalkable(...n)) continue;
        seen.add(n.join());
        q.push(n);
      }
    }
    for (const k of seen) expect(inRect(room.area, ...(k.split(',').map(Number) as [number, number]))).toBe(true);
    expect(seen.has(room.exit.join())).toBe(true);
    expect(seen.has(room.keeper!.at.join())).toBe(true);
    expect(w.isProtected(...room.entry)).toBe(true);
    expect(w.breakBlock(...room.entry)).toBeNull();
    expect(w.canPlace(...room.entry, Block.STONE)).toBe(false);
  });

  it('igual em toda seed e sem interiores fora do mundo com cidade', () => {
    expect(new World(1).interiors[0].area).toEqual(new World(999).interiors[0].area);
  });
});

describe('Tenda (cômodo do objeto do jogador)', () => {
  it('existe no mundo principal, não no Santuário; entra-se pela frente da tenda', () => {
    const w = new World(7);
    const room = w.tentRoom!;
    expect(room.def.id).toBe('tent');
    expect(room.outside).toBeNull();
    expect(w.isWalkable(...room.entry)).toBe(true);
    expect(w.interiorAt(...room.entry)).toBe(room);
    expect(w.isProtected(...room.entry)).toBe(true);
    expect(new World(7, WORLD_PROFILES.santuario).tentRoom).toBeNull();
    // Tenda colocada fora da cidade: as duas células da frente levam para dentro; as de trás e os lados, não.
    const [gx, gy] = w.outsideGate();
    const x = gx + 3;
    const y = gy + 4;
    for (let yy = y - 2; yy <= y + 2; yy++) for (let xx = x - 1; xx <= x + 2; xx++) while (w.topBlock(xx, yy)) w.breakBlock(xx, yy);
    expect(w.placeBlock(x, y, Block.TENT)).toBe(true);
    expect(w.tentDoorAt(x, y + 1)).toEqual([x, y]);
    expect(w.tentDoorAt(x + 1, y + 1)).toEqual([x, y]);
    expect(w.tentDoorAt(x, y)).toBeNull();
    expect(w.tentDoorAt(x - 1, y + 1)).toBeNull();
    expect(w.interiorEntrance(x, y + 1)).toBeNull(); // não é porta da cidade
  });
});

describe('Interiores na grade fina (ADR 0032, F4): scaleInteriorDef', () => {
  const fine = scaleInteriorDef(SMITHY_INTERIOR, 2);

  it('com 1 devolve o próprio cômodo', () => {
    expect(scaleInteriorDef(SMITHY_INTERIOR, 1)).toBe(SMITHY_INTERIOR);
  });

  it('cada caractere vira 2 × 2: mapa do dobro do tamanho, mesma forma', () => {
    const base = SMITHY_INTERIOR.map;
    expect(fine.map).toHaveLength(base.length * 2);
    expect(fine.map[0]).toHaveLength(base[0].length * 2);
    base.forEach((row, y) => [...row].forEach((c, x) => {
      for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) expect(fine.map[y * 2 + dy][x * 2 + dx]).toBe(c);
    }));
  });

  it('o capacho tem 2 × 2 células e o ferreiro e suas linhas acompanham', () => {
    expect(fine.map.join('').split('E').length - 1).toBe(4);
    expect(fine.keeper!.at).toEqual([SMITHY_INTERIOR.keeper!.at[0] * 2, SMITHY_INTERIOR.keeper!.at[1] * 2]);
    expect(fine.keeper!.rows).toEqual([SMITHY_INTERIOR.keeper!.rows[0] * 2, (SMITHY_INTERIOR.keeper!.rows[1] + 1) * 2 - 1]);
  });
});

describe('Mercado (v0.93.57): três lojas, um cômodo', () => {
  it('as três lojas da cidade se chamam Mercado e cada porta leva ao mesmo cômodo, com a saída na sua porta', () => {
    const w = new World(7);
    const town = w.town!;
    const shops = [Block.SHOP_POTION, Block.SHOP_GOODS, Block.SHOP_TOOLS].map((id) => town.buildings.find((b) => b.id === id)!);
    for (const b of shops) expect(b.name).toBe('Mercado');
    const room = w.interiors.find((l) => l.def.id === 'market')!;
    expect(room.def.name).toBe('Mercado');
    expect(room.doors).toHaveLength(3);
    room.doors.forEach((door, i) => {
      expect(door.outside).toEqual(shops[i].door); // da esquerda para a direita: poções, armazém, ferramentas
      expect(w.interiorDoorAt(door.outside![0], door.outside![1])).toEqual({ room, door });
      expect(exitDoorAt(room, door.exit[0], door.exit[1])).toBe(door);
      expect(interiorFloor(room, door.entry[0], door.entry[1])).toBe(true);
    });
  });
});
