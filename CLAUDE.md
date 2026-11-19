# Instruções para agentes de IA — Orvalis (repositório mundoblocos-2d)

Este arquivo é a porta de entrada para qualquer IA que trabalhe no repositório (Claude Code e outros; o
`AGENTS.md` aponta para cá). O projeto é tratado como **sistema vivo**: a documentação em `docs/` é memória
operacional e faz parte da entrega.

## 1. Antes de mexer em código
1. Leia, nesta ordem: `docs/README.md` (índice) → `docs/PROJECT_CONTEXT.md` → `docs/CURRENT_STATE.md` →
   `docs/ARCHITECTURE.md` → `docs/CONVENTIONS.md` → `docs/NEXT_STEPS.md`.
2. Abra o documento do domínio afetado em `docs/domains/` e o mapa correspondente em `docs/MAPS.md`
   (seção 8, "Onde mexer para…", aponta os arquivos de cada tipo de tarefa).
3. Declare ao usuário: documentos lidos, domínios impactados, fontes de verdade e restrições relevantes.
4. Faça um plano curto; só então implemente.

## 2. Invariantes (não quebrar)
- **Sem backend neste repositório.** O Orvalis é independente do maiamapps (ADR 0015): multiplayer, contas e nuvem
  pertencem ao **backend do Orvalis**, em repositório separado (subdomínio de `pensamentos.online` até o domínio
  próprio). Nunca chame `maiamapps`. Documente dependências do servidor em `NEXT_STEPS.md`.
- **Fontes de verdade:** mapa e regras de pisar/colocar/quebrar/plantar → `World` (`src/world/world.ts`);
  terreno não editado → `WorldGenerator` (função pura da seed); propriedades de bloco → `world/blocks.ts`;
  itens/ferramentas/drops → `world/items.ts`; números de vida, dano, atributos e progressão → `world/progression.ts`;
  aparência → `src/render/`.
- `src/world/` **não usa DOM nem `Math.random()`** (testável em Node, determinístico por seed).
- **Multiplayer** (ADR 0016): `src/net/` e `world/actions.ts` são compartilhados com o servidor — sem DOM; mensagem
  incompatível → suba `PROTOCOL_VERSION`. Ação que muda o mapa só vale quando o servidor confirma (`applied`).
  Bichos e moradores da sala (ADR 0021, 0034; v0.93.117): a sala roda as mesmas `game/entities.ts` (e tudo o que ela importa vai para o servidor:
  sem DOM nem arte); na sala o aparelho só espelha (`CreatureMirror`) e golpe/comida passam pela sala.
- **Grade fina (ADR 0032):** toda coordenada em células depende de `SUBDIV` (`config.ts`; padrão `DEFAULT_SUBDIV = 2` desde a F7 (v0.93.59; troca **no jogo e no servidor juntos**; o Santuário também usa 2 desde a v0.93.134)). Dado que sai da sessão (salvamento v16, `RoomSnapshot` v5, `hello`) carrega `sub`; a migração é de `world/subdiv.ts` (só aumenta a grade; arquivo de grade mais fina não é aberto nem sobrescrito). Constante nova em células → multiplique por `SUBDIV` (jogabilidade) ou use `objectScaleFor` (arte).
- `src/render/` só **lê** o mundo. Regra de ação do jogador fica no `ActionController` por célula
  (`canUseAt/canBreakAt/applyUse`), delegando ao `World`; cursor e botão de ação só escolhem a célula.
- **Arte por mundo:** imagens só são importadas em `src/render/art/<mundo>.ts` (ADR 0010), como URL — viram arquivos
  separados no Artifact (ADR 0013); nunca importe arte direto em módulos de render. **Nunca leia um canvas**
  (`toDataURL`/`getImageData`): com imagens em outro arquivo a leitura pode ser bloqueada. Orçamento: o que o jogo
  espera para começar < 3 MB (o build avisa); arte de outras regiões carrega em segundo plano (`loadDungeonArt`) e
  folhas de personagem/monstro só baixam quando o ator aparece (`SpriteSheet.request`).
- Toda entidade que anda estende `Walker`; colisão com o mapa sempre via `World.standHeight`.
- Jogo **horizontal**; layout deve caber em paisagem com ~360 px de altura e respeitar safe-area.
- Arte nova: folhas 4×4 na ordem frente, esquerda, direita, costas (NPCs: folha pronta em `assets-src/npcs` + retrato, `docs/domains/npc.md`); blocos novos em prancha **3/4**. Personagens prontos: folhas por ferramenta/golpe (`docs/OPERATIONS.md`). **Texturas
  sempre na direção desenhada**: nunca girar/espelhar blocos ou chão por célula (variedade = variações enviadas).
