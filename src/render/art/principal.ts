import blockAtlas from '../../assets/blocks-atlas.webp?inline';
import dungeonGround from '../../assets/dungeon-ground.webp?inline';
import dungeonMountains from '../../assets/dungeon-mountains.webp?inline';
import dungeonProps from '../../assets/dungeon-props.webp?inline';
import dungeonRocks from '../../assets/dungeon-rocks.webp?inline';
import dungeonWalls from '../../assets/dungeon-walls.webp?inline';
import heroineAxeAttack from '../../assets/heroine-axe-attack.webp?inline';
import heroineAxe from '../../assets/heroine-axe.webp?inline';
import heroineHoeAttack from '../../assets/heroine-hoe-attack.webp?inline';
import heroineHoe from '../../assets/heroine-hoe.webp?inline';
import heroinePickaxeAttack from '../../assets/heroine-pickaxe-attack.webp?inline';
import heroinePickaxe from '../../assets/heroine-pickaxe.webp?inline';
import heroineShovelAttack from '../../assets/heroine-shovel-attack.webp?inline';
import heroineShovel from '../../assets/heroine-shovel.webp?inline';
import heroineSwordAttack from '../../assets/heroine-sword-attack.webp?inline';
import heroineSword from '../../assets/heroine-sword.webp?inline';
import heroine from '../../assets/heroine.webp?inline';
import axeIcon from '../../assets/icon-axe.webp?inline';
import dirtIcon from '../../assets/icon-block-dirt.webp?inline';
import grassIcon from '../../assets/icon-block-grass.webp?inline';
import oakLogIcon from '../../assets/icon-block-oak-log.webp?inline';
import oakPlanksIcon from '../../assets/icon-block-oak-planks.webp?inline';
import pathIcon from '../../assets/icon-block-path.webp?inline';
import sandIcon from '../../assets/icon-block-sand.webp?inline';
import stoneIcon from '../../assets/icon-block-stone.webp?inline';
import stoneCobbleIcon from '../../assets/icon-block-stone-cobble.webp?inline';
import stoneBrickIcon from '../../assets/icon-block-stone-brick.webp?inline';
import stoneFloorIcon from '../../assets/icon-block-stone-floor.webp?inline';
import stoneSmoothIcon from '../../assets/icon-block-stone-smooth.webp?inline';
import stonePolishedIcon from '../../assets/icon-block-stone-polished.webp?inline';
import stoneCrackedIcon from '../../assets/icon-block-stone-cracked.webp?inline';
import stoneBrickCrackedIcon from '../../assets/icon-block-stone-brick-cracked.webp?inline';

import tilledIcon from '../../assets/icon-block-tilled.webp?inline';
import hoeIcon from '../../assets/icon-hoe.webp?inline';
import pickaxeIcon from '../../assets/icon-pickaxe.webp?inline';
import shovelIcon from '../../assets/icon-shovel.webp?inline';
import swordIcon from '../../assets/icon-sword.webp?inline';
import seedIcon from '../../assets/icon-wheat-seed.webp?inline';
import wheatIcon from '../../assets/icon-wheat.webp?inline';
import lamb from '../../assets/lamb.webp?inline';
import oakDoor from '../../assets/oak-door.webp?inline';
import sheepLove from '../../assets/sheep-love.webp?inline';
import sheep from '../../assets/sheep.webp?inline';
import spiderBig from '../../assets/spider-big.webp?inline';
import spiderBoss from '../../assets/spider-boss.webp?inline';
import spiderSmall from '../../assets/spider-small.webp?inline';
import spiderSmallDeath from '../../assets/spider-small-death.webp?inline';
import spiderBigDeath from '../../assets/spider-big-death.webp?inline';
import spiderBossDeath from '../../assets/spider-boss-death.webp?inline';
import silkIcon from '../../assets/icon-silk.webp?inline';
import fangIcon from '../../assets/icon-fang.webp?inline';
import queenHeartIcon from '../../assets/icon-queen-heart.webp?inline';
import bagIcon from '../../assets/icon-bag.webp?inline';
import characterIcon from '../../assets/icon-ui-character.webp?inline';
import skillsIcon from '../../assets/icon-ui-skills.webp?inline';
import builderIcon from '../../assets/icon-ui-builder.webp?inline';
import tentIcon from '../../assets/icon-block-tent.webp?inline';
import tentSprite from '../../assets/tent.webp?inline';
import chestIcon from '../../assets/icon-block-chest.webp?inline';
import chestSprite from '../../assets/chest.webp?inline';
import townHouseRed1f from '../../assets/town-house-red-1f.webp?inline';
import townHouseRed2f from '../../assets/town-house-red-2f.webp?inline';
import townHouseBlue1f from '../../assets/town-house-blue-1f.webp?inline';
import townHouseBlue2f from '../../assets/town-house-blue-2f.webp?inline';
import townHouseBrown1f from '../../assets/town-house-brown-1f.webp?inline';
import townHouseBrown2f from '../../assets/town-house-brown-2f.webp?inline';
import townShop1f from '../../assets/town-shop-1f.webp?inline';
import townShop2f from '../../assets/town-shop-2f.webp?inline';
import townSmithy from '../../assets/town-smithy.webp?inline';
import townGuild from '../../assets/town-guild.webp?inline';
import townCastle from '../../assets/town-castle.webp?inline';
import townWatchtower from '../../assets/town-watchtower.webp?inline';
import townBench2 from '../../assets/town-bench-2.webp?inline';
import townBench3 from '../../assets/town-bench-3.webp?inline';
import townLampStone from '../../assets/town-lamp-stone.webp?inline';
import townLampWood from '../../assets/town-lamp-wood.webp?inline';
import townLampMixed from '../../assets/town-lamp-mixed.webp?inline';
import townBushRound from '../../assets/town-bush-round.webp?inline';
import townBushTall from '../../assets/town-bush-tall.webp?inline';
import townBushWide from '../../assets/town-bush-wide.webp?inline';
import waterTop from '../../assets/water-top.webp?inline';
import waterFlow from '../../assets/water-flow.webp?inline';
import wheatCrop from '../../assets/wheat-crop.webp?inline';
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
    'spider-small': spiderSmall,
    'spider-big': spiderBig,
    'spider-boss': spiderBoss,
  },
  blockAtlas,
  materialIcons: {
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
  town: { 'house-red-1f': townHouseRed1f, 'house-red-2f': townHouseRed2f, 'house-blue-1f': townHouseBlue1f, 'house-blue-2f': townHouseBlue2f, 'house-brown-1f': townHouseBrown1f, 'house-brown-2f': townHouseBrown2f, 'shop-1f': townShop1f, 'shop-2f': townShop2f, 'smithy': townSmithy, 'guild': townGuild, 'castle': townCastle, 'watchtower': townWatchtower, 'bench-2': townBench2, 'bench-3': townBench3, 'lamp-stone': townLampStone, 'lamp-wood': townLampWood, 'lamp-mixed': townLampMixed, 'bush-round': townBushRound, 'bush-tall': townBushTall, 'bush-wide': townBushWide },
  water: { top: waterTop, flow: waterFlow },
  monsterDeaths: { 'spider-small': spiderSmallDeath, 'spider-big': spiderBigDeath, 'spider-boss': spiderBossDeath },
  wheatCrop,
  itemIcons: { wheat_seed: seedIcon, wheat: wheatIcon, silk: silkIcon, fang: fangIcon, queen_heart: queenHeartIcon },
  toolIcons: { sword: swordIcon, hoe: hoeIcon, pickaxe: pickaxeIcon, shovel: shovelIcon, axe: axeIcon },
};
export default pack;
