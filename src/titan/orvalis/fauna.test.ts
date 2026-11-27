import { describe, expect, it } from 'vitest';
import { attackFauna } from '../combat';
import { FAUNA_KINDS, FAUNA_ORDER, GROUP_CHANCE, GROUP_CHANCE_V3, groupChanceFor, faunaAim, faunaBox, faunaLoot, faunaPose, faunaSpecs, faunaYaw, GROUP_SIZE, hasFauna, hurtFauna, newFauna, PANIC_S, stepFauna, type Fauna } from '../fauna';
import { foodOf, isItem, Item, ITEM_NAMES, maxStack } from '../items';
import { craft, RECIPES } from '../recipes';
import { MemoryTitanStorage } from '../save';
import { openSession } from '../session';
import { sweep } from '../dropTestUtil';
import { smeltRecipe } from '../furnace';
import { TitanGenerator } from '../generator';
import { T } from '../voxel';
import { ORVALIS_GENERATOR_VERSION, OrvalisGenerator, orvalisGeneratorFor } from './generator';

/** Fauna de fazenda do Orvalis (ADR 0124): regras da Minecraft Wiki (vida, caixa de acerto, grupos de 4, espólio) e os itens novos. */
const open = async (seed = 42, version = ORVALIS_GENERATOR_VERSION) => openSession(new MemoryTitanStorage(), seed, () => 1, orvalisGeneratorFor, version, (sd, v) => new OrvalisGenerator(sd, v));

describe('Espécies: números da Wiki', () => {
  it('vida e caixa de acerto (Java)', () => {
    expect(FAUNA_KINDS.porco).toMatchObject({ hp: 10, width: 0.9, height: 0.9 });
    expect(FAUNA_KINDS.vaca).toMatchObject({ hp: 10, width: 0.9, height: 1.4 });
    expect(FAUNA_KINDS.ovelha).toMatchObject({ hp: 8, width: 0.9, height: 1.3 });
    expect(FAUNA_KINDS.galinha).toMatchObject({ hp: 4, width: 0.4, height: 0.7 });
  });
  it('pesos de geração 12/10/10/8 (Planície) e grupos de 4', () => {
    expect(FAUNA_ORDER.map((k) => FAUNA_KINDS[k].weight)).toEqual([12, 10, 10, 8]);
    expect(GROUP_SIZE).toBe(4);
  });
});

describe('Geração: função pura da seed, só no Orvalis v3', () => {
  it('v ≤ 2 e o Titã não têm fauna', () => {
    expect(hasFauna({ world: 'orvalis', version: 2 })).toBe(false);
    expect(hasFauna({ world: 'titan', version: 13 })).toBe(false);
    expect(faunaSpecs(new OrvalisGenerator(42, 2))).toEqual([]);
    expect(faunaSpecs(new TitanGenerator(42) as never)).toEqual([]);
  });
  it('determinística: a mesma seed dá os mesmos animais; seeds diferentes, outros', () => {
    const a = faunaSpecs(new OrvalisGenerator(42, 3)), b = faunaSpecs(new OrvalisGenerator(42, 3)), c = faunaSpecs(new OrvalisGenerator(7, 3));
    expect(a.length).toBeGreaterThan(8);
    expect(b).toEqual(a);
    expect(c).not.toEqual(a);
  });
  it('cada animal nasce em grama, acima da água, com ar em cima, dentro da região, e há as quatro espécies', () => {
    const results = [42, 7, 1234].map((seed) => ({ g: new OrvalisGenerator(seed, 3), specs: faunaSpecs(new OrvalisGenerator(seed, 3)) }));
    const kinds = new Set<string>();
    for (const { g, specs } of results) for (const sp of specs) {
      kinds.add(sp.kind);
      expect(g.inRegion(sp.x, sp.z)).toBe(true);
      expect(g.blockAt(sp.x, sp.y - 1, sp.z)).toBe(T.GRASS);
      expect(sp.y - 1).toBeGreaterThanOrEqual(64);
      expect(g.blockAt(sp.x, sp.y, sp.z)).toBe(T.AIR); expect(g.blockAt(sp.x, sp.y + 1, sp.z)).toBe(T.AIR);
    }
    expect([...kinds].sort()).toEqual(['galinha', 'ovelha', 'porco', 'vaca']);
  });
  it('ids únicos e grupos da mesma espécie', () => {
    const specs = faunaSpecs(new OrvalisGenerator(42, 3)), ids = new Set(specs.map((s) => s.id));
    expect(ids.size).toBe(specs.length);
    const groups = new Map<string, Set<string>>();
    for (const s of specs) { const k = s.id.split('_').slice(0, 3).join('_'); (groups.get(k) ?? groups.set(k, new Set()).get(k)!).add(s.kind); }
    for (const kinds of groups.values()) expect(kinds.size).toBe(1);
  });
  it('a v3 só liga a fauna: o terreno é o da v2', () => {
    const v2 = new OrvalisGenerator(42, 2), v3 = new OrvalisGenerator(42, 3);
    for (let x = -60; x <= 60; x += 11) for (let z = -60; z <= 60; z += 13) for (const y of [40, 66, 70, 75]) expect(v3.blockAt(x, y, z)).toBe(v2.blockAt(x, y, z));
  });
  it('a sessão do Orvalis v3 traz a fauna; a v2, não', async () => {
    const s3 = await open(42, 3), s2 = await open(42, 2);
    expect(s3.fauna.length).toBe(faunaSpecs(new OrvalisGenerator(42, 3)).length); expect(s3.fauna.length).toBeGreaterThan(0);
    expect(s2.fauna).toHaveLength(0);
    for (const f of s3.fauna) expect(f.hp).toBe(FAUNA_KINDS[f.kind].hp);
  });
});

