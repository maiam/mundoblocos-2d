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
| `npm run bench` | Benchmarks de geração/leitura de chunks (`bench/`, `vitest bench`) |
| `npm audit` | Deve mostrar 0 vulnerabilidades (a Hostinger também verifica as dependências do repositório) |
| `npm run build` | Typecheck + `dist/` estático (`base: './'`, qualquer subcaminho/CDN; inclui PWA) |
| `npm run build:artifact` | `dist/` → `artifact/mundoblocos.html` (código embutido, sem esqueleto `<html>`) + imagens em `artifact/mundoblocos-assets/` + mapa `artifact/mundoblocos-files.json` (ADR 0013) |
| `npm run build:artifact:santuario` | build com `VITE_WORLD=santuario` → `artifact/santuario.html` + `-assets/` + `-files.json` |

## Artifacts (versões jogáveis, privadas — compartilhar pelo menu Share)
| Mundo | URL | Atualizar |
|---|---|---|
| Principal | https://claude.ai/artifact/FKYk57NzSCjDA4rQH2RgLn | `npm run build:artifact` → publicar `artifact/mundoblocos.html` com `files` = conteúdo de `artifact/mundoblocos-files.json` |
| Santuário Celestial | https://claude.ai/artifact/AMGLa2gvXUbqpvjCVWR4gb | `npm run build:artifact:santuario` → publicar `artifact/santuario.html` com `files` de `artifact/santuario-files.json` |
- Rode **o build de cada mundo antes de publicá-lo** (os dois usam `dist/`). No dev: `?mundo=santuario`.
- Site próprio: ver "Hospedagem própria" abaixo (`orvalis.pensamentos.online`); o jogo reconhece o Santuário pelo hostname (`santuario.`).

## Hospedagem própria — `orvalis.pensamentos.online` (Hostinger)
Endereço **provisório** até o domínio próprio do Orvalis (ADR 0015: sem maiamapps): subdomínio de `pensamentos.online`,
na Hostinger. Site estático: nenhum servidor aqui; o servidor do jogo será outro app num subdomínio próprio
`orvalis-servidor.pensamentos.online`, publicado do repositório `maiam/orvalis-servidor` (app web Node.js na Hostinger,
Node 22, entrada `server.js`, sem build; porta de `PORT`). WebSocket de entrada **validado** em 2026-11-04 (página de
teste em `/`, saúde em `/saude`, eco em `/ws`). O app do jogo continua app Node.js (preset Vite) por causa do build
automático a cada merge.

**Multiplayer: mudou `src/net/` ou `src/world/`?** `npm run build:net` aqui → no servidor `npm run sync-net --
../mundoblocos-2d` → PR no servidor. Mudança incompatível de mensagem: suba `PROTOCOL_VERSION` e publique jogo e
servidor juntos (versões diferentes recebem "recarregue a página").

**Publicação pelo GitHub (forma principal)**: a Hostinger compila o repositório a cada push na branch escolhida.
Configuração no hPanel (conferida com build limpo `npm ci && npm run build` em Node 22):

| Campo | Valor |
|---|---|
| Configuração predefinida | Vite |
| Branch | `main` (publicar = mesclar o PR da entrega em `main` após a Verificação passar — `CONVENTIONS`) |
| Versão do Node | 22.x |
| Diretório raiz | `./` |
| Comando de construção | `npm run build` (typecheck + build) |
| Gerenciador de pacotes | npm (usa o `package-lock.json`) |
| Diretório de saída | `dist` |
| Variáveis de ambiente | nenhuma — **não** defina `VITE_WORLD` (sem ela, o site traz os dois mundos e escolhe pelo endereço) |

**No ar desde 2026-11-03** (conferido de fora: HTTPS, LiteSpeed; `index.html` com `no-cache`, `assets/` com cache de
1 ano, manifesto como `application/manifest+json`, `.htaccess` inacessível (403); jogo, celular e Santuário sem erros).
A Hostinger também lista vulnerabilidades das dependências do repositório: mantenha `npm audit` em 0.

**Pacote manual (alternativa)**: `npm run pack:site` → `npm run build` (sem `VITE_WORLD`: os dois mundos, escolhidos pelo endereço) e
`orvalis-site.zip` na raiz do repositório (não versionado) com o **conteúdo** de `dist/`: `index.html`,
`manifest.webmanifest`, ícones, `.htaccess` (tipos MIME e cache: página `no-cache`, arquivos com hash 1 ano) e `assets/`.

