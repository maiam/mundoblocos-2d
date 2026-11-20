# ADR 0073 — Titã: Brasa de Âmbar como combustível comum (gerador v11, v0.131.0)

**Status:** Aceita. Contexto: proposta do dono do produto (história: a brasa guarda a luz da tarde; juncos de vidro levam às primeiras brasas na superfície e veios maiores abastecem a oficina no subsolo). Estende ADR 0045 (brasa e junco), 0065/0068 (braseiro) e 0070 (veios enterrados).

## Decisão
1. **Quatro depósitos na superfície** (`gen.emberSites`, gerador **v11**): acessíveis a pé, dentro dos 4 × 4 chunks iniciais (|x|, |z| ≤ 30), afastados entre si (≥ 12; relaxa para 8 e 5 se faltar lugar), preferindo areia úmida rasa. Cada um rende **1 brasa** (como antes) e tem **juncos de vidro** em volta (`reedsForSites`; depósito em outro terreno recebe até 3 juncos de reserva). Até a v10 só havia um (`emberSite`).
2. **Veio de Âmbar** (bloco 28, tile 16, `T.EMBER_VEIN`): minério enterrado de **3 a 8 blocos** (`ORE_RULES`, `veinSizeMax`; 2 tentativas por chunk, Y −48..30, pico em −10; só da v11). **Só uma picareta o quebra** (a de rocha basta; sem ela "Só pó nos dedos") e solta **1 ou 2 brasas** no chão (`amberYield`, decidido pela célula), nunca o bloco. **Brilho discreto** no mesher (`glowOf`: depósito 0,42, veio 0,3, bloco 0,22); a luz do entorno fica com as lanternas.
3. **Veio garantido perto da chegada** (`placeAmberGuaranteed`, `gen.amberGuaranteed`): como o Titã **ainda não tem cavernas** (decisão do dono do produto: tratar como veios enterrados), há sempre um veio de 4 a 8 células entre 6 e 20 blocos da chegada e 6 a 21 blocos sob a superfície, alcançável cavando; vale mais que o sorteio (`amberKeys`).
4. **Bloco de Âmbar Compactado** (item e bloco 29, tile 17): receita na Mesa **9 brasas → 1 bloco** (`ambar-compactado`) e **1 bloco → 9 brasas** (`ambar-desmontar`); colocável como acabamento e devolvido ao quebrar. Também é **combustível** com o rendimento das 9 unidades.
5. **Braseiro** (`furnace.ts`): a Brasa de Âmbar rende **4 preparações** (`FUEL_TIME_S` 40 s) e o bloco, **36** (360 s); a carga **só é gasta enquanto o braseiro processa** uma receita (parado, o saldo fica para a próxima vez; `isWorking` é o que mantém o bloco aceso). A conta passou a ser por trechos (sem perder resíduo de arredondamento). A tela mostra "Carga: n preparações". Saves antigos: o saldo gravado em segundos continua válido.
6. A arte é provisória e gerada por código (`scripts/make-titan-ambar.py`: atlas de terreno 80 × 100 com os tiles 16 e 17; ícone 32 px do bloco em `assets-src/titan/arte32/`, id 29 no atlas de itens); partidas antigas (v ≤ 10) não ganham nada disso.

## Consequências
- Brasa deixa de ser escassa: 4 pontos à vista, um veio perto da chegada e centenas de blocos no subsolo; lanterna e braseiro viáveis antes de descer.
- Pendências: cavernas reais (ar enterrado, veios em paredes e chão); balanço de raridade e rendimento; arte final do veio e do bloco; luz própria/partículas; aceite em aparelho.
- Testes: `ambar.test.ts` (+5), `furnace.test.ts` reescrito para a carga por preparações.
