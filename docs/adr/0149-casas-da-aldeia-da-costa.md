# ADR 0149 — Casas e Celeiro da Aldeia da Costa (sala 102, v0.229.0; fecha a pendência "casas e celeiro: só o piso" da ADR 0142)

**Estado:** aceita (28/11/2026). Pedido do dono: "subir os blocos de paredes e telhado, com degraus nos telhados, alçapões nas janelas e portas na entrada". Não é regra de mundo (ADR 0116): é o desenho do mapa feito à mão, com blocos que já existem (paredes de carvalho, degrau, alçapão e porta de madeira).

## Estado antes
A Costa v101 tinha só o **piso de tábuas** (Y 70) nas 4 bases edificáveis do pacote (`COSTA_PLAN.bases`: Casa 1 9 × 9, Casa 2 5 × 9, Casa 3 7 × 7, Celeiro 7 × 7).

## Decisão
1. **`titan/orvalis/casas.ts`** (puro, `buildingBlockAt`; `COSTA_BUILDINGS` na ordem das bases): toras de carvalho nos 4 cantos, tábuas nas paredes (3 blocos; Celeiro 4), **porta de carvalho de 2 células na entrada** (dupla no Celeiro, dobradiças nas pontas), **alçapão de carvalho em pé nas janelas** (rente à face de fora, fechando a janela; usar o alçapão a abre; `windowOffsets`: 9 → 2 e 6, 7 → 1 e 5, 5 → meio; o Celeiro só tem janelas nas laterais), **telhado de duas águas de degraus de carvalho** (degrau baixo para fora, cumeeira de tábuas de ponta a ponta, oitão fechado de tábua, sem beiral) e interior vazio sobre o piso. Entradas voltadas para as trilhas: Casa 1 norte, Casa 2 leste, Casa 3 oeste, Celeiro sul.
2. **Fonte de verdade:** o desenho está no código (o pacote do Drive só traz as bases); `CostaGenerator.blockAt` o consulta a partir da **v102** (acima do solo Y 70, antes do muro e das cercas). Mudou o desenho → versão nova.
3. **`COSTA_GENERATOR_VERSION` 102** e **`TITAN_PROTOCOL_VERSION` 8** (o cliente antigo não conhece o gerador 102; jogo e servidor juntos). `orvalisGeneratorFor` segue abrindo a 100 e a 101; **a sala recusa o arquivo salvo da v101** (a sala recomeça; o servidor guarda a cópia `.bak`, como na v101).
4. **Correção de arte achada na conferência:** a lateral −X do perfil do degrau (madeira e pedra) usava `u = z` e o patamar alto caía na metade **transparente** do tile (saía um quadrado preto nas pontas do telhado); passou a `u = 1 − z`, como a lateral +X (`make-orvalis-madeira-familia.py`, `make-orvalis-degrau.py`; só os JSONs de modelo mudam).

## Consequências
Sem interior (móveis, cama, bancada, tocha), sem chaminé, sem degrau de entrada, sem beiral e sem luz interna: a sala vê as casas apagadas por dentro (o céu entra pelo telhado de degraus e pelas janelas). Janelas nascem fechadas. Casas só na sala 102 (a individual não tem a aldeia). Fila: mobília e luz (Tocha/Fogueira dentro), beiral e calha, cercas de canteiro, poço e bancos (o pacote não os traz).