describe('Probabilidade de grupo: Wiki na v4, 0,4 preservado na v3', () => {
  it('a v4 usa 0,1 (Wiki) e a v3 segue com 0,4', () => {
    expect(GROUP_CHANCE).toBe(0.1); expect(GROUP_CHANCE_V3).toBe(0.4);
    expect(groupChanceFor(3)).toBe(0.4); expect(groupChanceFor(4)).toBe(0.1); expect(ORVALIS_GENERATOR_VERSION).toBe(4);
  });
  it('a v4 tem bem menos animais que a v3, determinísticos, com o terreno da v3', () => {
    for (const seed of [42, 7, 1234]) {
      const v3 = faunaSpecs(new OrvalisGenerator(seed, 3)), v4 = faunaSpecs(new OrvalisGenerator(seed, 4));
      expect(v4.length).toBeLessThan(v3.length / 2); expect(v4.length).toBeGreaterThan(0);
      expect(faunaSpecs(new OrvalisGenerator(seed, 4))).toEqual(v4);
    }
    const a = new OrvalisGenerator(42, 3), b = new OrvalisGenerator(42, 4);
    for (let x = -60; x <= 60; x += 11) for (let z = -60; z <= 60; z += 13) for (const y of [40, 66, 70]) expect(b.blockAt(x, y, z)).toBe(a.blockAt(x, y, z));
  });
  it('a sessão nova (v4) traz a fauna da v4', async () => {
    const s = await open(42, ORVALIS_GENERATOR_VERSION);
    expect(s.fauna.length).toBe(faunaSpecs(new OrvalisGenerator(42, 4)).length);
  });
});

const mk = async (kind: 'porco' | 'vaca' | 'ovelha' | 'galinha' = 'porco') => {
  const s = await open(42, 3);
  const f: Fauna = newFauna({ id: 't0', kind, x: 0, y: 70, z: 0 }, 42);
  f.body.x = 10.5; f.body.y = 70; f.body.z = 0.5;
  s.fauna.length = 0; s.fauna.push(f);
  return { s, f };
};

describe('Mira: a caixa da Wiki', () => {
  it('o raio acerta dentro da caixa e erra fora dela', async () => {
    const { f } = await mk('vaca'); // 0,9 × 1,4
    const box = faunaBox(f);
    expect(box.x1 - box.x0).toBeCloseTo(0.9); expect(box.y1 - box.y0).toBeCloseTo(1.4);
    expect(faunaAim([f], 0, 70.7, 0.5, 1, 0, 0, 20)?.dist).toBeCloseTo(10.5 - 0.45);
    expect(faunaAim([f], 0, 71.6, 0.5, 1, 0, 0, 20)).toBeNull(); // acima da altura (1,4 m)
    expect(faunaAim([f], 0, 70.7, 1.2, 1, 0, 0, 20)).toBeNull(); // ao lado da largura
    expect(faunaAim([f], 0, 70.7, 0.5, 1, 0, 0, 9)).toBeNull(); // além do alcance
    expect(faunaAim([f], 0, 70.7, 0.5, 1, 0, 0, 20, 4)).toBeNull(); // bloco mais perto esconde
  });
  it('a galinha é uma caixa pequena (0,4 × 0,7)', async () => {
    const { f } = await mk('galinha');
    expect(faunaAim([f], 0, 70.35, 0.5, 1, 0, 0, 20)).not.toBeNull();
    expect(faunaAim([f], 0, 70.35, 0.8, 1, 0, 0, 20)).toBeNull();
    expect(faunaAim([f], 0, 71, 0.5, 1, 0, 0, 20)).toBeNull();
  });
});

