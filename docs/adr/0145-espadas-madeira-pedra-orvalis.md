# ADR 0145 — Espadas de madeira e de pedra do Orvalis (auditoria #49, v0.222.0)

**Estado:** aceita (28/11/2026). Ciclo da ADR 0116 cumprido, **com uma ressalva de fonte:** a `minecraft.wiki` **não abriu** na sessão (o host não resolve), então os números vêm do espelho [Sword (Fandom)](https://minecraft.fandom.com/wiki/Sword), da [Durabilidade (Fandom)](https://minecraft.fandom.com/wiki/Durability) e de guias; **não confirmados na Wiki oficial**. O dono aprovou a proposta com essa ressalva.

## Wiki (espelhos)
Espada de madeira: dano **4** (Java; 5 na Bedrock), durabilidade **59**, velocidade de ataque 1,6 (recarga 0,625 s). Espada de pedra: dano **5** (Java; 6 na Bedrock), durabilidade **131**. Desgaste: 1 ponto por golpe em mob ou jogador; **2** ao quebrar bloco que não quebra de uma vez. Receita: 2 tábuas (ou 2 pedregulhos) + 1 graveto, em coluna. Não confirmados: golpe crítico e ataque varredura.

## Estado antes
O Orvalis não tinha espada (a adaga é do Titã, itens 22 e 24, e a ADR 0114 proíbe compartilhar). Dano: punho 1; ferramentas do Orvalis abaixo da Wiki (machados 2 e 3, picaretas 1 e 2, pás 1 e 2, enxada 1: auditoria #25 pendente). Durabilidade 59 e 131 já eram a da Wiki. Sem recarga de ataque (cada toque é um golpe).

## Decisão
1. **Itens 174 (Espada de Madeira) e 175 (Espada de Pedra)**, só do Orvalis; novo `ToolKind` `'sword'` em `TOOLS` (`isSword`, nunca ids soltos), pilha de 1, **atlas de itens 4 × 44 (176 células; o item N fica na célula N − 1): o 176 ainda cabia (virou a Fogueira, ADR 0146) e o 177 amplia de novo** (correção da contagem original, que dizia 176).
2. **Dano 4 e 5** (Java) em `WEAPON_DAMAGE`; as demais ferramentas não mudam (ficam para a auditoria #25).
3. **Durabilidade 59 e 131** em `MAX_DURABILITY`; **desgaste como a adaga:** golpe −1, bloco −2, bloco de quebra instantânea 0 (`wearCost`).
4. **Receitas** na Mesa de Carpintaria, no padrão do jogo (ferramentas na bancada, sem a disposição em coluna): 2 tábuas de carvalho + 1 haste; 2 Pedras + 1 haste.
5. **Arte:** as duas imagens do dono (1254 × 1254) viram o ícone de **32 px** por `scripts/make-orvalis-espadas.py` (paleta pequena e cor mais frequente por célula, sem média) e entram em `assets-src/titan/arte32/itens.json`; na mão é o sprite extrudado de sempre (ADR 0097).

## Fora desta entrega
Recarga de ataque (1,6/s), golpe crítico, ataque varredura, quebra rápida de teia/bambu (não há o bloco), espada como combustível. Repetir a consulta quando a `minecraft.wiki` abrir e corrigir os números se divergirem.
