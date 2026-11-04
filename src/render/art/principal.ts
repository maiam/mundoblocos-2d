import blockAtlas from '../../assets/blocks-atlas.webp';
import dungeonGround from '../../assets/dungeon-ground.webp';
import dungeonMountains from '../../assets/dungeon-mountains.webp';
import dungeonProps from '../../assets/dungeon-props.webp';
import dungeonRocks from '../../assets/dungeon-rocks.webp';
import dungeonWalls from '../../assets/dungeon-walls.webp';
import heroineAxeAttack from '../../assets/heroine-axe-attack.webp';
import heroineAxe from '../../assets/heroine-axe.webp';
import heroineHoeAttack from '../../assets/heroine-hoe-attack.webp';
import heroineHoe from '../../assets/heroine-hoe.webp';
import heroinePickaxeAttack from '../../assets/heroine-pickaxe-attack.webp';
import heroinePickaxe from '../../assets/heroine-pickaxe.webp';
import heroineShovelAttack from '../../assets/heroine-shovel-attack.webp';
import heroineShovel from '../../assets/heroine-shovel.webp';
import heroineSwordAttack from '../../assets/heroine-sword-attack.webp';
import heroineSword from '../../assets/heroine-sword.webp';
import heroine from '../../assets/heroine.webp';
import axeIcon from '../../assets/icon-axe.webp';
import dirtIcon from '../../assets/icon-block-dirt.webp';
import grassIcon from '../../assets/icon-block-grass.webp';
import oakLogIcon from '../../assets/icon-block-oak-log.webp';
import oakPlanksIcon from '../../assets/icon-block-oak-planks.webp';
import pathIcon from '../../assets/icon-block-path.webp';
import sandIcon from '../../assets/icon-block-sand.webp';
import stoneIcon from '../../assets/icon-block-stone.webp';
import stoneCobbleIcon from '../../assets/icon-block-stone-cobble.webp';
import stoneBrickIcon from '../../assets/icon-block-stone-brick.webp';
import stoneFloorIcon from '../../assets/icon-block-stone-floor.webp';
import stoneSmoothIcon from '../../assets/icon-block-stone-smooth.webp';
import stonePolishedIcon from '../../assets/icon-block-stone-polished.webp';
import stoneCrackedIcon from '../../assets/icon-block-stone-cracked.webp';
import stoneBrickCrackedIcon from '../../assets/icon-block-stone-brick-cracked.webp';

import tilledIcon from '../../assets/icon-block-tilled.webp';
import hoeIcon from '../../assets/icon-hoe.webp';
import pickaxeIcon from '../../assets/icon-pickaxe.webp';
import shovelIcon from '../../assets/icon-shovel.webp';
import swordIcon from '../../assets/icon-sword.webp';
import seedIcon from '../../assets/icon-wheat-seed.webp';
import wheatIcon from '../../assets/icon-wheat.webp';
import lamb from '../../assets/lamb.webp';
import oakDoor from '../../assets/oak-door.webp';
import oakDoorIcon from '../../assets/icon-block-oak-door.webp';
import sheepLove from '../../assets/sheep-love.webp';
import sheep from '../../assets/sheep.webp';
import horse from '../../assets/horse.webp';
import villagerBlond from '../../assets/villager-blond.webp';
import villagerBrown from '../../assets/villager-brown.webp';
import villagerBlack from '../../assets/villager-black.webp';
import villagerSilver from '../../assets/villager-silver.webp';
import outfitDenim from '../../assets/outfit-denim.webp';
import outfitVarsity from '../../assets/outfit-varsity.webp';
import outfitFarmer from '../../assets/outfit-farmer.webp';
import outfitVest from '../../assets/outfit-vest.webp';
import outfitHoodie from '../../assets/outfit-hoodie.webp';
import outfitSmith from '../../assets/outfit-smith.webp';
import spiderBig from '../../assets/spider-big.webp';
import spiderBoss from '../../assets/spider-boss.webp';
import spiderSmall from '../../assets/spider-small.webp';
import spiderSmallDeath from '../../assets/spider-small-death.webp';
import spiderBigDeath from '../../assets/spider-big-death.webp';
import spiderBossDeath from '../../assets/spider-boss-death.webp';
import silkIcon from '../../assets/icon-silk.webp';
import fangIcon from '../../assets/icon-fang.webp';
import queenHeartIcon from '../../assets/icon-queen-heart.webp';
import bagIcon from '../../assets/icon-bag.webp';
import characterIcon from '../../assets/icon-ui-character.webp';
import skillsIcon from '../../assets/icon-ui-skills.webp';
import builderIcon from '../../assets/icon-ui-builder.webp';
import tentIcon from '../../assets/icon-block-tent.webp';
import tentSprite from '../../assets/tent.webp';
import chestIcon from '../../assets/icon-block-chest.webp';
import chestSprite from '../../assets/chest.webp';
import townHouseRed1f from '../../assets/town-house-red-1f.webp';
import townHouseRed2f from '../../assets/town-house-red-2f.webp';
import townHouseBlue1f from '../../assets/town-house-blue-1f.webp';
import townHouseBlue2f from '../../assets/town-house-blue-2f.webp';
import townHouseBrown1f from '../../assets/town-house-brown-1f.webp';
import townHouseBrown2f from '../../assets/town-house-brown-2f.webp';
import townShop1f from '../../assets/town-shop-1f.webp';
import townShop2f from '../../assets/town-shop-2f.webp';
import townSmithy from '../../assets/town-smithy.webp';
import townInn from '../../assets/town-inn.webp';
import interiorSmithy from '../../assets/interior-smithy.webp';
import townGuild from '../../assets/town-guild.webp';
import townCastle from '../../assets/town-castle.webp';
import townWatchtower from '../../assets/town-watchtower.webp';
import townBench2 from '../../assets/town-bench-2.webp';
import townBench3 from '../../assets/town-bench-3.webp';
import townLampStone from '../../assets/town-lamp-stone.webp';
import townLampWood from '../../assets/town-lamp-wood.webp';
import townLampMixed from '../../assets/town-lamp-mixed.webp';
import townBushRound from '../../assets/town-bush-round.webp';
import townBushTall from '../../assets/town-bush-tall.webp';
import townBushWide from '../../assets/town-bush-wide.webp';
import waterTop from '../../assets/water-top.webp';
import waterFlow from '../../assets/water-flow.webp';
import wheatCrop from '../../assets/wheat-crop.webp';
import { Block } from '../../world/blocks';
import type { ArtPack } from './types';


