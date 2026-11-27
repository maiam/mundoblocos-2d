# ADR 0131 — Itens soltos e coleta pela Minecraft Wiki (auditoria #18, v0.200.0)

**Estado:** aceita (27/11/2026). Ciclo da ADR 0116 cumprido: Minecraft Wiki ([Item (entity)](https://minecraft.wiki/w/Item_(entity))) → estado atual (`titan/drops.ts`, `titan/actions.ts`, ADR 0082/0098) → proposta → aprovada nos 4 pontos.

## Wiki
Atraso de coleta de 10 ticks (0,5 s; 40 ticks se jogado pelo jogador); sumiço em 6000 ticks (5 min) com o relógio pausado fora de chunk carregado; fusão de itens iguais dentro de uma caixa de 0,5 × 0,25 × 0,5 se couber na pilha (fica o relógio com mais tempo restante); alcance de coleta ≈1,425 (só página de discussão, **não verificado**); destruição por fogo, lava, cacto, explosão e vazio. Queda, flutuação e velocidade de saída do bloco não foram confirmadas.

## Antes
Atraso 0,45 s; alcance 1,45; só os drops de bloco (`b:`) sumiam em 5 min (espólios, sementes, lascas e pilhas da morte ficavam para sempre no save); sem fusão; sem ação de jogar item; sem lava, fogo nem cacto.

## Decisão
1. **Atraso 0,5 s** (`PICKUP_DELAY_S`) e **alcance 1,425** (`PICKUP_RADIUS`).
2. **Todo item solto some em 5 min de jogo ativo** (`DROP_LIFE_S`), com o relógio recomeçando ao carregar o save; **exceção: a pilha da morte (`d:`)**, que não some (sem aviso de local nem perigos, seria punitivo).
3. **Fusão** (`mergeDrops`): itens iguais, sem desgaste, repousando na mesma célula e da mesma classe de sumiço viram uma entrada, até `maxStack`; fica o de menor idade e o maior atraso.
4. **Pendências:** ação de jogar item e atraso de 2 s (não existe a ação); lava, fogo e cacto (não existem no Orvalis).

## Consequências
Sem mudança de save, de gerador nem de protocolo. O mundo deixa de acumular espólios soltos. Teste: `titan/dropsWiki.test.ts`.
