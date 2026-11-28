# ADR 0146 — Fogueira do Orvalis (auditoria #50, v0.223.0; etapa 1 dos acampamentos do Grunho)

**Estado:** aceita (28/11/2026). Ciclo da ADR 0116 cumprido, **com a ressalva de fonte:** a `minecraft.wiki` não abriu na sessão; os números vêm de espelhos ([Campfire (Fandom)](https://minecraft.fandom.com/wiki/Campfire) e guias) e ficam **a confirmar**. O dono escolheu "bloco e item fabricável" (sem cozinhar).

## Wiki (espelhos)
Receita: 3 gravetos + 1 carvão (ou carvão vegetal) + 3 troncos; luz 15; cozinha até 4 itens (30 s cada); machuca quem pisa. Dureza 2 (de memória, machado).

## Estado antes
O Orvalis não tinha Fogueira. A arte já estava no repositório (pacote P2-11, 16 px) e no Drive (32 px: `orvalis_fogueira_acesa_icone_32x32.png`). A Tocha (ADR 0121) é o modelo de bloco "sprite extrudado".

## Decisão
1. **Bloco `T.CAMPFIRE` (424, `T_MAX`) e item 176 (Fogueira)**, só do Orvalis; pergunte `isCampfire`/`modelOf` (`'fogueira'`), nunca ids soltos.
2. **Modelo:** o ícone de 32 px extrudado em **dois planos cruzados** (`render/tochaModel.ts`, `fogueiraModel`), a base na célula; brilho próprio como o da tocha.
3. **Luz 15** (`CAMPFIRE_LIGHT`, em `lightLevelOf`); **não sólida** (atravessa-se, como a tocha; simplificação: a Wiki dá uma caixa baixa de 7/16), alvo da mira (`CAMPFIRE_BOX`), não bloqueia luz.
4. **Colocar:** só em pé sobre o topo de um cubo firme (`torchTopSupport`; folhas e por baixo não); sem o apoio ela **cai como item** (`releaseTorches`). Quebrar devolve a Fogueira (machado, dureza 2).
5. **Receita** na Mesa de Carpintaria: 3 hastes + 1 Carvão Vegetal + 3 troncos de carvalho (o jogo não tem ingrediente alternativo: a Wiki aceita carvão comum e outras madeiras).
6. Atlas de itens: o 176 ainda cabia (o item N fica na célula N − 1), então nada foi ampliado; **o 177 amplia**.

## Fora desta entrega
Cozinhar (até 4 comidas), dano por pisar, fumaça, fogueira das almas, apagar com água, caixa de colisão baixa. Os acampamentos do Grunho (etapas 2 e 3) usam esta Fogueira.
