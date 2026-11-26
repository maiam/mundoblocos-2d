import { blockBoxes, T, WALL_E, WALL_N, WALL_S, WALL_W, type CellBox } from '../titan/voxel';
import type { ModelData } from './art/titan';

/**
 * Modelo 3D da Mureta de Pedra por máscara de conexão (ADR 0110): as mesmas caixas da colisão (`blockBoxes`), com as UV sobre a tira de 2 tiles de 16 px (topo | face,
 * `scripts/make-orvalis-mureta.py`). Sem arquivo: sai do código, uma vez por máscara. O poste é o primeiro box; os braços (N, E, S, W) vêm depois, na ordem dos bits.
 * Faces escondidas não entram: a ponta externa do braço (encosta no vizinho), a interna (encosta no poste) e a do poste que dá para um braço. A base também não.
 * Textura na direção desenhada: o topo dos braços de norte e sul gira 90° (o trecho da arte corre em X) e a lateral usa u = posição ao longo da face (a lateral −X e a de trás saem espelhadas).
 */
const EPS = 0.5 / 32; // meio texel de recuo nas bordas do tile (u)
const V_MIN = 0.25 + 1 / 64, V_MAX = 0.75 - 1 / 64; // o trecho útil da arte vai das linhas 4 a 11 (topo) e 4 a 15 (face): recuo de 1/4 de texel, senão a amostragem vizinha pega o transparente (pontos pretos)

type Face = { corners: [number, number, number][]; n: [number, number, number]; tile: 0 | 1; uv: (x: number, y: number, z: number) => [number, number]; dir: 'top' | 'N' | 'E' | 'S' | 'W' };

function facesOf(b: CellBox): Face[] {
  const [x0, y0, z0, x1, y1, z1] = b;
  const alongX = x1 - x0 >= z1 - z0; // o braço de leste/oeste (e o poste) usam o topo como desenhado; norte/sul giram
  return [
    { dir: 'top', corners: [[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]], n: [0, 1, 0], tile: 0, uv: alongX ? (x, _y, z) => [x, z] : (x, _y, z) => [z, x] },
    { dir: 'S', corners: [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], n: [0, 0, 1], tile: 1, uv: (x, y) => [x, 1 - y] },
    { dir: 'N', corners: [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]], n: [0, 0, -1], tile: 1, uv: (x, y) => [1 - x, 1 - y] },
    { dir: 'E', corners: [[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]], n: [1, 0, 0], tile: 1, uv: (_x, y, z) => [1 - z, 1 - y] },
    { dir: 'W', corners: [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], n: [-1, 0, 0], tile: 1, uv: (_x, y, z) => [z, 1 - y] },
  ];
}

const cache = new Map<number, ModelData>();
export function wallModelData(mask: number): ModelData {
  const hit = cache.get(mask);
  if (hit) return hit;
  const boxes = blockBoxes(T.STONE_WALL + mask)!;
  const arms = [WALL_N, WALL_E, WALL_S, WALL_W].filter((bit) => mask & bit); // a ordem dos braços em `wallBoxes`
  const pos: number[] = [], nrm: number[] = [], uv: number[] = [], idx: number[] = [];
  boxes.forEach((b, i) => {
    const hidden = new Set<string>();
    const postToward = (bit: number): string => (bit === WALL_N ? 'N' : bit === WALL_E ? 'E' : bit === WALL_S ? 'S' : 'W');
    const opposite = (d: string): string => (d === 'N' ? 'S' : d === 'S' ? 'N' : d === 'E' ? 'W' : 'E');
    if (i === 0) for (const bit of arms) hidden.add(postToward(bit)); // o poste não mostra a face que dá para um braço
    else { const d = postToward(arms[i - 1]); hidden.add(d); hidden.add(opposite(d)); } // o braço não mostra a ponta externa nem a que encosta no poste
    for (const f of facesOf(b)) {
      if (hidden.has(f.dir)) continue;
      const base = pos.length / 3;
      for (const [x, y, z] of f.corners) {
        pos.push(+(x - 0.5).toFixed(4), +y.toFixed(4), +(z - 0.5).toFixed(4));
        nrm.push(...f.n);
        const [u, v] = f.uv(x, y, z);
        const uu = Math.min(Math.max(u, EPS), 1 - EPS);
        uv.push(+((f.tile + uu) / 2).toFixed(5), +Math.min(Math.max(v, V_MIN), f.tile === 0 ? V_MAX : 1 - 1 / 64).toFixed(5));
      }
      idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  });
  const out = { size: [1, 1, 1], pos, nrm, uv, idx };
  cache.set(mask, out);
  return out;
}
