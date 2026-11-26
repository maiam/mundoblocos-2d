# Convenções

## Renderização por perfil
- **Mundo principal e Santuário:** renderer 2.5D em WebGL (Three.js) é o **único** (`render/worldThreeRenderer.ts`, `sanctuaryThreeRenderer.ts`; o Canvas 2D foi removido na v0.93.105, ADR 0031 M7). `Game`/`World`/save compartilhados. Desenhos usados também pela camada 2D do 3D (`render/selectionFx.ts`, `dungeonFx.ts`, `doorAnim.ts`, `groundFxMath.ts`) ficam num lugar só. Não duplicar regras de bloco nem importar cenas do laboratório de 5 níveis na engine oficial.
- A célula lógica continua 32×32; no Three cada célula é unidade de 1×1 e a altura física é 1 por camada, no máximo duas camadas. Paredes finas legadas ocupam metade da profundidade da célula; o segundo nível herda seu formato. O mármore V2/V3 foi removido na v0.93.28 (W4): o Mármore Celestial é um cubo comum.

## Código
- TypeScript estrito, ES modules, sem framework. Identificadores em inglês; UI, comentários e docs em pt-BR.
- Coordenadas: `x` → direita, `y` → **baixo na tela** (= sul). Unidade = célula; px de mundo = célula × `TILE`.
  A câmera nunca rota: direção de tela = direção do mapa (joystick e teclado usam o mesmo vetor).
- Conversão célula↔chunk **sempre** via `world/coords.ts`.
- Aleatoriedade do mundo só pela seed (`random.ts`/`noise.ts`); `Math.random()` só em efeitos e IA de NPC.
- Movimento/animação dependentes de tempo usam `dt` (nunca "por frame").
- Testes em `src/**/*.test.ts` (Vitest, Node); benchmarks em `bench/` no formato do Vitest 5: dentro de um `test`, com
  `bench` do contexto (`test('…', async ({ bench }) => { await bench('nome', fn).run(); })`).

## Mundo e regras
- **Autotile de construção no 2D oficial:** apenas os materiais listados em `render/adaptiveWalls.ts`; a geometria é resolvida só pela **base nível 0** (painel fino horizontal entre dois iguais ou porta existente, sem vizinho norte/sul). O bloco no **nível 1 herda a forma** da base (pilar ou parede), não faz autotile independente e conserva seu próprio material/textura. Porta na base funciona como pilar; base ausente ou material não construtivo produz bloco superior maciço. A face frontal nunca recua; topo visual usa a metade frontal. Terreno, rochas naturais, nuvem, pisos e outros objetos ficam maciços.
- **Altura de construção:** 2 níveis (objeto 0 + superior 1). Um terceiro nível de salvamentos antigos não é restaurado: `World.restoreChunk` devolve quantos blocos foram descartados e quem restaura avisa (jogo: aviso na tela; sala: log do servidor).
- Célula: chão + níveis 0..`MAX_STACK`-1 (2): objeto no nível 0, cubos empilhados acima (só sobre cubo). `AIR` = vazio.
- Material tem **um id** para chão e cubo; "é pisável" via `isGroundStandable`, nunca pelo `layer`.
- Altura de pé/colisão sempre via `World.standHeight` (inclui água, buracos, árvores).
- Mutação só por `World.setObject/placeBlock/breakBlock/plant` (garante `version` e vizinhos).
- Geração: novos campos do mapa entram em `WorldGenerator.cellAt` (uma avaliação de ruído por célula); não
  chamar `groundAt/objectAt/upperAt` em sequência dentro do gerador.
- `BlockId` aceita os estágios do trigo (61–74): usar `isWheat/wheatStage/wheatId`.

## Mundos
- Diferenças entre mundos vêm **só** de campos do `WorldProfile` (`world/profiles.ts`); não espalhar `if (mundo === …)`.
- Mundo limitado: fora dos limites é `VOID`; nada carrega fora (`clampRect`). Blocos colocáveis = `profile.blocks`.

## Mundos voxel (Titã e Orvalis em voxel, ADR 0105)
- Um mundo voxel novo **não copia o motor**: implementa `TerrainGen` (`titan/terrain.ts`), ganha um valor em `VoxelWorld`, o próprio banco (`save.ts`), paleta de céu e arte de água, e entra por `startTitan(…, world)`. Conteúdo próprio do Titã (lascas, juncos, nozes, toca, brasa) fica **vazio** no gerador que não o tem; nada de `if (mundo === …)` no motor.
- Bloco novo: id em `T` (suba `T_MAX`), nome em `BLOCK_NAMES`, tiles no **fim** de `tiles.json` + `BLOCK_TILES`, item em `Item`/`blockOfItem`/`itemOfBlock`, tempo em `breaking.ts`, som em `sounds.ts`; ícone → `make-titan-arte32.py`. Mudou qualquer regra de um gerador → suba a versão **dele** (`GENERATOR_VERSION` ou `ORVALIS_GENERATOR_VERSION`).

