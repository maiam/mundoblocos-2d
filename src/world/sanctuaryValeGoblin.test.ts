import { describe, expect, it } from 'vitest';
import { Block, blockDef } from './blocks';
import { WORLD_PROFILES } from './profiles';
import { buildValeGoblin, valeHeights, valeLevel, VALE_N } from './sanctuaryValeGoblin';
import { VALE_ALTURAS, VALE_CAVERNA, VALE_FOGUEIRA, VALE_GOBLINS, VALE_SUPERFICIES } from './valeGoblinData';
import { World } from './world';

const S = WORLD_PROFILES.santuario;
const X0 = -32, Y0 = -96; // canto noroeste do Vale Goblin no mundo (coluna 0 / linha 0): ao norte do bloco original

function vale(): World {
  const w = new World(1, S);
  for (let cx = -2; cx <= 5; cx++) for (let cy = -6; cy <= 1; cy++) w.loadChunk(cx, cy);
  return w;
}
const wx = (x: number): number => X0 + 32 + x; // x do pacote (−32..31) → mundo
const wy = (z: number): number => Y0 + 32 + z;

describe('Vale Goblin do Santuário (v0.93.158, ADR 0038)', () => {
  it('os dados do pacote têm 64 × 64 células, a fogueira e os 7 goblins', () => {
    expect(VALE_ALTURAS).toHaveLength(64);
    expect(VALE_SUPERFICIES.every((r) => r.length === 64)).toBe(true);
    expect(VALE_GOBLINS).toHaveLength(7);
    expect(VALE_FOGUEIRA).toEqual([0, 3, -2]);
    expect(VALE_CAVERNA.vazios).toHaveLength(24);
  });

  it('conversão de alturas: terraços 3..14 → 2..6, rocha → 7 ou 8; vizinhos caminháveis diferem no máximo 1', () => {
    expect(valeLevel(3, false)).toBe(2);
    expect(valeLevel(14, false)).toBe(6);
    expect(valeLevel(15, true)).toBe(7);
    expect(valeLevel(32, true)).toBe(8);
    const { level, rock } = valeHeights();
    for (let r = 0; r < VALE_N; r++) for (let c = 0; c < VALE_N; c++) {
      const i = r * VALE_N + c;
      for (const [dr, dc] of [[0, 1], [1, 0]] as const) {
        if (r + dr >= VALE_N || c + dc >= VALE_N) continue;
        const j = (r + dr) * VALE_N + c + dc;
        if (!rock[i] && !rock[j]) expect(Math.abs(level[i] - level[j]), `degrau em ${r},${c}`).toBeLessThanOrEqual(1);
        else if (!rock[i]) expect(level[j]).toBeGreaterThanOrEqual(level[i]);
        else if (!rock[j]) expect(level[i]).toBeGreaterThanOrEqual(level[j]);
      }
    }
  });

  it('é determinística, cabe na pilha de 8 e só usa blocos do Santuário', () => {
    const a = buildValeGoblin(1), b = buildValeGoblin(1);
    expect(a).toEqual(b);
    for (const col of a) {
      expect(col.length).toBeLessThanOrEqual(8);
      for (const id of col) if (id !== Block.AIR) expect(S.blocks.includes(id) || id === Block.TENT_PART || id === Block.CAMPFIRE || id === Block.ISO_GOBLIN, `id ${id}`).toBe(true);
    }
  });

  it('a Deusa nasce na origem; o vale fica ao norte do bloco original e o canto ao norte da Fazenda é céu aberto', () => {
    const w = vale();
    expect(w.findSpawn()).toEqual([0, 0]);
    expect(w.inBounds(0, -96)).toBe(true);
    expect(w.inBounds(0, -97)).toBe(false);
    expect(w.inBounds(95, -33)).toBe(true);
    expect(w.getGround(60, -60)).toBe(Block.VOID); // canto vazio
    expect(w.standHeight(60, -60)).toBeNull();
    expect(w.canPlace(60, -60, Block.STONE)).toBe(false);
    expect(w.standHeight(wx(0), wy(0))).toBe(2); // chão do vale
  });

  it('fogueira no lugar do pacote e os 7 goblins (malhas 3D, sólidos) nas posições do pacote, no chão do vale', () => {
    const w = vale();
    const [fx, , fz] = VALE_FOGUEIRA;
    expect(w.getLevel(wx(fx), wy(fz), 2)).toBe(Block.CAMPFIRE);
    for (const [x, , z] of VALE_GOBLINS) {
      expect(w.getLevel(wx(x), wy(z), 2), `goblin em ${x},${z}`).toBe(Block.ISO_GOBLIN);
      expect(w.getLevel(wx(x), wy(z), 1)).not.toBe(Block.AIR); // em cima do chão (planície de 2 cubos)
      expect(w.standHeight(wx(x), wy(z))).toBeNull(); // sólido
      expect(blockDef(Block.ISO_GOBLIN).placeable).toBe(false);
    }
  });

  it('a caverna da borda sul liga a trilha do vale à plataforma externa e ao bloco original (túnel de piso 3 com teto de rocha)', () => {
    const w = vale();
    const [bx, , bz] = VALE_CAVERNA.bocaExterna;
    for (const z of [21, 24, 27, bz]) expect(w.standHeight(wx(bx), wy(z)), `z ${z}`).toBe(3);
    expect(blockDef(w.getLevel(wx(bx), wy(24), 5)).shape).toBe('cube'); // teto
    expect(w.getLevel(wx(bx), wy(24), 3)).toBe(Block.AIR);
    expect(w.getLevel(wx(bx), wy(24), 4)).toBe(Block.AIR);
    // a plataforma externa encosta na borda norte do bloco original: dá para ir a pé do ponto de nascimento (0, 0) até a fogueira do vale, pela caverna
    expect(w.standHeight(bx, wy(bz + 4) + 1)).toBe(2); // o original, logo ao sul da plataforma
    const start = [0, 0], goal = `${wx(VALE_FOGUEIRA[0])},${wy(VALE_FOGUEIRA[2]) + 1}`;
    const seen = new Set<string>([start.join(',')]);
    const queue = [start];
    while (queue.length) {
      const [x, y] = queue.pop()!;
      const sh = w.standHeight(x, y)!;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = x + dx, ny = y + dy, key = nx + ',' + ny;
        if (seen.has(key) || !w.inBounds(nx, ny)) continue;
        const nh = w.standHeight(nx, ny);
        if (nh === null || Math.abs(nh - sh) > 1) continue;
        seen.add(key);
        queue.push([nx, ny]);
      }
    }
    expect(seen.has(goal)).toBe(true);
  });
});
