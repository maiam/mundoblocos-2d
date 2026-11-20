import { describe, expect, it } from 'vitest';
import { TitanGenerator } from './generator';
import { TitanVolume } from './volume';
import { collides, newBody, raycast, safePosition, stepBody } from './physics';
import { chunkOf, columnIndex, inRegion, isSolid, localOf, localY, REGION_MAX, REGION_MIN, sectionOf, T } from './voxel';

/** Formações da seed 42 como a entrega 1 (v0.94.0) as gerou: os saves da v1 não podem mudar. */
const RECORDED_V1_SEED_42 = [{ kind: 'rock', x: -6, z: -16 }, { kind: 'ice', x: -11, z: -26 }];
const SEEDS = [42, 7, 1, 2, 3, 99, 1234, 777777, 2 ** 31 - 1, 31337, 5, 6, 8, 9, 10, 11, 12, 13, 14, 15];

describe('endereçamento (docs Titã 05 §2/§7)', () => {
  it('X/Z em −17, −16, −1, 0, 15 e 16 caem no chunk certo com local 0..15', () => {
    const want: Array<[number, number, number]> = [[-17, -2, 15], [-16, -1, 0], [-1, -1, 15], [0, 0, 0], [15, 0, 15], [16, 1, 0]];
    for (const [v, c, l] of want) { expect(chunkOf(v)).toBe(c); expect(localOf(v)).toBe(l); }
  });
  it('Y = −64, −1, 0, 63, 64 e 319 → seção e Y local corretos', () => {
    const want: Array<[number, number, number]> = [[-64, 0, 0], [-1, 3, 15], [0, 4, 0], [63, 7, 15], [64, 8, 0], [319, 23, 15]];
    for (const [y, s, l] of want) { expect(sectionOf(y)).toBe(s); expect(localY(y)).toBe(l); }
    expect(columnIndex(0, -64, 0)).toBe(0);
  });
});

