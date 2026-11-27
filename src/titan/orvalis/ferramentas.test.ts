import { describe, expect, it } from 'vitest';
import { placeFromSlot, breakOrCollect } from '../actions';
import { blockToolOf, breakTotalMs, HOLD_MS, toolAdvantage } from '../breaking';
import { damageOf } from '../combat';
import { BAG, HOTBAR } from '../inventory';
import { isAxe, isHoe, isItem, isPick, isShovel, isTool, Item, ITEM_NAMES, maxStack, toolOf } from '../items';
import { craft, recipeById } from '../recipes';
import { MemoryTitanStorage } from '../save';
import { openSession } from '../session';
import { hoeResult, isHydrated, shovelResult } from '../soil';
import { maxDurability, wearCost } from '../wear';
import { T } from '../voxel';
import { ORVALIS_GENERATOR_VERSION, OrvalisGenerator, orvalisGeneratorFor } from './generator';

/** Ferramentas do Orvalis em voxel (ADR 0112): picareta, machado, pá e enxada, de madeira e de pedra. */
const open = () => openSession(new MemoryTitanStorage(), 42, () => 1, orvalisGeneratorFor, ORVALIS_GENERATOR_VERSION, (s, v) => new OrvalisGenerator(s, v));
type S = Awaited<ReturnType<typeof open>>;
const hold = (s: S, item: number): void => { s.inventory.add(item, 1); const i = [...Array(HOTBAR + BAG).keys()].find((k) => s.inventory.get(k)?.item === item)!; s.selected = i; };
const TOOLS_LIST: ReadonlyArray<[number, string, 'pick' | 'axe' | 'shovel' | 'hoe', 'wood' | 'rock']> = [
  [Item.PICARETA_MADEIRA, 'Picareta de Madeira', 'pick', 'wood'], [Item.PICARETA_PEDRA, 'Picareta de Pedra', 'pick', 'rock'],
  [Item.MACHADO_MADEIRA, 'Machado de Madeira', 'axe', 'wood'], [Item.MACHADO_PEDRA, 'Machado de Pedra', 'axe', 'rock'],
  [Item.PA_MADEIRA, 'Pá de Madeira', 'shovel', 'wood'], [Item.PA_PEDRA, 'Pá de Pedra', 'shovel', 'rock'],
  [Item.ENXADA_MADEIRA, 'Enxada de Madeira', 'hoe', 'wood'], [Item.ENXADA_PEDRA, 'Enxada de Pedra', 'hoe', 'rock'],
];

