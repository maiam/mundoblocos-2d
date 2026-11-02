# Domínio: cultivo e itens

## Ferramentas (`world/items.ts` → `TOOLS`)
- Espada, Enxada, Picareta, Pá, Machado: itens únicos, sem quantidade, equipados ao selecionar.
- **Enxada (ativa):** toque/clique com a enxada (animação de arar) numa célula de chão Terra ou Terra com Grama,
  sem nada em cima (capim/flor são removidos) → chão vira **Terra Arada** (`World.canTill/till`). Segurando,
  quebra só plantas (capim, flor, trigo — inclusive colher —, cacto); não quebra madeira/árvore e não ataca. Alvo: célula à frente (botão de
  ação) ou sob o cursor; mesmo alcance de 4,5 células.
- **Espada (ativa):** golpeia entidades (ver `domains/player.md`); não quebra nada do mundo.
- **Machado (ativo):** golpeia entidades; segurando, corta madeira, árvore e planta (`organic`). Árvore cortada
  solta 2–3 Toras de Carvalho (mundo com coleta).
- **Pá (ativa):** toque/clique (animação de cavar) em chão Terra, Terra com Grama ou Terra Arada sem nada em cima
  (enfeites removidos; trigo plantado impede) → **Caminho de Terra** (`World.canFlatten/flatten`). Segurando, cava
  só blocos macios e destrói plantas — inclusive trigo maduro — **sem soltar nada**. Não ataca.
- **Picareta (ativa):** segurando, minera qualquer bloco e destrói plantas (trigo inclusive) **sem drop**; não
  quebra madeira/árvore; não ataca.

## Itens (`world/items.ts`) — fonte de verdade
- **Tudo que se carrega** tem um `StackId`: item contável (`'wheat'`), material coletado (`'block:20'`) ou
  ferramenta (`'tool:sword'`). No mundo principal (`collectBlocks`) os **materiais são coletados**: quebrar devolve
  o bloco (`blockDrops`: o próprio material — Terra com Grama volta como Terra com Grama —, árvore → 2–3 toras, porta
  → porta) e colocar gasta 1. No Santuário seguem infinitos. `breakDrops` = colheita (`toolDrops`) + material.

## Inventário e grade (`game/inventory.ts`, `game/hotbar.ts`, `game/bag.ts`)
- **Inventário**: pilhas por `StackId`, sem limite. Começo: 5 ferramentas, 5 sementes, 2 trigos, 1 Porta de Carvalho.
- **Grade**: 8 espaços + **bolsa** no 9º (tecla 9, I ou B). Começa com ferramentas 1–5, semente 6, trigo 7 e o 8º
  livre (a porta começa na bolsa). Coletado vai para a grade se já estiver nela ou houver espaço livre; senão, bolsa.
  Pilha que acaba libera o espaço (`Hotbar.prune`).
- **Bolsa**: painel com tudo que a heroína carrega (número do espaço quando está na grade). Toque num item e depois
  num espaço da grade → coloca lá (o que estava volta para a bolsa; se o item já estava em outro espaço, trocam).
  Sem item escolhido, tocar num espaço da grade guarda-o na bolsa. Com a bolsa aberta o jogo pausa.
- **Morte**: perde **todos os materiais** (`Inventory.dropMaterials`); ferramentas, sementes, trigo e espólios ficam.
- Receitas: próximo passo (Fase 3 seguinte).
- `Semente de Trigo` (planta `WHEAT_0`) e `Trigo` (alimenta ovelhas).
- `dropsFor(bloco)`: trigo maduro → 1 trigo + 1–2 sementes; trigo verde → devolve 1 semente; demais blocos → nada.
- **Espólios** (`loot: true`, `LOOT_ITEMS`): Seda de Aranha, Presa de Aranha, Coração da Rainha — sem uso ainda
  (futuras receitas); não ocupam a hotbar, aparecem no contador da HUD. `monsterDrops(tipo)`: pequena 1 seda (60%);
  grande 1–2 sedas + presa (35%); Rainha 5–7 sedas, 2–3 presas e o Coração. Ícones `icon-silk/fang/queen-heart`.

## Plantação (`world/world.ts`, `world/blocks.ts`)
- Trigo = 16 ids consecutivos (`WHEAT_FIRST` = 60 … 75), forma `crop`: não bloqueia passagem, não aceita bloco
  por cima, não se coloca pela hotbar (só plantando).
- `canPlant`: **só chão de Terra Arada** (arado pela enxada ou piso de Terra Arada colocado num buraco), com a
  célula vazia ou com enfeite. Grama e terra comuns não aceitam semente.
- Crescimento: `World.tick(dt)` avança cada trigo um estágio com probabilidade `dt / WHEAT_STAGE_SECONDS` (6 s)
  → ~1,5 min da semente ao maduro, sem sincronia entre plantas. O `World` guarda as células plantadas
  (só em chunks modificados, que não descarregam).
- Colher = quebrar segurando (2 s com a mão/item, 1 s com ferramenta — mesma regra de qualquer quebra).

## Inventário e coleta (`game/`)
- `Inventory`: quantidades de itens; começa com 5 sementes e 2 trigos. Não persistido.
- Hotbar (`game/hotbar.ts`): ferramentas 1–5, semente 6 e trigo 7 (com contador), blocos depois.
- `Drops`: o que cai da colheita fica no chão (pulinho + flutuação) e voa até a personagem a < 1,6 célula.

## Ações (toque curto no botão de ação ou clique, conforme o item selecionado)
- Semente → planta na célula à frente da personagem (ou sob o cursor; alcance 4,5).
- Trigo → dá para a ovelha à frente (ou sob o cursor). Anel dourado = pode comer; vermelho = não.

## Arte
- `assets-src/wheat-growth-sheet-v2.png` (16 estágios, só a planta, sem monte de terra) →
  `scripts/process-crop.py` → `src/assets/wheat-crop.webp`: cada quadro ancorado pela **base do caule** e todos na
  mesma escala (a planta cresce no lugar). Quadro de 1,25 célula com a base a 0,8 célula da célula, sobre a terra
  arada. A folha antiga (`wheat-growth-sheet.png`, com monte de terra) fica só como referência.
- Ícones escolhidos da prancha: **monte de sementes** (Semente de Trigo) e **feixe com laço** (Trigo).
