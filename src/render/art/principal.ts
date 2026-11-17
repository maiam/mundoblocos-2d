import type { MaterialsV2Manifest } from '../materialsV2';
import npcBlack from '../../assets/npc-black.webp';
import portraitBlack from '../../assets/portrait-black.webp';
import npcDante from '../../assets/npc-dante.webp';
import portraitDante from '../../assets/portrait-dante.webp';
import npcSilvano from '../../assets/npc-silvano.webp';
import portraitSilvano from '../../assets/portrait-silvano.webp';
import npcMorgan from '../../assets/npc-morgan.webp';
import portraitMorgan from '../../assets/portrait-morgan.webp';
import npcAurelio from '../../assets/npc-aurelio.webp';
import portraitAurelio from '../../assets/portrait-aurelio.webp';
import npcRubem from '../../assets/npc-rubem.webp';
import portraitRubem from '../../assets/portrait-rubem.webp';
import npcRosendo from '../../assets/npc-rosendo.webp';
import portraitRosendo from '../../assets/portrait-rosendo.webp';
import npcTeodoro from '../../assets/npc-teodoro.webp';
import portraitTeodoro from '../../assets/portrait-teodoro.webp';
import npcBento from '../../assets/npc-bento.webp';
import portraitBento from '../../assets/portrait-bento.webp';
import npcSolano from '../../assets/npc-solano.webp';
import portraitSolano from '../../assets/portrait-solano.webp';
import npcNilo from '../../assets/npc-nilo.webp';
import portraitNilo from '../../assets/portrait-nilo.webp';
import npcMarlon from '../../assets/npc-marlon.webp';
import portraitMarlon from '../../assets/portrait-marlon.webp';
import npcLavinio from '../../assets/npc-lavinio.webp';
import portraitLavinio from '../../assets/portrait-lavinio.webp';
import npcCaio from '../../assets/npc-caio.webp';
import portraitCaio from '../../assets/portrait-caio.webp';
import npcNoel from '../../assets/npc-noel.webp';
import portraitNoel from '../../assets/portrait-noel.webp';
import npcLeandro from '../../assets/npc-leandro.webp';
import portraitLeandro from '../../assets/portrait-leandro.webp';
import dialogueFrame from '../../assets/dialogo-moldura.webp';
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
import goddessFloat from '../../assets/goddess-float.webp';
import goddessIsoWalk from '../../assets/goddess-iso-walk.webp';
import goddessIsoIdle from '../../assets/goddess-iso-idle.webp';
import goddessIsoSit from '../../assets/goddess-iso-sit.webp';
import goddessIsoSword from '../../assets/goddess-iso-sword.webp';
import goddessIsoAxe from '../../assets/goddess-iso-axe.webp';
import goddessIsoHoe from '../../assets/goddess-iso-hoe.webp';
import goddessIsoPickaxe from '../../assets/goddess-iso-pickaxe.webp';
import goddessIsoShovel from '../../assets/goddess-iso-shovel.webp';
import goddessIsoSwordAttack from '../../assets/goddess-iso-sword-attack.webp';
import goddessIsoAxeAttack from '../../assets/goddess-iso-axe-attack.webp';
import goddessIsoHoeAttack from '../../assets/goddess-iso-hoe-attack.webp';
import goddessIsoPickaxeAttack from '../../assets/goddess-iso-pickaxe-attack.webp';
import goddessIsoShovelAttack from '../../assets/goddess-iso-shovel-attack.webp';
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
import mila from '../../assets/mila.webp';
import grewn from '../../assets/grewn.webp';
import grewnSit from '../../assets/grewn-sit.webp';
import grewnSword from '../../assets/grewn-sword.webp';
import grewnAxe from '../../assets/grewn-axe.webp';
import grewnHoe from '../../assets/grewn-hoe.webp';
import grewnPickaxe from '../../assets/grewn-pickaxe.webp';
import grewnShovel from '../../assets/grewn-shovel.webp';
import grewnSwordAttack from '../../assets/grewn-sword-attack.webp';
import grewnAxeAttack from '../../assets/grewn-axe-attack.webp';
import grewnHoeAttack from '../../assets/grewn-hoe-attack.webp';
import grewnPickaxeAttack from '../../assets/grewn-pickaxe-attack.webp';
import grewnShovelAttack from '../../assets/grewn-shovel-attack.webp';
import milaSit from '../../assets/mila-sit.webp';
import milaSword from '../../assets/mila-sword.webp';
import milaAxe from '../../assets/mila-axe.webp';
import milaHoe from '../../assets/mila-hoe.webp';
import milaPickaxe from '../../assets/mila-pickaxe.webp';
import milaShovel from '../../assets/mila-shovel.webp';
import milaSwordAttack from '../../assets/mila-sword-attack.webp';
import milaAxeAttack from '../../assets/mila-axe-attack.webp';
import milaHoeAttack from '../../assets/mila-hoe-attack.webp';
import milaPickaxeAttack from '../../assets/mila-pickaxe-attack.webp';
import milaShovelAttack from '../../assets/mila-shovel-attack.webp';
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
import iconWallPlanks from '../../assets/icon-wall-planks.webp';
import iconWallStone from '../../assets/icon-wall-stone.webp';
import wallsPedra from '../../assets/walls-pedra.webp';
import wallsTabuas from '../../assets/walls-tabuas.webp';
import loveHearts from '../../assets/love-hearts.webp';
import sheep from '../../assets/sheep.webp';
import horse from '../../assets/horse.webp';
import cow from '../../assets/cow.webp';
import chicken from '../../assets/chicken.webp';
import capybara from '../../assets/capybara.webp';
import capybaraIdle from '../../assets/capybara-idle.webp';
import foal from '../../assets/foal.webp';
import calf from '../../assets/calf.webp';
import chick from '../../assets/chick.webp';
import wolfBrownWalk from '../../assets/wolf-brown-walk.webp';
import wolfBrownIdle from '../../assets/wolf-brown-idle.webp';
import wolfBrownRun from '../../assets/wolf-brown-run.webp';
import wolfBrownAlert from '../../assets/wolf-brown-alert.webp';
import wolfBrownAttack from '../../assets/wolf-brown-attack.webp';
import wolfBrownHurt from '../../assets/wolf-brown-hurt.webp';
import wolfBrownDeath from '../../assets/wolf-brown-death.webp';
import wolfGrayWalk from '../../assets/wolf-gray-walk.webp';
import wolfGrayIdle from '../../assets/wolf-gray-idle.webp';
import wolfGrayRun from '../../assets/wolf-gray-run.webp';
import wolfGrayAlert from '../../assets/wolf-gray-alert.webp';
import wolfGrayAttack from '../../assets/wolf-gray-attack.webp';
import wolfGrayHurt from '../../assets/wolf-gray-hurt.webp';
import wolfGrayDeath from '../../assets/wolf-gray-death.webp';
import wolfWhiteWalk from '../../assets/wolf-white-walk.webp';
import wolfWhiteIdle from '../../assets/wolf-white-idle.webp';
import wolfWhiteRun from '../../assets/wolf-white-run.webp';
import wolfWhiteAlert from '../../assets/wolf-white-alert.webp';
import wolfWhiteAttack from '../../assets/wolf-white-attack.webp';
import wolfWhiteHurt from '../../assets/wolf-white-hurt.webp';
import wolfWhiteDeath from '../../assets/wolf-white-death.webp';
import goblinWalk from '../../assets/goblin-walk.webp';
import goblinIdle from '../../assets/goblin-idle.webp';
import goblinAttack from '../../assets/goblin-attack.webp';
import goblinHurt from '../../assets/goblin-hurt.webp';
import goblinDeath from '../../assets/goblin-death.webp';
import goblinAlert from '../../assets/goblin-alert.webp';
import goblinRun from '../../assets/goblin-run.webp';
import lizardWalk from '../../assets/lizard-walk.webp';
import lizardIdle from '../../assets/lizard-idle.webp';
import lizardAttack from '../../assets/lizard-attack.webp';
import lizardHurt from '../../assets/lizard-hurt.webp';
import lizardDeath from '../../assets/lizard-death.webp';
import lizardAlert from '../../assets/lizard-alert.webp';
import lizardRun from '../../assets/lizard-run.webp';
import spiderBig from '../../assets/spider-big.webp';
import spiderBoss from '../../assets/spider-boss.webp';
import spiderSmall from '../../assets/spider-small.webp';
import spiderSmallDeath from '../../assets/spider-small-death.webp';
import spiderBigDeath from '../../assets/spider-big-death.webp';
import spiderBossDeath from '../../assets/spider-boss-death.webp';
import silkIcon from '../../assets/icon-silk.webp';
import fangIcon from '../../assets/icon-fang.webp';
import wolfFangIcon from '../../assets/icon-wolf-fang.webp';
import wolfPeltIcon from '../../assets/icon-wolf-pelt.webp';
import copperCoinIcon from '../../assets/icon-copper-coin.webp';
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
import flowers from '../../assets/flowers.webp';
import flowerIcon01 from '../../assets/icon-flower-01.webp';
import flowerIcon02 from '../../assets/icon-flower-02.webp';
import flowerIcon03 from '../../assets/icon-flower-03.webp';
import flowerIcon04 from '../../assets/icon-flower-04.webp';
import flowerIcon05 from '../../assets/icon-flower-05.webp';
import flowerIcon06 from '../../assets/icon-flower-06.webp';
import flowerIcon07 from '../../assets/icon-flower-07.webp';
import flowerIcon08 from '../../assets/icon-flower-08.webp';
import flowerIcon09 from '../../assets/icon-flower-09.webp';
import flowerIcon10 from '../../assets/icon-flower-10.webp';
import flowerIcon11 from '../../assets/icon-flower-11.webp';
import flowerIcon12 from '../../assets/icon-flower-12.webp';
import flowerIcon13 from '../../assets/icon-flower-13.webp';
import flowerIcon14 from '../../assets/icon-flower-14.webp';
import flowerIcon15 from '../../assets/icon-flower-15.webp';
import fxDig from '../../assets/fx-dig.webp';
import fxTree from '../../assets/fx-tree.webp';
import fxSlash from '../../assets/fx-slash.webp';
import fxSlashUp from '../../assets/fx-slash-up.webp';
import fxSlashDown from '../../assets/fx-slash-down.webp';
import fxRock from '../../assets/fx-rock.webp';
import fxSoil from '../../assets/fx-soil.webp';
import fxTill from '../../assets/fx-till.webp';
import fencePieces from '../../assets/fence.webp';
import fenceGate from '../../assets/fence-gate.webp';
import fenceIcon from '../../assets/icon-block-fence.webp';
import fenceGateBirchIcon from '../../assets/icon-block-fence-gate-betula.webp';
import fenceGateCherryIcon from '../../assets/icon-block-fence-gate-cerejeira.webp';
import fenceGateSide from '../../assets/fence-gate-side.webp';
import fenceGateSideBirch from '../../assets/fence-gate-side-betula.webp';
import fenceGateSideCherry from '../../assets/fence-gate-side-cerejeira.webp';
import fenceGateBirch from '../../assets/fence-gate-betula.webp';
import fenceGateCherry from '../../assets/fence-gate-cerejeira.webp';
import fenceBirch from '../../assets/fence-betula.webp';
import fenceBirchIcon from '../../assets/icon-block-fence-betula.webp';
import fenceCherry from '../../assets/fence-cerejeira.webp';
import fenceCherryIcon from '../../assets/icon-block-fence-cerejeira.webp';
import fenceGateIcon from '../../assets/icon-block-fence-gate.webp';
import treeOak from '../../assets/tree-oak.webp';
import treeApple from '../../assets/tree-apple.webp';
import treeCactus from '../../assets/tree-cactus.webp';
import treeAppleBare from '../../assets/tree-apple-bare.webp';
import treeCherry from '../../assets/tree-cherry.webp';
import treeBirch from '../../assets/tree-birch.webp';
import birchLogIcon from '../../assets/icon-block-birch-log.webp';
import birchPlanksIcon from '../../assets/icon-block-birch-planks.webp';
import cherryLogIcon from '../../assets/icon-block-cherry-log.webp';
import cherryPlanksIcon from '../../assets/icon-block-cherry-planks.webp';
import appleIcon from '../../assets/icon-item-apple.webp';
import chairIcon from '../../assets/icon-block-chair.webp';
import chairSprite from '../../assets/chair.webp';
// Vila Camponesa (scripts/extract-village.py)
// Itens da água (scripts/extract-village.py)
import waterFishCarp from '../../assets/water-fish-carp.webp';
import waterFishGold from '../../assets/water-fish-gold.webp';
import waterFishPerch from '../../assets/water-fish-perch.webp';
import waterFishSilver from '../../assets/water-fish-silver.webp';
import waterLilyBud from '../../assets/water-lily-bud.webp';
import waterLilyLeaf from '../../assets/water-lily-leaf.webp';
import waterLilyPink from '../../assets/water-lily-pink.webp';
import waterLilyWhite from '../../assets/water-lily-white.webp';
import waterVictoriaA from '../../assets/water-victoria-a.webp';
import waterVictoriaB from '../../assets/water-victoria-b.webp';
import waterVictoriaFlower from '../../assets/water-victoria-flower.webp';
import waterVictoriaPair from '../../assets/water-victoria-pair.webp';
import villageBarn from '../../assets/village-barn.webp';
import villageBarrel from '../../assets/village-barrel.webp';
import villageBedVeg from '../../assets/village-bed-veg.webp';
import villageBedWheat from '../../assets/village-bed-wheat.webp';
import villageBench1 from '../../assets/village-bench-1.webp';
import villageBench2 from '../../assets/village-bench-2.webp';
import villageBush from '../../assets/village-bush.webp';
import villageCart from '../../assets/village-cart.webp';
import villageCoop from '../../assets/village-coop.webp';
import villageFlowers from '../../assets/village-flowers.webp';
import villageGateClosed from '../../assets/village-gate-closed.webp';
import villageGateOpen from '../../assets/village-gate-open.webp';
import villageHay from '../../assets/village-hay.webp';
import villageHouseStraw1 from '../../assets/village-house-straw-1.webp';
import villageHouseStraw2 from '../../assets/village-house-straw-2.webp';
import villageHouseStraw3 from '../../assets/village-house-straw-3.webp';
import villageHouseTile1 from '../../assets/village-house-tile-1.webp';
import villageHouseTile2 from '../../assets/village-house-tile-2.webp';
import villageLamp from '../../assets/village-lamp.webp';
import villageLogs from '../../assets/village-logs.webp';
import villageOak1 from '../../assets/village-oak-1.webp';
import villageOak2 from '../../assets/village-oak-2.webp';
import villageOak3 from '../../assets/village-oak-3.webp';
import villageRocks from '../../assets/village-rocks.webp';
import villageSacks from '../../assets/village-sacks.webp';
import villageStakeIcon from '../../assets/icon-block-fence-stake.webp';
import villageStakeLow from '../../assets/village-stake-low.webp';
import villageStakeTall from '../../assets/village-stake-tall.webp';
import villageTree1 from '../../assets/village-tree-1.webp';
import villageTree2 from '../../assets/village-tree-2.webp';
import villageWell from '../../assets/village-well.webp';
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
import interiorMarket from '../../assets/interior-market.webp';
import interiorFlorist from '../../assets/interior-florist.webp';
import interiorGuild from '../../assets/interior-guild.webp';
import townFlorist from '../../assets/town-florist.webp';
import uiCharacter from '../../assets/ui-character.webp';
import uiShop from '../../assets/ui-shop.webp';
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
const pack: ArtPack = {
  actors: {
    goddess: goddessFloat, // Sala 2 (Santuário) usa o pacote do mundo normal; a folha só baixa quando a Deusa aparece
    // Deusa isométrica (Santuário solo, ADR 0036): 4 diagonais da câmera a 45° (frente=baixo, esquerda, direita, costas = as 4 direções do jogo); folhas só baixam quando ela aparece
    'goddess-iso': goddessIsoWalk,
    'goddess-iso-idle': goddessIsoIdle,
    'goddess-iso-sit': goddessIsoSit,
    'goddess-iso-sword': goddessIsoSword,
    'goddess-iso-axe': goddessIsoAxe,
    'goddess-iso-hoe': goddessIsoHoe,
    'goddess-iso-pickaxe': goddessIsoPickaxe,
    'goddess-iso-shovel': goddessIsoShovel,
    'goddess-iso-sword-attack': goddessIsoSwordAttack,
    'goddess-iso-axe-attack': goddessIsoAxeAttack,
    'goddess-iso-hoe-attack': goddessIsoHoeAttack,
    'goddess-iso-pickaxe-attack': goddessIsoPickaxeAttack,
    'goddess-iso-shovel-attack': goddessIsoShovelAttack,
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
    mila,
    grewn,
    'grewn-sit': grewnSit,
    'grewn-sword': grewnSword,
    'grewn-axe': grewnAxe,
    'grewn-hoe': grewnHoe,
    'grewn-pickaxe': grewnPickaxe,
    'grewn-shovel': grewnShovel,
    'grewn-sword-attack': grewnSwordAttack,
    'grewn-axe-attack': grewnAxeAttack,
    'grewn-hoe-attack': grewnHoeAttack,
    'grewn-pickaxe-attack': grewnPickaxeAttack,
    'grewn-shovel-attack': grewnShovelAttack,
    'mila-sit': milaSit,
    'mila-sword': milaSword,
    'mila-axe': milaAxe,
    'mila-hoe': milaHoe,
    'mila-pickaxe': milaPickaxe,
    'mila-shovel': milaShovel,
    'mila-sword-attack': milaSwordAttack,
    'mila-axe-attack': milaAxeAttack,
    'mila-hoe-attack': milaHoeAttack,
    'mila-pickaxe-attack': milaPickaxeAttack,
    'mila-shovel-attack': milaShovelAttack,
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
    capybara,
    'capybara-idle': capybaraIdle,
    foal,
    calf,
    chick,
    'npc-black': npcBlack,
    'npc-dante': npcDante,
    'npc-silvano': npcSilvano,
    'npc-morgan': npcMorgan,
    'npc-aurelio': npcAurelio,
    'npc-rubem': npcRubem,
    'npc-rosendo': npcRosendo,
    'npc-teodoro': npcTeodoro,
    'npc-bento': npcBento,
    'npc-solano': npcSolano,
    'npc-nilo': npcNilo,
    'npc-marlon': npcMarlon,
    'npc-lavinio': npcLavinio,
    'npc-caio': npcCaio,
    'npc-noel': npcNoel,
    'npc-leandro': npcLeandro,
    'wolf-brown': wolfBrownWalk,
    'wolf-brown-idle': wolfBrownIdle,
    'wolf-brown-run': wolfBrownRun,
    'wolf-brown-alert': wolfBrownAlert,
    'wolf-brown-attack': wolfBrownAttack,
    'wolf-brown-hurt': wolfBrownHurt,
    'wolf-gray': wolfGrayWalk,
    'wolf-gray-idle': wolfGrayIdle,
    'wolf-gray-run': wolfGrayRun,
    'wolf-gray-alert': wolfGrayAlert,
    'wolf-gray-attack': wolfGrayAttack,
    'wolf-gray-hurt': wolfGrayHurt,
    'wolf-white': wolfWhiteWalk,
    'wolf-white-idle': wolfWhiteIdle,
    'wolf-white-run': wolfWhiteRun,
    'wolf-white-alert': wolfWhiteAlert,
    'wolf-white-attack': wolfWhiteAttack,
    'wolf-white-hurt': wolfWhiteHurt,
    goblin: goblinWalk,
    'goblin-idle': goblinIdle,
    'goblin-run': goblinRun,
    'goblin-alert': goblinAlert,
    'goblin-attack': goblinAttack,
    'goblin-hurt': goblinHurt,
    lizard: lizardWalk,
    'lizard-idle': lizardIdle,
    'lizard-run': lizardRun,
    'lizard-alert': lizardAlert,
    'lizard-attack': lizardAttack,
    'lizard-hurt': lizardHurt,
    'spider-small': spiderSmall,
    'spider-big': spiderBig,
    'spider-boss': spiderBoss,
  },
  interiors: { smithy: interiorSmithy, tent: interiorTent, market: interiorMarket, florist: interiorFlorist, guild: interiorGuild },
  portraits: { black: portraitBlack, dante: portraitDante, silvano: portraitSilvano, morgan: portraitMorgan, aurelio: portraitAurelio, rubem: portraitRubem, rosendo: portraitRosendo, teodoro: portraitTeodoro, bento: portraitBento, solano: portraitSolano, nilo: portraitNilo, marlon: portraitMarlon, lavinio: portraitLavinio, caio: portraitCaio, noel: portraitNoel, leandro: portraitLeandro },
  dialogueFrame,
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
    [Block.BIRCH_LOG]: birchLogIcon,
    [Block.BIRCH_PLANKS]: birchPlanksIcon,
    [Block.WALL_PLANKS]: iconWallPlanks,
    [Block.WALL_STONE]: iconWallStone,
  },
  celestialIcons: {},
  // Paredes autotile no Mundo (W5): atlas por material e ícones (a porta de parede usa o ícone da Porta de Carvalho).
  wallAtlases: { [Block.WALL_PLANKS]: wallsTabuas, [Block.WALL_STONE]: wallsPedra },
  oakDoor,
  dungeon: { ground: dungeonGround, mountains: dungeonMountains, rocks: dungeonRocks, props: dungeonProps, walls: dungeonWalls, cave: dungeonCave },
  uiIcons: { bag: bagIcon, character: characterIcon, skills: skillsIcon, builder: builderIcon },
  shopFrame: uiShop,
  characterFrame: uiCharacter,
  tent: { icon: tentIcon, sprite: tentSprite },
  chest: { icon: chestIcon, sprite: chestSprite },
  craftables: {
    campfire: { icon: campfireIcon, sprite: campfireSprite },
    cauldron: { icon: cauldronIcon, sprite: cauldronSprite },
    oven: { icon: ovenIcon, sprite: ovenSprite },
    chair: { icon: chairIcon, sprite: chairSprite },
  },
  // Árvores adultas em tiras de variantes (scripts/process-trees.py); cacto: prancha 4 × 2 (scripts/extract-trees.py).
  trees: { oak: treeOak, apple: treeApple, appleBare: treeAppleBare, cherry: treeCherry, birch: treeBirch, cactus: treeCactus },
  rocks,
  flowers,
  flowerIcons: [flowerIcon01, flowerIcon02, flowerIcon03, flowerIcon04, flowerIcon05, flowerIcon06, flowerIcon07, flowerIcon08, flowerIcon09, flowerIcon10, flowerIcon11, flowerIcon12, flowerIcon13, flowerIcon14, flowerIcon15],
  fx: { dig: fxDig, tree: fxTree, slash: fxSlash, slashUp: fxSlashUp, slashDown: fxSlashDown, rock: fxRock, soil: fxSoil, till: fxTill },
  // Cerca de tábuas (scripts/extract-fence.py): peças emendadas por vizinhos + portão.
  fence: {
    pieces: fencePieces, gate: fenceGate, icon: fenceIcon, gateIcon: fenceGateIcon,
    birch: { pieces: fenceBirch, icon: fenceBirchIcon, gate: fenceGateBirch, gateIcon: fenceGateBirchIcon, gateSide: fenceGateSideBirch }, cherry: { pieces: fenceCherry, icon: fenceCherryIcon, gate: fenceGateCherry, gateIcon: fenceGateCherryIcon, gateSide: fenceGateSideCherry },
    gateSide: fenceGateSide,
  },
  // Cidade do Despertar (scripts/extract-town.py): construções, bancos, postes e arbustos.
  town: { 'house-red-1f': townHouseRed1f, 'house-red-2f': townHouseRed2f, 'house-blue-1f': townHouseBlue1f, 'house-blue-2f': townHouseBlue2f, 'house-brown-1f': townHouseBrown1f, 'house-brown-2f': townHouseBrown2f, 'shop-1f': townShop1f, 'shop-2f': townShop2f, 'smithy': townSmithy, 'inn': townInn, 'florist': townFlorist, 'fountain': townFountain, 'well': townWell, 'stall': townStall, 'barrel': townBarrel, 'guild': townGuild, 'castle': townCastle, 'watchtower': townWatchtower, 'bench-2': townBench2, 'bench-3': townBench3, 'lamp-stone': townLampStone, 'lamp-wood': townLampWood, 'lamp-mixed': townLampMixed, 'bush-round': townBushRound, 'bush-tall': townBushTall, 'bush-wide': townBushWide, 'water-fish-carp': waterFishCarp, 'water-fish-gold': waterFishGold, 'water-fish-perch': waterFishPerch, 'water-fish-silver': waterFishSilver, 'water-lily-bud': waterLilyBud, 'water-lily-leaf': waterLilyLeaf, 'water-lily-pink': waterLilyPink, 'water-lily-white': waterLilyWhite, 'water-victoria-a': waterVictoriaA, 'water-victoria-b': waterVictoriaB, 'water-victoria-flower': waterVictoriaFlower, 'water-victoria-pair': waterVictoriaPair, 'village-barn': villageBarn, 'village-barrel': villageBarrel, 'village-bed-veg': villageBedVeg, 'village-bed-wheat': villageBedWheat, 'village-bench-1': villageBench1, 'village-bench-2': villageBench2, 'village-bush': villageBush, 'village-cart': villageCart, 'village-coop': villageCoop, 'village-flowers': villageFlowers, 'village-gate-closed': villageGateClosed, 'village-gate-open': villageGateOpen, 'village-hay': villageHay, 'village-house-straw-1': villageHouseStraw1, 'village-house-straw-2': villageHouseStraw2, 'village-house-straw-3': villageHouseStraw3, 'village-house-tile-1': villageHouseTile1, 'village-house-tile-2': villageHouseTile2, 'village-lamp': villageLamp, 'village-logs': villageLogs, 'village-oak-1': villageOak1, 'village-oak-2': villageOak2, 'village-oak-3': villageOak3, 'village-rocks': villageRocks, 'village-stake-low': villageStakeLow, 'village-stake-tall': villageStakeTall, 'village-stake-icon': villageStakeIcon, 'village-sacks': villageSacks, 'village-tree-1': villageTree1, 'village-tree-2': villageTree2, 'village-well': villageWell },
  water: { top: waterTop, flow: waterFlow },
  monsterDeaths: { 'spider-small': spiderSmallDeath, 'spider-big': spiderBigDeath, 'spider-boss': spiderBossDeath, goblin: goblinDeath, lizard: lizardDeath, 'wolf-brown': wolfBrownDeath, 'wolf-gray': wolfGrayDeath, 'wolf-white': wolfWhiteDeath },
  wheatCrop,
  crops: { potato: cropPotato, tomato: cropTomato, carrot: cropCarrot },
  itemIcons: { wheat_seed: seedIcon, wheat: wheatIcon, silk: silkIcon, fang: fangIcon, queen_heart: queenHeartIcon, wolf_fang: wolfFangIcon, wolf_pelt: wolfPeltIcon, copper_coin: copperCoinIcon, apple: appleIcon, potato: potatoIcon, tomato: tomatoIcon, carrot: carrotIcon, silk_cloth: silkClothIcon, bread: breadIcon, pasta_tomato: pastaTomatoIcon, milk: milkIcon, egg: eggIcon, cheese: cheeseIcon, apple_pie: applePieIcon },
  toolIcons: { sword: swordIcon, hoe: hoeIcon, pickaxe: pickaxeIcon, shovel: shovelIcon, axe: axeIcon },
};
export default pack;