- **Cidade do Despertar** (`world/town.ts`, ADR 0012): igual em toda seed (semente própria); área protegida (nada
  quebra/coloca); início/renascer sem tenda = `town.start`. Testes que constroem perto do início usam
  `World.outsideGate()`. Mudar `buildTown` muda a cidade de todos: rode `town.test.ts`.
- **Dungeon:** área de `world/dungeon.ts` é protegida pelo `World` (`isProtected`: nada quebra/coloca) e monstros
  nunca saem do interior (`Monster.insideAt`). Mudar `buildDungeon`/`planDungeon` muda o mapa das seeds: rode os testes.
- **Interiores** (`world/interiors.ts`, ADR 0014): cômodos isolados do mesmo `World` em coordenadas fixas ao norte,
  protegidos; mapa lógico (`#`/`.`/`E`) sobre a arte; entrar pela rua diante da porta, sair pelo capacho.
- **Salvamento:** estado que deve persistir passa por `game/save.ts` (ADR 0011); mudou o formato → suba
  `SAVE_VERSION`. Nada de backend aqui: nuvem é do backend do Orvalis.
- **Render do Mundo (ADR 0031, v0.93.105):** o Mundo principal e o Santuário usam **só** o renderer **2.5D em WebGL** (`render/worldThreeRenderer.ts` (o `sanctuaryThreeRenderer.ts` do Santuário Celestial antigo foi removido na v0.93.133, ADR 0036), núcleo em `render/three/`, `RenderOptions`/`GameRenderer` em `render/rendererContract.ts`). **O Canvas 2D foi removido** (`render/renderer.ts` apagado; `?render=2d` não faz nada): sem WebGL o `main.ts` mostra um aviso em vez de abrir. O jogador não sobe em cubos sozinho (`?fisica=degrau` desfaz). Desenhos compartilhados com a camada 2D do 3D ficam num lugar só (`selectionFx`, `dungeonFx`, `doorAnim`, `groundFxMath`). A sala (servidor) não simula o movimento do jogador; mexer em `game/monster.ts`/`entities.ts` exige `build:net` + `sync-net`.
- **Blocos de 1/4 (ADR 0033, v0.93.76):** no Mundo principal todo bloco tem 1/4 de célula e empilha até 4 (`CUBE_LEVELS`); `z`/`standHeight` do `World` são em **níveis**, `visualZ` em células (`/ cubeLevels`); altura nova → `cubeLevels`, nunca 1 nível = 1 célula; paredes e Santuário (`cubeLevels = 1`) ficam fora. Mudou a regra → `SAVE_VERSION`/`ROOM_SNAPSHOT_VERSION`/`PROTOCOL_VERSION`.
- **Titã** (ADR 0039, v0.94.0): `?mundo=titan` é um **motor voxel à parte** em `src/titan/` (volume por `(x, y, z)`, Y −64..319, sem `World`/`SUBDIV`/`SaveStore`); fonte de verdade = `TitanVolume` sobre `TitanGenerator`. Mudou qualquer regra do gerador → suba `GENERATOR_VERSION` (partida antiga continua na versão dela); save em IndexedDB (`titan/save.ts`) com `TITAN_SAVE_VERSION`. Inventário, fragmentos e lanterna: ADR 0040 (`titan/inventory.ts`, `actions.ts`, `light.ts`); `generatorFor` mantém as versões antigas. Ciclo de céu: ADR 0041 (`titan/sky.ts`; a luz do dia é um uniform do shader, nunca grave luz ambiente nos vértices: `col` = sombreado, `glow` = lanterna). Interação: ADR 0042 (`titan/gesture.ts`: toque curto coloca, segurar quebra, uma ação por pressão; nunca reintroduza quebra instantânea nem leia o tempo só do quadro — confira no `release`). Receitas, Mesa de Trabalho, brasa e junco: ADR 0045 (`GENERATOR_VERSION` 4, `TITAN_SAVE_VERSION` 4; a cápsula, id 7, só existe em saves antigos e vira brasa na migração; fabricação sempre por `titan/recipes.ts` + `Inventory.tryCraft`, nunca débito e resultado em passos separados). Bancada 3 × 3 (ADR 0049): grade própria no inventário (`BENCH_*`), quantidades exatas pelo catálogo (`matchBench`), retirada atômica e revalidada a cada toque, devolver ao fechar — grade 3 × 3 é a única (ADR 0050): prévia por `previewCells`, Mesa só exigida em `takeBenchResult(at)`; as posições 36–39 só leem saves antigos. Céu em shader (ADR 0048): bruma, estrelas e Saturno raro são uniforms da cúpula (`render/titanSkyDome.ts` + `titan/sky.ts`, nunca remalhe por causa da hora); `?hora=crepusculo` e `?saturno=1` para teste. Bolsa de 9 + 27 e livro de receitas numa tela só: ADR 0047 (`TITAN_SAVE_VERSION` 5; use as constantes `HOTBAR`/`BAG`/`SLOTS` de `titan/inventory.ts`, nunca 7/24/31; o inventário gravado é `v: 2` e o formato antigo migra por seção em `Inventory.fromData`). Laje de Rocha (meia altura): ADR 0046 (`blockHeight`/`isFull` em `titan/voxel.ts`; colisão, degrau de 0,5 m, mira e malha leem a altura — nunca trate a laje como cubo inteiro). Veios e lascas soltas: ADR 0044 (gerador v3 = veios como blocos 8/9; `GENERATOR_VERSION` 3; drops em `header.drops`, `TITAN_SAVE_VERSION` 3; nunca recrie a fonte ao recolocar bloco; o corpo do Titã bloqueia seleção de texto). Detalhes: `docs/domains/titan.md`.
- **Vários mundos, um motor:** diferenças só pelo `WorldProfile` (`world/profiles.ts`). O **Santuário** (ADR 0036, v0.93.134) é
  **solo**, terreno plano **em camadas** (chão + Bloco de Pedra no nível 1 + Grama no nível 2; a Deusa e o resto em cima), **8×8 chunks** (o bloco original `cx −2..1` + a **Fazenda** do heightmap `cx 2..5`, `world/sanctuaryFazenda.ts`, ADR 0037, + o **Vale Goblin** ao norte do original (`cx −2..1`, `cy −6..−3`; canto `cx 2..5`, `cy −6..−3` = VOID), `world/sanctuaryValeGoblin.ts`, ADR 0038; **paisagem única**: toda seed abre igual, pilha de **8** níveis, Deusa nasce na origem), quebrar bloco em 1 s, **82 peças** (38 do conjunto isométrico: 4 cubos, 28 objetos — incluindo as **12 árvores** bétula/cerejeira/macieira/carvalho × 3 tamanhos, `ISO_TREE_SET`, v0.93.156 — e 6 cercas/portões em 3D; + 42 blocos do Mundo; + 2 pincéis do **Rio das Fadas**, `world/rio.ts`: o mapa guarda só o pincel e a peça de água é escolhida no desenho pelos vizinhos; **+ 5 sementes/vegetais infinitos** (trigo, cenoura, batata, tomate; `WorldProfile.crops`, v0.93.151): plantam sobre um cubo de **Terra Arada** no topo da pilha); essas regras são **só do Santuário** (`WorldProfile.breakSeconds`/`surfaceObjects`/`terrain.layers`; seeds de `LANDSCAPE_SEEDS` em `world/sanctuaryLandscape.ts` abrem com paisagem fixa) (`ISO_BLOCKS`, arte em `render/art/santuario.ts`), só a Deusa e câmera **isométrica fixa**; o Santuário Celestial antigo (18 blocos, nuvem) foi removido — não misture conteúdo entre mundos.

