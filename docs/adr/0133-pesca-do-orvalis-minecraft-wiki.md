# ADR 0133 — Pesca do Orvalis pela Minecraft Wiki (auditoria #14 E2, v0.202.0)

**Estado:** aceita (27/11/2026). Ciclo da ADR 0116 cumprido: Minecraft Wiki ([Fishing](https://minecraft.wiki/w/Fishing), [Fishing Rod](https://minecraft.wiki/w/Fishing_Rod), [Raw Cod](https://minecraft.wiki/w/Raw_Cod), [Raw Salmon](https://minecraft.wiki/w/Raw_Salmon), [Cooked Cod](https://minecraft.wiki/w/Cooked_Cod), [Cooked Salmon](https://minecraft.wiki/w/Cooked_Salmon), [Pufferfish](https://minecraft.wiki/w/Pufferfish_(item)), [Tropical Fish](https://minecraft.wiki/w/Tropical_Fish_(item))) → estado atual → proposta → aprovada (mecânica, baiacu não comestível, valores confirmados; a receita da vara espera o fio).

## Wiki
Sem encantamento: 85 % peixe, 10 % lixo, 5 % tesouro; entre os peixes bacalhau 60 %, salmão 25 %, baiacu 13 %, peixe tropical 2 %. Espera de 5 a 30 s até a fisgada; janela de 1 a 2 s (Java) para recolher; a captura custa 1 uso (64 na Java); a boia se solta além de 33 blocos (a página da vara diz 33, a de pesca 32). Comida: cru 2/0,4; bacalhau assado 5/6; salmão assado 6/9,6; peixe tropical 1/0,2 (não assa); baiacu 1/0,2 com Fome III, Veneno II e Náusea.

## Decisão
1. **Itens 106–112** (ids do Orvalis): Vara de Pesca (64 usos em `MAX_DURABILITY`), Bacalhau Cru, Salmão Cru, Baiacu, Peixe Tropical, Bacalhau Assado, Salmão Assado; **113 = só a textura da boia** (como o 86 da tocha de parede), não é item. **Atlas de itens 4 × 29** (116 células; o próximo item é o 114, que cabe até 116).
2. **Mecânica** (`titan/fishing.ts`, puro; estado só de execução em `session.fishing`, fora do save): vara na mão e toque na água (a mira acerta o líquido por `aimsLiquid`) lança a boia na superfície; espera sorteada de 5 a 30 s; fisgada com janela de 1 a 2 s (se passar, o peixe escapa e a espera recomeça); o toque seguinte recolhe — com fisgada vem o peixe (`rollFish`) e a vara gasta 1; sem fisgada só recolhe, sem gasto. Sem lugar na mochila, o peixe cai ao lado da boia (`f:…`). A linha se solta se a vara sai da mão ou o jogador se afasta mais de `FISH_MAX_DISTANCE` (33).
3. **Sorteio só de peixes** (60/25/13/2 %); lixo e tesouro ficam de fora até haver itens e arte.
4. **Comida e fornalha** pelos valores da Wiki; bacalhau e salmão assam (`assar-bacalhau`, `assar-salmao`). **O baiacu não se come** (sem sistema de efeitos).
5. **A vara não tem receita:** a Wiki pede fios, que o Orvalis não tem; a receita espera a arte de fio. Até lá a vara só entra por comandos de teste.
6. A boia é desenhada como item solto (`visibleItems`, sprite do atlas); o alcance é o de mira (adaptação: a Wiki lança mais longe); o ícone da vara lançada do pacote não é usado.

## Consequências
Sem mudança de save, de gerador nem de protocolo (a pesca é só do aparelho; a vara com desgaste já é lida pelo inventário). Pendentes: lixo e tesouro, fio e a receita da vara, baiacu com efeitos, balde com peixe, peixes como animais (E3), lançar além do alcance de mira. Teste: `orvalis/pesca.test.ts`; conferido no navegador (lançar, fisgar, recolher).
