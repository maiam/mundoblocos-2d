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
import townHouseRed from '../../assets/town-house-red.webp?inline';
import townBushes from '../../assets/town-bushes.webp?inline';
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
  town: { houseRed: townHouseRed, bushes: townBushes },
  water: { top: waterTop, flow: waterFlow },
  monsterDeaths: { 'spider-small': spiderSmallDeath, 'spider-big': spiderBigDeath, 'spider-boss': spiderBossDeath },
  wheatCrop,
  itemIcons: { wheat_seed: seedIcon, wheat: wheatIcon, silk: silkIcon, fang: fangIcon, queen_heart: queenHeartIcon },
  toolIcons: { sword: swordIcon, hoe: hoeIcon, pickaxe: pickaxeIcon, shovel: shovelIcon, axe: axeIcon },
};
export default pack;
