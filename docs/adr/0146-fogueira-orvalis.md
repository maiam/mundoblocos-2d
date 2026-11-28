# ADR 0146 — Fogueira do Orvalis (auditoria #50, v0.223.0; etapa 1 dos acampamentos do Grunho)

**Estado:** aceita (28/11/2026). Ciclo da ADR 0116 cumprido, **com a ressalva de fonte:** a `minecraft.wiki` não abriu na sessão; os números vêm de espelhos ([Campfire (Fandom)](https://minecraft.fandom.com/wiki/Campfire) e guias) e ficam **a confirmar**. O dono escolheu "bloco e item fabricável" (sem cozinhar).

## Wiki (espelhos)
Receita: 3 gravetos + 1 carvão (ou carvão vegetal) + 3 troncos; luz 15; cozinha até 4 itens (30 s cada); machuca quem pisa. Dureza 2 (de memória, machado).

## Estado antes
O Orvalis não tinha Fogueira. A arte já estava no repositório (pacote P2-11, 16 px) e no Drive (32 px: `orvalis_fogueira_acesa_icone_32x32.png`). A Tocha (ADR 0121) é o modelo de bloco "sprite extrudado".

## Decisão
1. **Bloco `T.CAMPFIRE` (424, `T_MAX`) e item 176 (Fogueira)**, só do Orvalis; pergunte `isCampfire`/`modelOf` (`'fogueira'`), nunca ids soltos.
2. **Modelo:** o ícone de 32 px extrudado (`render/tochaModel.ts`, `fogueiraModel`), a base na célula; brilho próprio como o da tocha (na v0.223.0 eram dois planos cruzados; **desde a v0.226.0 é um plano só virado para a câmera**, ver o adendo).
3. **Luz 15** (`CAMPFIRE_LIGHT`, em `lightLevelOf`); **não sólida** (atravessa-se, como a tocha; simplificação: a Wiki dá uma caixa baixa de 7/16), alvo da mira (`CAMPFIRE_BOX`), não bloqueia luz.
4. **Colocar:** só em pé sobre o topo de um cubo firme (`torchTopSupport`; folhas e por baixo não); sem o apoio ela **cai como item** (`releaseTorches`). Quebrar devolve a Fogueira (machado, dureza 2).
5. **Receita** na Mesa de Carpintaria: 3 hastes + 1 Carvão Vegetal + 3 troncos de carvalho (o jogo não tem ingrediente alternativo: a Wiki aceita carvão comum e outras madeiras).
6. Atlas de itens: o 176 ainda cabia (o item N fica na célula N − 1), então nada foi ampliado; **o 177 amplia**.

## Fora desta entrega
Cozinhar (até 4 comidas), dano por pisar, fumaça, fogueira das almas, apagar com água, caixa de colisão baixa. Os acampamentos do Grunho (etapas 2 e 3) usam esta Fogueira.

## Adendo (28/11/2026, v0.226.0): arte nova da fogueira
O dono enviou a arte nova: **fogueira acesa** (chama grande sobre três toras, uma versão e quatro variações) e **fogueira apagada** (toras queimadas com cinza, uma versão e quatro variações), em `assets-src/orvalis-voxel/fogueira/`. **Entrou a acesa:** `make-orvalis-espadas.py` a reduz a 32 px (paleta de 48 cores, cor mais frequente por célula, ocupa a célula inteira) em `assets32/orvalis_fogueira_acesa_32x32.png`, que passa a ser o ícone do item 176 (`arte32/itens.json`) e, como o modelo é o ícone extrudado, também o do bloco (agora **um plano só, sempre de frente para a câmera** — `faceCampfires` no renderer gira a instância em Y a cada quadro, por pedido do dono: a vista lateral dos planos cruzados não agradou —, a 0,85 de bloco de largura, caixa de mira 0,8 × 0,8, brilho próprio `CAMPFIRE_GLOW` 0,9 porque a arte tem contorno escuro e vermelhos fundos). **Ficam sem uso:** a fogueira **apagada** (o jogo não tem estado apagado: sem apagar com água nem acender com isqueiro) e as **variações** (quadros de uma chama animada; o modelo usa uma célula estática do atlas de itens). O ícone antigo (`orvalis_fogueira_acesa_icone_32x32.png`) fica no pacote, sem uso. A Fogueira só existe no Orvalis (ADR 0114): o Titã não tem; as duas versões do Orvalis (partida individual e sala 102) usam o mesmo código e a mesma arte.
