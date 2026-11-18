import { describe, expect, it } from 'vitest';
import { CHUNK_SIZE } from '../config';
import { hotbarFor } from '../game/hotbar';
import { Entities } from '../game/entities';
import { Player } from '../game/player';
import { Block } from './blocks';
import { chunkCount, resolveWorldId, WORLD_PROFILES } from './profiles';
import { World } from './world';

const S = { ...WORLD_PROFILES.santuario, terrain: { ...WORLD_PROFILES.santuario.terrain, landscape: false } }; // terreno liso em camadas (sem a paisagem fixa): base dos testes de mecânica

describe('Perfis de mundo', () => {
  it('escolhe o mundo por build fixo, subdomínio e ?mundo=', () => {
    expect(resolveWorldId('santuario.orvalis.pensamentos.online', '')).toBe('santuario');
    expect(resolveWorldId('orvalis.pensamentos.online', '?mundo=santuario')).toBe('santuario');
    expect(resolveWorldId('localhost', '')).toBe('principal');
    expect(resolveWorldId('santuario.com', '')).toBe('principal'); // domínio de 2 partes não é subdomínio
    expect(resolveWorldId('localhost', '?mundo=xyz')).toBe('principal');
    expect(resolveWorldId('qualquer.host.com', '', 'santuario')).toBe('santuario');
  });

  it('Santuário tem 32 chunks (8 × 4: o original e a Fazenda a leste); o Mundo principal é ilimitado', () => {
    expect(chunkCount(S.bounds)).toBe(32);
    expect(S.bounds!.cx1 - S.bounds!.cx0 + 1).toBe(8);
    expect(S.bounds!.cy1 - S.bounds!.cy0 + 1).toBe(4);
    expect(chunkCount(WORLD_PROFILES.principal.bounds)).toBeNull();
  });
});

