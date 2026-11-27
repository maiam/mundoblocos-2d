# Convenções

Só o motor voxel (Orvalis 3D e Titã). As convenções do 2.5D (renderização por perfil, `World`/`ActionController`, arte 3/4, paredes, SUBDIV) estão em [`archive/2d/CONVENTIONS.md`](archive/2d/CONVENTIONS.md).

## Regras de mundo (ADR 0116, regra do dono do produto)
- **Antes de implementar ou mudar uma regra de mundo:** Minecraft Wiki (funcionamento, fontes, parâmetros) → Orvalis/Titã atuais (código e valores) → proposta (manter, adaptar ou retirar, e por quê) → **pergunta e aprovação**. Sem resposta, não altera. Vale também para o que já está implementado: o que não passou por esse ciclo está **pendente de auditoria** em `AUDITORIA_REGRAS.md`.

## Código
- TypeScript estrito, ES modules, sem framework. Identificadores em inglês; UI, comentários e docs em pt-BR.
- Coordenadas voxel: X leste, Z sul, Y altura (1 bloco = 1 m); coordenada de chunk sempre por divisão com arredondamento para baixo (`chunkOf`, `localOf` em `titan/voxel.ts`).
- Aleatoriedade do mundo só pela seed (`random.ts`/`noise.ts`); `Math.random()` só em efeitos e IA de NPC.
- Movimento/animação dependentes de tempo usam `dt` (nunca "por frame").
- Testes em `src/**/*.test.ts` (Vitest, Node).

## Mundos voxel (Titã e Orvalis em voxel, ADR 0105)
- Um mundo voxel novo **não copia o motor**: implementa `TerrainGen` (`titan/terrain.ts`), ganha um valor em `VoxelWorld`, o próprio banco (`save.ts`), paleta de céu e arte de água, e entra por `startTitan(…, world)`. Conteúdo próprio do Titã (lascas, juncos, nozes, toca, brasa) fica **vazio** no gerador que não o tem; nada de `if (mundo === …)` no motor.
- Bloco novo: id em `T` (suba `T_MAX`), nome em `BLOCK_NAMES`, tiles no **fim** de `tiles.json` + `BLOCK_TILES`, item em `Item`/`blockOfItem`/`itemOfBlock`, tempo em `breaking.ts`, som em `sounds.ts`; ícone → `make-titan-arte32.py`. Mudou qualquer regra de um gerador → suba a versão **dele** (`GENERATOR_VERSION` ou `ORVALIS_GENERATOR_VERSION`).

## Titã: 16 px e isométrica (ADR 0106)
- **O mundo voxel é renderizado a 16 px por face**; a arte-fonte pode ser maior (reduzida pelo script do atlas). Arte nova de terreno entra no atlas de 16 px **e** no de 8 px (o script gera os dois); nunca importe uma textura de mundo direto no renderer.
- **Vista isométrica 2:1:** só `titan/iso.ts` define a câmera (30°, 4 vistas de 90°, `ISO_PX_PER_BLOCK`); renderer e jogo a usam igual. Na isométrica não há *pointer lock*, a ação é no ponto do mouse/dedo (`fingerMode()`), `look()` não gira e `session.yaw` é o giro da câmera. Elemento novo da cena que só existe em uma vista decide por `mode` no renderer, nunca por `if (mundo === …)`.

## Receitas por mundo (ADR 0107) e itens por mundo (ADR 0114)
- **Regra do dono do produto: os itens do Titã e os do Orvalis em voxel não são compartilhados.** Ids de item 1–41 = Titã; 42 em diante = Orvalis; blocos do Orvalis a partir do 90. Receita, bloco, semente, ferramenta e bancada de um mundo não servem no outro; `titan/itensPorMundo.test.ts` barra a mistura. Compartilhar exige decisão nova (ADR).
- `Recipe.world` ausente = Titã; `'orvalis'` = só no Orvalis em voxel. O livro mostra as do `gen.world` aberto. Receita nova de um mundo nasce com o `world` dele; bancada nova entra em `isCraftingTable` (nunca `isWorkbench` sozinho).

## Interface
- Jogo em **qualquer orientação** (ADR 0030; a vertical é opção do jogador): o layout cabe em paisagem com ~360 px de altura **e** em retrato (~390 × 844), e respeita `env(safe-area-inset-*)`. HUD novo posiciona-se pela variável `--hotbar-h` e testa as duas orientações.
  Em retrato no toque o jogo fica bloqueado (`ScreenMode.blocked`). A página nunca amplia (toque duplo, pinça e duplo clique bloqueados no `ScreenMode`; botões com `touch-action: manipulation`).
- Elemento com `display` próprio que usa `hidden` precisa de `[hidden] { display: none }` explícito.
- Controles na tela só em toque (`@media (hover: hover) and (pointer: fine)` esconde).

## Arte e assets
- **Armas, ferramentas e itens = sprite 2D extrudado de 16 × 16** (ADR 0097, regra do dono do produto): PNG plano de 16 × 16; o jogo cria a malha (frente, verso e só as bordas onde o pixel toca o transparente, 1/16 de espessura; `titan/extrude.ts`), nunca um modelo 3D esculpido nem cubinhos. Cabo no canto de baixo à esquerda (pivô do golpe). Exceção: tridente e besta carregada (caixas finas em 3D). Arte nova começa em 16 × 16; os 32 × 32 antigos seguem até serem redesenhados.
- **Escala**: ao integrar arte nova, confira-a no jogo ao lado dos personagens, animais e objetos existentes (a cena de escala `?escala=1` foi removida com o Canvas 2D, v0.93.105; `docs/assets/escala-referencia.jpg` fica como referência); não mude `TILE`, chunks nem colisão para "consertar" um desenho — ajuste a escala/âncora do sprite.
- **Texturas sempre na direção em que foram desenhadas** (regra do dono do produto, 2026-11-03): chão, cubos e
  em `assets-src/materiais/<material>/` pelo `assets-src/materiais/CONTRATO.md`; o motor monta o cubo. Gerar com
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
  mudar o formato exige subir `SAVE_VERSION`.

## Interface para quem ainda não lê
- Ações e estados importantes usam **ícone + cor** (✓ verde = fazer, ✕ vermelho = voltar, ✓/✗ = tem/falta) com, no
  máximo, uma palavra curta ao lado; o texto completo vai em `title`/`aria-label`. Vale para fichas, avisos de
  requisito e botões novos (v0.57.1).
