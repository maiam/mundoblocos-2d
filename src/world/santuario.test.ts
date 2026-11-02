import { describe, expect, it } from 'vitest';
import { CHUNK_SIZE } from '../config';
import { hotbarFor } from '../game/hotbar';
import { Entities } from '../game/entities';
import { Player } from '../game/player';
import { Block, CELESTIAL_BLOCKS, MATERIALS } from './blocks';
import { chunkCount, resolveWorldId, WORLD_PROFILES } from './profiles';
import { World } from './world';

const S = WORLD_PROFILES.santuario;

describe('Perfis de mundo', () => {
  it('escolhe o mundo por build fixo, subdomínio e ?mundo=', () => {
    expect(resolveWorldId('santuario.maiamapps.com.br', '')).toBe('santuario');
    expect(resolveWorldId('maiamapps.com.br', '?mundo=santuario')).toBe('santuario');
    expect(resolveWorldId('localhost', '')).toBe('principal');
    expect(resolveWorldId('santuario.com', '')).toBe('principal'); // domínio de 2 partes não é subdomínio
    expect(resolveWorldId('localhost', '?mundo=xyz')).toBe('principal');
    expect(resolveWorldId('qualquer.host.com', '', 'santuario')).toBe('santuario');
  });

  it('Santuário tem exatamente 10 chunks (5 × 2)', () => {
    expect(chunkCount(S.bounds)).toBe(10);
    expect(S.bounds!.cx1 - S.bounds!.cx0 + 1).toBe(5);
    expect(S.bounds!.cy1 - S.bounds!.cy0 + 1).toBe(2);
    expect(chunkCount(WORLD_PROFILES.principal.bounds)).toBeNull();
  });
});

describe('Santuário Celestial', () => {
  it('chão todo de Nuvem Sólida, sem objetos; fora dos limites é céu intransponível', () => {
    const w = new World(1, S);
    const b = S.bounds!;
    for (let y = b.cy0 * CHUNK_SIZE; y < (b.cy1 + 1) * CHUNK_SIZE; y++) {
      for (let x = b.cx0 * CHUNK_SIZE; x < (b.cx1 + 1) * CHUNK_SIZE; x++) {
        expect(w.getGround(x, y)).toBe(Block.CLOUD_SOLID);
        expect(w.getObject(x, y)).toBe(Block.AIR);
        expect(w.standHeight(x, y)).toBe(0);
      }
    }
    const outside = [[b.cx0 * CHUNK_SIZE - 1, 0], [(b.cx1 + 1) * CHUNK_SIZE, 0], [0, b.cy0 * CHUNK_SIZE - 1], [0, (b.cy1 + 1) * CHUNK_SIZE]];
    for (const [x, y] of outside) {
      expect(w.getGround(x, y)).toBe(Block.VOID);
      expect(w.standHeight(x, y)).toBeNull();
      expect(w.canBreak(x, y)).toBe(false);
      expect(w.placeBlock(x, y, Block.MARBLE_CELESTIAL)).toBe(false);
    }
  });

  it('nunca carrega mais que 10 chunks', () => {
    const w = new World(1, S);
    while (w.ensureChunks({ cx0: -20, cy0: -20, cx1: 20, cy1: 20 }, 50) > 0);
    expect(w.loadedCount).toBe(10);
  });

  it('só aceita os 18 blocos celestiais; o mundo principal não aceita os celestiais', () => {
    const w = new World(1, S);
    const [x, y] = w.findSpawn();
    expect(CELESTIAL_BLOCKS).toHaveLength(18);
    for (const m of MATERIALS) expect(w.canPlace(x, y, m)).toBe(false);
    for (const c of CELESTIAL_BLOCKS) expect(w.canPlace(x, y, c)).toBe(true);
    expect(w.placeBlock(x, y, Block.MARBLE_ORNATE)).toBe(true);
    expect(w.placeBlock(x, y, Block.LIGHT_BLOCK)).toBe(true); // empilha
    const main = new World(1);
    const [mx, my] = main.findSpawn();
    expect(main.canPlace(mx, my, Block.CLOUD_SOLID)).toBe(false);
  });

  it('cavar a nuvem abre buraco que só bloco celestial preenche', () => {
    const w = new World(1, S);
    const [x, y] = w.findSpawn();
    expect(w.breakBlock(x + 2, y)).toBe(Block.CLOUD_SOLID);
    expect(w.getGround(x + 2, y)).toBe(Block.HOLE);
    expect(w.placeBlock(x + 2, y, Block.STONE)).toBe(false);
    expect(w.placeBlock(x + 2, y, Block.CLOUD_SOLID)).toBe(true);
    expect(w.standHeight(x + 2, y)).toBe(0);
  });

  it('spawn no centro; Deusa é a personagem; hotbar só com os 18 blocos', () => {
    const w = new World(1, S);
    const [x, y] = w.findSpawn();
    expect(w.inBounds(x, y)).toBe(true);
    expect(Math.abs(x - -8)).toBeLessThanOrEqual(1); // centro de x ∈ [-48, 31]
    const e = new Entities(new Player(x + 0.5, y + 0.5), Math.random, S.character);
    expect(e.actors[0].kind).toBe('goddess');
    const hb = hotbarFor(S);
    expect(hb).toHaveLength(18);
    expect(hb.every((s) => s.kind === 'block')).toBe(true);
    expect(hotbarFor(WORLD_PROFILES.principal)).toHaveLength(15);
  });
});
