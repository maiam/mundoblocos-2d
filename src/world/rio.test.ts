import { describe, expect, it } from 'vitest';
import { Block, ALL_BLOCK_IDS, blockDef } from './blocks';
import { RIO_CANAL, RIO_LAGO, RIO_PIECES, RIO_VIRTUAL_FIRST, isRioBrush, rioEdge, rioHasExact, rioKind, rioPieceAt, rioPieceFor, rioVirtualId } from './rio';
import { WORLD_PROFILES } from './profiles';
import { World } from './world';

const S = WORLD_PROFILES.santuario;
/** Mapa de teste: células de água em (x, y) → pincel. */
const grid = (cells: Record<string, number>) => (x: number, y: number) => (cells[x + ',' + y] ?? Block.AIR) as number;

describe('Rio das Fadas: peças e autotile (v0.93.147)', () => {
  it('26 peças de códigos válidos; pincéis são blocos colocáveis do Santuário e não colidem com nenhum id', () => {
    expect(RIO_PIECES).toHaveLength(26);
    for (const p of RIO_PIECES) expect(p.edges).toMatch(/^[DCF]{4}$/);
    expect(new Set(RIO_PIECES.map((p) => p.key)).size).toBe(26);
    expect(S.blocks).toContain(RIO_CANAL);
    expect(S.blocks).toContain(RIO_LAGO);
    expect(blockDef(RIO_CANAL).placeable).toBe(true);
    expect(blockDef(RIO_LAGO).shape).toBe('cube');
    expect(ALL_BLOCK_IDS.filter((id) => id === RIO_CANAL || id === RIO_LAGO)).toHaveLength(2);
    expect(isRioBrush(RIO_CANAL) && isRioBrush(RIO_LAGO) && !isRioBrush(Block.ISO_G_GRASS)).toBe(true);
    expect(rioKind(RIO_LAGO)).toBe('lago');
    expect(RIO_VIRTUAL_FIRST).toBeGreaterThan(255); // ids virtuais nunca se confundem com blocos do mapa
  });

  it('borda entre células: lago se qualquer lado é lago; seco contra o que não é água', () => {
    expect(rioEdge('canal', 'canal')).toBe('C');
    expect(rioEdge('canal', 'lago')).toBe('F');
    expect(rioEdge('lago', 'canal')).toBe('F');
    expect(rioEdge('lago', null)).toBe('D');
  });

  it('a peça exata é escolhida quando existe (canal reto, curva, cruz, foz) e isolado vira poça / lago das ninfeias', () => {
    const key = (get: ReturnType<typeof grid>, x = 0, y = 0) => rioPieceAt(get, x, y, 0).key;
    expect(key(grid({ '0,0': RIO_CANAL }))).toBe('poca');
    expect(key(grid({ '0,0': RIO_LAGO }))).toBe('ninfeias');
    expect(key(grid({ '0,0': RIO_CANAL, '0,-1': RIO_CANAL, '0,1': RIO_CANAL }))).toBe('canal_ns');
    expect(key(grid({ '0,0': RIO_CANAL, '-1,0': RIO_CANAL, '1,0': RIO_CANAL }))).toBe('canal_lo');
    expect(key(grid({ '0,0': RIO_CANAL, '0,-1': RIO_CANAL, '1,0': RIO_CANAL }))).toBe('curva_nl');
    expect(key(grid({ '0,0': RIO_CANAL, '0,-1': RIO_CANAL, '1,0': RIO_CANAL, '0,1': RIO_CANAL, '-1,0': RIO_CANAL }))).toBe('cruz');
    // canal que chega num lago pelo sul: foz (norte canal, sul lago)
    expect(key(grid({ '0,0': RIO_CANAL, '0,-1': RIO_CANAL, '0,1': RIO_LAGO }))).toBe('foz_lago');
    // nascente: ponta de canal
    expect(key(grid({ '0,0': RIO_CANAL, '0,-1': RIO_CANAL }))).toBe('nascente_n');
  });

  it('só olha o mesmo nível: água em outro nível não conecta', () => {
    const get = (x: number, y: number, l: number) => (l === 1 && x === 0 && y === 0) || (l === 2 && x === 0 && y === -1) ? RIO_CANAL : Block.AIR;
    expect(rioPieceAt(get, 0, 0, 1).key).toBe('poca');
  });

  it('sem peça exata usa a de menor custo (nunca falha) e continua do mesmo pincel', () => {
    expect(rioHasExact('canal', 'DCCD')).toBe(false); // curva sul–leste: arte que falta
    const p = rioPieceFor('canal', 'DCCD', 3, 4, 0);
    expect(p.kind).toBe('canal');
    expect(p.edges).not.toBe('DDDD');
    for (const k of ['canal', 'lago'] as const) for (const w of ['DDDD', 'FCDF', 'CCCC', 'FFFF']) expect(rioPieceFor(k, w, 1, 1, 0).kind).toBe(k);
  });

  it('variação da água é determinística pela posição e usa mais de uma peça', () => {
    const seen = new Set<string>();
    for (let x = 0; x < 20; x++) for (let y = 0; y < 20; y++) {
      const a = rioPieceFor('lago', 'FFFF', x, y, 2), b = rioPieceFor('lago', 'FFFF', x, y, 2);
      expect(a).toBe(b);
      seen.add(a.key);
    }
    expect(seen.size).toBeGreaterThan(1);
    expect([...seen].every((k) => ['calma', 'ondulada', 'espuma', 'rochedos'].includes(k))).toBe(true);
  });

  it('World: pincel vai para a pilha (nunca para o buraco do chão) e quebrar devolve o pincel', () => {
    const w = new World(5, S);
    const [x, y] = [-6, 6];
    expect(w.placeBlock(x, y, RIO_CANAL)).toBe(true);
    expect(w.getLevel(x, y, 2)).toBe(RIO_CANAL);
    expect(w.placeBlock(x + 1, y, RIO_LAGO)).toBe(true);
    expect(w.breakBlock(x + 1, y)).toBe(RIO_LAGO);
    expect(rioVirtualId(RIO_PIECES[0])).toBe(RIO_VIRTUAL_FIRST);
    expect(w.getGround(x, y)).not.toBe(RIO_CANAL); // a água do rio mora na pilha, nunca no chão
  });

  it('World: mexer na borda de um chunk avisa o chunk vizinho para redesenhar', () => {
    const w = new World(5, S);
    const edgeX = 15; // última coluna do chunk 0 (a do chunk 1 começa em 16)
    w.loadChunk(0, 0); w.loadChunk(1, 0); // os dois chunks vizinhos carregados
    const right = w.getChunk(1, 0), left = w.getChunk(0, 0);
    expect(left && right).toBeTruthy();
    const v = right!.version;
    w.placeBlock(edgeX, 4, RIO_CANAL);
    expect(right!.version).toBeGreaterThan(v);
  });
});
