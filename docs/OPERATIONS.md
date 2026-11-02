# Operações

## Requisitos
Node 22+, npm. Para o pipeline de arte: Python 3 com Pillow (com WebP) e numpy. Sem variáveis de ambiente
(não há `env.example`). Fonte Nunito via Google Fonts, com fallback `system-ui`.

## Comandos
| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor local em `http://localhost:5173` (`?seed=<número|texto>`); expõe `window.__game` |
| `npm test` | Testes Vitest (`src/**/*.test.ts`) |
| `npx tsc --noEmit` | Typecheck |
| `npm run bench` | Benchmarks de geração/leitura de chunks (`bench/`) |
| `npm run build` | Typecheck + `dist/` estático (`base: './'`, qualquer subcaminho/CDN; inclui PWA) |
| `npm run build:artifact` | `dist/` → `artifact/mundoblocos.html` (arquivo único, sem esqueleto `<html>`) |

## Artifact (versão jogável)
- URL: https://claude.ai/artifact/FKYk57NzSCjDA4rQH2RgLn (privada; compartilhar pelo menu Share).
- Atualizar: `npm run build:artifact` e publicar o mesmo arquivo (`artifact/mundoblocos.html`) para manter a URL.
- `artifact/` não é versionado. O manifest PWA não entra no arquivo único.

## Pipeline de arte
Sempre: gerar PNG em `src/assets/` → `python3 scripts/optimize-assets.py` (converte para WebP e apaga os PNG).

**Sprites** — `P="python3 scripts/process-sprite.py"`:
```bash
$P assets-src/heroine-sheet.png        src/assets/heroine.png     --frame-h 144
for t in sword hoe pickaxe axe; do
  $P assets-src/heroine-$t-sheet.png   src/assets/heroine-$t.png  --frame-h 144 --rows-map 0,3,1,2
done
$P assets-src/heroine-shovel-sheet.png src/assets/heroine-shovel.png --frame-h 144 --rows-map 0,1,1m,2
$P assets-src/sheep-sheet.png          src/assets/sheep.png       --frame-h 96 --sat 23 --min 128
$P assets-src/lamb-sheet.png           src/assets/lamb.png        --frame-h 80 --sat 36 --min 128
$P assets-src/sheep-love-sheet.png     src/assets/sheep-love.png  --cols 4 --rows 1 --region 0,0,2172,490 --frame-h 120 --sat 20 --min 140
$P assets-src/wheat-growth-sheet.png   src/assets/wheat-crop.png  --frame-h 96 --sat 30 --min 196
```
**Ícones** (`--cols 1 --rows 1 --frame-h 64`):
- Trigo (`wheat-icons-sheet.png`, `--sat 50 --min 190`): semente `45,210,310,402` · trigo `645,555,905,835`.
- Ferramentas (`tool-icons-sheet.png`, `--sat 34 --min 175`): espada `75,105,455,490` · enxada `535,105,915,490` ·
  picareta `995,105,1375,490` · pá `285,590,680,985` · machado `770,590,1165,985`.

**Blocos**: `python3 scripts/extract-blocks.py` (prancha 3/4 `assets-src/blocks-sheet-34.png` → atlas + ícones).
`--iso` usa a prancha isométrica antiga; `--out X.png` gera só o atlas (para comparar sem trocar os ícones).

**PWA**: `python3 scripts/make-icons.py` → `public/icon-192.png`, `icon-512.png`.

## Testes no navegador
Playwright e Chromium já estão no ambiente (`require('playwright')`). Com `npm run dev` em segundo plano,
use `window.__game` (ex.: `__game.select(9)`, `__game.startAction()`, `__game.player`). Não encadeie
`pkill` com outros comandos (ver `CLAUDE.md`).