describe('ferramentas do Orvalis (ADR 0112)', () => {
  it('itens 70–77: nome, tipo, nível, pilha de 1 e durabilidade 59 (madeira) / 131 (pedra)', () => {
    for (const [item, name, kind, tier] of TOOLS_LIST) {
      expect(isItem(item) && isTool(item)).toBe(true); expect(ITEM_NAMES[item]).toBe(name);
      expect(toolOf(item)).toEqual({ kind, tier }); expect(maxStack(item)).toBe(1);
      expect(maxDurability(item)).toBe(tier === 'wood' ? 59 : 131);
      expect(isPick(item)).toBe(kind === 'pick'); expect(isAxe(item)).toBe(kind === 'axe'); expect(isShovel(item)).toBe(kind === 'shovel'); expect(isHoe(item)).toBe(kind === 'hoe');
      expect(wearCost(item, { type: 'use' })).toBe(1); expect(wearCost(item, { type: 'break_block', block: T.STONE })).toBe(1); expect(wearCost(item, { type: 'attack' })).toBe(2);
      expect(damageOf(item)).toBeGreaterThanOrEqual(1);
    }
    expect(isItem(82) && !isItem(83)).toBe(true);
  });

  it('receitas na Mesa (só no Orvalis): 3/3/1/2 materiais + 2 hastes; madeira = tábuas de carvalho, pedra = Pedra', async () => {
    const s = await open();
    const spec: ReadonlyArray<[string, number, number, number]> = [['picareta', 3, Item.PICARETA_MADEIRA, Item.PICARETA_PEDRA], ['machado', 3, Item.MACHADO_MADEIRA, Item.MACHADO_PEDRA], ['pa', 1, Item.PA_MADEIRA, Item.PA_PEDRA], ['enxada', 2, Item.ENXADA_MADEIRA, Item.ENXADA_PEDRA]];
    for (const [id, n, wood, stone] of spec) {
      for (const [suffix, mat, out] of [['madeira', Item.TABUA_CARVALHO, wood], ['pedra', Item.STONE, stone]] as const) {
        const r = recipeById(`${id}-${suffix}`)!;
        expect(r.world).toBe('orvalis'); expect(r.station).toBe('workbench'); expect(r.result).toEqual({ item: out, count: 1 });
        expect(r.ingredients).toEqual([{ item: mat, count: n }, { item: Item.HASTE, count: 2 }]);
        s.inventory.add(mat, n); s.inventory.add(Item.HASTE, 2);
        expect(craft(s.inventory, r, null)).toEqual({ ok: false, reason: 'station' });
        expect(craft(s.inventory, r, 'workbench').ok).toBe(true); expect(s.inventory.total(out)).toBe(1);
      }
    }
  });

  it('a ferramenta certa acelera o bloco certo: picareta na pedra, machado na madeira, pá no solo; a errada não ajuda', () => {
    expect(blockToolOf(T.STONE)).toBe('pick'); expect(blockToolOf(T.STONE_SLAB)).toBe('pick'); expect(blockToolOf(T.STONE_WALL)).toBe('pick'); expect(blockToolOf(T.BRICK_BLOCK)).toBe('pick');
    expect(blockToolOf(T.LOG_OAK)).toBe('axe'); expect(blockToolOf(T.PLANKS_BIRCH)).toBe('axe'); expect(blockToolOf(T.CARPENTRY_90)).toBe('axe');
    expect(blockToolOf(T.DIRT)).toBe('shovel'); expect(blockToolOf(T.GRASS)).toBe('shovel'); expect(blockToolOf(T.PATH)).toBe('shovel'); expect(blockToolOf(T.SAND)).toBe('shovel');
    expect(blockToolOf(T.LEAVES_OAK)).toBeNull(); expect(blockToolOf(T.LANTERN)).toBeNull();
    const ms = (item: number, block: number) => breakTotalMs('block', block, toolAdvantage(item, block));
    expect(ms(Item.PICARETA_PEDRA, T.STONE)).toBe(HOLD_MS + 600); // Wiki: pedra com picareta de pedra 0,6 s
    expect(ms(Item.PICARETA_MADEIRA, T.STONE)).toBe(HOLD_MS + 1150); // Wiki: 1,15 s
    expect(ms(Item.PICARETA_MADEIRA, T.STONE)!).toBeGreaterThan(ms(Item.PICARETA_PEDRA, T.STONE)!); // a de madeira é mais lenta
    expect(ms(Item.MACHADO_PEDRA, T.LOG_OAK)).toBe(HOLD_MS + 750); expect(ms(Item.PA_PEDRA, T.DIRT)).toBe(HOLD_MS + 200); // Wiki: madeira dura 0,75 s com machado de pedra, terra 0,2 s com pá de pedra
    expect(ms(Item.PA_PEDRA, T.STONE)).toBe(HOLD_MS + 7500); expect(ms(Item.MACHADO_PEDRA, T.DIRT)).toBe(HOLD_MS + 750); expect(ms(Item.PICARETA_PEDRA, T.LOG_OAK)).toBe(HOLD_MS + 3000); // ferramenta errada: tempo da mão
    expect(ms(Item.PICARETA_PEDRA, T.LEAVES_OAK)).toBe(HOLD_MS + 300);
    expect(toolAdvantage(null, T.STONE)).toBeNull(); expect(toolAdvantage(Item.NOZ, T.STONE)).toBeNull();
    // a picareta de cobre do Titã agora vale o nível dela (antes toda picareta valia o nível de rocha)
    expect(toolAdvantage(Item.COPPER_PICK, T.DARK_ROCK)).toBe('copper'); expect(breakTotalMs('block', T.VEIN_COPPER, toolAdvantage(Item.COPPER_PICK, T.VEIN_COPPER))).toBe(HOLD_MS + 900);
    expect(breakTotalMs('block', T.VEIN_COPPER, toolAdvantage(Item.PA_PEDRA, T.VEIN_COPPER))).toBeNull(); // só uma picareta quebra o veio
  });

  it('hidratação: lago a até 4 células na horizontal, no nível ou 1 acima; enxada e pá decidem o que fazem', async () => {
    const s = await open(), v = s.volume, a = s.volume.gen.arrival, x = Math.floor(a.x) + 6, z = Math.floor(a.z), y = a.y - 1;
    expect(isHydrated(v, x, y, z)).toBe(false);
    v.set(x + 4, y, z, T.LAKE); expect(isHydrated(v, x, y, z)).toBe(true);
    v.set(x + 4, y, z, T.AIR); v.set(x + 5, y, z, T.LAKE); expect(isHydrated(v, x, y, z)).toBe(false); // 5 é longe
    v.set(x + 5, y, z, T.AIR); v.set(x - 2, y + 1, z + 3, T.LAKE); expect(isHydrated(v, x, y, z)).toBe(true); // 1 acima vale
    v.set(x - 2, y + 1, z + 3, T.AIR);
    expect(hoeResult(v, T.DIRT, x, y, z)).toBe(T.FARMLAND_DRY); expect(hoeResult(v, T.GRASS, x, y, z)).toBe(T.FARMLAND_DRY); expect(hoeResult(v, T.PATH, x, y, z)).toBe(T.FARMLAND_DRY);
    expect(hoeResult(v, T.DIRT_INFERTILE, x, y, z)).toBe(T.DIRT); expect(hoeResult(v, T.STONE, x, y, z)).toBeNull();
    expect(shovelResult(T.GRASS)).toBe(T.PATH); expect(shovelResult(T.DIRT)).toBe(T.PATH); expect(shovelResult(T.STONE)).toBeNull(); expect(shovelResult(T.PATH)).toBeNull();
  });

  it('no jogo: a enxada ara (úmida com água perto), a pá abre caminho, ambas gastam 1; quebrar arada ou caminho devolve terra; a madeira quebra na 59ª vez', async () => {
    const s = await open(), v = s.volume, a = v.gen.arrival, x = Math.floor(a.x) + 6, z = Math.floor(a.z), y = a.y - 1;
    v.set(x, y, z, T.DIRT); v.set(x + 2, y, z + 2, T.DIRT); v.set(x + 3, y, z + 2, T.LAKE); // um bloco longe da água… e um perto
    v.set(x, y, z - 8, T.DIRT); v.set(x + 1, y, z - 8, T.GRASS); // longe de qualquer lago
    hold(s, Item.ENXADA_PEDRA);
    const top = (px: number, py: number, pz: number) => ({ x: px, y: py, z: pz, nx: 0, ny: 1, nz: 0 });
    expect(placeFromSlot(s, top(x, y, z - 8), s.selected).ok).toBe(true); expect(v.get(x, y, z - 8)).toBe(T.FARMLAND_DRY);
    expect(placeFromSlot(s, top(x + 2, y, z + 2), s.selected).ok).toBe(true); expect(v.get(x + 2, y, z + 2)).toBe(T.FARMLAND_WET); // o lago a 1 célula
    expect(s.inventory.get(s.selected)?.wear).toBe(2); // −1 por uso
    expect(placeFromSlot(s, { ...top(x + 1, y, z - 8), ny: 0, nx: 1 }, s.selected).ok).toBe(false); // só a face de cima
    expect(placeFromSlot(s, top(x + 8, y - 5, z), s.selected).ok).toBe(false); // alvo que não é terra
    hold(s, Item.PA_MADEIRA);
    expect(placeFromSlot(s, top(x + 1, y, z - 8), s.selected).ok).toBe(true); expect(v.get(x + 1, y, z - 8)).toBe(T.PATH);
    expect(placeFromSlot(s, top(x, y, z - 8), s.selected).ok).toBe(false); // a pá não arada
    expect(breakOrCollect(s, top(x + 1, y, z - 8)).ok).toBe(true);
    expect(v.get(x + 1, y, z - 8)).toBe(T.AIR); // quebrar o caminho devolve terra (conferido em solo.test)
    const cells: Array<[number, number]> = []; // 64 células de grama longe da água
    for (let i = 0; i < 64; i++) { const cx = x + 10 + (i % 8), cz = z - 20 + Math.floor(i / 8); v.set(cx, y, cz, T.GRASS); v.set(cx, y + 1, cz, T.AIR); cells.push([cx, cz]); }
    // o gasto de uma enxada de madeira (59) esgota na 59ª vez: o item some e a mensagem avisa
    hold(s, Item.ENXADA_MADEIRA); const wearBase = s.inventory.get(s.selected)!.wear ?? 0; expect(wearBase).toBe(0);
    let last: ReturnType<typeof placeFromSlot> | null = null; let uses = 0;
    for (const [cx, cz] of cells) { last = placeFromSlot(s, top(cx, y, cz), s.selected); if (last.ok) uses++; if (last.broken) break; }
    expect(uses).toBe(59); expect(last?.broken).toBe(true); expect(last?.msg).toContain('Enxada de Madeira'); expect(s.inventory.total(Item.ENXADA_MADEIRA)).toBe(0);
  });
});