## 3. Comandos
```bash
npm run dev                 # http://localhost:5173/?seed=42  (window.__game exposto só no dev)
npm test                    # Vitest (domínio + entidades)
npx tsc --noEmit            # typecheck
npm run bench               # benchmarks de geração/leitura de chunks
npm run perf:cpu:3d         # custo de JS por quadro; leak:3d = vazamento ao atravessar o mapa
#   ?fps=1 mostra o painel de desempenho (toque copia o relatório); ?fisica=degrau devolve o degrau
npm run build:artifact      # mundo principal → artifact/mundoblocos.html + -assets/ + -files.json (publicar com files, mesma URL)
python3 scripts/optimize-assets.py   # SEMPRE após gerar sprites/atlas (PNG → WebP q84); --recompress regrava WebP grandes
```
Pipeline completo de assets: `docs/OPERATIONS.md`.

## 4. Armadilhas já vividas (evite repetir)
- **Não encadeie `pkill -f vite` com outros comandos** no mesmo shell: o processo do shell morre (exit 144) e
  o resto não roda. Suba o dev server em segundo plano numa chamada própria e encerre-o separadamente.
- Elemento com `display` próprio + atributo `hidden` precisa de `[hidden] { display: none }` explícito
  (já houve camada invisível bloqueando toques).
