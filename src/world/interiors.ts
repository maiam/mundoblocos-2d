import { Block, type BlockId } from './blocks';
import type { Biome } from './biomes';
import { inRect, type Rect } from './dungeon';
import type { Cell, TerrainSource } from './terrain';
import type { TownLayout } from './town';

/**
 * Interiores das construções da cidade (ADR 0014). Cada interior é um cômodo isolado do mapa, em coordenadas fixas
 * muito ao norte (fora do alcance a pé), cercado de paredes e protegido pelo `World`: a personagem chega lá pela porta
 * da construção e volta pelo capacho. O mapa lógico (onde se anda) vem da tabela abaixo, desenhada sobre a arte do
 * cômodo (uma célula = 1/`w` da largura da imagem); a arte em si fica no render (`render/art`, `interiors`).
 */

/** Mapa do cômodo, de cima para baixo: `#` bloqueado (parede, móvel), `.` chão, `E` capacho de saída. */
export interface InteriorDef {
  id: string;
  /** Nome mostrado ao entrar. */
  name: string;
  /** Construção da cidade cuja porta leva ao cômodo. */
  building: BlockId;
  map: string[];
  /** Onde fica o morador do ofício (coluna, linha) e as linhas em que ele pode andar [de, até]. */
  keeper?: { at: [number, number]; rows: [number, number] };
}

/**
 * Ferraria (arte `assets-src/interiors/smithy.png`, 9 × 18 células): parede do fundo com forja e bigorna, mesa de
 * projetos e armeiro, estante de armaduras, caixotes e o balcão. O ferreiro fica atrás do balcão, sobre o tapete.
 */
export const SMITHY_INTERIOR: InteriorDef = {
  id: 'smithy',
  name: 'Ferraria',
  building: Block.SMITHY,
  map: [
    '#########', // 0  moldura
    '#########', // 1  parede do fundo
    '#########', // 2
    '#########', // 3
    '#########', // 4  estante, bigorna, forja
    '#########', // 5  barris, base da forja
    '####.####', // 6  mesa de projetos | armeiro
    '####.####', // 7
    '####.####', // 8  banquinho
    '##....###', // 9  barril | tapete | planta, caixotes
    '###...###', // 10 estante de armaduras
    '###.....#', // 11 atrás do balcão (passagem pelo lado dos caixotes)
    '#######.#', // 12 balcão
    '#######.#', // 13
    '#.......#', // 14
    '#.......#', // 15
    '#.......#', // 16
    '####E####', // 17 capacho
  ],
  keeper: { at: [4, 11], rows: [9, 11] },
};

export const INTERIOR_DEFS: InteriorDef[] = [SMITHY_INTERIOR];

/** Canto superior esquerdo do primeiro cômodo e distância entre cômodos (células): longe de tudo o que se gera perto. */
export const INTERIOR_ORIGIN: [number, number] = [0, -100000];
const INTERIOR_SPACING = 64;
/** Anel de paredes em volta do cômodo (nada de terreno gerado encosta nele). */
const INTERIOR_MARGIN = 2;

export interface InteriorLayout {
  def: InteriorDef;
  w: number;
  h: number;
  /** Área do cômodo (inclusiva), em células do mundo. */
  area: Rect;
  /** Área protegida (cômodo + anel de paredes). */
  guard: Rect;
  /** Onde a personagem aparece ao entrar (logo acima do capacho) e o capacho (pisar = sair). */
  entry: [number, number];
  exit: [number, number];
  /** Célula da rua diante da porta da construção (andar para cima nela = entrar; ao sair, volta para cá). */
  outside: [number, number];
  /** Morador do ofício em células do mundo, ou null. */
  keeper: { at: [number, number]; rows: [number, number] } | null;
}

