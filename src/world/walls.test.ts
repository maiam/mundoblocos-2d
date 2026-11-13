import { describe, expect, it } from 'vitest';
import {
  clampWallThickness, DEFAULT_WALL_THICKNESS, parseWallThickness, wallFootprintParts,
  CAP_E, CAP_N, CAP_S, CAP_W, INNER_NE, INNER_NW, INNER_SE, INNER_SW, WALL_CAP_PIECES,
  wallCapMask, wallFront, wallFootprint, wallFrontRanges, wallInnerCorners, wallNeighbors, wallPiece, wallThin,
} from './walls';

/** Monta uma grade de texto ('#' = parede) e devolve o predicado `isWall` dela. */
function grid(rows: string[]): (x: number, y: number) => boolean {
  return (x, y) => rows[y]?.[x] === '#';
}

describe('autotile das paredes (ADR 0027)', () => {
  it('a tampa tem 16 peças: a máscara N/E/S/W cobre 0..15 sem repetir', () => {
    const seen = new Set<number>();
    for (let m = 0; m < 16; m++) {
      const nb = { n: !!(m & CAP_N), e: !!(m & CAP_E), s: !!(m & CAP_S), w: !!(m & CAP_W), ne: false, se: false, sw: false, nw: false };
      seen.add(wallCapMask(nb));
    }
    expect(seen.size).toBe(WALL_CAP_PIECES);
  });

  it('parede solta: frente "single", tampa 0, sem cantos internos', () => {
    const p = wallPiece(wallNeighbors(grid(['...', '.#.', '...']), 1, 1));
    expect(p).toEqual({ front: 'single', cap: 0, inner: 0 });
  });

  it('fileira horizontal: ponta esquerda, meio e ponta direita', () => {
    const is = grid(['.....', '.###.', '.....']);
    expect(wallPiece(wallNeighbors(is, 1, 1)).front).toBe('left');
    expect(wallPiece(wallNeighbors(is, 2, 1)).front).toBe('mid');
    expect(wallPiece(wallNeighbors(is, 3, 1)).front).toBe('right');
    expect(wallPiece(wallNeighbors(is, 2, 1)).cap).toBe(CAP_E | CAP_W);
  });

  it('fileira norte–sul: só o último bloco ao sul mostra a frente ("end"); os demais só a tampa', () => {
    const is = grid(['.#.', '.#.', '.#.']);
    expect(wallFront(wallNeighbors(is, 1, 0))).toBeNull();
    expect(wallFront(wallNeighbors(is, 1, 1))).toBeNull();
    expect(wallFront(wallNeighbors(is, 1, 2))).toBe('end');
    expect(wallCapMask(wallNeighbors(is, 1, 1))).toBe(CAP_N | CAP_S);
    expect(wallThin(wallNeighbors(is, 1, 1))).toBe(true);
  });

  it('canto em L: máscara e frente de cada ponta', () => {
    const is = grid(['##.', '#..', '...']);
    const corner = wallPiece(wallNeighbors(is, 0, 0)); // canto noroeste: vizinhos leste e sul
    expect(corner.cap).toBe(CAP_E | CAP_S);
    expect(corner.front).toBe('left'); // o poste fica coberto pelo braço sul; só o braço leste mostra a frente
    const arm = wallPiece(wallNeighbors(is, 1, 0)); // ponta leste do braço de cima
    expect(arm.cap).toBe(CAP_W);
    expect(arm.front).toBe('right');
  });

  it('canto interno: os dois ortogonais são parede e o diagonal não', () => {
    // sala em L: a célula do meio tem parede a leste e ao sul, mas não no diagonal sudeste
    const is = grid(['...', '.##', '.#.']);
    const nb = wallNeighbors(is, 1, 1);
    expect(wallInnerCorners(nb)).toBe(INNER_SE);
    // diagonal presente: sem canto interno
    const full = wallNeighbors(grid(['...', '.##', '.##']), 1, 1);
    expect(wallInnerCorners(full)).toBe(0);
  });

  it('cada um dos quatro cantos internos usa o seu bit', () => {
    const cross = (diagonalMissing: 'ne' | 'se' | 'sw' | 'nw') => {
      const nb = { n: true, e: true, s: true, w: true, ne: true, se: true, sw: true, nw: true };
      nb[diagonalMissing] = false;
      return wallInnerCorners(nb);
    };
    expect(cross('ne')).toBe(INNER_NE);
    expect(cross('se')).toBe(INNER_SE);
    expect(cross('sw')).toBe(INNER_SW);
    expect(cross('nw')).toBe(INNER_NW);
  });

  it('a forma não depende do material: o predicado é quem decide o que conecta', () => {
    const a = wallPiece(wallNeighbors((x, y) => x === 1 && y === 0, 0, 0));
    expect(a.cap).toBe(CAP_E);
  });

  describe('placa fina (geometria do autotile, espessura explícita 0,25 / 0,35)', () => {
    const THIN = { x: 0.25, z: 0.35 };
    const area = (rs: Array<{ x0: number; x1: number; z0: number; z1: number }>) => rs.reduce((a, r) => a + (r.x1 - r.x0) * (r.z1 - r.z0), 0);
    const nbOf = (rows: string[], x: number, y: number) => wallNeighbors(grid(rows), x, y);
    const { x: TX, z: TZ } = THIN;
    const C0 = (1 - TX) / 2;
    const C1 = (1 + TX) / 2;
    const Z0 = (1 - TZ) / 2;
    const Z1 = (1 + TZ) / 2;

    it('poste isolado: um quadrado fino no centro da célula', () => {
      const f = wallFootprint(nbOf(['.#.'], 1, 0), THIN);
      expect(f).toEqual([{ x0: C0, x1: C1, z0: Z0, z1: Z1 }]);
      expect(wallFrontRanges(nbOf(['.#.'], 1, 0), THIN)).toEqual([[C0, C1]]);
    });

    it('fileira leste–oeste: frente de célula inteira e sem lacuna entre blocos', () => {
      const rows = ['###'];
      expect(wallFrontRanges(nbOf(rows, 1, 0), THIN)).toEqual([[0, 1]]);
      expect(wallFrontRanges(nbOf(rows, 0, 0), THIN)).toEqual([[C0, 1]]); // ponta oeste: começa no poste
      expect(wallFrontRanges(nbOf(rows, 2, 0), THIN)).toEqual([[0, C1]]);
    });

    it('fileira norte–sul: nenhuma frente, exceto o último bloco (fina)', () => {
      const rows = ['#', '#', '#'];
      expect(wallFrontRanges(nbOf(rows, 0, 0), THIN)).toEqual([]);
      expect(wallFrontRanges(nbOf(rows, 0, 1), THIN)).toEqual([]);
      expect(wallFrontRanges(nbOf(rows, 0, 2), THIN)).toEqual([[C0, C1]]);
    });

    it('canto noroeste do cômodo (leste + sul): só o braço leste mostra a frente', () => {
      const nb = nbOf(['##', '#.'], 0, 0);
      expect(wallFrontRanges(nb, THIN)).toEqual([[C1, 1]]);
    });

    it('a pegada não se sobrepõe e fica dentro da célula; a área cresce com os braços', () => {
      const cross = nbOf(['.#.', '###', '.#.'], 1, 1);
      const f = wallFootprint(cross, THIN);
      expect(f).toHaveLength(5);
      for (const r of f) { expect(r.x0).toBeGreaterThanOrEqual(0); expect(r.x1).toBeLessThanOrEqual(1); expect(r.z0).toBeGreaterThanOrEqual(0); expect(r.z1).toBeLessThanOrEqual(1); }
      // poste + 2 braços norte/sul (x × (1 − z)/2) + 2 braços leste/oeste (z × (1 − x)/2)
      expect(area(f)).toBeCloseTo(TX * TZ + 2 * TX * (1 - TZ) / 2 + 2 * TZ * (1 - TX) / 2, 9);
    });

    it('thin: sem vizinho a leste/oeste', () => {
      expect(wallThin(nbOf(['.#.'], 1, 0))).toBe(true);
      expect(wallThin(nbOf(['##'], 0, 0))).toBe(false);
    });
  });

  describe('espessura ajustável por eixo', () => {
    const is = (rows: string[]) => grid(rows);
    it('o padrão é x 1,0 · z 0,35 (escolhido pelo dono do produto em 13/11/2026)', () => {
      expect(DEFAULT_WALL_THICKNESS).toEqual({ x: 1, z: 0.35 });
    });

    it('x muda a largura do poste e das faixas norte–sul; z muda a profundidade da tampa', () => {
      const nb = wallNeighbors(is(['.#.']), 1, 0);
      const [post] = wallFootprint(nb, { x: 0.2, z: 0.4 });
      expect(post.x1 - post.x0).toBeCloseTo(0.2, 9);
      expect(post.z1 - post.z0).toBeCloseTo(0.4, 9);
    });

    it('os braços continuam indo até a borda da célula, com a espessura de cada eixo', () => {
      const nb = wallNeighbors(is(['###']), 1, 0);
      const f = wallFootprint(nb, { x: 0.25, z: 0.35 });
      const west = f.find((r) => r.x0 === 0)!;
      const east = f.find((r) => r.x1 === 1)!;
      expect(west.z1 - west.z0).toBeCloseTo(0.35, 9); // profundidade da tampa
      expect(west.x1).toBeCloseTo(0.375, 9);
      expect(east.x0).toBeCloseTo(0.625, 9);
    });

    it('a frente de uma fileira leste–oeste continua sem lacuna com qualquer espessura', () => {
      const nb = wallNeighbors(is(['###']), 1, 0);
      for (const t of [{ x: 0.2, z: 0.35 }, { x: 0.5, z: 0.2 }]) expect(wallFrontRanges(nb, t)).toEqual([[0, 1]]);
    });

    it('a faixa fina da frente de um fim de coluna acompanha x', () => {
      const nb = wallNeighbors(is(['#', '#']), 0, 1);
      const [[a, b]] = wallFrontRanges(nb, { x: 0.25, z: 0.35 });
      expect(a).toBeCloseTo(0.375, 9);
      expect(b).toBeCloseTo(0.625, 9);
    });

    it('lê "0.25,0.35", "0.3" e rejeita lixo; limita a 0,1–1,0', () => {
      expect(parseWallThickness('0.25,0.35')).toEqual({ x: 0.25, z: 0.35 });
      expect(parseWallThickness('0.3')).toEqual({ x: 0.3, z: 0.3 });
      expect(parseWallThickness('abc')).toBeNull();
      expect(parseWallThickness('')).toBeNull();
      expect(parseWallThickness('0.1,0.2,0.3')).toBeNull();
      expect(parseWallThickness('5,0')).toEqual({ x: 1, z: 0.1 });
      expect(clampWallThickness({ x: NaN, z: 0.5 })).toEqual({ x: 0.3, z: 0.5 });
    });
  });

  describe('coluna da largura da célula (x = 0,9 e 1,0, v0.93.20)', () => {
    const nbOf = (rows: string[], x: number, y: number) => wallNeighbors(grid(rows), x, y);

    it('x = 1: a coluna ocupa a célula inteira em x e não há braços leste/oeste (comprimento zero)', () => {
      const parts = wallFootprintParts(nbOf(['###'], 1, 0), { x: 1, z: 0.35 });
      expect(parts.map((p) => p.kind)).toEqual(['post']);
      expect(parts[0].rect.x0).toBe(0);
      expect(parts[0].rect.x1).toBe(1);
    });

    it('x = 1: uma fileira leste–oeste ainda tem frente de célula inteira, sem faixas de comprimento zero', () => {
      const nb = nbOf(['###'], 1, 0);
      expect(wallFrontRanges(nb, { x: 1, z: 0.35 })).toEqual([[0, 1]]);
      for (const [a, b] of wallFrontRanges(nbOf(['##', '#.'], 0, 0), { x: 1, z: 0.35 })) expect(b).toBeGreaterThan(a);
    });

    it('x = 0,9: braços leste/oeste de 0,05 e braços norte/sul de largura 0,9', () => {
      const parts = wallFootprintParts(nbOf(['.#.', '###', '.#.'], 1, 1), { x: 0.9, z: 0.35 });
      const by = Object.fromEntries(parts.map((p) => [p.kind, p.rect]));
      expect(by.n.x1 - by.n.x0).toBeCloseTo(0.9, 9);
      expect(by.s.x1 - by.s.x0).toBeCloseTo(0.9, 9);
      expect(by.w.x1 - by.w.x0).toBeCloseTo(0.05, 9);
      expect(by.e.x1 - by.e.x0).toBeCloseTo(0.05, 9);
    });

    it('as partes não se sobrepõem em nenhuma espessura', () => {
      for (const t of [{ x: 0.25, z: 0.35 }, { x: 0.9, z: 0.35 }, { x: 1, z: 0.35 }]) {
        const rs = wallFootprint(nbOf(['.#.', '###', '.#.'], 1, 1), t);
        const total = rs.reduce((a, r) => a + (r.x1 - r.x0) * (r.z1 - r.z0), 0);
        const union = new Set<string>();
        const N = 200;
        for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
          const px = (i + 0.5) / N, pz = (j + 0.5) / N;
          if (rs.some((r) => px >= r.x0 && px < r.x1 && pz >= r.z0 && pz < r.z1)) union.add(`${i},${j}`);
        }
        expect(union.size / (N * N)).toBeCloseTo(total, 2); // soma das áreas = área da união (sem sobreposição)
      }
    });
  });

  describe('padrão x = 1,0 (decisão final)', () => {
    const nbOf = (rows: string[], x: number, y: number) => wallNeighbors(grid(rows), x, y);
    const shapeKey = (m: number) => JSON.stringify(wallFootprint({ n: !!(m & CAP_N), e: !!(m & CAP_E), s: !!(m & CAP_S), w: !!(m & CAP_W), ne: false, se: false, sw: false, nw: false }));

    it('só os vizinhos norte/sul mudam a forma da tampa: 4 formas para as 16 máscaras', () => {
      const shapes = new Set(Array.from({ length: 16 }, (_, m) => shapeKey(m)));
      expect(shapes.size).toBe(4);
      expect(shapeKey(0)).toBe(shapeKey(CAP_E | CAP_W)); // poste e fileira têm a mesma forma
      expect(shapeKey(CAP_N)).toBe(shapeKey(CAP_N | CAP_E)); // coluna com ramal leste: mesma forma
      expect(shapeKey(CAP_N | CAP_S)).toBe(shapeKey(CAP_N | CAP_S | CAP_E | CAP_W));
    });

    it('a coluna contínua (N + S) ocupa a célula inteira', () => {
      const f = wallFootprint(nbOf(['.#.', '.#.', '.#.'], 1, 1));
      const covered = (px: number, pz: number) => f.some((r) => px >= r.x0 && px < r.x1 && pz >= r.z0 && pz < r.z1);
      for (const px of [0.05, 0.5, 0.95]) for (const pz of [0.05, 0.5, 0.95]) expect(covered(px, pz)).toBe(true);
    });

    it('frente só onde não há parede ao sul, sempre de célula inteira; canto leste+sul não mostra frente', () => {
      expect(wallFrontRanges(nbOf(['###'], 1, 0))).toEqual([[0, 1]]);
      expect(wallFrontRanges(nbOf(['.#.'], 1, 0))).toEqual([[0, 1]]);        // bloco isolado
      expect(wallFrontRanges(nbOf(['#', '#'], 0, 1))).toEqual([[0, 1]]);     // fim de coluna
      expect(wallFrontRanges(nbOf(['#', '#'], 0, 0))).toEqual([]);           // meio da coluna
      expect(wallFrontRanges(nbOf(['##', '#.'], 0, 0))).toEqual([]);         // canto: coberto pelo braço sul
    });
  });
});
