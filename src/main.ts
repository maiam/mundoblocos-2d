import './style.css';
import { Game } from './game/game';
import { ScreenMode } from './game/screenMode';
import { seedFromString } from './world/random';

const canvas = document.getElementById('world') as HTMLCanvasElement;
const screenMode = new ScreenMode();
let game: Game | null = null;

function start(seed: number): void {
  game?.destroy();
  const url = new URL(window.location.href);
  url.searchParams.set('seed', String(seed));
  window.history.replaceState(null, '', url);
  game = new Game(canvas, seed, screenMode);
  // Só em desenvolvimento: acesso para testes automatizados no navegador.
  if (import.meta.env.DEV) (window as unknown as { __game: Game }).__game = game;
}

const param = new URLSearchParams(window.location.search).get('seed');
start(param ? seedFromString(param) : Math.floor(Math.random() * 2 ** 31));