## Titã: 16 px e isométrica (ADR 0106)
- **O mundo voxel é renderizado a 16 px por face**; a arte-fonte pode ser maior (reduzida pelo script do atlas). Arte nova de terreno entra no atlas de 16 px **e** no de 8 px (o script gera os dois); nunca importe uma textura de mundo direto no renderer.
- **Vista isométrica 2:1:** só `titan/iso.ts` define a câmera (30°, 4 vistas de 90°, `ISO_PX_PER_BLOCK`); renderer e jogo a usam igual. Na isométrica não há *pointer lock*, a ação é no ponto do mouse/dedo (`fingerMode()`), `look()` não gira e `session.yaw` é o giro da câmera. Elemento novo da cena que só existe em uma vista decide por `mode` no renderer, nunca por `if (mundo === …)`.

## Receitas por mundo (ADR 0107) e itens por mundo (ADR 0114)
- **Regra do dono do produto: os itens do Titã e os do Orvalis em voxel não são compartilhados.** Ids de item 1–41 = Titã; 42 em diante = Orvalis; blocos do Orvalis a partir do 90. Receita, bloco, semente, ferramenta e bancada de um mundo não servem no outro; `titan/itensPorMundo.test.ts` barra a mistura. Compartilhar exige decisão nova (ADR).
- `Recipe.world` ausente = Titã; `'orvalis'` = só no Orvalis em voxel. O livro mostra as do `gen.world` aberto. Receita nova de um mundo nasce com o `world` dele; bancada nova entra em `isCraftingTable` (nunca `isWorkbench` sozinho).

## Jogo
- Regra de ação do jogador por célula no `ActionController` (`canUseAt/canBreakAt/applyUse`), delegando ao `World`; a
  origem do alvo (cursor ou frente da personagem) só escolhe a célula. Não duplicar regra por entrada.
- Itens contáveis em `world/items.ts`; quantidades em `game/inventory.ts`; materiais são infinitos; o que um
  bloco devolve vem de `dropsFor`.
- Toda entidade que anda estende `Walker`; NPCs entram em `Entities`; ocupação de célula via `Entities.occupies`.
- Personagem: posição = centro dos pés; a câmera segue a posição lógica, nunca o sprite.

## Interface
- Jogo em **qualquer orientação** (ADR 0030; a vertical é opção do jogador): o layout cabe em paisagem com ~360 px de altura **e** em retrato (~390 × 844), e respeita `env(safe-area-inset-*)`. HUD novo posiciona-se pela variável `--hotbar-h` e testa as duas orientações.
  Em retrato no toque o jogo fica bloqueado (`ScreenMode.blocked`). A página nunca amplia (toque duplo, pinça e duplo clique bloqueados no `ScreenMode`; botões com `touch-action: manipulation`).
- Elemento com `display` próprio que usa `hidden` precisa de `[hidden] { display: none }` explícito.
- Controles na tela só em toque (`@media (hover: hover) and (pointer: fine)` esconde).

## Arte e assets
- **Armas, ferramentas e itens = sprite 2D extrudado de 16 × 16** (ADR 0097, regra do dono do produto): PNG plano de 16 × 16; o jogo cria a malha (frente, verso e só as bordas onde o pixel toca o transparente, 1/16 de espessura; `titan/extrude.ts`), nunca um modelo 3D esculpido nem cubinhos. Cabo no canto de baixo à esquerda (pivô do golpe). Exceção: tridente e besta carregada (caixas finas em 3D). Arte nova começa em 16 × 16; os 32 × 32 antigos seguem até serem redesenhados.
- **Escala**: ao integrar arte nova, confira-a no jogo ao lado dos personagens, animais e objetos existentes (a cena de escala `?escala=1` foi removida com o Canvas 2D, v0.93.105; `docs/assets/escala-referencia.jpg` fica como referência); não mude `TILE`, chunks nem colisão para "consertar" um desenho — ajuste a escala/âncora do sprite.
- **Texturas sempre na direção em que foram desenhadas** (regra do dono do produto, 2026-11-03): chão, cubos e
  construções nunca giram nem espelham por célula — ele planeja a arte contando com essa direção. Para variar, ele
  envia **variações** (ex.: 3 gramas), sorteadas por célula, cada uma na direção desenhada.
  **Exceção — máscaras de transição** (ADR 0023): máscara é **forma** (só alfa), não textura; o script pode girá-la ou
  espelhá-la para cobrir as 47 combinações de vizinhos. A textura que aparece através dela nunca gira.
- **Bloco aposentado não perde o id**: sai das receitas e dos usos do jogo e vai para uma lista (`RETIRED_STONES`), mas o
  id, a definição e a posição em `MATERIALS` (coluna do atlas antigo) ficam, porque mundos e salas salvos podem tê-lo. Não ganha arte V2.
- **Bloco removido de vez** (as antigas paredes, ids 210–225): não sobra definição, receita, arte nem código, mas a faixa de
  ids fica reservada e todo dado que entra (mapa, salvamento, bolsa, baú, rede) passa por `isRemovedBlock`/`isRemovedStack` e
  vira vazio — mundos e salas antigos não podem quebrar. Antes de remover um bloco, ache todas as portas de entrada de ids.
