import { bench, describe } from 'vitest';
import { CHUNK_SIZE } from '../src/config';
import { World } from '../src/world/world';
import { WorldGenerator } from '../src/world/generator';

const N = CHUNK_SIZE * CHUNK_SIZE;

describe('mundo', () => {
  const g = new WorldGenerator(42);
  const a = new Uint8Array(N), b = new Uint8Array(N), c = new Uint8Array(N);
  let k = 0;
  bench('gerar 1 chunk', () => {
    g.generateChunk(k++ % 50, (k * 7) % 50, a, b, c);
  });

  const w = new World(42);
  for (let cy = -2; cy <= 2; cy++) for (let cx = -2; cx <= 2; cx++) w.loadChunk(cx, cy);
  bench('ler 1000 células carregadas (getObject+getUpper+getGround)', () => {
    for (let i = 0; i < 1000; i++) {
      const x = (i % 60) - 30, y = ((i / 60) | 0) - 8;
      w.getObject(x, y); w.getUpper(x, y); w.getGround(x, y);
    }
  });
});