describe('gerador (determinismo, chegada, lago)', () => {
  it('mesma seed e versão → mesma costa; seeds diferentes → terreno diferente', () => {
    const a = new TitanGenerator(42), b = new TitanGenerator(42), c = new TitanGenerator(7);
    let diff = 0;
    for (let z = REGION_MIN; z < REGION_MAX; z += 3) for (let x = REGION_MIN; x < REGION_MAX; x += 3) {
      expect(a.column(x, z)).toEqual(b.column(x, z));
      if (a.column(x, z).top !== c.column(x, z).top) diff++;
    }
    expect(a.arrival).toEqual(b.arrival);
    expect(diff).toBeGreaterThan(40);
  });
  it('a ordem de consulta não altera a base', () => {
    const a = new TitanGenerator(42), b = new TitanGenerator(42);
    const pts: Array<[number, number]> = [];
    for (let i = 0; i < 300; i++) pts.push([REGION_MIN + (i * 7) % 64, REGION_MIN + (i * 13) % 64]);
    const fwd = pts.map(([x, z]) => a.blockAt(x, 60, z));
    const rev = [...pts].reverse().map(([x, z]) => b.blockAt(x, 60, z)).reverse();
    expect(fwd).toEqual(rev);
  });
  for (const seed of SEEDS) for (const version of [2, 3]) {
    it(`seed ${seed} (gerador v${version}): chegada seca (solo em Y=64, pés em 65, 2 blocos livres), clareira 6×6, formações e acessibilidade`, () => {
      const g = new TitanGenerator(seed, version), v = new TitanVolume(g);
      const a = g.arrival;
      expect(a.y).toBe(65);
      expect(inRegion(a.x, a.z)).toBe(true);
      const c = a.clearing;
      for (let x = c.x0; x < c.x0 + c.size; x++) for (let z = c.z0; z < c.z0 + c.size; z++) {
        expect(v.get(x, 64, z)).toBe(T.SAND);
        expect(v.get(x, 65, z)).toBe(T.AIR);
        expect(v.get(x, 66, z)).toBe(T.AIR);
        expect(g.lakeField(x, z)).toBeLessThan(0); // seca
      }
      expect(collides(v, a.x, a.y, a.z)).toBe(false);
      // o lago existe e tem líquido até Y = 63
      let liquid = 0, maxLiquidY = -999;
      for (let z = REGION_MIN; z < REGION_MAX; z++) for (let x = REGION_MIN; x < REGION_MAX; x++) for (let y = 40; y < 70; y++) if (v.get(x, y, z) === T.LAKE) { liquid++; maxLiquidY = Math.max(maxLiquidY, y); }
      expect(liquid).toBeGreaterThan(300);
      expect(maxLiquidY).toBe(63);
      // as duas fontes de fragmento (rocha e gelo) existem, em terra seca
      expect(g.formations.map((f) => f.kind).sort()).toEqual(['ice', 'rock']);
      // percurso: de pés (passos de ≤ 1 bloco, sem entrar no lago) chega à costa e às duas formações
      const top = (x: number, z: number): number => { for (let y = 200; y > 0; y--) if (isSolid(v.get(x, y, z))) return y; return -1; };
      const key = (x: number, z: number): number => x * 1000 + z;
      const seen = new Set<number>([key(Math.floor(a.x), Math.floor(a.z))]);
      const q: Array<[number, number]> = [[Math.floor(a.x), Math.floor(a.z)]];
      let reachedShore = false;
      while (q.length) {
        const [x, z] = q.pop()!;
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, nz = z + dz;
          if (!inRegion(nx, nz) || seen.has(key(nx, nz))) continue;
          if (Math.abs(top(nx, nz) - top(x, z)) > 1) continue;
          if (v.get(nx, top(nx, nz) + 1, nz) === T.LAKE) reachedShore = true; // dá para chegar à beira da água
          seen.add(key(nx, nz)); q.push([nx, nz]);
        }
      }
      expect(reachedShore).toBe(true);
      for (const f of g.formations) expect(seen.has(key(f.x, f.z))).toBe(true);
      // fragmentos de superfície: 3 lascas de rocha e 3 de gelo, ids únicos, sobre o solo da formação e alcançáveis a pé
      if (version === 3) { expect(g.surfaceItems).toHaveLength(0); return; } // v3: as lascas saem; a fonte é o veio (testes em `veins.test.ts`)
      expect(g.surfaceItems.filter((i) => i.item === 5)).toHaveLength(3);
      expect(g.surfaceItems.filter((i) => i.item === 6)).toHaveLength(3);
      expect(new Set(g.surfaceItems.map((i) => i.id)).size).toBe(6);
      for (const it of g.surfaceItems) { expect(seen.has(key(it.x, it.z))).toBe(true); expect(isSolid(v.get(it.x, it.y - 1, it.z))).toBe(true); expect(v.get(it.x, it.y, it.z)).toBe(T.AIR); }
    });
  }
});

describe('volume: bordas, líquido e deslocamento', () => {
  const mk = (): { v: TitanVolume; g: TitanGenerator } => { const g = new TitanGenerator(42); return { v: new TitanVolume(g), g }; };
  it('remover um bloco da praia permanece; colocar e retirar um sólido na bacia devolve o líquido', () => {
    const { v, g } = mk();
    // praia: sólido de areia na região
    const a = g.arrival;
    const bx = Math.floor(a.x), bz = Math.floor(a.z);
    expect(v.remove(bx, 64, bz)).toBe(true);
    expect(v.get(bx, 64, bz)).toBe(T.AIR);
    // bacia: primeira célula líquida
    let lx = 0, lz = 0, found = false;
    for (let z = REGION_MIN; z < REGION_MAX && !found; z++) for (let x = REGION_MIN; x < REGION_MAX && !found; x++) if (v.get(x, 63, z) === T.LAKE) { lx = x; lz = z; found = true; }
    expect(found).toBe(true);
    expect(v.place(lx, 63, lz, T.DARK_ROCK)).toBe(true);
    expect(v.get(lx, 63, lz)).toBe(T.DARK_ROCK);
    expect(v.remove(lx, 63, lz)).toBe(true);
    expect(v.get(lx, 63, lz)).toBe(T.LAKE);
    expect(v.editCount).toBe(1); // só a praia: na bacia não sobra delta, o líquido volta pela base
    expect(v.get(bx, 64, bz)).toBe(T.AIR); // a praia continua removida
  });
  it('a rocha-mãe e fora da região não se editam', () => {
    const { v } = mk();
    expect(v.remove(0, -64, 0)).toBe(false);
    expect(v.place(40, 65, 0, T.SAND)).toBe(false);
  });
  it('editar na divisa de chunks marca as seções dos dois lados', () => {
    const { v } = mk();
    v.takeTouched();
    expect(v.place(15, 120, 0, T.DARK_ROCK)).toBe(true);
    const keys = v.takeTouched();
    expect(keys).toContain('0,11,0'); // y 120 → (120+64)/16 = 11
    expect(keys).toContain('1,11,0');
  });
});

