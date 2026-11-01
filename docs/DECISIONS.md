# Decisões

| # | Decisão | Onde |
|---|---|---|
| 0001 | Terreno como função pura da seed + chunks 16×16 com edições sobrepostas | [adr/0001](adr/0001-geracao-pura-e-chunks.md) |
| 0002 | Texturas 100% procedurais em canvas, cache offscreen por chunk | [adr/0002](adr/0002-texturas-procedurais.md) |
| 0003 | Vista superior inclinada (3/4) com camadas chão/objeto; personagem como sprite asset | [adr/0003](adr/0003-vista-superior-inclinada.md) |
| — | Pilha máx. 2 cubos; personagem sobe 1 nível por passo (pode chegar ao 2 a partir do 1); descer é livre | `domains/player.md` |
| — | Chão quebrado vira buraco; só bloco novo ocupa; o bloco vira piso nivelado (não cubo saliente) | `domains/world.md` |
| — | HUD mínimo (só hotbar; joystick só em toque); quebrar = segurar 2 s, colocar = toque curto | `domains/player.md` |
| 0004 | Entidades andantes compartilham `Walker`; NPCs em `game/` como estado de execução | [adr/0004](adr/0004-entidades-walker.md) |
| — | Ovelha não sobe em cubos (stepHeight 0): blocos servem de cerca | `domains/npc.md` |
| — | Horizontal garantido por camada de rotação; tela cheia/trava só como melhoria quando o navegador permite | `domains/player.md` |
| 0005 | Itens contáveis separados dos blocos infinitos; inventário em `game/` | [adr/0005](adr/0005-itens-e-inventario.md) |
| — | Crescimento do trigo probabilístico por tempo (média 6 s/estágio) | `domains/farming.md` |
| — | Ícones: monte de sementes e feixe com laço | `domains/farming.md` |
| — | Ferramenta equipada = espaço selecionado; sem ação até definirmos o uso de cada uma | `domains/player.md` |
| — | Pá sem folha para a direita: espelho da esquerda | `domains/render.md` |
| — | Ação no celular pelo botão de ação sobre o alvo à frente; toque no mundo desativado no toque | `domains/player.md` |
| — | Câmera sem rotação + joystick em direções de tela | `domains/player.md` |
| — | Sem backend neste repositório; persistência futura via core | `PROJECT_CONTEXT.md` |
| — | Chunks quadrados 16×16 nos dois eixos do mapa | `domains/world.md` |
