# ADR 0137 — Botes do Orvalis (auditoria #14 E4a, v0.206.0)

**Estado:** aceita (27/11/2026). Ciclo da ADR 0116 cumprido: Minecraft Wiki ([Boat](https://minecraft.wiki/w/Boat)) → estado atual → proposta → aprovada nos 5 pontos (divisão E4a/E4b, receita de 5 tábuas mantida de memória, controles, só água a 8 m/s, persistência no save).

## Wiki
Qualquer tábua do mundo normal; 2 ocupantes; ~8 m/s na água (gelo muito mais rápido; lento em terra); remos esquerdo e direito; o dano acima de 40 destrói o bote, que vira item; o bote com baú solta o baú e o conteúdo; anula o dano de queda. Não confirmados: a receita (5 tábuas é de memória), o desembarque e a velocidade exata.

## Decisão
1. **E4a: só o bote sem baú** (3 madeiras). O bote com baú (E4b) espera o baú do Orvalis, que não existe (o baú de rocha e junco é do Titã, ADR 0114). Os modelos com baú do pacote ficam importados, sem uso.
2. **Itens 153–155** (Bote de Carvalho, de Bétula e de Cerejeira), ícones do pacote; receita de **5 tábuas da mesma madeira** na Mesa de Carpintaria (de memória, mantida). **Atlas de itens 4 × 39** (156 células).
3. **`titan/boat.ts`** (puro): `Boat` {id, madeira, x, y, z, giro}; `stepBoat` (acelera a até `BOAT_MAX_SPEED` 8 m/s, ré de 2,5, aceleração 6 e freio 5 m/s², leme `BOAT_TURN_RATE` 1,8 rad/s — os três últimos são adaptação); **só anda sobre água** (`boatFits`: centro, proa, popa e bordos precisam ser água na superfície, com ar livre em cima) e para na margem; flutua a Y = 63,9; proa em −Z (o mesmo sentido do olhar com giro 0). Caixa de mira por `boatBox`/`boatAim`.
4. **Colocar:** com o bote na mão (a mira acerta o líquido: `aimsLiquid`), o toque na superfície o põe lá, se o casco cabe e não há outro bote em 1,6 m (`placeBoat`). **Embarcar:** tocar no bote (`mountBoat`); **pilotar:** W e S, A e D giram (no toque, o joystick: frente e lado), o olhar é livre, o corpo segue o assento (sem passos, queda nem dano; `session.boatRide` só de execução); **desembarcar:** pular (`dismountBoat`); **recolher:** segurar no bote vazio (`pickBoat`, volta como item ou cai ao lado se a mochila está cheia). Adaptação: sem agachar, pular desembarca.
5. **Modelo:** o GLB estático do pacote (`orvalis-bote-<madeira>.glb`, ~20 KB cada, carregado por `GLTFLoader` como o Farejador), `render/boatView.ts`: material da luz do dia, filtro vizinho mais próximo, um molde por madeira e clones por bote.
6. **Save:** `header.boats` opcional (`{k, x, y, z, r}`), **`TITAN_SAVE_VERSION` 8**; ausente = nenhum; quem estava a bordo não persiste (o jogador reaparece onde o salvamento o pôs). Lido por `boatsFromData` (descarta entradas inválidas).
7. **Fora desta etapa:** bote com baú, segundo passageiro, mobs a bordo, gelo, dano e golpe que quebra o bote, andar em terra, anular o dano de queda.

## Consequências
Sem mudança de protocolo (salas são só do Titã) nem de gerador. Pendentes: E4b (com baú), segundo passageiro e animais a bordo, bote em terra (lento), golpe que o destrói, e a vara de pesca a partir do bote. Testes: `orvalis/botes.test.ts`; conferido no navegador (bote na água, remar a ~7,8 m/s e desembarcar).
