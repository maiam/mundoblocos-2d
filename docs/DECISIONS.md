# Decisões

| # | Decisão | Onde |
|---|---|---|
| 0001 | Terreno como função pura da seed + chunks 16×16 com edições sobrepostas | [adr/0001](adr/0001-geracao-pura-e-chunks.md) |
| 0002 | Texturas 100% procedurais em canvas, cache offscreen por chunk | [adr/0002](adr/0002-texturas-procedurais.md) |
| 0003 | Vista superior inclinada (3/4) com camadas chão/objeto; personagem como sprite asset | [adr/0003](adr/0003-vista-superior-inclinada.md) |
| — | Pilha máx. 2 cubos; personagem sobe 1 nível por passo (pode chegar ao 2 a partir do 1); descer é livre | `domains/player.md` |
| — | Chão quebrado vira buraco; só bloco novo ocupa; o bloco vira piso nivelado (não cubo saliente) | `domains/world.md` |
| — | Câmera sem rotação + joystick em direções de tela | `domains/player.md` |
| — | Sem backend neste repositório; persistência futura via core | `PROJECT_CONTEXT.md` |
| — | Chunks quadrados 16×16 nos dois eixos do mapa | `domains/world.md` |
