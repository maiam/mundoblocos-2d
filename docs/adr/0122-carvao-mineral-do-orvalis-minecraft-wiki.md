# ADR 0122 — Carvão mineral do Orvalis: minério, Carvão e Bloco de Carvão, pela Minecraft Wiki (auditoria #34)

**Status:** Aceita e implementada (v0.189.0). Proposta enviada ao dono do produto e aprovada em 27/11/2026 ("sim").

## Wiki (páginas "Coal Ore", "Coal" e "Block of Coal", edição Java)
Minério de carvão: dureza 3 (em ardósia, 4,5), pede picareta de madeira ou melhor, solta 1 Carvão (sem toque de seda); gera em veios de até 37 blocos, 20 tentativas por chunk entre Y 0 e 192 (pico em 96), metade dos blocos expostos ao ar não nasce. Carvão: combustível de 80 s e ingrediente da Tocha. Bloco de Carvão: 9 Carvões, dureza 5, queima 800 s.

## Decisão
- **Blocos** 150 `T.COAL_ORE` e 151 `T.COAL_BLOCK` (cubos opacos, dureza 3 e 5, picareta, som de rocha, tiles `orvalis/minerio-carvao` e `bloco-carvao` do pacote P2-09). **Itens** 87 **Carvão** (sem bloco) e 88 **Bloco de Carvão**; **não há item de minério** (sem toque de seda, o minério solta Carvão e nunca a si mesmo), então o atlas de itens segue **4 × 22** (88 células: 86 é a textura da tocha de parede, ADR 0121).
- **Queda:** o minério solta **1 Carvão só com picareta** (qualquer uma: `isPick`); sem picareta quebra e não solta nada (Wiki). Vale por ora só para o minério; a regra geral de queda por ferramenta é a auditoria #18.
- **Receitas:** 9 Carvões → Bloco de Carvão (bancada); Bloco → 9 Carvões (pessoal); **Tocha também com Carvão** (Carvão + haste → 4). **Fornalha:** Carvão 80 s, Bloco de Carvão 800 s (`FUEL_TIME_S`); o limite de queima gravado no save sobe de 600 para 800 s (`furnaceFromData`).
- **Geração — `ORVALIS_GENERATOR_VERSION` 2** (partidas antigas continuam na v1, sem minério): `ORVALIS_ORE_RULES` com o `OreRule` do Titã (`titan/ores.ts`, ADR 0070): **20 tentativas por chunk, veios de 4 a 30 blocos, Y −60 a 90 com pico triangular em 40** (a Wiki pica em 96 num mundo de 192 de pedra; aqui a pedra vai de −64 a ~90), **descarte de 50 % dos blocos expostos ao ar**, só substitui a pedra abaixo do subsolo de 3 blocos. Resultado independente da ordem de leitura (os 3 × 3 chunks em volta são gerados antes); 0,75 % da pedra vira minério (o Minecraft tem ~1 %).
- **Fora desta entrega:** ardósia abissal (não há camada de ardósia; a arte do minério em ardósia fica só como fonte), picareta de madeira ser a mínima para **dropar** pedra e demais blocos (#18), minério de ferro e cobre (pacote P2-09, regras próprias).

## Consequências
Pacote da sala muda (gerador, itens, receitas, regras): o servidor precisa do `sync-net` desta versão; protocolo e save não mudam. Testes: `orvalis/carvao.test.ts` (7) e o teste de ids do gerador aceita o novo bloco. Conferido no navegador (minério na pedra, bloco de carvão, Carvão na mão e na bolsa).