/** Mundo principal: heroína e ferramentas, materiais, porta, trigo, ovelhas e a dungeon das aranhas. */
const pack: ArtPack = {
  actors: {
    heroine,
    'heroine-sword': heroineSword,
    'heroine-hoe': heroineHoe,
    'heroine-pickaxe': heroinePickaxe,
    'heroine-shovel': heroineShovel,
    'heroine-axe': heroineAxe,
    'heroine-sword-attack': heroineSwordAttack,
    'heroine-axe-attack': heroineAxeAttack,
    'heroine-hoe-attack': heroineHoeAttack,
    'heroine-shovel-attack': heroineShovelAttack,
    'heroine-pickaxe-attack': heroinePickaxeAttack,
    sheep,
    lamb,
    'sheep-love': sheepLove,
    horse,
    'villager-blond': villagerBlond,
    'villager-brown': villagerBrown,
    'villager-black': villagerBlack,
    'villager-silver': villagerSilver,
    'spider-small': spiderSmall,
    'spider-big': spiderBig,
    'spider-boss': spiderBoss,
  },
  interiors: { smithy: interiorSmithy },
  outfits: { denim: outfitDenim, varsity: outfitVarsity, farmer: outfitFarmer, vest: outfitVest, hoodie: outfitHoodie, smith: outfitSmith },
  blockAtlas,
  materialIcons: {
    [Block.OAK_DOOR]: oakDoorIcon,
    [Block.DIRT]: dirtIcon,
    [Block.GRASS]: grassIcon,
    [Block.TILLED]: tilledIcon,
    [Block.PATH]: pathIcon,
    [Block.SAND]: sandIcon,
    [Block.STONE]: stoneIcon,
    [Block.STONE_COBBLE]: stoneCobbleIcon,
    [Block.STONE_BRICK]: stoneBrickIcon,
    [Block.STONE_FLOOR]: stoneFloorIcon,
    [Block.STONE_SMOOTH]: stoneSmoothIcon,
    [Block.STONE_POLISHED]: stonePolishedIcon,
    [Block.STONE_CRACKED]: stoneCrackedIcon,
    [Block.STONE_BRICK_CRACKED]: stoneBrickCrackedIcon,

    [Block.OAK_LOG]: oakLogIcon,
    [Block.OAK_PLANKS]: oakPlanksIcon,
  },
  celestialIcons: {},
  oakDoor,
  dungeon: { ground: dungeonGround, mountains: dungeonMountains, rocks: dungeonRocks, props: dungeonProps, walls: dungeonWalls },
  uiIcons: { bag: bagIcon, character: characterIcon, skills: skillsIcon, builder: builderIcon },
  tent: { icon: tentIcon, sprite: tentSprite },
  chest: { icon: chestIcon, sprite: chestSprite },
  // Cidade do Despertar (scripts/extract-town.py): construções, bancos, postes e arbustos.
  town: { 'house-red-1f': townHouseRed1f, 'house-red-2f': townHouseRed2f, 'house-blue-1f': townHouseBlue1f, 'house-blue-2f': townHouseBlue2f, 'house-brown-1f': townHouseBrown1f, 'house-brown-2f': townHouseBrown2f, 'shop-1f': townShop1f, 'shop-2f': townShop2f, 'smithy': townSmithy, 'inn': townInn, 'guild': townGuild, 'castle': townCastle, 'watchtower': townWatchtower, 'bench-2': townBench2, 'bench-3': townBench3, 'lamp-stone': townLampStone, 'lamp-wood': townLampWood, 'lamp-mixed': townLampMixed, 'bush-round': townBushRound, 'bush-tall': townBushTall, 'bush-wide': townBushWide },
  water: { top: waterTop, flow: waterFlow },
  monsterDeaths: { 'spider-small': spiderSmallDeath, 'spider-big': spiderBigDeath, 'spider-boss': spiderBossDeath },
  wheatCrop,
  itemIcons: { wheat_seed: seedIcon, wheat: wheatIcon, silk: silkIcon, fang: fangIcon, queen_heart: queenHeartIcon },
  toolIcons: { sword: swordIcon, hoe: hoeIcon, pickaxe: pickaxeIcon, shovel: shovelIcon, axe: axeIcon },
};
export default pack;