describe('física e mira', () => {
  it('cai, pousa na chegada e salta 1 bloco, mas não 2', () => {
    const g = new TitanGenerator(42), v = new TitanVolume(g);
    const a = g.arrival;
    const b = newBody(a.x, a.y + 3, a.z);
    for (let i = 0; i < 120; i++) stepBody(v, b, { dirX: 0, dirZ: 0, jump: false }, 1 / 60);
    expect(b.y).toBeCloseTo(65, 2);
    expect(b.onGround).toBe(true);
    // degrau de 1 e de 2 à frente
    v.place(Math.floor(a.x) + 1, 65, Math.floor(a.z), T.SAND);
    v.place(Math.floor(a.x) + 2, 65, Math.floor(a.z), T.SAND);
    v.place(Math.floor(a.x) + 2, 66, Math.floor(a.z), T.SAND);
    v.place(Math.floor(a.x) + 2, 67, Math.floor(a.z), T.SAND); // 2 blocos acima do degrau de 1
    let y = 0;
    for (let i = 0; i < 90; i++) { stepBody(v, b, { dirX: 1, dirZ: 0, jump: true }, 1 / 60); y = Math.max(y, b.y); }
    expect(y).toBeGreaterThan(66); // subiu o degrau de 1 bloco
    expect(b.x).toBeLessThan(Math.floor(a.x) + 2.2); // o muro de 2 blocos barrou
  });
  it('a mira acerta a face certa, ignora o líquido e respeita o alcance', () => {
    const g = new TitanGenerator(42), v = new TitanVolume(g);
    const a = g.arrival;
    const hit = raycast(v, a.x, 66.62, a.z, 0, -1, 0, 6);
    expect(hit).toMatchObject({ y: 64, ny: 1 });
    expect(raycast(v, a.x, 100, a.z, 0, 1, 0, 6)).toBeNull();
    // sobre o lago, o raio atravessa o líquido e bate no fundo
    let lx = 0, lz = 0;
    outer: for (let z = REGION_MIN; z < REGION_MAX; z++) for (let x = REGION_MIN; x < REGION_MAX; x++) if (v.get(x, 63, z) === T.LAKE && v.get(x, 62, z) !== T.LAKE) { lx = x; lz = z; break outer; }
    const h2 = raycast(v, lx + 0.5, 66, lz + 0.5, 0, -1, 0, 8);
    expect(h2).not.toBeNull();
    expect(v.get(h2!.x, h2!.y, h2!.z)).not.toBe(T.LAKE);
  });
  it('posição gravada obstruída reabre em posição segura', () => {
    const g = new TitanGenerator(42), v = new TitanVolume(g);
    const a = g.arrival;
    const p = safePosition(v, { x: a.x, y: 50, z: a.z }, a); // dentro da rocha
    expect(collides(v, p.x, p.y, p.z)).toBe(false);
    expect(safePosition(v, { x: NaN, y: 0, z: 0 }, a)).toEqual({ x: a.x, y: a.y, z: a.z });
  });
});

describe('versões do gerador', () => {
  it('v1 (entrega 1) continua gerando a mesma costa e as mesmas formações para os saves antigos', () => {
    const v1 = new TitanGenerator(42, 1);
    expect(v1.version).toBe(1);
    expect(v1.formations).toEqual(RECORDED_V1_SEED_42);
    // terreno fora das formações é igual nas duas versões
    const v2 = new TitanGenerator(42, 2);
    expect(v2.version).toBe(2);
    expect(v2.arrival).toEqual(v1.arrival);
    expect(new TitanGenerator(42).version).toBe(10); // a versão atual (ADR 0072)
    expect(new TitanGenerator(42, 5).region).toEqual({ min: -32, max: 32 }); expect(new TitanGenerator(42).region).toEqual({ min: -64, max: 64 }); // região por versão
    expect(new TitanGenerator(42, 4).nutPlants).toHaveLength(0); // a v4 não tem plantas de noz
    expect(new TitanGenerator(42, 3).version).toBe(3);
  });
});
