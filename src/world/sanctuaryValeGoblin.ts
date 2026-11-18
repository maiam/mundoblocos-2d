import { Block, ISO_TREE_IDS, ISO_TREE_SET } from './blocks';
import { hash2 } from './random';
import { VALE_ALTURAS, VALE_CAVERNA, VALE_FOGUEIRA, VALE_SUPERFICIES } from './valeGoblinData';

/**
 * Vale Goblin do Santuário (v0.93.158, ADR 0038): o terceiro bloco de 4 × 4 chunks (64 × 64 células), a leste da Fazenda, feito a partir do terreno do dono do produto
 * (`assets-src/santuario-vale-goblin`, dados em `valeGoblinData.ts` por `scripts/make-vale-goblin-data.py`). Função PURA (sem DOM, sem `Math.random()`).
 *
 * Um vale fechado por montanhas (alturas 2–32 no pacote). Conversão para a pilha de 8 níveis do Santuário: o chão do vale (3) é a planície de 2 cubos; os terraços de
 * grama (3–14) sobem de 2 a 6 (relevo comprimido e alisado: vizinhos caminháveis diferem no máximo 1 nível, o degrau da Deusa); a rocha (15–32) vira 7 ou 8 (paredes sem
 * objetos em cima). A caverna da borda sul vira um túnel (piso no nível 3, dois níveis livres, teto de rocha). Objetos: fogueira, duas barracas, caixas e barris no
 * acampamento, lampiões na boca da caverna, árvores, arbustos e pedras. Os 7 goblins ficam só como dados (`VALE_GOBLINS`): o Santuário ainda não tem monstros.
 */
export const VALE_N = 64;
/** Pilha máxima (`SANCTUARY_MAX_STACK`). */
const MAX_STACK = 8;
/** Último nível em que ainda cabe um objeto em cima da pilha. */
const MAX_FLOOR = 6;

export type Column = number[];
const at = (r: number, c: number): number => r * VALE_N + c;
const ok = (r: number, c: number): boolean => r >= 0 && c >= 0 && r < VALE_N && c < VALE_N;

/** Nível (nº de cubos) de uma altura do pacote: o terraço de grama 3..14 → 2..6; a rocha 15..23 → 7 e 24+ → 8. */
export function valeLevel(h: number, rock: boolean): number {
  if (rock) return h >= 24 ? 8 : 7;
  return Math.max(2, Math.min(MAX_FLOOR, 2 + Math.round(((h - 3) * 4) / 11)));
}

/** Níveis por célula depois do alisamento (células secas caminháveis vizinhas diferem no máximo 1) e se a célula é rocha. Exportado para os testes. */
export function valeHeights(): { level: Uint8Array; rock: Uint8Array } {
  const level = new Uint8Array(VALE_N * VALE_N);
  const rock = new Uint8Array(VALE_N * VALE_N);
  for (let r = 0; r < VALE_N; r++) {
    for (let c = 0; c < VALE_N; c++) {
      const i = at(r, c);
      rock[i] = VALE_SUPERFICIES[r][c] === 'r' ? 1 : 0;
      level[i] = valeLevel(parseInt(VALE_ALTURAS[r][c], 36), !!rock[i]);
    }
  }
  const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;
  for (let pass = 0; pass < 12; pass++) {
    let changed = false;
    for (let r = 0; r < VALE_N; r++) {
      for (let c = 0; c < VALE_N; c++) {
        const i = at(r, c);
        if (rock[i]) continue;
        for (const [dx, dy] of nb) {
          if (!ok(r + dy, c + dx)) continue;
          const j = at(r + dy, c + dx);
          if (rock[j]) { if (level[i] > level[j]) { level[i] = level[j]; changed = true; } continue; } // a rocha é parede: nunca mais baixa que o terraço ao lado
          if (level[i] > level[j] + 1) { level[i] = level[j] + 1; changed = true; }
        }
      }
    }
    if (!changed) break;
  }
  return { level, rock };
}

