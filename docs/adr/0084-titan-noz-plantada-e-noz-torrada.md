# ADR 0084 — Titã: Noz plantada e Noz Torrada (v0.145.0)

**Status:** Aceita. Etapa 2 da rodada "cultivo e oficina da Margem" (ADR 0083); o dono do produto aceitou as sugestões. Estende o motor de cultivo do junco a uma segunda espécie.

## Decisão
1. **Espécie na planta:** `Crop` ganha `species: 'junco' | 'noz'`. O motor é o mesmo (random ticks, pontos da areia e vizinhas, aglomeração só entre a mesma espécie, luz ≥ 9). A Noz tem 3 fases (0 broto, 1 planta sem frutos, 2 com frutos) e **só cresce na Areia Ocre** (`plantableSoil`); na úmida não se planta nem cresce.
2. **Plantar × comer:** com a Noz na mão, o toque no mundo **planta** se o alvo é o topo de uma Areia Ocre com a célula de cima livre (`canPlantNut`); em qualquer outro alvo continua **comendo**. Tocar de novo no espaço da hotbar come sempre. Com a Noz crua na mão perto da areia ocre, comer pede apontar para outro lugar ou usar a hotbar (decisão de usabilidade, pede teste no toque).
3. **Colheita:** a planta adulta rende **4 nozes** (`NUT_YIELD`) e recua à fase 1 (sem frutos); nunca é arrancada. Quebrar a areia de baixo derruba a planta e devolve a noz (`seedOf`). **Não cria Farejador** (os animais vêm só do gerador).
4. **Desenho:** o modelo da Noz de Duna silvestre (`setNuts`, agora com tamanho opcional `s`): broto a 0,4, planta inteira nas fases 1 e 2, frutos só na 2 (`nutLook`). `standingNuts` junta silvestres e plantadas.
5. **Save:** `header.crops` aceita `{ s: 'noz', a: idade }` para a Noz (o junco segue como número); na leitura a Noz só entra com Areia Ocre sob a célula. Sem subir `TITAN_SAVE_VERSION`.
6. **Noz Torrada** (item 30, `Item.NOZ_TORRADA`): receita do Braseiro `noz-torrada` (1 Noz → 1, 10 s, combustível normal), fome **7** e saturação **5,6** (a crua: 4 e 2,4; a carne assada: 8). `isItem` vai até 30. O ícone é **provisório**, gerado por `scripts/make-titan-noz-torrada.py` a partir do ícone da Noz (a `Noz_Torrada_Arte.png` do Drive é só uma ilustração grande) e entra no atlas de itens por `make-titan-arte32.py`.

## Consequências
- A Noz silvestre mais próxima da chegada sem guarda depende do gerador v13 (etapa 4); o gerador não mudou.
- Pendências: ícone final da Noz Torrada; calibrar tempos em jogo; esteira (etapa 3).
- Testes: `crops.test.ts` e `cropsSession.test.ts` (+4); `margem`, `noz` e `recipes` ajustados (item 30, toque na lateral para comer, receita nova). Conferido a 740 × 360: broto, planta, planta com frutos e o ícone na hotbar.
