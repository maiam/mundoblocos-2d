import './style.css';
import { Game } from './game/game';
import { loadBlockArt } from './render/blockArt';
import { resolveWorldId, WORLD_PROFILES } from './world/profiles';
import { ScreenMode } from './game/screenMode';
import { seedFromString } from './world/random';

const canvas = document.getElementById('world') as HTMLCanvasElement;
const screenMode = new ScreenMode();
// Mundo: fixo no build (VITE_WORLD, artefato próprio) → subdomínio → ?mundo= → principal.
const profile = WORLD_PROFILES[resolveWorldId(window.location.hostname, window.location.search, import.meta.env.VITE_WORLD)];
document.title = profile.id === 'principal' ? 'MundoBlocos 2D' : profile.name;
let game: Game | null = null;

function start(seed: number): void {
  game?.destroy();
  const url = new URL(window.location.href);
  url.searchParams.set('seed', String(seed));
  window.history.replaceState(null, '', url);
  game = new Game(canvas, seed, screenMode, profile);
  // Só em desenvolvimento: acesso para testes automatizados no navegador.
  if (import.meta.env.DEV) (window as unknown as { __game: Game }).__game = game;
}

const param = new URLSearchParams(window.location.search).get('seed');
// A arte dos blocos precisa estar carregada antes de montar chão e cubos.
void loadBlockArt().then(() => start(param ? seedFromString(param) : Math.floor(Math.random() * 2 ** 31)));
