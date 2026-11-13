import newCloudSolid from '../../assets/santuario-nuvem-solida-512.jpg';
import newCloudEthereal from '../../assets/santuario-nuvem-eterea-512.jpg';
import newMarbleCelestial from '../../assets/santuario-marmore-celestial-512.jpg';
import newMarbleOrnate from '../../assets/santuario-marmore-ornamentado-512.jpg';
import newStoneCelestial from '../../assets/santuario-pedra-celestial-512.jpg';
import newStoneGolden from '../../assets/santuario-pedra-dourada-512.jpg';
import celestialAtlas from '../../assets/celestial-atlas.webp';
import wallsTabuas from '../../assets/walls-tabuas.webp';
import wallsPedra from '../../assets/walls-pedra.webp';
import goddessFloat from '../../assets/goddess-float.webp';
import iconCrystalLife from '../../assets/icon-celestial-crystal-life.webp';
import iconEarthCultivated from '../../assets/icon-celestial-earth-cultivated.webp';
import iconEarthFloral from '../../assets/icon-celestial-earth-floral.webp';
import iconEarthSacred from '../../assets/icon-celestial-earth-sacred.webp';
import iconFoliageGolden from '../../assets/icon-celestial-foliage-golden.webp';
import iconGrassCelestial from '../../assets/icon-celestial-grass-celestial.webp';
import iconGrassFlowery from '../../assets/icon-celestial-grass-flowery.webp';
import iconLightBlock from '../../assets/icon-celestial-light-block.webp';
import iconMossLuminous from '../../assets/icon-celestial-moss-luminous.webp';
import iconWaterCrystal from '../../assets/icon-celestial-water-crystal.webp';
import iconWaterSacred from '../../assets/icon-celestial-water-sacred.webp';
import iconWoodCelestial from '../../assets/icon-celestial-wood-celestial.webp';
import iconWallPlanks from '../../assets/icon-wall-planks.webp';
import iconWallStone from '../../assets/icon-wall-stone.webp';
import { Block } from '../../world/blocks';
import type { ArtPack } from './types';

/** Santuário Celestial: só a Deusa e os 18 blocos celestiais. */
const pack: ArtPack = {
  actors: { goddess: goddessFloat },
  celestialAtlas,
  celestialSurfaces: {
    [Block.CLOUD_SOLID]: newCloudSolid,
    [Block.CLOUD_ETHEREAL]: newCloudEthereal,
    [Block.MARBLE_CELESTIAL]: newMarbleCelestial,
    [Block.MARBLE_ORNATE]: newMarbleOrnate,
    [Block.STONE_CELESTIAL]: newStoneCelestial,
    [Block.STONE_GOLDEN]: newStoneGolden,
  },
  wallAtlases: { [Block.WALL_PLANKS]: wallsTabuas, [Block.WALL_STONE]: wallsPedra },
  celestialIcons: {
    [Block.CLOUD_SOLID]: newCloudSolid,
    [Block.CLOUD_ETHEREAL]: newCloudEthereal,
    [Block.MARBLE_CELESTIAL]: newMarbleCelestial,
    [Block.MARBLE_ORNATE]: newMarbleOrnate,
    [Block.STONE_CELESTIAL]: newStoneCelestial,
    [Block.STONE_GOLDEN]: newStoneGolden,
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
    // paredes autotile (ADR 0027); a porta de parede segue com o ícone provisório (`wallPlaceholderIcon`)
    [Block.WALL_PLANKS]: iconWallPlanks,
    [Block.WALL_STONE]: iconWallStone,
  },
  materialIcons: {},
  itemIcons: {},
  toolIcons: {},
};
export default pack;
