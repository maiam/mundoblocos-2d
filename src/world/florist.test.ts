import { describe, expect, it } from 'vitest';
import { SUBDIV } from '../config';
import { Inventory } from '../game/inventory';
import { Block, BLOCKS, blockDef, FLOWER_BLOCKS, HOTBAR_BLOCKS, isFancyFlower } from './blocks';
import { blockDrops, blockStack, Item, toolCanBreak } from './items';
import { FLORIST_PRICE, FLORIST_STOCK, buyOffer, CURRENCY } from './shop';
import { FLORIST_INTERIOR, interiorLayouts, INTERIOR_DEFS } from './interiors';
import { WORLD_PROFILES } from './profiles';
import { World } from './world';

describe('15 Flores Fofas colocáveis (v0.93.110)', () => {
  it('são 15 blocos de enfeite, de ids únicos e sem colisão com os outros blocos, no mundo principal e no Santuário', () => {
    expect(FLOWER_BLOCKS).toHaveLength(15);
    expect(new Set(FLOWER_BLOCKS).size).toBe(15);
    const values = Object.values(Block) as number[];
    expect(new Set(values).size).toBe(values.length); // nenhum id do enum se repete
    for (const id of FLOWER_BLOCKS) {
      const d = blockDef(id);
      expect(d.layer).toBe('object');
      expect(d.shape).toBe('decoration');
      expect(d.solid).toBe(false);
      expect(d.placeable).toBe(true);
      expect(isFancyFlower(id)).toBe(true);
      expect(HOTBAR_BLOCKS).toContain(id);
      expect(WORLD_PROFILES.santuario.blocks).toContain(id); // também no Santuário (v0.93.146), como blocos novos
    }
    expect(isFancyFlower(Block.FLOWER)).toBe(false); // a Flor sorteada do mundo continua à parte
    expect(BLOCKS[Block.FLOWER_HONEY].name).toBe('Margarida de Mel');
    expect(BLOCKS[Block.FLOWER_CORAL].name).toBe('Dançarina de Coral');
    expect(BLOCKS[Block.FLOWER_VANILLA].name).toBe('Coroa de Baunilha');
  });

  it('colocam sem bloquear a passagem, quebram com a mão e voltam como o próprio item; sem efeito além do visual', () => {
    const w = new World(7);
    const [gx, gy] = w.outsideGate();
    for (const [i, id] of FLOWER_BLOCKS.entries()) {
      const x = gx + 2 + i, y = gy + 3;
      while (w.topBlock(x, y)) w.breakBlock(x, y);
      expect(w.placeBlock(x, y, id), `${blockDef(id).name}`).toBe(true);
      expect(w.getObject(x, y)).toBe(id);
      expect(w.isWalkable(x, y)).toBe(true); // sem colisão
      expect(toolCanBreak(null, id)).toBe(true);
      expect(blockDrops(id, () => 0)).toEqual([{ item: blockStack(id), count: 1 }]);
    }
  });

  it('a Floricultura vende as 15, na ordem da lista, por Moedas de Cobre; comprar entrega o bloco', () => {
    expect(FLORIST_STOCK.map((o) => o.item)).toEqual(FLOWER_BLOCKS.map((id) => blockStack(id)));
    expect(FLORIST_STOCK.every((o) => o.price === FLORIST_PRICE && o.price > 0)).toBe(true);
    const inv = new Inventory({ [Item.COPPER_COIN]: 5 });
    expect(buyOffer(inv, FLORIST_STOCK[0])).toBe('ok');
    expect(inv.count(blockStack(FLOWER_BLOCKS[0]))).toBe(1);
    expect(inv.count(CURRENCY)).toBe(5 - FLORIST_PRICE);
    expect(buyOffer(new Inventory({}), FLORIST_STOCK[1])).toBe('coins');
    expect(buyOffer(inv, FLORIST_STOCK[2], () => false)).toBe('full');
  });
});

describe.runIf(SUBDIV === 2 || SUBDIV === 1)('Floricultura na cidade (v0.93.110)', () => {
  it('a construção existe com porta, o cômodo vem depois dos outros e a florista fica atrás do balcão', () => {
    const w = new World(42);
    const b = w.town!.buildings.find((x) => x.id === Block.FLORIST)!;
    expect(b.name).toBe('Floricultura');
    expect(b.door).not.toBeNull();
    expect(INTERIOR_DEFS.map((d) => d.id)).toEqual(['smithy', 'market', 'florist', 'guild']); // cômodo novo no fim: os outros não mudam de lugar
    const lay = interiorLayouts(w.town!).find((l) => l.def.id === 'florist')!;
    expect(lay.doors).toHaveLength(1);
    expect(lay.keeper).not.toBeNull();
    expect(FLORIST_INTERIOR.map.every((r) => r.length === 24)).toBe(true);
    expect(FLORIST_INTERIOR.map).toHaveLength(13);
    // a rua chega à porta (célula diante dela andável)
    expect(w.isWalkable(b.door![0], b.door![1])).toBe(true);
  });
});
