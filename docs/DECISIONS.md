# Decisões

## Arquitetura (ADRs)
| # | Decisão | ADR |
|---|---|---|
| 0001 | Terreno como função pura da seed + chunks 16×16 com edições sobrepostas | [0001](adr/0001-geracao-pura-e-chunks.md) |
| 0002 | Texturas procedurais e cache offscreen por chunk (blocos substituídos pela 0006) | [0002](adr/0002-texturas-procedurais.md) |
| 0003 | Vista superior inclinada (3/4), camadas por célula, personagem como sprite | [0003](adr/0003-vista-superior-inclinada.md) |
| 0004 | Entidades andantes compartilham `Walker`; NPCs como estado de execução em `game/` | [0004](adr/0004-entidades-walker.md) |
| 0005 | Itens contáveis separados dos blocos infinitos; inventário em `game/` | [0005](adr/0005-itens-e-inventario.md) |
| 0006 | Blocos = 8 materiais da prancha; mesmo id como chão e cubo; prancha 3/4 como fonte | [0006](adr/0006-materiais-da-prancha.md) |
| 0007 | Assets em WebP gerados por script; PNG só como etapa intermediária | [0007](adr/0007-assets-webp.md) |

## Produto e regras de jogo
| Decisão | Onde |
|---|---|
| Sem backend neste repositório; persistência futura via core | PROJECT_CONTEXT |
| Chunks quadrados 16×16 nos dois eixos | domains/world |
| Pilha máx. 2 cubos; personagem sobe 1 nível por passo; descer é livre | domains/player |
| Chão quebrado vira buraco; só bloco novo ocupa e vira piso nivelado | domains/world |
| Ovelha não sobe em cubos: blocos servem de cerca | domains/npc |
| Crescimento do trigo probabilístico (média 6 s/estágio) | domains/farming |
| Ferramenta equipada = espaço selecionado; sem ação até definir o uso de cada uma | domains/player |

## Interface e controles
| Decisão | Onde |
|---|---|
| Câmera sem rotação; joystick e teclado em direções de tela | domains/player |
| HUD mínimo: só a hotbar (joystick e botão de ação só em toque) | domains/player |
| Celular: botão de ação sobre o alvo à frente; toque no mundo não age | domains/player |
| Quebrar = segurar 2 s; colocar = toque/clique curto | domains/player |
| Horizontal garantido pela camada de rotação; tela cheia/trava quando o navegador permite | domains/player |

## Arte
| Decisão | Onde |
|---|---|
| Ícones do trigo: monte de sementes e feixe com laço | domains/farming |
| Pá sem folha para a direita: espelho da esquerda | domains/render |
| Prancha 3/4 venceu a extração isométrica (comparação no jogo) | adr/0006 |
