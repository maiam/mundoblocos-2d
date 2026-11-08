import chibiManifest from '../../assets/chibi-manifesto.json';
import type { ModularManifest } from '../modular';
import type { MaterialsV2Manifest } from '../materialsV2';
import blockAtlas from '../../assets/blocks-atlas.webp';
import materialsV2Atlas from '../../assets/materials-v2.webp';
import transitionsV2 from '../../assets/transitions-v2.webp';
import materialsV2Manifest from '../../assets/materials-v2.json';
import dungeonGround from '../../assets/dungeon-ground.webp';
import dungeonMountains from '../../assets/dungeon-mountains.webp';
import dungeonProps from '../../assets/dungeon-props.webp';
import dungeonRocks from '../../assets/dungeon-rocks.webp';
import dungeonWalls from '../../assets/dungeon-walls.webp';
import dungeonCave from '../../assets/dungeon-cave.webp';
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
import hero from '../../assets/hero.webp';
import heroPickaxe from '../../assets/hero-pickaxe.webp';
import heroSword from '../../assets/hero-sword.webp';
import heroAxe from '../../assets/hero-axe.webp';
import heroHoe from '../../assets/hero-hoe.webp';
import heroShovel from '../../assets/hero-shovel.webp';
import heroPickaxeAttack from '../../assets/hero-pickaxe-attack.webp';
import heroSwordAttack from '../../assets/hero-sword-attack.webp';
import heroAxeAttack from '../../assets/hero-axe-attack.webp';
import heroHoeAttack from '../../assets/hero-hoe-attack.webp';
import heroShovelAttack from '../../assets/hero-shovel-attack.webp';
import gino from '../../assets/gino.webp';
import ginoSit from '../../assets/gino-sit.webp';
import heroineSit from '../../assets/heroine-sit.webp';
import heroSit from '../../assets/hero-sit.webp';
import hoodSit from '../../assets/hood-sit.webp';
import ginoSword from '../../assets/gino-sword.webp';
import ginoAxe from '../../assets/gino-axe.webp';
import ginoHoe from '../../assets/gino-hoe.webp';
import ginoPickaxe from '../../assets/gino-pickaxe.webp';
import ginoShovel from '../../assets/gino-shovel.webp';
import ginoSwordAttack from '../../assets/gino-sword-attack.webp';
import ginoAxeAttack from '../../assets/gino-axe-attack.webp';
import ginoHoeAttack from '../../assets/gino-hoe-attack.webp';
import ginoPickaxeAttack from '../../assets/gino-pickaxe-attack.webp';
import ginoShovelAttack from '../../assets/gino-shovel-attack.webp';
import hood from '../../assets/hood.webp';
import hoodSword from '../../assets/hood-sword.webp';
import hoodAxe from '../../assets/hood-axe.webp';
import hoodHoe from '../../assets/hood-hoe.webp';
import hoodPickaxe from '../../assets/hood-pickaxe.webp';
import hoodShovel from '../../assets/hood-shovel.webp';
import hoodSwordAttack from '../../assets/hood-sword-attack.webp';
import hoodAxeAttack from '../../assets/hood-axe-attack.webp';
import hoodHoeAttack from '../../assets/hood-hoe-attack.webp';
import hoodPickaxeAttack from '../../assets/hood-pickaxe-attack.webp';
import hoodShovelAttack from '../../assets/hood-shovel-attack.webp';
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
import loveHearts from '../../assets/love-hearts.webp';
import sheep from '../../assets/sheep.webp';
import horse from '../../assets/horse.webp';
import cow from '../../assets/cow.webp';
import chicken from '../../assets/chicken.webp';
import foal from '../../assets/foal.webp';
import calf from '../../assets/calf.webp';
import chick from '../../assets/chick.webp';
import villagerBlond from '../../assets/villager-blond.webp';
import villagerBrown from '../../assets/villager-brown.webp';
import villagerBlack from '../../assets/villager-black.webp';
import villagerSilver from '../../assets/villager-silver.webp';
import villagerRed from '../../assets/villager-red.webp';
import exprCalm from '../../assets/expr-calm.webp';
import exprHappy from '../../assets/expr-happy.webp';
import exprSmile from '../../assets/expr-smile.webp';
import exprLaugh from '../../assets/expr-laugh.webp';
import exprSurprised from '../../assets/expr-surprised.webp';
import exprWink from '../../assets/expr-wink.webp';
import exprContent from '../../assets/expr-content.webp';
import exprExcited from '../../assets/expr-excited.webp';
import exprSad from '../../assets/expr-sad.webp';
import exprScared from '../../assets/expr-scared.webp';
import exprScaredFx from '../../assets/expr-scared-fx.webp';
import exprAngry from '../../assets/expr-angry.webp';
import exprAngryFx from '../../assets/expr-angry-fx.webp';
import exprSmug from '../../assets/expr-smug.webp';
import exprGuffaw from '../../assets/expr-guffaw.webp';
import exprNeutral from '../../assets/expr-neutral.webp';
import exprShy from '../../assets/expr-shy.webp';
import exprSleepy from '../../assets/expr-sleepy.webp';
import exprSleepyFx from '../../assets/expr-sleepy-fx.webp';
import bangsBlond from '../../assets/villager-blond-bangs.webp';
import bangsBrown from '../../assets/villager-brown-bangs.webp';
import bangsBlack from '../../assets/villager-black-bangs.webp';
import bangsSilver from '../../assets/villager-silver-bangs.webp';
import bangsRed from '../../assets/villager-red-bangs.webp';
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
import campfireIcon from '../../assets/icon-block-campfire.webp';
import campfireSprite from '../../assets/campfire.webp';
import cauldronIcon from '../../assets/icon-block-cauldron.webp';
import cauldronSprite from '../../assets/cauldron.webp';
import ovenIcon from '../../assets/icon-block-oven.webp';
import ovenSprite from '../../assets/oven.webp';
import rocks from '../../assets/rocks.webp';
import fencePieces from '../../assets/fence.webp';
import fenceGate from '../../assets/fence-gate.webp';
import fenceIcon from '../../assets/icon-block-fence.webp';
import fenceGateIcon from '../../assets/icon-block-fence-gate.webp';
import treeOak from '../../assets/tree-oak.webp';
import treeApple from '../../assets/tree-apple.webp';
import treeCactus from '../../assets/tree-cactus.webp';
import treeCherry from '../../assets/tree-cherry.webp';
import cherryLogIcon from '../../assets/icon-block-cherry-log.webp';
import cherryPlanksIcon from '../../assets/icon-block-cherry-planks.webp';
import appleIcon from '../../assets/icon-item-apple.webp';
import chairIcon from '../../assets/icon-block-chair.webp';
import chairSprite from '../../assets/chair.webp';
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
import townFountain from '../../assets/town-fountain.webp';
import townWell from '../../assets/town-well.webp';
import townStall from '../../assets/town-stall.webp';
import townBarrel from '../../assets/town-barrel.webp';
import interiorSmithy from '../../assets/interior-smithy.webp';
import interiorTent from '../../assets/interior-tent.webp';
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
import cropPotato from '../../assets/crop-potato.webp';
import cropTomato from '../../assets/crop-tomato.webp';
import cropCarrot from '../../assets/crop-carrot.webp';
import breadIcon from '../../assets/icon-item-bread.webp';
import milkIcon from '../../assets/icon-item-milk.webp';
import eggIcon from '../../assets/icon-item-egg.webp';
import cheeseIcon from '../../assets/icon-item-cheese.webp';
import applePieIcon from '../../assets/icon-item-apple-pie.webp';
import pastaTomatoIcon from '../../assets/icon-item-pasta-tomato.webp';
import silkClothIcon from '../../assets/icon-item-silk-cloth.webp';
import potatoIcon from '../../assets/icon-item-potato.webp';
import tomatoIcon from '../../assets/icon-item-tomato.webp';
import carrotIcon from '../../assets/icon-item-carrot.webp';
import { Block } from '../../world/blocks';
import type { ArtPack } from './types';


