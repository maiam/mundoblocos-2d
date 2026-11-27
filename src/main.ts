import { resolveWorldId } from './titan/worldId';

/**
 * Entrada do jogo (ADR 0115): só o motor voxel de `src/titan/`. O **Orvalis 3D** é o mundo padrão; o **Titã** só abre com `?mundo=titan`.
 * Mundo fixo no build (`VITE_WORLD`, artefato próprio) → `?mundo=` → Orvalis 3D.
 */
const canvas = document.getElementById('world') as HTMLCanvasElement;
const world = resolveWorldId(window.location.search, import.meta.env.VITE_WORLD);
const orvalis = world === 'orvalis3d';
document.title = orvalis ? 'Orvalis · Ilha das Florestas' : 'Titã · Margem Silenciosa';
document.getElementById('world')?.setAttribute('aria-label', orvalis ? 'Orvalis' : 'Titã');
void import('./titan/titanGame').then((m) => m.startTitan(canvas, window.location.search, undefined, orvalis ? 'orvalis' : 'titan'));