describe('Santuário (terreno em camadas, ADR 0036)', () => {
  it('terreno em camadas: chão de grama, Bloco de Pedra no nível 1 e Grama no nível 2 em toda célula; fora dos limites é céu intransponível', () => {
    const w = new World(1, S);
    const b = S.bounds!;
    for (let y = b.cy0 * CHUNK_SIZE; y < (b.cy1 + 1) * CHUNK_SIZE; y += 3) {
      for (let x = b.cx0 * CHUNK_SIZE; x < (b.cx1 + 1) * CHUNK_SIZE; x += 3) {
        expect(w.getGround(x, y)).toBe(Block.ISO_G_GRASS);
        expect(w.getLevel(x, y, 0)).toBe(Block.ISO_STONE_BLOCK); // "nível 1" do dono do produto: a camada de pedra
        expect(w.getLevel(x, y, 1)).toBe(Block.ISO_G_GRASS);     // "nível 2": a camada de grama
        expect(w.getLevel(x, y, 2)).toBe(Block.AIR);             // "nível 3": onde ficam a Deusa e todo o resto
        expect(w.stackHeight(x, y)).toBe(2);
        expect(w.standHeight(x, y)).toBe(2);
        expect(w.topBlock(x, y)).toEqual({ id: Block.ISO_G_GRASS, level: 1 });
      }
    }
    const outside = [[b.cx0 * CHUNK_SIZE - 1, 0], [(b.cx1 + 1) * CHUNK_SIZE, 0], [0, b.cy0 * CHUNK_SIZE - 1], [0, (b.cy1 + 1) * CHUNK_SIZE]];
    for (const [x, y] of outside) {
      expect(w.getGround(x, y)).toBe(Block.VOID);
      expect(w.standHeight(x, y)).toBeNull();
      expect(w.canBreak(x, y)).toBe(false);
      expect(w.placeBlock(x, y, Block.ISO_G_STONE)).toBe(false);
    }
  });

  it('cavar: a grama sai, depois a pedra, depois o chão vira buraco; as regras do Santuário não vazam para o Mundo', () => {
    const w = new World(1, S);
    expect(w.breakBlock(5, 5)).toBe(Block.ISO_G_GRASS);
    expect(w.standHeight(5, 5)).toBe(1);
    expect(w.breakBlock(5, 5)).toBe(Block.ISO_STONE_BLOCK);
    expect(w.standHeight(5, 5)).toBe(0);
    expect(S.breakSeconds).toBe(1);
    expect(S.surfaceObjects).toBe(true);
    expect(WORLD_PROFILES.principal.breakSeconds).toBeNull();      // Mundo: pela ferramenta (1 s) ou mão (2 s)
    expect(WORLD_PROFILES.principal.surfaceObjects).toBe(false);
    expect(WORLD_PROFILES.principal.terrain.kind).toBe('procedural');
  });

  it('nunca carrega mais que 32 chunks', () => {
    const w = new World(1, S);
    while (w.ensureChunks({ cx0: -20, cy0: -20, cx1: 20, cy1: 20 }, 50) > 0);
    expect(w.loadedCount).toBe(32);
  });

  it('só deixa colocar as 68 peças (a porta exige batentes); cubos empilham e objetos ficam EM CIMA do terreno (nível 3)', () => {
    const w = new World(1, S);
    const [x, y] = w.findSpawn();
    for (const b of S.blocks.filter((id) => id !== Block.OAK_DOOR)) expect(w.canPlace(x, y, b)).toBe(true);
    expect(w.canPlace(x, y, Block.OAK_DOOR)).toBe(false); // sem os dois batentes ao lado
    expect(w.canPlace(x, y, Block.WALL_PLANKS)).toBe(false); // fora do perfil (as paredes não entram no Santuário)
    expect(w.placeBlock(x, y, Block.ISO_STONE_BLOCK)).toBe(true);
    expect(w.getLevel(x, y, 2)).toBe(Block.ISO_STONE_BLOCK); // cubo empilha no topo (2 → 3 cubos)
    expect(w.placeBlock(x + 1, y, Block.ISO_TREE)).toBe(true);
    expect(w.getLevel(x + 1, y, 0)).toBe(Block.ISO_STONE_BLOCK); // a árvore não toma o nível 0: fica em cima das camadas
    expect(w.getLevel(x + 1, y, 2)).toBe(Block.ISO_TREE);
    expect(w.stackHeight(x + 1, y)).toBe(2);                     // objeto não é altura de piso
    expect(w.standHeight(x + 1, y)).toBeNull();                  // árvore sólida
    expect(w.placeBlock(x + 1, y, Block.ISO_G_STONE)).toBe(false); // sobre um objeto não empilha cubo
    expect(w.placeBlock(x + 2, y, Block.ISO_DAISIES)).toBe(true);
    expect(w.standHeight(x + 2, y)).toBe(2);                     // enfeite não bloqueia
    expect(w.breakBlock(x + 1, y)).toBe(Block.ISO_TREE);        // quebra primeiro o objeto de cima
    expect(w.standHeight(x + 1, y)).toBe(2);
  });

  it('a casa 12 × 12 assenta em cima do terreno (mesma altura nas 144 células) e cai inteira', () => {
    const w = new World(1, S);
    const [x, y] = [-20, 20];
    expect(w.placeBlock(x, y, Block.ISO_HOUSE)).toBe(true);
    expect(w.getLevel(x, y, 2)).toBe(Block.ISO_HOUSE);
    expect(w.getLevel(x + 11, y - 11, 2)).toBe(Block.ISO_HOUSE_PART);
    expect(w.getLevel(x + 5, y - 5, 0)).toBe(Block.ISO_STONE_BLOCK); // o terreno continua embaixo
    w.placeBlock(x + 20, y, Block.ISO_G_STONE);       // um degrau em outra altura
    expect(w.canPlace(x + 18, y, Block.ISO_HOUSE)).toBe(false);   // cobriria o degrau: alturas diferentes
    expect(w.breakBlock(x + 7, y - 4)).toBe(Block.ISO_HOUSE);
  });

  it('spawn no centro; Deusa isométrica é a personagem; hotbar com as 70 peças', () => {
    const w = new World(1, S);
    const [x, y] = w.findSpawn();
    expect(w.inBounds(x, y)).toBe(true);
    expect(Math.abs(x)).toBeLessThanOrEqual(1);
    expect(Math.abs(y)).toBeLessThanOrEqual(1);
    expect(w.standHeight(x, y)).toBe(2); // a Deusa nasce em cima das duas camadas
    const e = new Entities(new Player(x + 0.5, y + 0.5), Math.random, S.character);
    expect(e.actors[0].kind).toBe('goddess-iso-idle'); // parada: folha de idle; andando, 'goddess-iso'
    const hb = hotbarFor(S);
    expect(hb).toHaveLength(75); // 70 peças + 5 sementes/vegetais (v0.93.152)
    expect(hb.filter((s) => s.kind === 'block')).toHaveLength(70);
    expect(hb.slice(70).every((s) => s.kind === 'item')).toBe(true);
    expect(hotbarFor(WORLD_PROFILES.principal)).toHaveLength(58); // (v0.93.110: + 15 Flores Fofas; v0.93.99: + Portões de Bétula e de Cerejeira; v0.93.96: + Cercas de Bétula e de Cerejeira; v0.93.90: + Cerca de Estacas) 5 ferramentas + 2 itens + 19 materiais (8 + 7 pedras + 2 de cerejeira + 2 de bétula) + porta + tenda + baú + fogueira + caldeirão + forno + cadeira + 3 cercas (Carvalho, Bétula, Cerejeira) + 3 portões + 15 flores fofas + 2 paredes + porta de parede (W5)
  });
});

