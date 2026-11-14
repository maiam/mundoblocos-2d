import { describe, expect, it } from 'vitest';
import { SUBDIV } from '../config';
import { Block, blockDef } from './blocks';
import { isVillageId, VILLAGE_H, VILLAGE_SIZES, VILLAGE_W, villageLayout } from './village';
import { World } from './world';

describe('Vila Camponesa (domains/village.md)', () => {
  it('só existe na grade fina (SUBDIV = 2); na grade 1 é null e o mundo não a tem', () => {
    const v = villageLayout();
    if (SUBDIV !== 2) { expect(v).toBeNull(); expect(new World(42).village).toBeNull(); return; }
    expect(v).not.toBeNull();
    expect(new World(42).village).toBe(v);
  });

  it.runIf(SUBDIV === 2)('é igual em toda seed, fica ao sul da cidade e do campo do rebanho, e não toca a cidade nem a dungeon', () => {
    const a = new World(1), b = new World(987654);
    const v = a.village!;
    expect(b.village).toBe(v);
    expect(v.area.x1 - v.area.x0 + 1).toBe(VILLAGE_W);
    expect(v.area.y1 - v.area.y0 + 1).toBe(VILLAGE_H);
    expect(v.area.y0).toBeGreaterThan(a.town!.area.y1 + 56); // depois do campo do rebanho (28 células antigas)
    for (const w of [a, b]) {
      expect(w.dungeon!.area.x1 < v.touched.x0 || w.dungeon!.area.x0 > v.touched.x1 || w.dungeon!.area.y1 < v.touched.y0 || w.dungeon!.area.y0 > v.touched.y1).toBe(true);
      expect(w.cave!.guard.x1 < v.touched.x0 || w.cave!.guard.x0 > v.touched.x1 || w.cave!.guard.y1 < v.touched.y0 || w.cave!.guard.y0 > v.touched.y1).toBe(true);
    }
  });

  it.runIf(SUBDIV === 2)('a área é protegida: nada quebra nem se coloca; o ponto de início segue na cidade', () => {
    const w = new World(42);
    const v = w.village!;
    const [cx, cy] = [Math.floor((v.area.x0 + v.area.x1) / 2), Math.floor((v.area.y0 + v.area.y1) / 2)];
    expect(w.isProtected(cx, cy)).toBe(true);
    expect(w.isProtected(v.area.x0, v.area.y0)).toBe(true);
    expect(w.canPlace(cx, cy, Block.STONE)).toBe(false);
    expect(w.isProtected(v.area.x0 - 1, v.area.y0 - 1) && !w.town!.area).toBe(false);
    expect(w.findSpawn()).toEqual(w.town!.start);
  });

  it.runIf(SUBDIV === 2)('o muro de estacas fecha os quatro lados e só o portão abre (o vão do sul é andável, o resto bloqueia)', () => {
    const w = new World(42);
    const v = w.village!;
    const solid = (x: number, y: number) => w.standHeight(x, y) === null || blockSolid(w, x, y);
    // norte, oeste e leste: nenhuma célula livre ao longo da linha do muro
    for (let x = 1; x <= 46; x++) expect(solid(v.area.x0 + x, v.area.y0 + 4), `norte x=${x}`).toBe(true);
    for (let y = 4; y <= 43; y++) { expect(solid(v.area.x0 + 1, v.area.y0 + y), `oeste y=${y}`).toBe(true); expect(solid(v.area.x0 + 46, v.area.y0 + y), `leste y=${y}`).toBe(true); }
    // sul: tudo bloqueado, menos o vão do portão (x 23–25)
    for (let x = 1; x <= 46; x++) expect(solid(v.area.x0 + x, v.area.y0 + 43), `sul x=${x}`).toBe(x < 23 || x > 25);
  });

  it.runIf(SUBDIV === 2)('do portão da vila à praça do poço há caminho livre (estrada de terra), e as seis casas têm porta para um caminho', () => {
    const w = new World(42);
    const v = w.village!;
    let reachable = 0;
    // busca em largura a partir do vão do portão, andando só em células livres dentro da área
    const seen = new Set<string>();
    const queue: Array<[number, number]> = [[v.gate.x0 + 1, v.gate.y0 + 1]];
    while (queue.length) {
      const [x, y] = queue.pop()!;
      const k = x + ',' + y;
      if (seen.has(k) || x < v.area.x0 || x > v.area.x1 || y < v.area.y0 || y > v.area.y1 || blockSolid(w, x, y)) continue;
      seen.add(k); reachable++;
      queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    const well = v.props.find((p) => p.id === Block.V_WELL)!;
    expect(seen.has(`${well.x + 1},${well.y + 1}`)).toBe(true); // célula livre logo ao sul do poço
    for (const p of v.props.filter((p) => p.id === Block.V_HOUSE_STRAW || p.id === Block.V_HOUSE_TILE)) {
      const [lw] = VILLAGE_SIZES[p.id]!;
      expect(seen.has(`${p.x + lw / 2},${p.y + 1}`), `porta da casa em ${p.x},${p.y}`).toBe(true); // diante da porta (célula ao sul do meio)
    }
    expect(reachable).toBeGreaterThan(900);
  });

  it.runIf(SUBDIV === 2)('as peças: 6 casas, celeiro, galinheiro, poço, canteiro de trigo e horta; todo lote cabe na área e sem sobreposição', () => {
    const v = villageLayout()!;
    const count = (id: number) => v.props.filter((p) => p.id === id).length;
    expect(count(Block.V_HOUSE_STRAW) + count(Block.V_HOUSE_TILE)).toBe(6);
    for (const id of [Block.V_BARN, Block.V_COOP, Block.V_WELL, Block.V_BED_WHEAT, Block.V_BED_VEG, Block.V_GATE]) expect(count(id)).toBe(1);
    for (const p of v.props) {
      expect(isVillageId(p.id)).toBe(true);
      expect(p.x >= v.area.x0 && p.x <= v.area.x1 && p.y >= v.area.y0 && p.y <= v.area.y1).toBe(true);
    }
    const ids = new Set(v.props.map((p) => p.x + ',' + p.y));
    expect(ids.size).toBe(v.props.length); // duas peças não dividem a célula âncora
  });

  it.runIf(SUBDIV === 2)('o terreno em volta é terra firme (sem água) e a trilha liga o fim da estrada da cidade ao portão', () => {
    const w = new World(42);
    const v = w.village!;
    for (let x = v.area.x0 - 8; x <= v.area.x1 + 8; x += 3) {
      expect(w.getGround(x, v.area.y1 + 4)).not.toBe(Block.WATER);
      expect(w.getGround(x, v.area.y0 - 4)).not.toBe(Block.WATER);
    }
    expect(w.getGround(v.gate.x0 + 1, v.gate.y1 + 3)).toBe(Block.PATH); // fora do portão, na trilha
    expect(w.getGround(v.gate.x0 + 1, v.gate.y0 - 3)).toBe(Block.PATH); // dentro, a estrada segue pelo meio da vila
    expect(w.getGround(v.area.x0 + 3, v.area.y0 + 30)).toBe(Block.GRASS); // o resto é grama
  });

  it.runIf(SUBDIV === 2)('o portão abre e fecha: tocar em qualquer bloco muda os 5 juntos; fechado bloqueia o vão, aberto deixa passar', () => {
    const w = new World(42);
    const v = w.village!;
    const y = v.gate.y0;
    const cells = Array.from({ length: 5 }, (_, i) => [v.gate.x0 - 1 + i, y] as [number, number]);
    expect(w.gateCells(v.gate.x0 + 1, y)).toEqual(cells);
    expect(w.gateCells(v.gate.x0 - 2, y)).toBeNull(); // o muro ao lado não é do portão
    expect(w.isDoor(v.gate.x0 + 1, y)).toBe(true);
    expect(w.isDoorOpen(v.gate.x0 + 1, y)).toBe(true);
    for (const [x] of cells.slice(1, 4)) expect(blockSolid(w, x, y), `aberto x=${x}`).toBe(false);
    expect(w.toggleDoor(v.gate.x0 + 1, y)).toBe(true); // um bloco do vão fecha o portão inteiro
    expect(w.getObject(cells[0][0], y)).toBe(Block.V_GATE_CLOSED);
    for (const [x] of cells.slice(1, 4)) { expect(w.getObject(x, y)).toBe(Block.V_GATE_GAP_CLOSED); expect(blockSolid(w, x, y), `fechado x=${x}`).toBe(true); }
    expect(w.isDoorOpen(v.gate.x0 + 1, y)).toBe(false);
    expect(w.toggleDoor(cells[0][0], y)).toBe(true); // o poste abre de novo
    expect(w.getObject(cells[0][0], y)).toBe(Block.V_GATE);
    expect(w.getObject(cells[4][0], y)).toBe(Block.TOWN_PART); // o poste da direita nunca muda
    expect(blockSolid(w, cells[4][0], y)).toBe(true);
    for (const [x] of cells.slice(1, 4)) expect(blockSolid(w, x, y)).toBe(false);
  });

  it.runIf(SUBDIV === 2)('o portão volta aberto ao restaurar um chunk salvo (a área é protegida e volta do gerador)', () => {
    const a = new World(42);
    const v = a.village!;
    a.toggleDoor(v.gate.x0 + 1, v.gate.y0);
    const b = new World(42);
    expect(b.getObject(v.gate.x0 + 1, v.gate.y0)).toBe(Block.V_GATE_GAP);
  });
});

/** A célula bloqueia o personagem (objeto sólido, chão que não se pisa ou pilha de blocos)? */
function blockSolid(w: World, x: number, y: number): boolean {
  const o = w.getObject(x, y);
  return (o !== Block.AIR && blockDef(o).solid) || !w.isGroundStandable(x, y) || w.stackHeight(x, y) > 0;
}