**Primeira vez (hPanel)**:
1. **Sites** → `pensamentos.online` → **Painel** → menu **Domínios** → **Subdomínios**: criar `orvalis`. Deixe a
   pasta padrão (`public_html/orvalis`, ou `domains/pensamentos.online/public_html/orvalis` conforme o plano).
   Se o DNS de `pensamentos.online` **não** usa os nameservers da Hostinger, crie também um registro **A** `orvalis`
   apontando para o IP do servidor (hPanel → Painel → "Detalhes do plano"/IP).
2. **Arquivos** → **Gerenciador de Arquivos** → abrir a pasta do subdomínio → apagar o `default.php`/`index.php` de
   boas-vindas, se existir → **Enviar** `orvalis-site.zip` → clicar com o botão direito → **Extrair** aqui (os arquivos
   devem ficar direto na pasta, com `index.html` na raiz dela) → apagar o `.zip`.
3. **Segurança** → **SSL**: conferir/instalar o certificado grátis para `orvalis.pensamentos.online` (pode levar
   alguns minutos até horas) e ativar **Forçar HTTPS**. HTTPS é necessário para instalar como app.
4. Santuário (opcional): criar o subdomínio `santuario.orvalis` apontando para a **mesma** pasta (o jogo abre o
   Santuário pelo primeiro nome do endereço). Sem ele, `https://orvalis.pensamentos.online/?mundo=santuario` funciona.
5. Conferir: abrir no celular (deitado), jogar, recarregar (continua salvo), instalar na tela inicial.

**Atualizar**: `npm run pack:site` → no Gerenciador de Arquivos, apagar a pasta `assets/` e o `index.html` antigos →
enviar e extrair o zip novo. (Arquivos velhos em `assets/` não atrapalham, só ocupam espaço.)

**Testar antes de enviar**: `cd dist && python3 -m http.server` e abrir `http://localhost:8000` (e `?mundo=santuario`).

## Pipeline de arte
### Personagem modular (contrato v02, ADR 0017)

Regras: `assets-src/personagens/CONTRATO.md`. A arte publica em `humano-chibi/entrega/v02/` e atualiza
`humano-chibi/catalogo.json`; `_trabalho/` e `_arquivo/` (Krita, ORA, v01) ficam só no computador (fora do git —
manter cópia em nuvem).

```bash
python3 scripts/export-personagem.py                          # valida a entrega (erro = sai com código 1)
python3 scripts/export-personagem.py --out /tmp/chibi-export  # valida e exporta WebP + manifesto.json
```

Teste no jogo: `python3 scripts/export-personagem.py --out src/assets --prefixo chibi-` (regrava as folhas
`chibi-*.webp` + `chibi-manifesto.json`; não rodar `optimize-assets.py` nelas, já saem em WebP) e abrir
`http://localhost:5173/?seed=42&personagem=chibi&tronco=colete-verde&pernas=calca-ardosia&pes=sapatos-couro`.

Precisa de Pillow com WebP (sem numpy). Valida tamanho das folhas, pixels fora da caixa da ação, partes/encaixes
desconhecidos, contato dos pés e prévias ≤ 1 MB. Peça nova ou revisada só vai ao jogo depois de passar no validador e ser reexportada para `src/assets/`.

Sempre: gerar PNG em `src/assets/` → `python3 scripts/optimize-assets.py` (converte para WebP q84/alfa q85 e apaga os
PNG; `--recompress` regrava no nível atual os WebP de sprite ≥ 60 kB). Depois, **importar o asset no pacote do mundo**
(`src/render/art/principal.ts` ou `santuario.ts`, ADR 0010) — é o único lugar que importa imagens (como URL, ADR 0013).