/** Cômodos cuja construção existe na cidade (com porta), na ordem de `INTERIOR_DEFS`. */
export function interiorLayouts(town: TownLayout): InteriorLayout[] {
  const out: InteriorLayout[] = [];
  INTERIOR_DEFS.forEach((def, k) => {
    const b = town.buildings.find((x) => x.id === def.building && x.door);
    if (!b) return;
    const w = def.map[0].length;
    const h = def.map.length;
    const x0 = INTERIOR_ORIGIN[0] + k * INTERIOR_SPACING;
    const y0 = INTERIOR_ORIGIN[1];
    const find = (ch: string): [number, number] => {
      const row = def.map.findIndex((r) => r.includes(ch));
      return [x0 + def.map[row].indexOf(ch), y0 + row];
    };
    const exit = find('E');
    const area = { x0, y0, x1: x0 + w - 1, y1: y0 + h - 1 };
    out.push({
      def, w, h, area,
      guard: { x0: x0 - INTERIOR_MARGIN, y0: y0 - INTERIOR_MARGIN, x1: area.x1 + INTERIOR_MARGIN, y1: area.y1 + INTERIOR_MARGIN },
      entry: [exit[0], exit[1] - 1],
      exit,
      outside: b.door!,
      keeper: def.keeper ? { at: [x0 + def.keeper.at[0], y0 + def.keeper.at[1]], rows: [y0 + def.keeper.rows[0], y0 + def.keeper.rows[1]] } : null,
    });
  });
  return out;
}

/** Célula andável do cômodo (chão ou capacho)? Fora do cômodo: false. */
export function interiorFloor(l: InteriorLayout, x: number, y: number): boolean {
  if (!inRect(l.area, x, y)) return false;
  return l.def.map[y - l.area.y0][x - l.area.x0] !== '#';
}

/**
 * Terreno com os cômodos sobrepostos: chão de pedra lisa onde se anda e `TOWN_PART` (sólido, inquebrável) nas paredes,
 * nos móveis e no anel em volta. O render não desenha esse chão: desenha a arte do cômodo por cima de tudo.
 */
export class InteriorTerrain implements TerrainSource {
  constructor(private readonly base: TerrainSource, readonly layouts: InteriorLayout[]) {}

  get seed(): number {
    return this.base.seed;
  }

  private at(x: number, y: number): InteriorLayout | undefined {
    return this.layouts.find((l) => inRect(l.guard, x, y));
  }

  cellAt(x: number, y: number): Cell {
    const l = this.at(x, y);
    if (!l) return this.base.cellAt(x, y);
    return interiorFloor(l, x, y)
      ? { ground: Block.STONE_SMOOTH, object: Block.AIR, upper: Block.AIR }
      : { ground: Block.STONE_SMOOTH, object: Block.TOWN_PART, upper: Block.AIR };
  }

  groundAt(x: number, y: number): BlockId {
    return this.cellAt(x, y).ground;
  }

  objectAt(x: number, y: number): BlockId {
    return this.cellAt(x, y).object;
  }

  upperAt(x: number, y: number): BlockId {
    return this.cellAt(x, y).upper;
  }

  biomeAt(x: number, y: number): Biome {
    return this.base.biomeAt(x, y);
  }

  generateChunk(cx: number, cy: number, ground: Uint8Array, objects: Uint8Array, upper: Uint8Array): void {
    this.base.generateChunk(cx, cy, ground, objects, upper);
    const S = Math.round(Math.sqrt(ground.length));
    const x0 = cx * S;
    const y0 = cy * S;
    for (const l of this.layouts) {
      const g = l.guard;
      if (x0 > g.x1 || x0 + S - 1 < g.x0 || y0 > g.y1 || y0 + S - 1 < g.y0) continue;
      for (let ly = 0; ly < S; ly++) {
        for (let lx = 0; lx < S; lx++) {
          const x = x0 + lx;
          const y = y0 + ly;
          if (!inRect(g, x, y)) continue;
          const c = this.cellAt(x, y);
          const i = ly * S + lx;
          ground[i] = c.ground;
          objects[i] = c.object;
          upper[i] = c.upper;
        }
      }
    }
  }
}