- **Materiais novos no Padrão V2** (ADR 0023): a arte entrega material plano 128×128 (`top`; `front` e `front_overlay`
  opcionais — sem `front` a frente repete o topo; frente de 18 px)
  em `assets-src/materiais/<material>/` pelo `assets-src/materiais/CONTRATO.md`; o motor monta o cubo. Gerar com
  `scripts/build-materials.py`; compor o bloco em `render/materialsV2.ts` (`V2_BLOCKS`). Mistura entre materiais só no
  chão plano e na mesma altura. **Massa contínua:** o contorno de cubos V2 é da silhueta do conjunto, nunca de cada
  cubo — sem riscos entre vizinhos nem entre níveis, nem entre materiais; `front.png` seamless nas 4 bordas.
- Estilo: ilustração de fantasia RPG/anime; sombras puxam para índigo, luz de cima-esquerda, contornos
  coloridos, brilhos em estrela.
- Folhas 4×4 na ordem frente, esquerda, direita, costas (`--rows-map` normaliza; `m` espelha); quadros com a
  mesma ancoragem (pés na base). Ajustar `--sat/--min` quando a sombra do desenho for escura/saturada.
- **NPCs**: cada um é uma folha 4×4 pronta (`assets-src/npcs/<id>.png` → `process-sprite.py --alpha --largest --rows-map 0,3,1,2`) + retrato (`make-portraits.py`); nome e falas só em `game/npcs.ts`. Sem camadas de roupa/rosto.
- Blocos novos: cubo na prancha **3/4** (topo + frente, mesmo enquadramento) + entrada em `MATERIALS` na mesma
  ordem dos nomes de `extract-blocks.py`.
- Sprites de objeto: `ox/oy` relativos ao canto da célula; base do sprite = base da célula (ordenação por linha).
  Cubos: topo `TILE`, frente `CUBE_FRONT`.
- `src/assets/*.webp?inline` só é importado nos pacotes de arte (`render/art/principal.ts`, `santuario.ts`): arte nova
  entra no pacote do mundo que a usa. Depois de gerar PNG, rodar `scripts/optimize-assets.py`.
- Originais ficam em `assets-src/` (versionados) e os comandos de processamento em `OPERATIONS.md`.

## Commits, PRs e publicação (regra do dono do produto, 2026-11-03)
- `main` = **o que está no ar** (a Hostinger publica `orvalis.pensamentos.online` a cada atualização dela).
- Trabalho na branch `feat/mundo-chunks-fantasia`: commits pequenos, em pt-BR, explicando o **porquê**.
- **Um PR para `main` por entrega** pronta (tsc, testes, build e conferência no navegador feitos), com título de versão
  (ex.: "Orvalis v0.37.3: …") e resumo do que muda para o jogador. Correções miúdas podem esperar e ir juntas.
- **Merge automático no fim de cada entrega** (decisão do dono do produto): abrir o PR, esperar a **Verificação**
  (GitHub Actions) passar e mesclar. Verificação vermelha = não mescla; corrigir na branch e repetir.
- Método de merge: **merge** (commit de merge), nunca squash/rebase — a branch de trabalho continua viva e o squash
  criaria divergência e conflitos falsos nas próximas entregas.
- **Verificação** (`.github/workflows/ci.yml`) em todo PR para `main` e em cada atualização dela: `npm ci`, `tsc`,
  testes, `npm run build` (como a Hostinger) e `npm audit --audit-level=moderate`.
- Opcional ainda não adotado: proteção da `main` no GitHub (exigir PR e Verificação verde) — configuração do dono.

## Documentação
- Documentos descrevem o **estado atual**; histórico vai para CHANGELOG/ADRs.
- Arquivos soltos (capturas de tela, rascunhos) não ficam na raiz do repositório: imagens de apoio vão em `docs/assets/`; saídas geradas (`__pycache__`, `dist/`, `artifact/`) ficam no `.gitignore`.
- `CURRENT_STATE` é um **retrato do estado atual** (edite a seção afetada, não acrescente uma seção por versão); o histórico por entrega vai só para o `CHANGELOG`. O diário técnico antigo está em `docs/archive/` e não se atualiza.
- Toda entrega atualiza CURRENT_STATE, NEXT_STEPS e CHANGELOG; mapas (`MAPS.md`) acompanham mudanças de fluxo.
- Estado de jogo novo que deva sobreviver ao recarregar entra em `game/save.ts` (`SaveData` + teste de ida e volta);
  mudar o formato exige subir `SAVE_VERSION`.

## Interface para quem ainda não lê
- Ações e estados importantes usam **ícone + cor** (✓ verde = fazer, ✕ vermelho = voltar, ✓/✗ = tem/falta) com, no
  máximo, uma palavra curta ao lado; o texto completo vai em `title`/`aria-label`. Vale para fichas, avisos de
  requisito e botões novos (v0.57.1).