describe('Comportamento', () => {
  it('ferida, foge no sentido oposto ao do golpe, por PANIC_S, e depois volta a passear', async () => {
    const { s, f } = await mk('ovelha');
    for (let y = 68; y <= 72; y++) for (let x = 0; x <= 24; x++) for (let z = -8; z <= 8; z++) s.volume.set(x, y, z, y < 70 ? T.STONE : T.AIR);
    f.body.y = 70; f.body.vy = 0;
    const r = hurtFauna(f, 2, 0, 0.5);
    expect(r.dead).toBe(false); expect(f.hp).toBe(6); expect(f.phase).toBe('panic');
    const x0 = f.body.x;
    for (let i = 0; i < 40; i++) stepFauna(f, s.volume, 0.05);
    expect(f.body.x).toBeGreaterThan(x0 + 0.5); // fugiu para longe de x = 0
    for (let i = 0; i < Math.ceil(PANIC_S / 0.05); i++) stepFauna(f, s.volume, 0.05);
    expect(f.phase).toBe('wander');
  });
  it('a fuga é mais rápida que o passeio e a galinha corre mais (1,4×)', () => {
    expect(FAUNA_KINDS.galinha.panic).toBeGreaterThan(FAUNA_KINDS.porco.panic);
    expect(FAUNA_KINDS.porco.panic).toBe(1.25);
  });
  it('o passeio fica perto de casa e a pose anda quando se mexe', async () => {
    const { s, f } = await mk('porco');
    for (let y = 68; y <= 72; y++) for (let x = 0; x <= 24; x++) for (let z = -12; z <= 12; z++) s.volume.set(x, y, z, y < 70 ? T.STONE : T.AIR);
    f.body.y = 70; f.pause = 0;
    let moved = false;
    for (let i = 0; i < 600; i++) { if (stepFauna(f, s.volume, 0.05).moving) moved = true; }
    expect(moved).toBe(true);
    expect(Math.hypot(f.body.x - f.home.x, f.body.z - f.home.z)).toBeLessThan(9);
    expect(faunaPose(f, true).legs[0]).toBeCloseTo(-faunaPose(f, true).legs[1]);
    expect(faunaPose(f, false).legs).toEqual([0, -0, -0, 0]);
  });
  it('a frente do modelo é −Z', () => {
    expect(faunaYaw(0, -1)).toBeCloseTo(0);
    expect(faunaYaw(1, 0)).toBeCloseTo(-Math.PI / 2);
  });
});

describe('Espólio da Wiki', () => {
  const draws = (kind: 'porco' | 'vaca' | 'ovelha' | 'galinha') => Array.from({ length: 200 }, (_, i) => faunaLoot(kind, 42, i));
  const range = (kind: 'porco' | 'vaca' | 'ovelha' | 'galinha', item: number) => { const n = draws(kind).map((l) => l.find((x) => x.item === item)?.count ?? 0); return [Math.min(...n), Math.max(...n)]; };
  it('porco: 1–3 carne de porco crua', () => expect(range('porco', Item.PORCO_CRU)).toEqual([1, 3]));
  it('vaca: 0–2 couro e 1–3 carne bovina', () => { expect(range('vaca', Item.COURO)).toEqual([0, 2]); expect(range('vaca', Item.BOVINA_CRUA)).toEqual([1, 3]); });
  it('ovelha: 1 lã e 1–2 carneiro', () => { expect(range('ovelha', Item.LA)).toEqual([1, 1]); expect(range('ovelha', Item.CARNEIRO_CRU)).toEqual([1, 2]); });
  it('galinha: 0–2 penas e 1 frango', () => { expect(range('galinha', Item.PENA)).toEqual([0, 2]); expect(range('galinha', Item.FRANGO_CRU)).toEqual([1, 1]); });
  it('é determinístico', () => expect(faunaLoot('vaca', 42, 5)).toEqual(faunaLoot('vaca', 42, 5)));
});