/** Mundo principal: heroína e ferramentas, materiais, porta, trigo, ovelhas e a dungeon das aranhas. */
// Personagem modular em teste (ADR 0017): `export-personagem.py --out src/assets --prefixo chibi-`. URLs só carregam
// quando o chibi aparece (`?personagem=chibi`); fora do orçamento de início.
const chibiSheets = Object.fromEntries(
  Object.entries(import.meta.glob<string>('../../assets/chibi-*.webp', { eager: true, import: 'default' }))
    .map(([path, url]) => [path.slice(path.lastIndexOf('/') + 1), url]),
);

const pack: ArtPack = {
  actors: {
    heroine,
    hero,
    'hero-sword': heroSword,
    'hero-hoe': heroHoe,
    'hero-shovel': heroShovel,
    'hero-axe': heroAxe,
    'hero-pickaxe': heroPickaxe,
    'hero-sword-attack': heroSwordAttack,
    'hero-axe-attack': heroAxeAttack,
    'hero-hoe-attack': heroHoeAttack,
    'hero-shovel-attack': heroShovelAttack,
    'hero-pickaxe-attack': heroPickaxeAttack,
    gino: gino,
    'gino-sit': ginoSit,
    'heroine-sit': heroineSit,
    'hero-sit': heroSit,
    'hood-sit': hoodSit,
    'gino-sword': ginoSword,
    'gino-axe': ginoAxe,
    'gino-hoe': ginoHoe,
    'gino-pickaxe': ginoPickaxe,
    'gino-shovel': ginoShovel,
    'gino-sword-attack': ginoSwordAttack,
    'gino-axe-attack': ginoAxeAttack,
    'gino-hoe-attack': ginoHoeAttack,
    'gino-pickaxe-attack': ginoPickaxeAttack,
    'gino-shovel-attack': ginoShovelAttack,
    hood,
    'hood-sword': hoodSword,
    'hood-axe': hoodAxe,
    'hood-hoe': hoodHoe,
    'hood-pickaxe': hoodPickaxe,
    'hood-shovel': hoodShovel,
    'hood-sword-attack': hoodSwordAttack,
    'hood-axe-attack': hoodAxeAttack,
    'hood-hoe-attack': hoodHoeAttack,
    'hood-pickaxe-attack': hoodPickaxeAttack,
    'hood-shovel-attack': hoodShovelAttack,
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
    'love-hearts': loveHearts,
    horse,
    cow,
    chicken,
    foal,
    calf,
    chick,
    'villager-blond': villagerBlond,
    'villager-brown': villagerBrown,
    'villager-black': villagerBlack,
    'villager-silver': villagerSilver,
    'villager-red': villagerRed,
    'spider-small': spiderSmall,
    'spider-big': spiderBig,
    'spider-boss': spiderBoss,
  },
  interiors: { smithy: interiorSmithy, tent: interiorTent },
  expressions: { calm: { face: exprCalm }, happy: { face: exprHappy }, smile: { face: exprSmile }, laugh: { face: exprLaugh }, surprised: { face: exprSurprised }, wink: { face: exprWink }, content: { face: exprContent }, excited: { face: exprExcited }, sad: { face: exprSad }, scared: { face: exprScared, fx: exprScaredFx }, angry: { face: exprAngry, fx: exprAngryFx }, smug: { face: exprSmug }, guffaw: { face: exprGuffaw }, neutral: { face: exprNeutral }, shy: { face: exprShy }, sleepy: { face: exprSleepy, fx: exprSleepyFx } },
  bangs: { blond: bangsBlond, brown: bangsBrown, black: bangsBlack, silver: bangsSilver, red: bangsRed },
  outfits: { denim: outfitDenim, varsity: outfitVarsity, farmer: outfitFarmer, vest: outfitVest, hoodie: outfitHoodie, smith: outfitSmith },
  blockAtlas,
  materialsV2: { atlas: materialsV2Atlas, manifest: materialsV2Manifest as MaterialsV2Manifest, masks: transitionsV2 },
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
    [Block.CHERRY_LOG]: cherryLogIcon,
    [Block.CHERRY_PLANKS]: cherryPlanksIcon,
  },
  celestialIcons: {},
  oakDoor,
  dungeon: { ground: dungeonGround, mountains: dungeonMountains, rocks: dungeonRocks, props: dungeonProps, walls: dungeonWalls, cave: dungeonCave },
  uiIcons: { bag: bagIcon, character: characterIcon, skills: skillsIcon, builder: builderIcon },
  tent: { icon: tentIcon, sprite: tentSprite },
  chest: { icon: chestIcon, sprite: chestSprite },
  craftables: {
    campfire: { icon: campfireIcon, sprite: campfireSprite },
    cauldron: { icon: cauldronIcon, sprite: cauldronSprite },
    oven: { icon: ovenIcon, sprite: ovenSprite },
    chair: { icon: chairIcon, sprite: chairSprite },
  },
  // Árvores adultas em tiras de variantes (scripts/process-trees.py); cacto: prancha 4 × 2 (scripts/extract-trees.py).
  trees: { oak: treeOak, apple: treeApple, cherry: treeCherry, cactus: treeCactus },
  rocks,
  // Cerca de tábuas (scripts/extract-fence.py): peças emendadas por vizinhos + portão.
  fence: { pieces: fencePieces, gate: fenceGate, icon: fenceIcon, gateIcon: fenceGateIcon },
  // Cidade do Despertar (scripts/extract-town.py): construções, bancos, postes e arbustos.
  town: { 'house-red-1f': townHouseRed1f, 'house-red-2f': townHouseRed2f, 'house-blue-1f': townHouseBlue1f, 'house-blue-2f': townHouseBlue2f, 'house-brown-1f': townHouseBrown1f, 'house-brown-2f': townHouseBrown2f, 'shop-1f': townShop1f, 'shop-2f': townShop2f, 'smithy': townSmithy, 'inn': townInn, 'fountain': townFountain, 'well': townWell, 'stall': townStall, 'barrel': townBarrel, 'guild': townGuild, 'castle': townCastle, 'watchtower': townWatchtower, 'bench-2': townBench2, 'bench-3': townBench3, 'lamp-stone': townLampStone, 'lamp-wood': townLampWood, 'lamp-mixed': townLampMixed, 'bush-round': townBushRound, 'bush-tall': townBushTall, 'bush-wide': townBushWide },
  water: { top: waterTop, flow: waterFlow },
  monsterDeaths: { 'spider-small': spiderSmallDeath, 'spider-big': spiderBigDeath, 'spider-boss': spiderBossDeath },
  wheatCrop,
  crops: { potato: cropPotato, tomato: cropTomato, carrot: cropCarrot },
  itemIcons: { wheat_seed: seedIcon, wheat: wheatIcon, silk: silkIcon, fang: fangIcon, queen_heart: queenHeartIcon, apple: appleIcon, potato: potatoIcon, tomato: tomatoIcon, carrot: carrotIcon, silk_cloth: silkClothIcon, bread: breadIcon, pasta_tomato: pastaTomatoIcon, milk: milkIcon, egg: eggIcon, cheese: cheeseIcon, apple_pie: applePieIcon },
  toolIcons: { sword: swordIcon, hoe: hoeIcon, pickaxe: pickaxeIcon, shovel: shovelIcon, axe: axeIcon },
  modular: { manifest: chibiManifest as unknown as ModularManifest, sheets: chibiSheets },
};
export default pack;
