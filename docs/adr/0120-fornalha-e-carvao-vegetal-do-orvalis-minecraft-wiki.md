# ADR 0120 — Fornalha e Carvão Vegetal do Orvalis, pela Minecraft Wiki (auditoria #21)

**Status:** Aceita e implementada (v0.187.0). Proposta enviada ao dono do produto e aprovada nos quatro pontos em 27/11/2026 ("Sim às quatro, ícone provisório").

## Wiki (páginas "Furnace", "Smelting" e "Charcoal", edição Java)
Fornalha = 8 blocos de pedra; dureza 3,5 (sem picareta não dropa); cubo; luz 13 acesa; 3 espaços (entrada, combustível, saída); uma preparação a cada 200 ticks (10 s); o combustível é gasto ao começar e **queima até o fim** mesmo sem entrada; sem queima o progresso regride 2× mais rápido. Combustíveis (s): carvão e carvão vegetal 80, tora, tábuas e Mesa de Carpintaria 15, haste 5. Tora vira carvão vegetal; bola de argila vira tijolo; pedra vira pedra lisa. O carvão vegetal também é ingrediente da Tocha.

## Decisão
- **Motor único** `titan/furnace.ts`, com **regras por tipo de bloco** (`rulesOf`): `BRAZIER_RULES` (Titã: estação `brazier`, a carga só gasta ao processar, ADR 0073 — **mantido, auditoria própria depois**) e `FURNACE_RULES` (Orvalis: estação `furnace`, **queima contínua**). A escolha é pelo bloco no lugar, nunca por mundo. Dados, save (`header.furnaces`), sala e protocolo não mudam (`TITAN_PROTOCOL_VERSION` segue 3); só `furnaceFromData(d, regras)` lê o gravado com as regras do bloco (sessão e cliente da sala).
- **Fornalha:** 8 ids — apagada 137–140, acesa 141–144, giro no id (`furnaceId`/`furnaceTurn`/`isFurnace`/`isFurnaceLit`; nunca ids soltos), colocada com a frente para o jogador, sempre apagada. Cubo opaco (`isFull`, bloqueia luz), dureza 3,5 com picareta, **luz 13 quando acesa** (`lightLevelOf`), som de rocha; acende e apaga por `tickFurnaces` sem perder o giro; quebrar cospe o conteúdo e devolve a Fornalha apagada. Item 83, receita **8 Pedras na bancada** (Mesa de Carpintaria).
- **Carvão Vegetal** (item 84, sem bloco): `carvao-carvalho`/`-cerejeira`/`-betula` (1 tora → 1 carvão) na estação `furnace`. **`pedra-lisa` e `tijolo` saem da bancada** (eram provisórias, ADR 0108/0111) e passam à Fornalha. Receitas de estação `furnace` têm um ingrediente só e ficam no painel da fornalha, não em cartões.
- **Combustíveis do Orvalis** em `FUEL_TIME_S` (segundos de queima da Wiki): Carvão Vegetal 80; tora, tábuas e Mesa de Carpintaria 15; haste 5. Os itens dos dois mundos não se misturam (ADR 0114), então uma tabela única serve.
- **Painel:** o do braseiro, com título "Fornalha" e a dica do combustível do Orvalis (estação `furnace` em `titanGame.ts`).
- **Arte:** tiles `orvalis/fornalha-topo|lateral|frente-apagada|frente-acesa` (pacote Cozinha do Drive, 16 px) e ícone de cubo (item 83); **ícone do Carvão Vegetal provisório**, desenhado em código (`scripts/make-orvalis-carvao.py`, `assets-src/titan/arte16/`) porque nenhum pacote do Drive traz o carvão — trocar o PNG quando a arte chegar. Atlas de itens 4 × 21: **84 ids, todos em uso**; o próximo item amplia (`ITEM_ROWS`, CSS, `make-titan-arte32.py`).
- **Fora desta entrega:** batata assada e vidro (faltam item e arte); Braseiro do Titã (mantido); a Tocha (#33) segue com o ciclo dela, agora com receita da Wiki possível (Carvão Vegetal + haste → 4).

## Consequências
`make-titan-arte32.py` não achava a base `titan-hotbar-sprites-16px.webp` (saiu com a arte do 2.5D, ADR 0115): passou a partir do atlas de itens já gravado quando a base falta. Testes: `orvalis/fornalha.test.ts` (12) e ajustes em `pedraObra`/`solo` (receitas na fornalha) e nos limites de item (83 → 85). Sem mudança de gerador nem de save.