describe('Golpe e abate', () => {
  it('o punho tira 1, a vida cai e o animal foge', async () => {
    const { s, f } = await mk('porco');
    const r = attackFauna(s, 0);
    expect(r.ok).toBe(true); expect(r.dead).toBe(false); expect(f.hp).toBe(9); expect(f.phase).toBe('panic');
  });
  it('abatido solta o espólio no chão, some e não volta na sessão', async () => {
    const { s, f } = await mk('galinha');
    f.hp = 1;
    const r = attackFauna(s, 0);
    expect(r.dead).toBe(true); expect(s.fauna).toHaveLength(0);
    expect(r.msg).toContain('Galinha abatido');
    sweep(s);
    expect(s.inventory.total(Item.FRANGO_CRU)).toBe(1);
    expect(s.inventory.total(Item.PENA)).toBeGreaterThanOrEqual(0);
  });
  it('um espólio antigo ainda no chão não apaga o novo', async () => {
    const { s, f } = await mk('porco');
    f.hp = 1; attackFauna(s, 0);
    const first = [...s.drops.keys()];
    const g = newFauna({ id: 't0', kind: 'porco', x: 0, y: 70, z: 0 }, 42); g.hp = 1; s.fauna.push(g);
    attackFauna(s, 0);
    expect(s.drops.size).toBeGreaterThan(first.length);
  });
  it('índice inválido não faz nada', async () => {
    const { s } = await mk('porco');
    expect(attackFauna(s, 9).ok).toBe(false);
  });
});

describe('Itens 89–99, comida e receitas', () => {
  it('faixa do Orvalis, nomes, pilha 64 e atlas até o 99', () => {
    expect(Item.COURO).toBe(89); expect(Item.FRANGO_ASSADO).toBe(99);
    for (let i = 89; i <= 99; i++) { expect(isItem(i)).toBe(true); expect(ITEM_NAMES[i]).toBeTruthy(); expect(maxStack(i)).toBe(64); }
    expect(isItem(100)).toBe(false);
    expect(ITEM_NAMES[Item.BIFE]).toBe('Bife'); expect(ITEM_NAMES[Item.LA]).toBe('Lã');
  });
  it('comida da Wiki: carne crua e assada', () => {
    expect(foodOf(Item.PORCO_CRU)).toEqual({ hunger: 3, saturation: 1.8 }); expect(foodOf(Item.PORCO_ASSADO)).toEqual({ hunger: 8, saturation: 12.8 });
    expect(foodOf(Item.BOVINA_CRUA)).toEqual({ hunger: 3, saturation: 1.8 }); expect(foodOf(Item.BIFE)).toEqual({ hunger: 8, saturation: 12.8 });
    expect(foodOf(Item.CARNEIRO_CRU)).toEqual({ hunger: 2, saturation: 1.2 }); expect(foodOf(Item.CARNEIRO_ASSADO)).toEqual({ hunger: 6, saturation: 9.6 });
    expect(foodOf(Item.FRANGO_CRU)).toEqual({ hunger: 2, saturation: 1.2 }); expect(foodOf(Item.FRANGO_ASSADO)).toEqual({ hunger: 6, saturation: 7.2 });
    expect(foodOf(Item.COURO)).toBeNull(); expect(foodOf(Item.LA)).toBeNull(); expect(foodOf(Item.PENA)).toBeNull();
  });
  it('a Fornalha assa cada carne crua, uma por vez', () => {
    for (const [cru, assado] of [[Item.PORCO_CRU, Item.PORCO_ASSADO], [Item.BOVINA_CRUA, Item.BIFE], [Item.CARNEIRO_CRU, Item.CARNEIRO_ASSADO], [Item.FRANGO_CRU, Item.FRANGO_ASSADO]]) {
      const r = smeltRecipe(cru, 'furnace');
      expect(r?.result).toEqual({ item: assado, count: 1 }); expect(r?.world).toBe('orvalis');
      expect(smeltRecipe(cru, 'brazier')).toBeNull(); // o braseiro é do Titã (ADR 0114)
    }
  });
  it('itens do Orvalis não entram em receita do Titã', () => {
    for (const r of RECIPES.filter((x) => x.world !== 'orvalis')) for (const i of [...r.ingredients.map((x) => x.item), r.result.item]) expect(i < 89 || i > 99).toBe(true);
    expect(typeof craft).toBe('function');
  });
});
