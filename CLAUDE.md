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
  Bichos da sala (ADR 0021): a sala roda as mesmas `game/entities.ts` (e tudo o que ela importa vai para o servidor:
  sem DOM nem arte); na sala o aparelho só espelha (`CreatureMirror`) e golpe/comida passam pela sala.
- **Grade fina (ADR 0032):** toda coordenada em células depende de `SUBDIV` (`config.ts`; padrão `DEFAULT_SUBDIV = 2` desde a F7 (v0.93.59; troca **no jogo e no servidor juntos**; o Santuário fica em 1)). Dado que sai da sessão (salvamento v16, `RoomSnapshot` v5, `hello`) carrega `sub`; a migração é de `world/subdiv.ts` (só aumenta a grade; arquivo de grade mais fina não é aberto nem sobrescrito). Constante nova em células → multiplique por `SUBDIV` (jogabilidade) ou use `objectScaleFor` (arte).
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
- **Render do Mundo (ADR 0031, M6, v0.93.47):** o Mundo principal usa o renderer **2.5D em WebGL** por padrão (`render/worldThreeRenderer.ts`, núcleo em `render/three/`, escolha em `render/rendererChoice.ts`); `?render=2d` e aparelhos sem WebGL usam o Canvas 2D (`render/renderer.ts`, reserva até o M7). Com o 3D o jogador não sobe em cubos sozinho (`?fisica=degrau` desfaz). **Mudança visual do Mundo: conferir nos dois** e manter os desenhos compartilhados (`selectionFx`, `dungeonFx`, `doorAnim`, `groundFxMath`) num lugar só. A sala (servidor) não simula o movimento do jogador; mexer em `game/monster.ts`/`entities.ts` exige `build:net` + `sync-net`.
- **Vários mundos, um motor:** diferenças só pelo `WorldProfile` (`world/profiles.ts`). O Santuário Celestial é
  limitado a 10 chunks e aceita os 18 blocos celestiais, as paredes autotile + porta de parede (ADR 0027) e só a Deusa — não misture conteúdo entre mundos.

## 3. Comandos
```bash
npm run dev                 # http://localhost:5173/?seed=42  (window.__game exposto só no dev)
npm test                    # Vitest (domínio + entidades)
npx tsc --noEmit            # typecheck
npm run bench               # benchmarks de geração/leitura de chunks
npm run parity:3d           # capturas 2D × 3D lado a lado (parity-out/); perf:cpu:3d = custo de JS por quadro; leak:3d = vazamento ao atravessar o mapa
#   ?fps=1 mostra o painel de desempenho (toque copia o relatório); ?render=2d volta ao Canvas 2D; ?fisica=degrau devolve o degrau no 3D
npm run build:artifact      # mundo principal → artifact/mundoblocos.html + -assets/ + -files.json (publicar com files, mesma URL)
npm run build:artifact:santuario   # Santuário → artifact/santuario.html (rode o build do mundo antes de publicá-lo)
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
  toque age como clique **e** o botão de ação fica. Testes de toque: celular pelo botão; tablet pelos dois.
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
