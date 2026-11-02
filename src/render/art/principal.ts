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
import wheatCrop from '../../assets/wheat-crop.webp?inline';
import { Block } from '../../world/blocks';
import type { ArtPack } from './types';

/**
 * Ícones PROVISÓRIOS dos espólios das aranhas (vetoriais, no estilo do jogo) até chegar a arte final:
 * trocar por `import x from '../../assets/icon-<item>.webp?inline'` sem mexer em mais nada.
 */
const svg = (body: string) => `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${body}</svg>`)}`;
const silkIcon = svg(`<ellipse cx="32" cy="36" rx="18" ry="20" fill="#f4ecff" stroke="#5a3d7a" stroke-width="3"/>
<path d="M18 28c8 4 20 4 28 0M16 38c10 5 22 5 32 0M20 48c8 3 16 3 24 0" fill="none" stroke="#b9a2d6" stroke-width="2.5" stroke-linecap="round"/>
<path d="M32 16V6" stroke="#e6dbf7" stroke-width="2.5" stroke-linecap="round"/><circle cx="25" cy="27" r="3" fill="#fff"/>`);
const fangIcon = svg(`<path d="M22 8c10 2 22 2 26 0-2 16-8 34-17 48C26 40 22 24 22 8Z" fill="#f6ead2" stroke="#5a3d2a" stroke-width="3" stroke-linejoin="round"/>
<path d="M27 14c2 12 4 22 4 32" fill="none" stroke="#d6c39d" stroke-width="3" stroke-linecap="round"/>
<path d="M20 8h30" stroke="#7a2f4a" stroke-width="5" stroke-linecap="round"/>`);
const queenHeartIcon = svg(`<path d="M32 56 9 33A13 13 0 0 1 32 15a13 13 0 0 1 23 18Z" fill="#c23a6e" stroke="#3a1230" stroke-width="3" stroke-linejoin="round"/>
<path d="M32 50 15 33a8 8 0 0 1 4-12" fill="none" stroke="#ff8fb6" stroke-width="3" stroke-linecap="round"/>
<path d="M22 22l6 6-6 6M42 22l-6 6 6 6" fill="none" stroke="#2a0d24" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
<circle cx="32" cy="34" r="4" fill="#ffd36b"/>`);

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
    [Block.OAK_LOG]: oakLogIcon,
    [Block.OAK_PLANKS]: oakPlanksIcon,
  },
  celestialIcons: {},
  oakDoor,
  dungeon: { ground: dungeonGround, mountains: dungeonMountains, rocks: dungeonRocks, props: dungeonProps, walls: dungeonWalls },
  wheatCrop,
  itemIcons: { wheat_seed: seedIcon, wheat: wheatIcon, silk: silkIcon, fang: fangIcon, queen_heart: queenHeartIcon },
  toolIcons: { sword: swordIcon, hoe: hoeIcon, pickaxe: pickaxeIcon, shovel: shovelIcon, axe: axeIcon },
};
export default pack;
