# Operações

- Requisitos: Node 22+, npm.
- `npm run dev` (servidor local), `npm test`, `npm run build` → `dist/` estático (`base: './'`, pode ser
  servido de qualquer subcaminho/CDN).
- `npm run build:artifact` → `artifact/mundoblocos.html` (arquivo único, JS/CSS inline, sem esqueleto `<html>`),
  usado para publicar como Artifact do claude.ai. Versão publicada: https://claude.ai/artifact/FKYk57NzSCjDA4rQH2RgLn
  (privada; compartilhar pelo menu Share). Republicar após mudanças. `artifact/` não é versionado.
- Sprites (requer Pillow e numpy) — `P="python3 scripts/process-sprite.py"`:
  `$P assets-src/heroine-sheet.png src/assets/heroine.png --frame-h 144`
  `$P assets-src/sheep-sheet.png src/assets/sheep.png --frame-h 96 --sat 23 --min 128`
  `$P assets-src/lamb-sheet.png src/assets/lamb.png --frame-h 80 --sat 36 --min 128`
  `$P assets-src/sheep-love-sheet.png src/assets/sheep-love.png --cols 4 --rows 1 --region 0,0,2172,490 --frame-h 120 --sat 20 --min 140`
  `$P assets-src/wheat-growth-sheet.png src/assets/wheat-crop.png --frame-h 96 --sat 30 --min 196`
  `$P assets-src/wheat-icons-sheet.png src/assets/icon-wheat-seed.png --cols 1 --rows 1 --region 45,210,310,402 --frame-h 64 --sat 50 --min 190`
  `$P assets-src/wheat-icons-sheet.png src/assets/icon-wheat.png --cols 1 --rows 1 --region 645,555,905,835 --frame-h 64 --sat 50 --min 190`
  `for t in sword hoe pickaxe axe; do $P assets-src/heroine-$t-sheet.png src/assets/heroine-$t.png --frame-h 144 --rows-map 0,3,1,2; done`
  `$P assets-src/heroine-shovel-sheet.png src/assets/heroine-shovel.png --frame-h 144 --rows-map 0,1,1m,2`
  Ícones (regiões da prancha `tool-icons-sheet.png`, `--cols 1 --rows 1 --frame-h 64 --sat 34 --min 175`):
  espada `75,105,455,490` · enxada `535,105,915,490` · picareta `995,105,1375,490` · pá `285,590,680,985` ·
  machado `770,590,1165,985`.
- Blocos: `python3 scripts/extract-blocks.py` (prancha `assets-src/blocks-sheet.png` → atlas + ícones).
- Em `npm run dev`, `window.__game` dá acesso ao jogo para testes automatizados (não existe no build).
- Ícones do PWA: `python3 scripts/make-icons.py` (Pillow). `public/` é copiado para `dist/` (manifest e ícones);
  o build de Artifact é arquivo único e não leva manifest.
- Não há variáveis de ambiente nem `env.example` (nenhuma configuração externa necessária).
- Fonte Nunito via Google Fonts (com fallback `system-ui` se offline).
