import { describe, expect, it } from 'vitest';
import { breakOrCollect, placeFromSlot } from '../actions';
import { hardnessOf } from '../breaking';
import { smeltRecipe } from '../furnace';
import { HOTBAR, BAG } from '../inventory';
import { blockOfItem, isItem, Item, ITEM_NAMES, itemOfBlock } from '../items';
import { meshSection } from '../mesher';
import { MemoryTitanStorage } from '../save';
import { openSession } from '../session';
import { blocksLight, isFull, isGlass, isSolid, tileFor, T, T_MAX } from '../voxel';
import { ORVALIS_GENERATOR_VERSION, OrvalisGenerator, orvalisGeneratorFor } from './generator';

/** Vidro do Orvalis (ADR 0150): cubo sólido e translúcido; a luz passa; não solta nada; Areia na Fornalha. */
const open = () => openSession(new MemoryTitanStorage(), 42, () => 1, orvalisGeneratorFor, ORVALIS_GENERATOR_VERSION, (s, v) => new OrvalisGenerator(s, v));
type S = Awaited<ReturnType<typeof open>>;
const hold = (s: S, item: number): void => { s.inventory.add(item, 1); const i = [...Array(HOTBAR + BAG).keys()].find((k) => s.inventory.get(k)?.item === item)!; s.selected = i; };
/** Um canteiro limpo no ar acima da chegada, com `cells` de vidro e o que mais se pedir. */
const clear = (s: S): { x: number; y: number; z: number } => {
  const a = s.volume.gen.arrival, x = Math.floor(a.x / 16) * 16 + 7, z = Math.floor(a.z / 16) * 16 + 7, y = Math.floor((a.y + 10 + 64) / 16) * 16 - 64 + 7; // no meio da seção: o vizinho cai na mesma malha
  for (let dy = -2; dy <= 3; dy++) for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) s.volume.set(x + dx, y + dy, z + dz, T.AIR);
  return { x, y, z };
};
const faces = (m: { idx: Uint32Array } | null): number => (m ? m.idx.length / 6 : 0);
const sectionOf = (x: number, y: number, z: number): [number, number, number] => [Math.floor(x / 16), Math.floor((y + 64) / 16), Math.floor(z / 16)];

describe('vidro do Orvalis (ADR 0150)', () => {
  it('bloco 425 e item 178: cubo sólido que não bloqueia luz; ida e volta; receita da Areia na Fornalha', () => {
    expect(T.GLASS).toBe(425); expect(T_MAX).toBe(425); expect(Item.VIDRO).toBe(178);
    expect(isGlass(T.GLASS)).toBe(true); expect(isSolid(T.GLASS)).toBe(true); expect(isFull(T.GLASS)).toBe(true); expect(blocksLight(T.GLASS)).toBe(false);
    expect(isItem(178)).toBe(true); expect(isItem(179)).toBe(false); expect(ITEM_NAMES[178]).toBe('Vidro');
    expect(blockOfItem(Item.VIDRO)).toBe(T.GLASS); expect(itemOfBlock(T.GLASS)).toBe(Item.VIDRO);
    expect(tileFor(T.GLASS, 'top')).toBe(tileFor(T.GLASS, 'side'));
    const r = smeltRecipe(Item.BEACH, 'furnace')!; expect(r.result).toEqual({ item: Item.VIDRO, count: 1 }); expect(r.world).toBe('orvalis');
    expect(smeltRecipe(Item.BEACH, 'brazier')).toBeNull(); // só na Fornalha do Orvalis
    expect(hardnessOf(T.GLASS)).toBe(0.3);
  });

  it('malha translúcida à parte: o vidro não entra na malha opaca; faces entre vidros somem; o cubo opaco vizinho mostra a face através dele', async () => {
    const s = await open(), v = s.volume, { x, y, z } = clear(s);
    v.set(x, y, z, T.GLASS);
    let m = meshSection(v, ...sectionOf(x, y, z));
    expect(faces(m.glass)).toBe(6); expect(faces(m.opaque)).toBe(0);
    v.set(x + 1, y, z, T.GLASS); // dois vidros lado a lado: 10 faces (a de dentro de cada um some)
    m = meshSection(v, ...sectionOf(x, y, z)); expect(faces(m.glass)).toBe(10);
    v.set(x + 1, y, z, T.STONE); // pedra ao lado: a face do vidro para a pedra some (5), a da pedra para o vidro aparece (5 + 1)
    m = meshSection(v, ...sectionOf(x, y, z)); expect(faces(m.glass)).toBe(5); expect(faces(m.opaque)).toBe(6);
  });

  it('a luz do céu e a de bloco passam: a coluna sob o vidro continua com céu 15', async () => {
    const s = await open(), v = s.volume, { x, y, z } = clear(s);
    v.set(x, y - 1, z, T.STONE); // sob o vidro há um piso para ter onde medir
    const before = v.skyLight(x, y, z);
    v.set(x, y + 1, z, T.GLASS);
    expect(v.skyLight(x, y, z)).toBe(before); expect(before).toBe(15);
  });

  it('colocar, quebrar sem soltar nada (Wiki, sem Toque Suave) e quebrar mesmo sem ferramenta', async () => {
    const s = await open(), v = s.volume, { x, y, z } = clear(s);
    v.set(x, y - 1, z, T.STONE); hold(s, Item.VIDRO);
    expect(placeFromSlot(s, { x, y: y - 1, z, nx: 0, ny: 1, nz: 0 }, s.selected).ok).toBe(true);
    expect(v.get(x, y, z)).toBe(T.GLASS); expect(s.inventory.total(Item.VIDRO)).toBe(0);
    const drops0 = s.drops.size;
    expect(breakOrCollect(s, { x, y, z, nx: 0, ny: 1, nz: 0 }).ok).toBe(true);
    expect(v.get(x, y, z)).toBe(T.AIR); expect(s.drops.size).toBe(drops0); expect(s.inventory.total(Item.VIDRO)).toBe(0);
  });
});
