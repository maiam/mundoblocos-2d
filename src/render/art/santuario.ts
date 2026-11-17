import type { ArtPack } from './types';
import isoGround from '../../assets/iso-ground.webp';
import isoCube from '../../assets/iso-cube.webp';
import isoProps from '../../assets/iso-props.webp';
import isoFenceModel from '../../assets/iso-fence-model.json';
import isoWood from '../../assets/iso-wood.webp';
import iconFence from '../../assets/icon-block-fence.webp';
import iconFenceBirch from '../../assets/icon-block-fence-betula.webp';
import iconFenceCherry from '../../assets/icon-block-fence-cerejeira.webp';
import iconGate from '../../assets/icon-block-fence-gate.webp';
import iconGateBirch from '../../assets/icon-block-fence-gate-betula.webp';
import iconGateCherry from '../../assets/icon-block-fence-gate-cerejeira.webp';
import { Block } from '../../world/blocks';
import type { IsoFenceModel } from '../three/isoFences';
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

/** Ícones das peças (`icon-iso-<chave>.webp`), por chave com hífens (`g-grass`). Vite devolve a URL de cada arquivo. */
const iconFiles = import.meta.glob('../../assets/icon-iso-*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const icons: Record<string, string> = {};
for (const [path, url] of Object.entries(iconFiles)) icons[path.replace(/^.*icon-iso-/, '').replace(/\.webp$/, '')] = url;

/**
 * Santuário isométrico (ADR 0036, v0.93.140): só o conjunto isométrico (pisos, bloco de grama e objetos) e a Deusa isométrica. Não traz a arte do Mundo
 * principal (materiais, árvores, cidade…): o Santuário não tem nada disso.
 */
const pack: ArtPack = {
  actors: {
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
  },
  isoSet: { ground: isoGround, cube: isoCube, props: isoProps, icons },
  isoFence: {
    model: isoFenceModel as IsoFenceModel, wood: isoWood,
    icons: {
      [Block.FENCE]: iconFence, [Block.FENCE_BIRCH]: iconFenceBirch, [Block.FENCE_CHERRY]: iconFenceCherry,
      [Block.FENCE_GATE]: iconGate, [Block.FENCE_GATE_BIRCH]: iconGateBirch, [Block.FENCE_GATE_CHERRY]: iconGateCherry,
    },
  },
  materialIcons: {},
  itemIcons: {},
  toolIcons: {},
};
export default pack;
