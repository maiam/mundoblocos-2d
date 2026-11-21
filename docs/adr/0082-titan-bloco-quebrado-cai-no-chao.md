# ADR 0082 — Titã: o bloco quebrado cai no chão e é recolhido por proximidade (v0.141.0)

**Status:** Aceita. Pedido do dono do produto (especificação de drops do Minecraft). Estende a ADR 0044 (lascas soltas) a **todo** bloco comum.

- **Regra:** quebrar um bloco comum remove o bloco e solta o item na célula quebrada (`actions.spillBlock`, id `b:x,y,z:n`, `n` livre; desce até o apoio por `restY`). Não passa mais pela mochila: quebrar **nunca falha por mochila cheia**; o item espera no chão (a laje dupla solta 2 numa pilha).
- **Exceção:** a lanterna continua indo direto para a mochila e, sem espaço, fica no lugar (item-chave; não se perde em precipício ou água). Lascas de veio, brasa, cobre e espólio seguem como antes; veio solta o bloco **e** a lasca.
- **Coleta:** `collectNearby(s, px, py, pz, dt)` com raio de **1,45 m** (era 1,25) e a mesma regra de altura. **Atraso de coleta de 0,45 s** (`PICKUP_DELAY_S`) para os recém-soltos; pilha que não cabe fica (aviso "Mochila cheia" uma vez por aproximação). Coleta parcial de uma pilha não foi feita (tudo ou nada, como antes).
- **Vida:** drops `b:` somem em **300 s** de jogo ativo (`DROP_LIFE_S`); a pilha da morte (`d:`), o espólio e as lascas nunca somem.
- **Estado de execução:** o relógio (`session.dropFx`: atraso e idade) **não vai no save**; um drop `b:` lido do save ganha relógio novo (sem atraso, 5 min a partir da abertura). `header.drops` não mudou de formato (sem `TITAN_SAVE_VERSION`/`GENERATOR_VERSION`).
- **Visual** (`render/titanRenderer.ts`, só desenho): item novo **salta** (0,4 s) e cada item tem uma folga fixa pelo id na célula (não se sobrepõem); ao ser recolhido **voa 0,14 s** até a cintura do jogador e some. A primeira lista (partida retomada) não salta.
- **Não adotado:** impulso horizontal físico, ferramenta mínima para dropar (Titã segue com as regras de `TOOLS`/veios), coleta parcial.
- **Testes:** `dropsBloco.test.ts` (8) e `dropTestUtil.ts` (`sweep`/`sweepBlocks`, para testes que quebram e conferem a mochila); 8 arquivos de teste existentes ajustados (mochila cheia agora quebra e deixa no chão).