**Artefatos**: `npm run build:artifact` (fixa `VITE_WORLD=principal`) e `npm run build:artifact:santuario`; cada um
só leva a arte do seu mundo, em arquivos ao lado da página (ADR 0013). Gere o build de um mundo imediatamente antes de publicá-lo (mesmo `dist/`).

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
$P assets-src/heroine-sword-attack-sheet.png src/assets/heroine-sword-attack.png --alpha --largest --frame-h 144
$P assets-src/heroine-axe-attack-sheet.png   src/assets/heroine-axe-attack.png   --alpha --largest --frame-h 144
$P assets-src/heroine-hoe-attack-sheet.png   src/assets/heroine-hoe-attack.png   --alpha --largest --frame-h 144
$P assets-src/heroine-shovel-attack-sheet.png src/assets/heroine-shovel-attack.png --alpha --largest --frame-h 144
# porta de carvalho (4×2, 0–3 abrindo, 4–7 fechando); geometria em textures.ts (DOOR_*)
$P assets-src/oak-door-sheet.png src/assets/oak-door.png --alpha --largest --cols 4 --rows 2 --frame-h 120
# picareta: quadros transbordam a grade (picareta erguida sobe, pés descem) → --respace
$P assets-src/heroine-pickaxe-attack-sheet.png src/assets/heroine-pickaxe-attack.png --alpha --largest --respace 40 --frame-h 144
$P assets-src/goddess-float-sheet.png  src/assets/goddess-float.png --cols 7 --rows 4 --region 130,0,1470,1000 --rows-map 0,3,1,2 --frame-h 160 --sat 16 --min 228
```
`--largest`: mantém só o maior pedaço por quadro (fragmentos de quadros vizinhos); `--alpha`: folha já transparente (usa o alfa); `--grid-offset-y`: sobe a grade quando o desenho invade a linha de cima
(foi o caso da folha de caminhada da Deusa, hoje só referência: `--alpha --frame-h 160 --grid-offset-y 22`).

**Cavalo**: `$P assets-src/horse-sheet.png src/assets/horse.png --alpha --largest --frame-h 112`

**Vaca e galinha**: `$P assets-src/animals/cow.png src/assets/cow.png --alpha --largest --frame-h 112` e
`$P assets-src/animals/chicken.png src/assets/chicken.png --alpha --largest --frame-h 96` (o ruído vermelho do fundo
da galinha some com `--largest`).

**Pranchas de crescimento** (árvores e cacto, grade 4×2 transparente em `assets-src/trees/<nome>.png`):
`python3 scripts/extract-trees.py` → `tree-<nome>.png` (quadros de 192 px, mesma escala dentro da prancha, base no pé)
+ ícones das mudas e da maçã → `optimize-assets.py`. A grade da prancha não precisa ser exata: o script separa os 8
desenhos por pedaços conectados (copas que cruzam a divisa vêm inteiras) e descarta o ruído do fundo.

**Interiores** (`assets-src/interiors/<id>.png`, imagem inteira = cômodo): `python3 scripts/extract-interiors.py
[--grid <png>]` → `interior-<id>.png` a 64 px por célula (grade de `InteriorDef.map`) → `optimize-assets.py`. A prévia
`--grid` pinta de vermelho as células bloqueadas e de azul o capacho, para conferir o mapa sobre a arte.

**Moradores e roupas** (`assets-src/villagers/villager-*-sheet.png` e `outfit-*-sheet.png`, 4×4 transparentes):
`python3 scripts/extract-villagers.py [--preview <png>]` → `villager-*.png` + `outfit-*.png` na mesma grade/escala
(a roupa perde a cabeça careca) → `optimize-assets.py`. A prévia mostra cada morador com cada roupa.
O mesmo script gera as **expressões** (`assets-src/expressions/`, 16 rostos × frente/esquerda/direita) → `expr-<id>`,
`expr-<id>-fx` e `villager-<cabelo>-bangs`; `--expr-preview <png>` mostra as 16 expressões em cada personagem. Folha de
expressão nova com outro molde: medir de novo `CALIB` (escala e deslocamento da expressão 0 até o morador loiro).

**Crescimento do trigo** (estágios de tamanhos diferentes, ancorados pela base):
`python3 scripts/process-crop.py assets-src/wheat-growth-sheet-v2.png src/assets/wheat-crop.png 128`

**Blocos do Santuário** (prancha 3/4 transparente 6×3): `python3 scripts/extract-blocks.py --celestial` →
`celestial-atlas.png` + `icon-celestial-*.png` (ordem = `CELESTIAL_BLOCKS`). `slice-icons.py` recorta ícones de
qualquer prancha em grade, se precisar.

**Ícones** (`--cols 1 --rows 1 --frame-h 64`):
- Trigo (`wheat-icons-sheet.png`, `--sat 50 --min 190`): semente `45,210,310,402` · trigo `645,555,905,835`.
- Ferramentas (`tool-icons-sheet.png`, `--sat 34 --min 175`): espada `75,105,455,490` · enxada `535,105,915,490` ·
  picareta `995,105,1375,490` · pá `285,590,680,985` · machado `770,590,1165,985`.

**Dungeon** (montanhas, pedras, blocos, 3 aranhas; fontes `assets-src/dungeon-*-sheet.png` e `spider-*-sheet.png`):
`python3 scripts/extract-dungeon.py` e depois `optimize-assets.py` (gera também `dungeon-walls`, os cubos de parede). Caixas de cada prancha e modo de recorte
(alpha/light/dark) estão no fim do script; a aranha gigante usa a prancha de 2172 px (o retrato à esquerda é ignorado). Também gera os ícones dos espólios
(`spider-loot-icons-sheet.png` → `icon-silk/fang/queen-heart`) e as mortes (`spider-*-death-sheet.png` →
`spider-*-death.png`; o script imprime a `ratio` que vai em `SheetSpec.death`).

**Água** (`assets-src/water-block.png`, `water-flow-sheet.png`): `python3 scripts/extract-water.py` →
`water-top` (chão) e `water-flow` (4 direções × 4 quadros, recortes do destino no fim do script) → `optimize-assets.py`.

**Fogueira, caldeirão e forno** (`assets-src/campfire.png`, `cauldron.png`, `oven.png`, transparentes):
`python3 scripts/extract-craftables.py` → `icon-block-<nome>` (64×64) + `<nome>` (sprite 128 px de largura; a largura em
células fica em `CRAFT_PROPS`, `render/textures.ts`) → `optimize-assets.py`.

**Interface, tenda e Tábua** (`assets-src/ui-*.png`, `tent.jpg`, `oak-planks-cube.png`): `python3 scripts/extract-ui.py`
→ `icon-ui-character/skills/builder`, `icon-block-tent` + `tent`, e substitui a coluna da Tábua no `blocks-atlas`
(rode **depois** de `extract-blocks.py`, que regeneraria a coluna antiga) → `optimize-assets.py`.

**Variações de pedra** (`assets-src/stone-variants-34.png`, 4×2 transparente): `python3 scripts/extract-stones.py`
→ ícones `icon-block-stone*` e colunas 5 (Pedra Bruta) e 8–14 do `blocks-atlas` (rode **depois** de
`extract-blocks.py` e `extract-ui.py`) → `optimize-assets.py`. Ordem total: blocks → ui → stones → optimize.

**Cidade — arte em imagem** (pranchas em `assets-src/town/*.png`, transparentes ou com fundo liso): `python3
scripts/extract-town.py [--only nome1,nome2] [--preview arquivo.png]` → `src/assets/town-<nome>.png` → `optimize-assets.py`. Cada objeto é
uma linha de `OBJECTS` (prancha, recorte em px, encaixe `('base', células, linha)` ou `('full', células)`, área,
remover fundo). Escala única de 48 px/célula, centro da área no centro da imagem; legendas/setas somem (só ficam as
partes grandes). A prévia desenha a área de cada objeto sob ele para conferir. Novo nome → registrar em
`render/art/principal.ts` (`town`) e em `IMAGE_ART` de `render/townArt.ts`. Uma imagem **por tamanho** de construção.

**Terra com Grama** (`assets-src/grass-variants-34.png`, 3 cubos lado a lado): `python3 scripts/extract-grass.py` →
coluna 1 (variação 1) e colunas extras 15–16 do `blocks-atlas` + `icon-block-grass` (rode **depois** de
`extract-blocks.py`, `extract-ui.py` e `extract-stones.py`) → `optimize-assets.py`. Ordem total: blocks → ui → stones →
grass → optimize. Colunas extras de um material: `MATERIAL_VARIANT_COLS` em `render/textures.ts`.

**Blocos**: `python3 scripts/extract-blocks.py` (prancha 3/4 `assets-src/blocks-sheet-34.png` → atlas + ícones).
`--iso` usa a prancha isométrica antiga; `--out X.png` gera só o atlas (para comparar sem trocar os ícones).

**PWA**: `python3 scripts/make-icons.py` → `public/icon-192.png`, `icon-512.png`.

## Testes no navegador
Playwright e Chromium já estão no ambiente (`require('playwright')`). Com `npm run dev` em segundo plano,
use `window.__game` (ex.: `__game.select(9)`, `__game.startAction()`, `__game.player`). Não encadeie
`pkill` com outros comandos (ver `CLAUDE.md`).
