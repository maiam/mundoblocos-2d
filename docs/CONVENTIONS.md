# Convenções

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
- Célula: chão + níveis 0..`MAX_STACK`-1 (3): objeto no nível 0, cubos empilhados acima (só sobre cubo). `AIR` = vazio.
- Material tem **um id** para chão e cubo; "é pisável" via `isGroundStandable`, nunca pelo `layer`.
- Altura de pé/colisão sempre via `World.standHeight` (inclui água, buracos, árvores).
- Mutação só por `World.setObject/placeBlock/breakBlock/plant` (garante `version` e vizinhos).
- Geração: novos campos do mapa entram em `WorldGenerator.cellAt` (uma avaliação de ruído por célula); não
  chamar `groundAt/objectAt/upperAt` em sequência dentro do gerador.
- `BlockId` aceita os estágios do trigo (61–74): usar `isWheat/wheatStage/wheatId`.

## Mundos
- Diferenças entre mundos vêm **só** de campos do `WorldProfile` (`world/profiles.ts`); não espalhar `if (mundo === …)`.
- Mundo limitado: fora dos limites é `VOID`; nada carrega fora (`clampRect`). Blocos colocáveis = `profile.blocks`.

## Jogo
- Regra de ação do jogador por célula no `ActionController` (`canUseAt/canBreakAt/applyUse`), delegando ao `World`; a
  origem do alvo (cursor ou frente da personagem) só escolhe a célula. Não duplicar regra por entrada.
- Itens contáveis em `world/items.ts`; quantidades em `game/inventory.ts`; materiais são infinitos; o que um
  bloco devolve vem de `dropsFor`.
- Toda entidade que anda estende `Walker`; NPCs entram em `Entities`; ocupação de célula via `Entities.occupies`.
- Personagem: posição = centro dos pés; a câmera segue a posição lógica, nunca o sprite.

## Interface
- Jogo **horizontal**: layout cabe em paisagem com ~360 px de altura e respeita `env(safe-area-inset-*)`.
  Em retrato no toque o jogo fica bloqueado (`ScreenMode.blocked`). A página nunca amplia (toque duplo, pinça e duplo clique bloqueados no `ScreenMode`; botões com `touch-action: manipulation`).
- Elemento com `display` próprio que usa `hidden` precisa de `[hidden] { display: none }` explícito.
- Controles na tela só em toque (`@media (hover: hover) and (pointer: fine)` esconde).

## Arte e assets
- **Escala**: ao integrar arte nova, confira-a na cena de escala (`?escala=1`, ADR 0022) ao lado dos personagens, animais e objetos existentes; não mude `TILE`, chunks nem colisão para "consertar" um desenho — ajuste a escala/âncora do sprite.
- **Texturas sempre na direção em que foram desenhadas** (regra do dono do produto, 2026-11-03): chão, cubos e
  construções nunca giram nem espelham por célula — ele planeja a arte contando com essa direção. Para variar, ele
  envia **variações** (ex.: 3 gramas), sorteadas por célula, cada uma na direção desenhada.
  **Exceção — máscaras de transição** (ADR 0023): máscara é **forma** (só alfa), não textura; o script pode girá-la ou
  espelhá-la para cobrir as 47 combinações de vizinhos. A textura que aparece através dela nunca gira.
- **Materiais novos no Padrão V2** (ADR 0023): a arte entrega material plano 128×128 (`top`, `front`, `front_overlay`)
  em `assets-src/materiais/<material>/` pelo `assets-src/materiais/CONTRATO.md`; o motor monta o cubo. Gerar com
  `scripts/build-materials.py`; compor o bloco em `render/materialsV2.ts` (`V2_BLOCKS`). Mistura entre materiais só no
  chão plano e na mesma altura.
- Estilo: ilustração de fantasia RPG/anime; sombras puxam para índigo, luz de cima-esquerda, contornos
  coloridos, brilhos em estrela.
- Folhas 4×4 na ordem frente, esquerda, direita, costas (`--rows-map` normaliza; `m` espelha); quadros com a
  mesma ancoragem (pés na base). Ajustar `--sat/--min` quando a sombra do desenho for escura/saturada.
- **Personagens em camadas** (moradores): personagem de **roupa branca** + folhas de caminhada **só de roupa** na mesma
  grade 4×4; processar todas juntas com `scripts/extract-villagers.py` (mesma escala) e desenhar a roupa por cima.
  **Expressões** em camada: rosto → franja → efeitos → roupa (`render/character.ts`).
  **Ofício = visual único**: personagem e roupa de um ofício (`ROLE_LOOK`) não aparecem em mais ninguém.
- Blocos novos: cubo na prancha **3/4** (topo + frente, mesmo enquadramento) + entrada em `MATERIALS` na mesma
  ordem dos nomes de `extract-blocks.py`.
- Sprites de objeto: `ox/oy` relativos ao canto da célula; base do sprite = base da célula (ordenação por linha).
  Cubos: topo `TILE`, frente `CUBE_FRONT`.
- `src/assets/*.webp?inline` só é importado nos pacotes de arte (`render/art/principal.ts`, `santuario.ts`): arte nova
  entra no pacote do mundo que a usa. Depois de gerar PNG, rodar `scripts/optimize-assets.py`.
- Originais ficam em `assets-src/` (versionados) e os comandos de processamento em `OPERATIONS.md`.
- **Personagem modular** (ADR 0017): seguir `assets-src/personagens/CONTRATO.md`. A arte trabalha em `_trabalho/`
  (fora do git), publica PNGs em `entrega/<versão>/<encaixe>/<peça>/<ação>__<parte>.png` e atualiza `catalogo.json`;
  `scripts/export-personagem.py` valida antes de qualquer commit de arte. `.kra`/`.ora`/autosaves nunca sobem.
  Mudou regra do contrato → atualizar `CONTRATO.md` + `contrato.json` e subir a versão.

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