export function buildValeGoblin(seed: number): Column[] {
  const { level, rock } = valeHeights();
  const top = new Uint16Array(VALE_N * VALE_N).fill(Block.GRASS);
  const obj = new Uint16Array(VALE_N * VALE_N);
  const keep = new Uint8Array(VALE_N * VALE_N);
  const custom = new Map<number, Column>();
  const cell = (x: number, z: number): number => at(z + 32, x + 32);

  for (let r = 0; r < VALE_N; r++) for (let c = 0; c < VALE_N; c++) if (VALE_SUPERFICIES[r][c] === 't') { top[at(r, c)] = Block.PATH; keep[at(r, c)] = 1; }

  // Caverna: túnel nas células vazias (piso no nível da trilha, dois níveis livres, teto de rocha até o topo da montanha).
  const floor = valeLevel(VALE_CAVERNA.bocaExterna[1], false);
  for (const [x, z] of VALE_CAVERNA.vazios) {
    const i = cell(x, z);
    const col: Column = [Block.STONE, ...Array(Math.max(0, floor - 2)).fill(Block.DIRT), Block.PATH, Block.AIR, Block.AIR];
    while (col.length < level[i]) col.push(Block.STONE);
    custom.set(i, col);
    keep[i] = 1;
  }
  // Lampiões nos dois lados da boca externa.
  const [bx, , bz] = VALE_CAVERNA.bocaExterna;
  for (const x of [bx - 3, bx + 2]) { obj[cell(x, bz)] = Block.ISO_LANTERN; keep[cell(x, bz)] = 1; }

  // Acampamento: fogueira (do pacote), duas barracas 2 × 2 a oeste/sudoeste, caixas e barris.
  const [fx, , fz] = VALE_FOGUEIRA;
  const camp = { c: fx + 32, r: fz + 32 };
  obj[at(camp.r, camp.c)] = Block.CAMPFIRE;
  const tent = (dc: number, dr: number): void => {
    // âncora no canto inferior esquerdo (como `tentCells`: [x, y], [x + 1, y], [x, y − 1], [x + 1, y − 1])
    const cells: Array<[number, number]> = [[0, 0], [1, 0], [0, -1], [1, -1]];
    cells.forEach(([ox, oy], k) => { const i = at(camp.r + dr + oy, camp.c + dc + ox); obj[i] = k === 0 ? Block.TENT : Block.TENT_PART; keep[i] = 1; });
  };
  tent(-7, -1);
  tent(-7, 4);
  obj[at(camp.r + 3, camp.c + 4)] = Block.ISO_CRATE;
  obj[at(camp.r + 2, camp.c + 6)] = Block.ISO_BARREL;
  obj[at(camp.r - 4, camp.c - 5)] = Block.ISO_BARREL;
  for (let dr = -3; dr <= 3; dr++) for (let dc = -3; dc <= 3; dc++) keep[at(camp.r + dr, camp.c + dc)] = 1;

  // Árvores (carvalho e as 4 espécies × 3 tamanhos), arbustos e pedras no chão de grama livre.
  const free = (r: number, c: number): boolean => ok(r, c) && !rock[at(r, c)] && top[at(r, c)] === Block.GRASS && !keep[at(r, c)] && !obj[at(r, c)] && !custom.has(at(r, c)) && level[at(r, c)] <= MAX_FLOOR;
  const near = (r: number, c: number, d: number, f: (j: number) => boolean): boolean => {
    for (let dr = -d; dr <= d; dr++) for (let dc = -d; dc <= d; dc++) if (ok(r + dr, c + dc) && f(at(r + dr, c + dc))) return true;
    return false;
  };
  for (let r = 0; r < VALE_N; r++) {
    for (let c = 0; c < VALE_N; c++) {
      const i = at(r, c);
      if (!free(r, c) || near(r, c, 2, (j) => !!keep[j])) continue;
      const x = c - 32, y = r - 32;
      if (hash2(seed, x, y) < (level[i] > 2 ? 0.05 : 0.014) && !near(r, c, 2, (j) => ISO_TREE_IDS.has(obj[j]))) {
        const pick = Math.floor(hash2(seed ^ 0x51, x, y) * (ISO_TREE_SET.length + 1));
        obj[i] = pick === 0 ? Block.ISO_TREE : ISO_TREE_SET[pick - 1][0];
      }
    }
  }
  for (let r = 0; r < VALE_N; r++) {
    for (let c = 0; c < VALE_N; c++) {
      const i = at(r, c);
      if (!free(r, c)) continue;
      const q = hash2(seed ^ 0x2b, c - 32, r - 32);
      if (near(r, c, 2, (j) => ISO_TREE_IDS.has(obj[j])) && q < 0.1) obj[i] = q < 0.025 ? Block.ISO_BUSH_L : q < 0.05 ? Block.ISO_BUSH_M : Block.ISO_BUSH_S;
      else if (q > 0.97) obj[i] = Block.ISO_ROCK_L;
      else if (q > 0.93 && !near(r, c, 1, (j) => !!keep[j])) obj[i] = Block.ISO_PEBBLES;
    }
  }

  // Colunas finais: pedra no fundo, terra nas paredes dos terraços, o bloco do topo e o objeto por cima da pilha.
  const out: Column[] = [];
  for (let i = 0; i < VALE_N * VALE_N; i++) {
    const c = custom.get(i);
    if (c) { out.push(c); continue; }
    const hh = level[i];
    let col: Column;
    if (rock[i]) col = Array(hh).fill(Block.STONE);
    else if (hh === 2) col = [Block.STONE, top[i]];
    else col = [Block.STONE, ...Array(hh - 2).fill(Block.DIRT), top[i]];
    if (obj[i] && !rock[i] && hh < MAX_STACK) col[hh] = obj[i];
    out.push(col);
  }
  return out;
}