- Folhas de sprite chegam com **ordem de linhas diferente**: confira visualmente e use `--rows-map`
  (`m` espelha). Ex.: folhas de ferramenta = `0,3,1,2`; pá = `0,1,1m,2`.
- Remoção de fundo: ajuste `--sat/--min` quando a sombra do desenho for escura/saturada; confira sobre fundo
  colorido antes de usar.
- `Entities.update`: ordem **concluir namoro → parear → iniciar**, senão o namoro reinicia em loop.
- No celular, o canvas ignora `pointerType === 'touch'` (ação só pelo botão); no **tablet** (`ScreenMode.isTablet`) o
  toque age como clique **e** o botão de ação fica; no **Santuário** (`Game.touchActs`, v0.93.150) o toque na tela também coloca/quebra no celular. Testes de toque: celular pelo botão (Santuário e tablet: pelos dois).
- **Zoom do navegador**: o Safari ignora `user-scalable=no`; o `ScreenMode` bloqueia toque duplo/pinça/duplo clique
  (fora de botões e campos) e todo botão usa `touch-action: manipulation`. Toda captura de ponteiro trata
  `lostpointercapture` como fim do toque (senão o botão fica "apertado" e ignora os próximos toques).
- Tela cheia em toque (`ScreenMode`): nunca pedir tela cheia ao tocar num campo de texto (o teclado sai da tela cheia
  e pedir de novo fecha o teclado em loop).
- Mudar o gerador muda o mapa de todas as seeds: avise o usuário e rode os testes de determinismo/spawn.
- Folhas que já vêm transparentes: `process-sprite.py --alpha`; se o desenho invade a linha de cima (auréolas,
  asas), `--grid-offset-y`. Confira a "altura do desenho" no relatório: igual à célula = recorte errado.
- Folha de ação com pedaços de quadros vizinhos (relatório "altura do desenho = célula"): use `--largest`; se os
  quadros transbordam a grade para cima e para baixo em colunas diferentes (ex.: picareta), `--respace 40`.
- Combate fica em `Entities` (estado de execução). O que cada ferramenta pode quebrar vem de `TOOLS[tool].breaks`
  (`toolCanBreak` em `world/items.ts`), o toque no chão de `TOOLS[tool].groundUse` e o drop de `toolDrops` — não
  espalhe `if (ferramenta === …)` pelo `Game`.
- Os dois artefatos usam o mesmo `dist/`: gere o build do mundo imediatamente antes de publicá-lo.
- Ao republicar só os assets novos, a chave de `files` é o **nome do arquivo sem pasta** (como em
  `mundoblocos-files.json`, ex.: `materials-v2-XXXX.webp`); com `mundoblocos-assets/` na frente a imagem não carrega (v0.68.0).
- **Nunca use `window.confirm/alert/prompt`**: o iframe do Artifact bloqueia e devolve falso sem mostrar nada (o botão
  "Novo mundo" já parou assim). Confirme na própria UI (ex.: tocar de novo, `Menu.ask`).
- Testes no navegador: Playwright já instalado (`require('playwright')`); use `window.__game` no dev.

## 5. Ao terminar (definição de pronto)
- `npx tsc --noEmit`, `npm test` e, se mexeu em desempenho, `npm run bench` — resumir em uma linha.
- Verificar no navegador (captura de tela) quando a mudança é visual ou de interação.
- Atualizar (`CURRENT_STATE` é retrato do estado atual — edite a seção afetada, sem diário por versão): `docs/CURRENT_STATE.md`, `docs/NEXT_STEPS.md`, `docs/CHANGELOG.md` e, se houver impacto,
  `ARCHITECTURE`, `CONVENTIONS`, `DECISIONS` (+ ADR), `OPERATIONS`, `MAPS`, domínios e `README.md`.
- Republicar o Artifact se o jogo mudou (`npm run build:artifact` + publicar `artifact/mundoblocos.html` com `files`
  = `artifact/mundoblocos-files.json`).
- Commit em pt-BR descrevendo o porquê; push na branch de trabalho.
- **Publicação** (`docs/CONVENTIONS.md` § Commits): entrega pronta → abrir **um PR para `main`** com título de versão →
  esperar a **Verificação** (GitHub Actions) passar → **mesclar automaticamente**, sempre com método *merge* (nunca
  squash). `main` = site no ar (Hostinger publica sozinha). Verificação vermelha: corrigir antes de mesclar.
- Resumo final ao usuário: implementado, arquivos, docs atualizados (e quais não, com motivo), decisões,
  inconsistências encontradas, próximos passos.
