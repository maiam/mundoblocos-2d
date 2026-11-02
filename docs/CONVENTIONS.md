# Convenções

## Código
- TypeScript estrito, ES modules, sem framework. Identificadores em inglês; UI, comentários e docs em pt-BR.
- Coordenadas: `x` → direita, `y` → **baixo na tela** (= sul). Unidade = célula; px de mundo = célula × `TILE`.
  A câmera nunca rota: direção de tela = direção do mapa (joystick e teclado usam o mesmo vetor).
- Conversão célula↔chunk **sempre** via `world/coords.ts`.
- Aleatoriedade do mundo só pela seed (`random.ts`/`noise.ts`); `Math.random()` só em efeitos e IA de NPC.
- Movimento/animação dependentes de tempo usam `dt` (nunca "por frame").
- Testes em `src/**/*.test.ts` (Vitest, Node); benchmarks em `bench/`.

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
  Em retrato no toque o jogo fica bloqueado (`ScreenMode.blocked`).
- Elemento com `display` próprio que usa `hidden` precisa de `[hidden] { display: none }` explícito.
- Controles na tela só em toque (`@media (hover: hover) and (pointer: fine)` esconde).

## Arte e assets
- Estilo: ilustração de fantasia RPG/anime; sombras puxam para índigo, luz de cima-esquerda, contornos
  coloridos, brilhos em estrela.
- Folhas 4×4 na ordem frente, esquerda, direita, costas (`--rows-map` normaliza; `m` espelha); quadros com a
  mesma ancoragem (pés na base). Ajustar `--sat/--min` quando a sombra do desenho for escura/saturada.
- Blocos novos: cubo na prancha **3/4** (topo + frente, mesmo enquadramento) + entrada em `MATERIALS` na mesma
  ordem dos nomes de `extract-blocks.py`.
- Sprites de objeto: `ox/oy` relativos ao canto da célula; base do sprite = base da célula (ordenação por linha).
  Cubos: topo `TILE`, frente `CUBE_FRONT`.
- `src/assets/*.webp?inline` só é importado nos pacotes de arte (`render/art/principal.ts`, `santuario.ts`): arte nova
  entra no pacote do mundo que a usa. Depois de gerar PNG, rodar `scripts/optimize-assets.py`.
- Originais ficam em `assets-src/` (versionados) e os comandos de processamento em `OPERATIONS.md`.

## Documentação
- Documentos descrevem o **estado atual**; histórico vai para CHANGELOG/ADRs.
- Toda entrega atualiza CURRENT_STATE, NEXT_STEPS e CHANGELOG; mapas (`MAPS.md`) acompanham mudanças de fluxo.