describe('Blocos do Mundo no Santuário (v0.93.146): objetos de superfície', () => {
  it('porta entre dois batentes do mesmo nível abre e fecha; baú guarda itens; tenda cai inteira e o terreno fica', () => {
    const w = new World(3, S);
    const [x, y] = [-10, 10];
    expect(w.placeBlock(x + 1, y, Block.OAK_DOOR)).toBe(false);
    w.placeBlock(x, y, Block.STONE); w.placeBlock(x + 2, y, Block.STONE);
    expect(w.placeBlock(x + 1, y, Block.OAK_DOOR)).toBe(true);
    expect(w.getLevel(x + 1, y, 2)).toBe(Block.OAK_DOOR);
    expect(w.standHeight(x + 1, y)).toBeNull();               // fechada
    expect(w.toggleDoor(x + 1, y)).toBe(true);
    expect(w.isDoorOpen(x + 1, y)).toBe(true);
    expect(w.standHeight(x + 1, y)).toBe(2);                  // aberta: passa
    expect(w.placeBlock(x + 6, y, Block.CHEST)).toBe(true);
    expect(w.chestAt(x + 6, y)).not.toBeNull();
    expect(w.getLevel(x + 6, y, 0)).toBe(Block.ISO_STONE_BLOCK);
    expect(w.placeBlock(x, y + 5, Block.TENT)).toBe(true);
    expect(w.getLevel(x + 1, y + 4, 2)).toBe(Block.TENT_PART);
    expect(w.breakBlock(x + 1, y + 4)).toBe(Block.TENT);
    expect(w.getLevel(x, y + 5, 2)).toBe(Block.AIR);
    expect(w.getLevel(x + 1, y + 4, 0)).toBe(Block.ISO_STONE_BLOCK); // o terreno continua
    expect(w.placeBlock(x + 3, y + 5, Block.CAMPFIRE)).toBe(true);
    expect(w.placeBlock(x + 4, y + 5, Block.FLOWER_HONEY)).toBe(true);
  });
});

describe('Sementes e vegetais no Santuário (v0.93.152)', () => {
  it('a grade fixa termina com trigo (semente e vegetal), cenoura, batata e tomate', () => {
    const items = hotbarFor(S).filter((h) => h.kind === 'item').map((h) => (h as { item: string }).item);
    expect(items).toEqual(['wheat_seed', 'wheat', 'carrot', 'potato', 'tomato']);
  });

  it('planta só sobre Terra Arada, no topo da pilha, e a planta cresce', () => {
    const w = new World(1, S);
    const [x, y] = [0, 0];
    expect(w.canPlant(x, y, Block.CARROT_0)).toBe(false); // grama não serve
    const level = w.stackHeight(x, y);
    expect(w.placeBlockAt(x, y, Block.TILLED, level)).toBe(true);
    expect(w.canPlant(x, y, Block.CARROT_0)).toBe(true);
    expect(w.plant(x, y, Block.CARROT_0)).toBe(true);
    expect(w.surfaceObject(x, y)).toBe(Block.CARROT_0);
    expect(w.canPlant(x, y, Block.CARROT_0)).toBe(false); // já ocupada
    for (let i = 0; i < 200; i++) w.tick(100, () => 0, true);
    expect(w.surfaceObject(x, y)).not.toBe(Block.CARROT_0);
  });
});

