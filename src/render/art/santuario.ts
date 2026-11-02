import celestialAtlas from '../../assets/celestial-atlas.webp?inline';
import goddessFloat from '../../assets/goddess-float.webp?inline';
import iconCloudEthereal from '../../assets/icon-celestial-cloud-ethereal.webp?inline';
import iconCloudSolid from '../../assets/icon-celestial-cloud-solid.webp?inline';
import iconCrystalLife from '../../assets/icon-celestial-crystal-life.webp?inline';
import iconEarthCultivated from '../../assets/icon-celestial-earth-cultivated.webp?inline';
import iconEarthFloral from '../../assets/icon-celestial-earth-floral.webp?inline';
import iconEarthSacred from '../../assets/icon-celestial-earth-sacred.webp?inline';
import iconFoliageGolden from '../../assets/icon-celestial-foliage-golden.webp?inline';
import iconGrassCelestial from '../../assets/icon-celestial-grass-celestial.webp?inline';
import iconGrassFlowery from '../../assets/icon-celestial-grass-flowery.webp?inline';
import iconLightBlock from '../../assets/icon-celestial-light-block.webp?inline';
import iconMarbleCelestial from '../../assets/icon-celestial-marble-celestial.webp?inline';
import iconMarbleOrnate from '../../assets/icon-celestial-marble-ornate.webp?inline';
import iconMossLuminous from '../../assets/icon-celestial-moss-luminous.webp?inline';
import iconStoneCelestial from '../../assets/icon-celestial-stone-celestial.webp?inline';
import iconStoneGolden from '../../assets/icon-celestial-stone-golden.webp?inline';
import iconWaterCrystal from '../../assets/icon-celestial-water-crystal.webp?inline';
import iconWaterSacred from '../../assets/icon-celestial-water-sacred.webp?inline';
import iconWoodCelestial from '../../assets/icon-celestial-wood-celestial.webp?inline';
import { Block } from '../../world/blocks';
import type { ArtPack } from './types';

/** Santuário Celestial: só a Deusa e os 18 blocos celestiais. */
const pack: ArtPack = {
  actors: { goddess: goddessFloat },
  celestialAtlas,
  celestialIcons: {
    [Block.CLOUD_SOLID]: iconCloudSolid,
    [Block.CLOUD_ETHEREAL]: iconCloudEthereal,
    [Block.MARBLE_CELESTIAL]: iconMarbleCelestial,
    [Block.MARBLE_ORNATE]: iconMarbleOrnate,
    [Block.STONE_CELESTIAL]: iconStoneCelestial,
    [Block.STONE_GOLDEN]: iconStoneGolden,
    [Block.GRASS_CELESTIAL]: iconGrassCelestial,
    [Block.GRASS_FLOWERY]: iconGrassFlowery,
    [Block.MOSS_LUMINOUS]: iconMossLuminous,
    [Block.EARTH_SACRED]: iconEarthSacred,
    [Block.EARTH_FLORAL]: iconEarthFloral,
    [Block.EARTH_CULTIVATED]: iconEarthCultivated,
    [Block.WATER_SACRED]: iconWaterSacred,
    [Block.WATER_CRYSTAL]: iconWaterCrystal,
    [Block.CRYSTAL_LIFE]: iconCrystalLife,
    [Block.LIGHT_BLOCK]: iconLightBlock,
    [Block.WOOD_CELESTIAL]: iconWoodCelestial,
    [Block.FOLIAGE_GOLDEN]: iconFoliageGolden,
  },
  materialIcons: {},
  itemIcons: {},
  toolIcons: {},
};
export default pack;
