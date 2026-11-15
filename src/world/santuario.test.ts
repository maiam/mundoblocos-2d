import { describe, expect, it } from 'vitest';
import { CHUNK_SIZE } from '../config';
import { hotbarFor } from '../game/hotbar';
import { Entities } from '../game/entities';
import { Player } from '../game/player';
import { Block } from './blocks';
import { chunkCount, resolveWorldId, WORLD_PROFILES } from './profiles';
import { World } from './world';

const S = WORLD_PROFILES.santuario;

describe('Perfis de mundo', () => {
  it('escolhe o mundo por build fixo, subdomínio e ?mundo=', () => {
    expect(resolveWorldId('santuario.orvalis.pensamentos.online', '')).toBe('santuario');
    expect(resolveWorldId('orvalis.pensamentos.online', '?mundo=santuario')).toBe('santuario');
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
  it('chão sob a paisagem permanece Nuvem Sólida; fora dos limites é céu intransponível', () => {
    const w = new World(1, S);
    const b = S.bounds!;
    for (let y = b.cy0 * CHUNK_SIZE; y < (b.cy1 + 1) * CHUNK_SIZE; y++) {
      for (let x = b.cx0 * CHUNK_SIZE; x < (b.cx1 + 1) * CHUNK_SIZE; x++) {
        expect(w.getGround(x, y)).toBe(Block.CLOUD_SOLID);
        const height = w.standHeight(x, y);
        expect(height).not.toBeNull();
        expect(height!).toBeGreaterThanOrEqual(1);
        expect(height!).toBeLessThanOrEqual(5);
        expect(w.topBlock(x, y)?.id).toBe(Block.GRASS);
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

  it('só deixa colocar os oito blocos do laboratório no Santuário', () => {
    const w = new World(1, S);
    const [x, y] = w.findSpawn();
    for(const b of S.blocks) expect(w.canPlace(x, y, b)).toBe(true);
    expect(w.canPlace(x, y, Block.MARBLE_ORNATE)).toBe(false);
    expect(w.canPlace(x, y, Block.CLOUD_SOLID)).toBe(false);
    const main = new World(1);
    const [mx, my] = main.findSpawn();
    expect(main.canPlace(mx, my, Block.WATER_PURE)).toBe(false);
    expect(w.placeBlock(x, y, Block.OAK_LOG)).toBe(true);
    expect(w.placeBlock(x, y, Block.STONE_SMOOTH)).toBe(true); // empilha
  });

  it('cavar a nuvem abre buraco que só um material permitido preenche', () => {
    const w = new World(1, S);
    const [x, y] = w.findSpawn();
    // Desbasta a coluna gerada antes de abrir o chão subjacente.
    while (w.topBlock(x + 2, y)) w.breakBlock(x + 2, y);
    expect(w.breakBlock(x + 2, y)).toBe(Block.CLOUD_SOLID);
    expect(w.getGround(x + 2, y)).toBe(Block.HOLE);
    expect(w.placeBlock(x + 2, y, Block.MARBLE_ORNATE)).toBe(false);
    expect(w.placeBlock(x + 2, y, Block.DIRT)).toBe(true);
    expect(w.standHeight(x + 2, y)).toBe(0);
  });

  it('spawn no centro; Deusa é a personagem; hotbar só com os 8 blocos novos', () => {
    const w = new World(1, S);
    const [x, y] = w.findSpawn();
    expect(w.inBounds(x, y)).toBe(true);
    expect(Math.abs(x - -8)).toBeLessThanOrEqual(1); // centro de x ∈ [-48, 31]
    const e = new Entities(new Player(x + 0.5, y + 0.5), Math.random, S.character);
    expect(e.actors[0].kind).toBe('goddess');
    const hb = hotbarFor(S);
    expect(hb).toHaveLength(8);
    expect(hb.every((s) => s.kind === 'block')).toBe(true);
    expect(hotbarFor(WORLD_PROFILES.principal)).toHaveLength(43); // (v0.93.99: + Portões de Bétula e de Cerejeira; v0.93.96: + Cercas de Bétula e de Cerejeira; v0.93.90: + Cerca de Estacas) 5 ferramentas + 2 itens + 19 materiais (8 + 7 pedras + 2 de cerejeira + 2 de bétula) + porta + tenda + baú + fogueira + caldeirão + forno + cadeira + 3 cercas (Carvalho, Bétula, Cerejeira) + 3 portões + 2 paredes + porta de parede (W5)
  });
});
